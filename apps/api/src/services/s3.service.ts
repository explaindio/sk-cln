import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { awsConfig } from '../config/aws.config';
import { compressionService } from './compression.service';

export class S3Service {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: awsConfig.region,
      credentials: awsConfig.credentials,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    key: string,
    bucket: 'public' | 'private' = 'public',
    compress: boolean = false
  ) {
    const bucketName = bucket === 'public'
      ? awsConfig.s3.publicBucket
      : awsConfig.s3.privateBucket;

    // Check if the file should be compressed
    let body = file.buffer;
    let contentType = file.mimetype;
    let metadata: Record<string, string> = {
      originalName: file.originalname,
    };
    
    // Compression metadata
    let isCompressed = false;
    let compressedSize: number | undefined;

    if (compress && compressionService.shouldCompress(file.mimetype)) {
      try {
        const compressedBuffer = await compressionService.compressBuffer(file.buffer);
        
        // Only use compression if it actually reduces the file size
        if (compressedBuffer.length < file.buffer.length) {
          body = compressedBuffer;
          contentType = 'application/gzip';
          isCompressed = true;
          compressedSize = compressedBuffer.length;
          
          metadata.compressed = 'true';
          metadata.originalSize = file.size.toString();
          metadata.compressedSize = compressedBuffer.length.toString();
        }
      } catch (error) {
        // If compression fails, continue with original file
        console.warn('Compression failed, uploading original file:', error);
      }
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
    });

    await this.s3Client.send(command);

    // Generate CDN URL if CloudFront is configured
    let cdnUrl: string | undefined;
    if (awsConfig.cloudfront.domain) {
      cdnUrl = `https://${awsConfig.cloudfront.domain}/${key}`;
    }

    return {
      key,
      bucket: bucketName,
      url: `https://${bucketName}.s3.${awsConfig.region}.amazonaws.com/${key}`,
      cdnUrl,
      isCompressed,
      compressedSize,
    };
  }

  /**
   * Generate a CDN URL for a file
   */
  generateCdnUrl(key: string): string | undefined {
    if (awsConfig.cloudfront.domain) {
      return `https://${awsConfig.cloudfront.domain}/${key}`;
    }
    return undefined;
  }

  /**
   * Get file URL (CDN URL if available, otherwise S3 URL)
   */
  getFileUrl(key: string, bucket: 'public' | 'private' = 'public'): string {
    // Try to generate CDN URL first
    const cdnUrl = this.generateCdnUrl(key);
    if (cdnUrl) {
      return cdnUrl;
    }

    // Fallback to S3 URL
    const bucketName = bucket === 'public'
      ? awsConfig.s3.publicBucket
      : awsConfig.s3.privateBucket;
      
    return `https://${bucketName}.s3.${awsConfig.region}.amazonaws.com/${key}`;
  }

  async deleteFile(key: string, bucket: 'public' | 'private' = 'public') {
    const bucketName = bucket === 'public'
      ? awsConfig.s3.publicBucket
      : awsConfig.s3.privateBucket;

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    bucket: 'public' | 'private' = 'public',
    expiresIn: number = 3600
  ) {
    const bucketName = bucket === 'public'
      ? awsConfig.s3.publicBucket
      : awsConfig.s3.privateBucket;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    return {
      uploadUrl: url,
      key,
      bucket: bucketName,
    };
  }

  async getPresignedDownloadUrl(
    key: string,
    bucket: 'public' | 'private' = 'private',
    expiresIn: number = 3600
  ) {
    const bucketName = bucket === 'public'
      ? awsConfig.s3.publicBucket
      : awsConfig.s3.privateBucket;

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async fileExists(key: string, bucket: 'public' | 'private' = 'public') {
    const bucketName = bucket === 'public'
      ? awsConfig.s3.publicBucket
      : awsConfig.s3.privateBucket;

    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  // Multipart upload methods for large files
  async initiateMultipartUpload(
    key: string,
    contentType: string,
    bucket: 'public' | 'private' = 'private'
  ) {
    const bucketName = bucket === 'public'
      ? awsConfig.s3.publicBucket
      : awsConfig.s3.privateBucket;

    const command = new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      Metadata: {
        originalName: key.split('/').pop() || 'unknown',
      },
    });

    const response = await this.s3Client.send(command);

    return {
      uploadId: response.UploadId!,
      key,
      bucket: bucketName,
    };
  }

  async getPresignedPartUrl(
    key: string,
    uploadId: string,
    partNumber: number,
    bucket: 'public' | 'private' = 'private',
    expiresIn: number = 3600
  ) {
    const bucketName = bucket === 'public'
      ? awsConfig.s3.publicBucket
      : awsConfig.s3.privateBucket;

    const command = new UploadPartCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    return {
      uploadUrl: url,
      partNumber,
    };
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: Array<{ ETag: string; PartNumber: number }>,
    bucket: 'public' | 'private' = 'private'
  ) {
    const bucketName = bucket === 'public'
      ? awsConfig.s3.publicBucket
      : awsConfig.s3.privateBucket;

    const command = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
      },
    });

    const response = await this.s3Client.send(command);

    return {
      key,
      bucket: bucketName,
      url: response.Location || `https://${bucketName}.s3.${awsConfig.region}.amazonaws.com/${key}`,
      etag: response.ETag,
    };
  }

  async abortMultipartUpload(
    key: string,
    uploadId: string,
    bucket: 'public' | 'private' = 'private'
  ) {
    const bucketName = bucket === 'public'
      ? awsConfig.s3.publicBucket
      : awsConfig.s3.privateBucket;

    const command = new AbortMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
    });

    await this.s3Client.send(command);
  }
}

export const s3Service = new S3Service();