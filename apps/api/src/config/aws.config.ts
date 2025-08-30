export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  s3: {
    publicBucket: process.env.AWS_S3_BUCKET_PUBLIC!,
    privateBucket: process.env.AWS_S3_BUCKET_PRIVATE!,
  },
  cloudfront: {
    domain: process.env.AWS_CLOUDFRONT_DOMAIN!,
    keyPairId: process.env.AWS_CLOUDFRONT_KEY_PAIR_ID!,
  },
};