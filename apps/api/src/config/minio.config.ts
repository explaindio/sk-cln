export const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
  buckets: {
    public: process.env.MINIO_PUBLIC_BUCKET || 'public',
    private: process.env.MINIO_PRIVATE_BUCKET || 'private',
  },
};