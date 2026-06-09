import {
  AthenaClient,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  StartQueryExecutionCommand,
  StopQueryExecutionCommand,
} from "@aws-sdk/client-athena";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function getAwsRegion() {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
}

function getCredentials() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return undefined;
  return { accessKeyId, secretAccessKey };
}

let s3Client;
export function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: getAwsRegion(),
      credentials: getCredentials(),
    });
  }
  return s3Client;
}

let athenaClient;
export function getAthenaClient() {
  if (!athenaClient) {
    athenaClient = new AthenaClient({
      region: getAwsRegion(),
      credentials: getCredentials(),
    });
  }
  return athenaClient;
}

export {
  AthenaClient,
  DeleteObjectCommand,
  GetObjectCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  PutObjectCommand,
  S3Client,
  StartQueryExecutionCommand,
  StopQueryExecutionCommand,
  getSignedUrl,
};
