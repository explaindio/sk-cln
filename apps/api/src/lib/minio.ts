import * as Minio from 'minio';
import { Readable } from 'stream';
import { minioConfig } from '../config/minio.config';

export class MinioService {
  private minioClient: Minio.Client;

  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: minioConfig.endPoint,
      port: minioConfig.port,
      useSSL: minioConfig.useSSL,
      accessKey: minioConfig.accessKey,
      secretKey: minioConfig.secretKey,
    });
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    bucket: string,
    mimeType?: string
  ) {
    try {
      const metaData = {
        'Content-Type': mimeType || 'application/octet-stream',
      };

      const etag = await this.minioClient.putObject(
        bucket,
        fileName,
        fileBuffer,
        fileBuffer.length,
        metaData
      );

      return {
        key: fileName,
        bucket,
        url: `${minioConfig.useSSL ? 'https' : 'http'}://${minioConfig.endPoint}:${minioConfig.port}/${bucket}/${fileName}`,
        etag,
      };
    } catch (error) {
      throw new Error(`Failed to upload file to Minio: ${error}`);
    }
  }

  async deleteFile(bucket: string, fileName: string) {
    try {
      await this.minioClient.removeObject(bucket, fileName);
    } catch (error) {
      throw new Error(`Failed to delete file from Minio: ${error}`);
    }
  }

  async getFileStream(bucket: string, fileName: string): Promise<Readable> {
    try {
      return await this.minioClient.getObject(bucket, fileName);
    } catch (error) {
      throw new Error(`Failed to get file stream from Minio: ${error}`);
    }
  }

  async fileExists(bucket: string, fileName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(bucket, fileName);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getPresignedUrl(
    bucket: string,
    fileName: string,
    expiry: number = 3600
  ) {
    try {
      const url = await this.minioClient.presignedGetObject(
        bucket,
        fileName,
        expiry
      );
      return url;
    } catch (error) {
      throw new Error(`Failed to generate presigned URL: ${error}`);
    }
  }

  async createBucketIfNotExists(bucket: string) {
    try {
      const exists = await this.minioClient.bucketExists(bucket);
      if (!exists) {
        await this.minioClient.makeBucket(bucket, 'us-east-1');
      }
    } catch (error) {
      throw new Error(`Failed to create bucket: ${error}`);
    }
  }
}

export const minioService = new MinioService();