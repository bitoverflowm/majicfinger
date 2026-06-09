import { GetObjectCommand, getS3Client } from "@/lib/awsClients";

export async function getObject(key) {
  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    }),
  );
  return response;
}
