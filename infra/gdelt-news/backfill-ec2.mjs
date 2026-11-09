/**
 * Backfills the GDELT news archive from a one-off EC2 instance that terminates itself when it's
 * done, when it's stopped, or when it hits its time limit. The instance downloads GDELT's files
 * itself, so it never competes with the 15-minute Lambda.
 *
 *   node backfill-ec2.mjs start [--from 2019-09-23] [--to <3 days ago>] [--type c7g.2xlarge] [--workers 8] [--downloads 4] [--hours 20]
 *
 * Each day takes about 50 seconds of CPU (parsing and compressing), so one worker per core.
 *   node backfill-ec2.mjs status            progress, ETA, heartbeat, flagged and failed days
 *   node backfill-ec2.mjs logs [--lines 40] [--console]
 *   node backfill-ec2.mjs stop [--now]      stop after the days in flight, or terminate right away
 *   node backfill-ec2.mjs try 2020-03-01    build and check one day on this machine first
 *   node backfill-ec2.mjs verify            check every day's file against its record, and spot-check Athena
 *
 * Re-running `start` picks up where the last run left off: a day is skipped once its record exists.
 * The instance can only read and write under news/gdelt/ in the bucket, and can't delete anything.
 */
/* eslint-disable no-console */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { AthenaClient, GetQueryExecutionCommand, GetQueryResultsCommand, StartQueryExecutionCommand } from "@aws-sdk/client-athena";
import {
  DescribeImagesCommand,
  DescribeInstancesCommand,
  DescribeVpcsCommand,
  EC2Client,
  GetConsoleOutputCommand,
  RunInstancesCommand,
  TerminateInstancesCommand,
} from "@aws-sdk/client-ec2";
import {
  AddRoleToInstanceProfileCommand,
  CreateInstanceProfileCommand,
  CreateRoleCommand,
  GetInstanceProfileCommand,
  GetRoleCommand,
  IAMClient,
  PutRolePolicyCommand,
} from "@aws-sdk/client-iam";
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { HERE, ROOT, loadEnv } from "./env.mjs";

const NAME = "lychee-gdelt-news-backfill";
const ARTICLES = "news/gdelt/articles/";
const CONTROL = "news/gdelt/backfill/";
const TABLE = "gdelt_news_articles";
/** GDELT's 15-minute files carry headlines from this day on. */
const FIRST_HEADLINE_DAY = "2019-09-23";
const NODE_VERSION = "v22.12.0";
const DAY_MS = 24 * 60 * 60_000;
/** A heartbeat older than this means the runner has stalled or the instance is gone. */
const STALE_HEARTBEAT_MS = 3 * 60_000;
/** A day taking longer than this is stuck. */
const SLOW_DAY_SECONDS = 15 * 60;

loadEnv();
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
const bucket = (process.env.DATA_LAKE_S3_BUCKET || "").trim();
const ec2 = new EC2Client({ region });
const iam = new IAMClient({ region });
const s3 = new S3Client({ region });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function flag(args, name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
}

function isoDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function need(value, name) {
  if (!value) throw new Error(`${name} is not set in .env`);
  return value;
}

async function readJson(key) {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return JSON.parse(await res.Body.transformToString());
  } catch (err) {
    if (err.name === "NoSuchKey") return null;
    throw err;
  }
}

async function listObjects(prefix) {
  const items = [];
  let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    items.push(...(page.Contents || []));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return items;
}

async function instances(states = ["pending", "running", "stopping", "stopped", "shutting-down"]) {
  const res = await ec2.send(
    new DescribeInstancesCommand({
      Filters: [
        { Name: "tag:Name", Values: [NAME] },
        { Name: "instance-state-name", Values: states },
      ],
    }),
  );
  return (res.Reservations || []).flatMap((r) => r.Instances || []).sort((a, b) => b.LaunchTime - a.LaunchTime);
}

async function ensureRole() {
  const trust = JSON.stringify({
    Version: "2012-10-17",
    Statement: [{ Effect: "Allow", Principal: { Service: "ec2.amazonaws.com" }, Action: "sts:AssumeRole" }],
  });
  try {
    await iam.send(new GetRoleCommand({ RoleName: NAME }));
  } catch (err) {
    if (err.name !== "NoSuchEntityException") throw err;
    await iam.send(new CreateRoleCommand({ RoleName: NAME, AssumeRolePolicyDocument: trust, Description: "One-off GDELT news backfill" }));
    console.log(`  created role ${NAME}`);
  }
  const policy = {
    Version: "2012-10-17",
    Statement: [
      { Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject"], Resource: [`arn:aws:s3:::${bucket}/${ARTICLES}*`, `arn:aws:s3:::${bucket}/${CONTROL}*`] },
      { Effect: "Allow", Action: "s3:ListBucket", Resource: `arn:aws:s3:::${bucket}`, Condition: { StringLike: { "s3:prefix": ["news/gdelt/*"] } } },
    ],
  };
  await iam.send(new PutRolePolicyCommand({ RoleName: NAME, PolicyName: "gdelt-news-backfill", PolicyDocument: JSON.stringify(policy) }));
  try {
    const profile = await iam.send(new GetInstanceProfileCommand({ InstanceProfileName: NAME }));
    if (!profile.InstanceProfile.Roles?.some((role) => role.RoleName === NAME)) {
      await iam.send(new AddRoleToInstanceProfileCommand({ InstanceProfileName: NAME, RoleName: NAME }));
    }
  } catch (err) {
    if (err.name !== "NoSuchEntityException") throw err;
    await iam.send(new CreateInstanceProfileCommand({ InstanceProfileName: NAME }));
    await iam.send(new AddRoleToInstanceProfileCommand({ InstanceProfileName: NAME, RoleName: NAME }));
    console.log(`  created instance profile ${NAME}`);
  }
}

/** runner.mjs, gkg.mjs and the S3 client, as one tarball the instance unpacks. */
function buildBundle() {
  const dir = path.join(HERE, ".build");
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(HERE, "runner.mjs"), path.join(dir, "runner.mjs"));
  fs.copyFileSync(path.join(ROOT, "src/lib/gdeltGkg.js"), path.join(dir, "gkg.mjs"));
  const out = path.join(dir, "bundle.tgz");
  const tar = spawnSync("tar", ["-czf", out, "-C", dir, "runner.mjs", "gkg.mjs", "-C", HERE, "node_modules"], {
    env: { ...process.env, COPYFILE_DISABLE: "1" },
    encoding: "utf8",
  });
  if (tar.status !== 0) throw new Error(`tar failed: ${tar.stderr}`);
  return fs.readFileSync(out);
}

async function latestAmi(arch) {
  const res = await ec2.send(
    new DescribeImagesCommand({
      Owners: ["amazon"],
      Filters: [
        { Name: "name", Values: [`al2023-ami-2023.*-kernel-*-${arch}`] },
        { Name: "state", Values: ["available"] },
        { Name: "architecture", Values: [arch] },
      ],
    }),
  );
  const image = (res.Images || []).sort((a, b) => String(b.CreationDate).localeCompare(String(a.CreationDate)))[0];
  if (!image) throw new Error(`No Amazon Linux 2023 image found for ${arch}`);
  return image;
}

function userData({ from, to, workers, downloads, hours, nodeArch }) {
  const control = `s3://${bucket}/${CONTROL}`;
  return `#!/bin/bash
set -uo pipefail
shutdown -h +${hours * 60} "GDELT news backfill reached its time limit"
LOG=/var/log/news-backfill.log
exec >>"$LOG" 2>&1
finish() {
  echo "Runner exited; shutting down."
  aws s3 cp "$LOG" "${control}log.txt" --only-show-errors || true
  shutdown -h now
}
trap finish EXIT
echo "Starting $(date -u)"
TOKEN=$(curl -sX PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
export INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
export AWS_REGION=${region} NEWS_BUCKET=${bucket} ARTICLES_PREFIX=${ARTICLES} CONTROL_PREFIX=${CONTROL}
export FROM=${from} TO=${to} WORKERS=${workers} DOWNLOADS=${downloads} LOG_FILE="$LOG"
mkdir -p /opt/news && cd /opt/news || exit 1
curl -fsSL https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-${nodeArch}.tar.xz -o node.tar.xz || exit 1
tar -xJf node.tar.xz --strip-components=1 -C /usr/local || exit 1
aws s3 cp "${control}code/bundle.tgz" bundle.tgz --only-show-errors || exit 1
tar -xzf bundle.tgz --warning=no-unknown-keyword || exit 1
echo "Node $(/usr/local/bin/node --version) on $INSTANCE_ID"
/usr/local/bin/node runner.mjs run
`;
}

async function start(args) {
  need(bucket, "DATA_LAKE_S3_BUCKET");
  const from = flag(args, "from", FIRST_HEADLINE_DAY);
  const to = flag(args, "to", isoDay(Date.now() - 3 * DAY_MS));
  const type = flag(args, "type", "c7g.2xlarge");
  const workers = Number(flag(args, "workers", 8));
  const downloads = Number(flag(args, "downloads", 4));
  const hours = Number(flag(args, "hours", 20));
  if (!(from <= to) || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error("--from and --to must be days, from first");
  const graviton = /^[a-z]+\d+g[a-z]*\./.test(type);
  const arch = graviton ? "arm64" : "x86_64";

  const running = await instances();
  if (running.length) throw new Error(`A backfill instance is already up: ${running[0].InstanceId} (${running[0].State.Name}). Check it with \`status\`.`);
  const vpcs = await ec2.send(new DescribeVpcsCommand({ Filters: [{ Name: "isDefault", Values: ["true"] }] }));
  if (!vpcs.Vpcs?.length) throw new Error(`No default VPC in ${region}; the instance needs one to reach GDELT and S3.`);

  console.log(`Backfilling ${from} to ${to} on a ${type} (${workers} workers × ${downloads} downloads, off after at most ${hours}h)`);
  await ensureRole();
  const bundle = buildBundle();
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: `${CONTROL}code/bundle.tgz`, Body: bundle, ContentType: "application/gzip" }));
  console.log(`  uploaded the runner (${(bundle.length / 1e6).toFixed(1)} MB)`);
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: `${CONTROL}stop` }));
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `${CONTROL}status.json`,
      Body: JSON.stringify({ state: "launching", from, to, updatedAt: new Date().toISOString() }),
      ContentType: "application/json",
    }),
  );

  const image = await latestAmi(arch);
  const tags = [
    { Key: "Name", Value: NAME },
    { Key: "Purpose", Value: "GDELT news backfill; terminates itself" },
  ];
  const params = {
    ImageId: image.ImageId,
    InstanceType: type,
    MinCount: 1,
    MaxCount: 1,
    IamInstanceProfile: { Name: NAME },
    InstanceInitiatedShutdownBehavior: "terminate",
    MetadataOptions: { HttpTokens: "required", HttpEndpoint: "enabled" },
    BlockDeviceMappings: [{ DeviceName: image.RootDeviceName, Ebs: { VolumeSize: 16, VolumeType: "gp3", DeleteOnTermination: true } }],
    UserData: Buffer.from(userData({ from, to, workers, downloads, hours, nodeArch: graviton ? "arm64" : "x64" })).toString("base64"),
    TagSpecifications: [
      { ResourceType: "instance", Tags: tags },
      { ResourceType: "volume", Tags: tags },
    ],
  };
  let instance;
  for (let attempt = 1; ; attempt += 1) {
    try {
      instance = (await ec2.send(new RunInstancesCommand(params))).Instances[0];
      break;
    } catch (err) {
      const propagating = /instance profile|iamInstanceProfile/i.test(String(err.message)) && attempt < 12;
      if (!propagating) throw err;
      console.log("  waiting for the new instance profile to reach EC2…");
      await sleep(5_000);
    }
  }
  console.log(`  launched ${instance.InstanceId} from ${image.Name}`);
  console.log("It reports in within a few minutes. Watch it with `node backfill-ec2.mjs status`.");
}

function ago(iso) {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return "never";
  if (ms < 90_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 90 * 60_000) return `${Math.round(ms / 60_000)} min ago`;
  return `${(ms / 3_600_000).toFixed(1)} h ago`;
}

async function status() {
  need(bucket, "DATA_LAKE_S3_BUCKET");
  const [s, recent] = await Promise.all([readJson(`${CONTROL}status.json`), instances(["pending", "running", "stopping", "shutting-down", "terminated", "stopped"])]);
  const instance = recent[0];
  console.log(`Instance: ${instance ? `${instance.InstanceId} ${instance.State.Name}, launched ${ago(instance.LaunchTime.toISOString())}` : "none"}`);
  if (!s) return console.log("No status reported yet.");
  console.log(`Runner:   ${s.state}, last heartbeat ${ago(s.updatedAt)}${s.from ? `, ${s.from} to ${s.to}` : ""}`);
  if (s.error) console.log(`Error:    ${s.error}`);
  if (s.toBuild != null) {
    const pct = s.toBuild ? Math.round((s.built / s.toBuild) * 100) : 100;
    console.log(`Progress: ${s.built} of ${s.toBuild} days built (${pct}%), ${s.alreadyBuilt} done before this run, ${s.left} left`);
    console.log(`Data:     ${Number(s.articles).toLocaleString()} articles, ${s.gigabytes} GB this run`);
    if (s.daysPerHour) console.log(`Speed:    ${s.daysPerHour} days/hour${s.etaAt ? `, done around ${new Date(s.etaAt).toLocaleString()}` : ""}`);
    console.log(`Health:   ${s.retries} retries, ${s.flagged.length} flagged, ${s.failed.length} failed, ${s.freeMemoryMb} MB memory free`);
    for (const job of s.inFlight || []) {
      console.log(`  building ${job.day} (try ${job.attempt}, ${job.seconds}s)${job.seconds > SLOW_DAY_SECONDS ? "  ← slow" : ""}`);
    }
    for (const day of s.flagged.slice(-5)) console.log(`  flagged ${day.day}: ${day.flags.join("; ")}`);
    for (const day of s.failed.slice(-5)) console.log(`  failed  ${day.day}: ${day.error}`);
    if (s.lastError) console.log(`Last error: ${s.lastError}`);
    if (s.stopReason) console.log(`Stopping because: ${s.stopReason}`);
  }
  const live = ["running", "stopping", "launching"].includes(s.state);
  if (live && Date.now() - Date.parse(s.updatedAt) > STALE_HEARTBEAT_MS && instance?.State.Name === "running") {
    console.log("WARNING: the runner hasn't reported in for a while. Check `logs --console`.");
  }
  if (live && (!instance || ["terminated", "shutting-down"].includes(instance.State.Name))) {
    console.log("WARNING: the instance is gone but the runner never reported finishing. Check `logs`, then `start` again to resume.");
  }
}

async function logs(args) {
  need(bucket, "DATA_LAKE_S3_BUCKET");
  if (args.includes("--console")) {
    const [instance] = await instances(["pending", "running", "stopping", "shutting-down", "terminated", "stopped"]);
    if (!instance) return console.log("No backfill instance found.");
    const res = await ec2.send(new GetConsoleOutputCommand({ InstanceId: instance.InstanceId, Latest: true }));
    return console.log(res.Output ? Buffer.from(res.Output, "base64").toString("utf8") : "No console output yet (it can lag a few minutes).");
  }
  const lines = Number(flag(args, "lines", 40));
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: `${CONTROL}log.txt` }));
    console.log((await res.Body.transformToString()).trimEnd().split("\n").slice(-lines).join("\n"));
  } catch (err) {
    if (err.name !== "NoSuchKey") throw err;
    console.log("No log uploaded yet; the runner uploads it every two minutes. Try `logs --console` for boot output.");
  }
}

async function stop(args) {
  need(bucket, "DATA_LAKE_S3_BUCKET");
  if (args.includes("--now")) {
    const live = await instances(["pending", "running", "stopping", "stopped"]);
    if (!live.length) return console.log("No backfill instance is running.");
    await ec2.send(new TerminateInstancesCommand({ InstanceIds: live.map((i) => i.InstanceId) }));
    return console.log(`Terminating ${live.map((i) => i.InstanceId).join(", ")}. Days in flight are rebuilt on the next \`start\`.`);
  }
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: `${CONTROL}stop`, Body: new Date().toISOString() }));
  console.log("Asked the runner to stop; it finishes the days in flight, then the instance turns itself off.");
}

function tryDay(args) {
  const day = args[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) throw new Error("Usage: try YYYY-MM-DD");
  buildBundle();
  const run = spawnSync(process.execPath, ["--no-warnings", path.join(HERE, ".build/runner.mjs"), "day", day], {
    stdio: "inherit",
    env: { ...process.env, AWS_REGION: region, NEWS_BUCKET: need(bucket, "DATA_LAKE_S3_BUCKET"), ARTICLES_PREFIX: ARTICLES, CONTROL_PREFIX: CONTROL, INSTANCE_ID: "local" },
  });
  if (run.status !== 0) process.exit(run.status || 1);
}

async function athenaCounts(days) {
  const athena = new AthenaClient({ region });
  const output = need((process.env.DATA_LAKE_ATHENA_OUTPUT_S3_URI || "").trim(), "DATA_LAKE_ATHENA_OUTPUT_S3_URI");
  const { QueryExecutionId } = await athena.send(
    new StartQueryExecutionCommand({
      QueryString: `SELECT day, count(*) FROM ${TABLE} WHERE day IN (${days.map((d) => `'${d}'`).join(", ")}) GROUP BY day`,
      WorkGroup: process.env.DATA_LAKE_ATHENA_WORKGROUP || "primary",
      ResultConfiguration: { OutputLocation: output.endsWith("/") ? output : `${output}/` },
      QueryExecutionContext: { Database: need((process.env.DATA_LAKE_ATHENA_DATABASE || "").trim(), "DATA_LAKE_ATHENA_DATABASE") },
    }),
  );
  for (;;) {
    const { QueryExecution } = await athena.send(new GetQueryExecutionCommand({ QueryExecutionId }));
    if (QueryExecution.Status.State === "SUCCEEDED") break;
    if (["FAILED", "CANCELLED"].includes(QueryExecution.Status.State)) throw new Error(QueryExecution.Status.StateChangeReason);
    await sleep(1_000);
  }
  const counts = new Map();
  let token;
  do {
    const page = await athena.send(new GetQueryResultsCommand({ QueryExecutionId, NextToken: token }));
    for (const row of page.ResultSet.Rows.slice(token ? 0 : 1)) counts.set(row.Data[0].VarCharValue, Number(row.Data[1].VarCharValue));
    token = page.NextToken;
  } while (token);
  return counts;
}

async function verify(args) {
  need(bucket, "DATA_LAKE_S3_BUCKET");
  const s = await readJson(`${CONTROL}status.json`);
  const from = flag(args, "from", s?.from || FIRST_HEADLINE_DAY);
  const to = flag(args, "to", s?.to || isoDay(Date.now() - 3 * DAY_MS));
  const [records, files] = await Promise.all([listObjects(`${CONTROL}days/`), listObjects(ARTICLES)]);
  const sizes = new Map();
  for (const item of files) {
    const m = /day=(\d{4}-\d{2}-\d{2})\/day\.json\.gz$/.exec(item.Key);
    if (m) sizes.set(m[1], item.Size);
  }
  const recorded = new Set(records.map((item) => /days\/(\d{4}-\d{2}-\d{2})\.json$/.exec(item.Key)?.[1]).filter(Boolean));
  const days = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY_MS) days.push(isoDay(t));
  const manifests = new Map();
  const wanted = days.filter((day) => recorded.has(day));
  for (let i = 0; i < wanted.length; i += 32) {
    const batch = await Promise.all(wanted.slice(i, i + 32).map((day) => readJson(`${CONTROL}days/${day}.json`)));
    for (const m of batch) if (m) manifests.set(m.day, m);
  }

  const notBuilt = days.filter((day) => !manifests.has(day));
  const sizeMismatch = [...manifests.values()].filter((m) => sizes.get(m.day) !== m.bytes).map((m) => m.day);
  const flagged = [...manifests.values()].filter((m) => m.status === "flagged");
  const articles = [...manifests.values()].reduce((sum, m) => sum + m.articles, 0);
  const bytes = [...manifests.values()].reduce((sum, m) => sum + m.bytes, 0);
  console.log(`${from} to ${to}: ${days.length} days, ${manifests.size} built and checked, ${notBuilt.length} not built yet`);
  console.log(`${articles.toLocaleString()} articles, ${(bytes / 1e9).toFixed(1)} GB`);
  if (notBuilt.length) console.log(`Not built: ${notBuilt.slice(0, 10).join(", ")}${notBuilt.length > 10 ? ` and ${notBuilt.length - 10} more` : ""}`);
  console.log(sizeMismatch.length ? `PROBLEM: ${sizeMismatch.length} days whose file doesn't match its record: ${sizeMismatch.slice(0, 10).join(", ")}` : "Every built day's file matches its record.");
  if (flagged.length) {
    console.log(`${flagged.length} flagged days:`);
    for (const m of flagged.slice(0, 20)) console.log(`  ${m.day}: ${m.flags.join("; ")}`);
  }

  const byYear = new Map();
  for (const m of manifests.values()) {
    const year = m.day.slice(0, 4);
    const entry = byYear.get(year) || { days: 0, articles: 0 };
    entry.days += 1;
    entry.articles += m.articles;
    byYear.set(year, entry);
  }
  for (const [year, entry] of [...byYear].sort()) {
    console.log(`  ${year}: ${entry.days} days, ${Math.round(entry.articles / entry.days).toLocaleString()} articles a day on average`);
  }

  const sample = [];
  const seenMonths = new Set();
  for (const m of manifests.values()) {
    const month = m.day.slice(0, 7);
    if (seenMonths.has(month)) continue;
    seenMonths.add(month);
    sample.push(m.day);
  }
  if (!sample.length) return;
  const counts = await athenaCounts(sample);
  const wrong = sample.filter((day) => counts.get(day) !== manifests.get(day).articles);
  console.log(
    wrong.length
      ? `PROBLEM: Athena disagrees on ${wrong.length} of ${sample.length} sampled days: ${wrong.map((d) => `${d} (${counts.get(d) ?? 0} vs ${manifests.get(d).articles})`).join(", ")}`
      : `Athena agrees on all ${sample.length} sampled days (one per month).`,
  );
}

const [command, ...args] = process.argv.slice(2);
const commands = { start: () => start(args), status, logs: () => logs(args), stop: () => stop(args), try: () => tryDay(args), verify: () => verify(args) };
if (!commands[command]) {
  console.log("Usage: node backfill-ec2.mjs start | status | logs [--console] | stop [--now] | try YYYY-MM-DD | verify");
  process.exit(1);
}
Promise.resolve(commands[command]()).catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
