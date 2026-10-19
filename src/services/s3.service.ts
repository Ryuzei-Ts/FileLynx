import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export const s3Service = {
  async listBucket(credentials: {
    region: string;
    endpoint?: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  }) {
    const client = new S3Client({
      region: credentials.region,
      endpoint: credentials.endpoint || undefined,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });

    const command = new ListObjectsV2Command({ Bucket: credentials.bucket });
    const response = await client.send(command);
    return response.Contents || [];
  },
};
