/**
 * GDELT news archive on AWS: a Lambda that copies GDELT's 15-minute GKG files into the data lake,
 * a schedule that runs it every 15 minutes, and an Athena table over the result.
 *
 * Run from this folder after `npm install` here (kept apart from the app's dependencies):
 *
 *   node deploy.mjs deploy              create or update everything (safe to re-run)
 *   node deploy.mjs backfill [--days 90] [--force]
 *                                       build past days in the cloud; skips days already built
 *   node deploy.mjs run                 run the 15-minute catch-up once now and print what it did
 *   node deploy.mjs status              which days are in the lake
 *
 * Env (from the repo's .env.local, then .env): AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 * DATA_LAKE_S3_BUCKET, DATA_LAKE_ATHENA_DATABASE, DATA_LAKE_ATHENA_OUTPUT_S3_URI, DATA_LAKE_ATHENA_WORKGROUP.
 */
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { AthenaClient, GetQueryExecutionCommand, StartQueryExecutionCommand } from "@aws-sdk/client-athena";
import { GetRoleCommand, CreateRoleCommand, IAMClient, PutRolePolicyCommand, UpdateAssumeRolePolicyCommand } from "@aws-sdk/client-iam";
import {
  CreateFunctionCommand,
  GetAccountSettingsCommand,
  GetFunctionCommand,
  GetFunctionConcurrencyCommand,
  InvokeCommand,
  LambdaClient,
  PutFunctionConcurrencyCommand,
  PutFunctionEventInvokeConfigCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
  waitUntilFunctionActiveV2,
  waitUntilFunctionUpdatedV2,
} from "@aws-sdk/client-lambda";
import { CreateScheduleCommand, SchedulerClient, UpdateScheduleCommand } from "@aws-sdk/client-scheduler";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const NAME = "lychee-gdelt-news";
const LAMBDA_ROLE = `${NAME}-lambda`;
const SCHEDULER_ROLE = `${NAME}-scheduler`;
const SCHEDULE = `${NAME}-every-15-min`;
const TABLE = "gdelt_news_articles";
const PREFIX = "news/gdelt/articles/";
/** GDELT publishes each slot a minute or two after :00, :15, :30 and :45. */
const SCHEDULE_EXPRESSION = "cron(4/15 * * * ? *)";
/** Days built at once, so GDELT's file server sees at most this many times four downloads. */
const BACKFILL_AT_ONCE = 8;
const FIRST_GKG_DAY = "2015-02-18";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!m || process.env[m[1]] !== undefined) continue;
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
}

loadEnv();
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
const bucket = process.env.DATA_LAKE_S3_BUCKET;
const database = (process.env.DATA_LAKE_ATHENA_DATABASE || "").trim();
const output = (process.env.DATA_LAKE_ATHENA_OUTPUT_S3_URI || "").trim();
const workGroup = process.env.DATA_LAKE_ATHENA_WORKGROUP || "primary";

const iam = new IAMClient({ region });
const lambda = new LambdaClient({ region });
const scheduler = new SchedulerClient({ region });
const s3 = new S3Client({ region });
const athena = new AthenaClient({ region });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function need(value, name) {
  if (!value) throw new Error(`${name} is not set in .env`);
  return value;
}

/** Retries while IAM changes propagate, which can take a few seconds after a role is created. */
async function untilPropagated(label, fn) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      const propagating = /assume|role|propagat/i.test(String(err.message)) && attempt < 12;
      if (!propagating) throw err;
      console.log(`  waiting for IAM to catch up (${label})…`);
      await sleep(5_000);
    }
  }
}

/** `sourceAccount` limits who can make the service assume the role, for services that send that key. */
async function ensureRole(name, service, policy, sourceAccount) {
  const statement = { Effect: "Allow", Principal: { Service: service }, Action: "sts:AssumeRole" };
  if (sourceAccount) statement.Condition = { StringEquals: { "aws:SourceAccount": sourceAccount } };
  const trust = JSON.stringify({ Version: "2012-10-17", Statement: [statement] });
  let arn;
  try {
    arn = (await iam.send(new GetRoleCommand({ RoleName: name }))).Role.Arn;
    await iam.send(new UpdateAssumeRolePolicyCommand({ RoleName: name, PolicyDocument: trust }));
    console.log(`  role ${name} exists`);
  } catch (err) {
    if (err.name !== "NoSuchEntityException") throw err;
    arn = (await iam.send(new CreateRoleCommand({ RoleName: name, AssumeRolePolicyDocument: trust, Description: "GDELT news archive" }))).Role.Arn;
    console.log(`  created role ${name}`);
  }
  await iam.send(new PutRolePolicyCommand({ RoleName: name, PolicyName: "gdelt-news", PolicyDocument: JSON.stringify(policy) }));
  return arn;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  if (typeof zlib.crc32 === "function") return zlib.crc32(buf);
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A deflated zip of `{ name, data }` files, enough for a Lambda upload. */
function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name);
    const packed = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, packed);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + packed.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

function bundle() {
  return zip([
    { name: "handler.mjs", data: fs.readFileSync(path.join(HERE, "handler.mjs")) },
    { name: "gkg.mjs", data: fs.readFileSync(path.join(ROOT, "src/lib/gdeltGkg.js")) },
  ]);
}

async function ensureFunction(roleArn) {
  const code = bundle();
  const config = {
    FunctionName: NAME,
    Role: roleArn,
    Runtime: "nodejs22.x",
    Handler: "handler.handler",
    Architectures: ["arm64"],
    MemorySize: 2048,
    Timeout: 900,
    Description: "Copies GDELT's 15-minute GKG news files into the data lake",
    Environment: { Variables: { NEWS_BUCKET: bucket, NEWS_PREFIX: PREFIX } },
  };
  let exists = true;
  try {
    await lambda.send(new GetFunctionCommand({ FunctionName: NAME }));
  } catch (err) {
    if (err.name !== "ResourceNotFoundException") throw err;
    exists = false;
  }
  if (!exists) {
    await untilPropagated("lambda role", () => lambda.send(new CreateFunctionCommand({ ...config, Code: { ZipFile: code } })));
    await waitUntilFunctionActiveV2({ client: lambda, maxWaitTime: 120 }, { FunctionName: NAME });
    console.log(`  created function ${NAME}`);
  } else {
    await lambda.send(new UpdateFunctionCodeCommand({ FunctionName: NAME, ZipFile: code, Architectures: config.Architectures }));
    await waitUntilFunctionUpdatedV2({ client: lambda, maxWaitTime: 120 }, { FunctionName: NAME });
    const { Architectures: _ignored, ...settings } = config;
    await untilPropagated("lambda role", () => lambda.send(new UpdateFunctionConfigurationCommand(settings)));
    await waitUntilFunctionUpdatedV2({ client: lambda, maxWaitTime: 120 }, { FunctionName: NAME });
    console.log(`  updated function ${NAME}`);
  }
  await lambda.send(new PutFunctionEventInvokeConfigCommand({ FunctionName: NAME, MaximumRetryAttempts: 2, MaximumEventAgeInSeconds: 6 * 3600 }));
  try {
    await lambda.send(new PutFunctionConcurrencyCommand({ FunctionName: NAME, ReservedConcurrentExecutions: BACKFILL_AT_ONCE }));
    console.log(`  at most ${BACKFILL_AT_ONCE} copies run at once`);
  } catch (err) {
    console.log(`  couldn't cap concurrency (${err.name}); backfill will pace itself from here instead`);
  }
  return (await lambda.send(new GetFunctionCommand({ FunctionName: NAME }))).Configuration.FunctionArn;
}

async function ensureSchedule(functionArn, roleArn) {
  const params = {
    Name: SCHEDULE,
    ScheduleExpression: SCHEDULE_EXPRESSION,
    FlexibleTimeWindow: { Mode: "OFF" },
    State: "ENABLED",
    Description: "Copy the newest GDELT news files into the data lake",
    Target: { Arn: functionArn, RoleArn: roleArn, Input: "{}", RetryPolicy: { MaximumRetryAttempts: 2, MaximumEventAgeInSeconds: 900 } },
  };
  try {
    await untilPropagated("scheduler role", () => scheduler.send(new CreateScheduleCommand(params)));
    console.log(`  created schedule ${SCHEDULE} (${SCHEDULE_EXPRESSION})`);
  } catch (err) {
    if (err.name !== "ConflictException") throw err;
    await untilPropagated("scheduler role", () => scheduler.send(new UpdateScheduleCommand(params)));
    console.log(`  updated schedule ${SCHEDULE} (${SCHEDULE_EXPRESSION})`);
  }
}

async function athenaDdl(sql) {
  const { QueryExecutionId } = await athena.send(
    new StartQueryExecutionCommand({
      QueryString: sql,
      WorkGroup: workGroup,
      ResultConfiguration: { OutputLocation: output.endsWith("/") ? output : `${output}/` },
      QueryExecutionContext: { Database: database },
    }),
  );
  for (;;) {
    const state = (await athena.send(new GetQueryExecutionCommand({ QueryExecutionId }))).QueryExecution.Status;
    if (state.State === "SUCCEEDED") return;
    if (state.State === "FAILED" || state.State === "CANCELLED") throw new Error(state.StateChangeReason || state.State);
    await sleep(500);
  }
}

async function ensureTable() {
  const location = `s3://${bucket}/${PREFIX}`;
  await athenaDdl(`CREATE EXTERNAL TABLE IF NOT EXISTS ${TABLE} (
  t bigint,
  url string,
  source string,
  title string,
  persons array<string>,
  orgs array<string>,
  tone double,
  image string,
  text string
)
PARTITIONED BY (day string)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
WITH SERDEPROPERTIES ('ignore.malformed.json' = 'true')
LOCATION '${location}'
TBLPROPERTIES (
  'projection.enabled' = 'true',
  'projection.day.type' = 'date',
  'projection.day.format' = 'yyyy-MM-dd',
  'projection.day.range' = '${FIRST_GKG_DAY},NOW',
  'projection.day.interval' = '1',
  'projection.day.interval.unit' = 'DAYS',
  'storage.location.template' = '${location}day=\${day}/'
)`);
  console.log(`  table ${database}.${TABLE} over ${location}`);
}

async function deploy() {
  need(bucket, "DATA_LAKE_S3_BUCKET");
  need(database, "DATA_LAKE_ATHENA_DATABASE");
  need(output, "DATA_LAKE_ATHENA_OUTPUT_S3_URI");
  const account = (await new STSClient({ region }).send(new GetCallerIdentityCommand({}))).Account;
  const functionArn = `arn:aws:lambda:${region}:${account}:function:${NAME}`;
  console.log(`Deploying ${NAME} to ${region}`);
  const lambdaRole = await ensureRole(
    LAMBDA_ROLE,
    "lambda.amazonaws.com",
    {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
          Resource: [`arn:aws:logs:${region}:${account}:log-group:/aws/lambda/${NAME}`, `arn:aws:logs:${region}:${account}:log-group:/aws/lambda/${NAME}:*`],
        },
        { Effect: "Allow", Action: ["s3:PutObject", "s3:DeleteObject"], Resource: `arn:aws:s3:::${bucket}/${PREFIX}*` },
        { Effect: "Allow", Action: "s3:ListBucket", Resource: `arn:aws:s3:::${bucket}`, Condition: { StringLike: { "s3:prefix": `${PREFIX}*` } } },
      ],
    },
    null,
  );
  const schedulerRole = await ensureRole(
    SCHEDULER_ROLE,
    "scheduler.amazonaws.com",
    { Version: "2012-10-17", Statement: [{ Effect: "Allow", Action: "lambda:InvokeFunction", Resource: functionArn }] },
    account,
  );
  await ensureFunction(lambdaRole);
  await ensureSchedule(functionArn, schedulerRole);
  await ensureTable();
  console.log("Done. The schedule picks up each new 15-minute file; run `backfill` for history.");
}

async function lakeDays() {
  const days = new Map();
  let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: need(bucket, "DATA_LAKE_S3_BUCKET"), Prefix: PREFIX, ContinuationToken: token }));
    for (const item of page.Contents || []) {
      const m = /day=(\d{4}-\d{2}-\d{2})\/(.+)$/.exec(item.Key);
      if (!m) continue;
      const entry = days.get(m[1]) || { slots: 0, whole: false, bytes: 0 };
      if (m[2] === "day.json.gz") entry.whole = true;
      else entry.slots += 1;
      entry.bytes += item.Size || 0;
      days.set(m[1], entry);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return days;
}

async function invoke(payload, wait) {
  const res = await lambda.send(
    new InvokeCommand({ FunctionName: NAME, InvocationType: wait ? "RequestResponse" : "Event", Payload: Buffer.from(JSON.stringify(payload)) }),
  );
  if (!wait) return null;
  const body = res.Payload ? JSON.parse(Buffer.from(res.Payload).toString("utf8") || "null") : null;
  if (res.FunctionError) throw new Error(body?.errorMessage || res.FunctionError);
  return body;
}

function isoDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

async function backfill(args) {
  const days = Number(args[args.indexOf("--days") + 1]) || 90;
  const force = args.includes("--force");
  const have = await lakeDays();
  const today = Date.parse(`${isoDay(Date.now())}T00:00:00Z`);
  const todo = [];
  for (let i = 1; i <= days; i += 1) {
    const day = isoDay(today - i * 86_400_000);
    if (force || !have.get(day)?.whole) todo.push(day);
  }
  const slotsToday = Math.floor((Date.now() - today) / (15 * 60_000));
  if (slotsToday > 0) {
    await invoke({ slots: slotsToday, force }, false);
    console.log(`Queued today's ${slotsToday} slots so far.`);
  }
  console.log(`${todo.length} of ${days} days to build${todo.length < days ? ` (${days - todo.length} already in the lake)` : ""}`);
  if (!todo.length) return;

  let capped = false;
  try {
    capped = (await lambda.send(new GetFunctionConcurrencyCommand({ FunctionName: NAME }))).ReservedConcurrentExecutions > 0;
  } catch {
    capped = false;
  }
  if (capped) {
    for (const day of todo) await invoke({ action: "day", day }, false);
    console.log(`Queued ${todo.length} days in the cloud; AWS works through them ${BACKFILL_AT_ONCE} at a time.`);
    console.log("Nothing more runs on this machine. Check progress with `status`.");
    return;
  }
  const limit = (await lambda.send(new GetAccountSettingsCommand({}))).AccountLimit?.UnreservedConcurrentExecutions || 10;
  const atOnce = Math.max(1, Math.min(BACKFILL_AT_ONCE, Math.floor(limit / 2)));
  console.log(`Building ${atOnce} days at a time (the account allows ${limit} Lambda runs at once).`);
  const invokeWhenFree = async (payload) => {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await invoke(payload, true);
      } catch (err) {
        const throttled = err.name === "TooManyRequestsException" || /rate exceeded/i.test(String(err.message));
        if (!throttled || attempt >= 20) throw err;
        await sleep(5_000 + Math.random() * 10_000);
      }
    }
  };
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < todo.length) {
      const day = todo[next];
      next += 1;
      try {
        const r = await invokeWhenFree({ action: "day", day });
        done += 1;
        console.log(`  ${done}/${todo.length} ${day}: ${r.articles.toLocaleString()} articles, ${(r.bytes / 1e6).toFixed(1)} MB${r.missing ? `, ${r.missing} slots missing at GDELT` : ""}`);
      } catch (err) {
        console.log(`  ${day} failed: ${err.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: atOnce }, worker));
}

async function status() {
  const days = await lakeDays();
  const sorted = [...days.keys()].sort();
  if (!sorted.length) return console.log("Nothing in the lake yet.");
  const bytes = [...days.values()].reduce((sum, entry) => sum + entry.bytes, 0);
  console.log(`${sorted.length} days, ${sorted[0]} to ${sorted.at(-1)}, ${(bytes / 1e9).toFixed(2)} GB`);
  const gaps = [];
  for (let t = Date.parse(`${sorted[0]}T00:00:00Z`); t <= Date.parse(`${sorted.at(-1)}T00:00:00Z`); t += 86_400_000) {
    if (!days.has(isoDay(t))) gaps.push(isoDay(t));
  }
  if (gaps.length) console.log(`Missing days: ${gaps.join(", ")}`);
  for (const day of sorted.slice(-3)) {
    const entry = days.get(day);
    console.log(`  ${day}: ${entry.whole ? "whole day" : ""}${entry.whole && entry.slots ? " + " : ""}${entry.slots ? `${entry.slots} slot files` : ""}`);
  }
}

const [command, ...args] = process.argv.slice(2);
const commands = {
  deploy,
  backfill: () => backfill(args),
  run: async () => console.log(JSON.stringify(await invoke({}, true), null, 2)),
  status,
};
if (!commands[command]) {
  console.log("Usage: node deploy.mjs deploy | backfill [--days 90] [--force] | run | status");
  process.exit(1);
}
commands[command]().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
