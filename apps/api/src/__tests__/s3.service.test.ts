import { s3Service } from '../services/s3.service';
import { compressionService } from '../services/compression.service';
import { awsConfig } from '../config/aws.config';

// Mock the AWS SDK clients
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

// Mock the compression service
jest.mock('../services/compression.service');

// Mock the AWS config
jest.mock('../config/aws.config');

describe('S3Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload a file to S3 without compression', async () => {
      const mockFile = {
        buffer: Buffer.from('test content'),
        originalname: 'test.txt',
        mimetype: 'text/plain'
      } as Express.Multer.File;
      
      const key = 'test/test.txt';
      const bucket = 'public';
      
      const mockConfig = {
        region: 'us-east-1',
        s3: {
          publicBucket: 'public-bucket',
          privateBucket: 'private-bucket'
        },
        cloudfront: {
          domain: 'cdn.example.com'
        }
      };
      
      (awsConfig as any) = mockConfig;
      
      // Mock the S3 client send method
      const mockSend = jest.fn().mockResolvedValue({});
      (s3Service as any).s3Client.send = mockSend;
      
      // Mock compression service to return false for shouldCompress
      (compressionService.shouldCompress as jest.Mock).mockReturnValue(false);
      
      const result = await s3Service.uploadFile(mockFile, key, bucket);
      
      expect(compressionService.shouldCompress).toHaveBeenCalledWith('text/plain');
      expect(mockSend).toHaveBeenCalled();
      expect(result).toEqual({
        key,
        bucket: 'public-bucket',
        url: 'https://public-bucket.s3.us-east-1.amazonaws.com/test/test.txt',
        cdnUrl: 'https://cdn.example.com/test/test.txt',
        isCompressed: false,
        compressedSize: undefined
      });
    });
    
    it('should upload a file to S3 with compression when beneficial', async () => {
      const mockFile = {
        buffer: Buffer.from('large test content that will be compressed'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 38
      } as Express.Multer.File;
      
      const key = 'test/test.txt';
      const bucket = 'private';
      
      const mockConfig = {
        region: 'us-east-1',
        s3: {
          publicBucket: 'public-bucket',
          privateBucket: 'private-bucket'
        },
        cloudfront: {
          domain: 'cdn.example.com'
        }
      };
      
      (awsConfig as any) = mockConfig;
      
      // Mock the S3 client send method
      const mockSend = jest.fn().mockResolvedValue({});
      (s3Service as any).s3Client.send = mockSend;
      
      // Mock compression service
      (compressionService.shouldCompress as jest.Mock).mockReturnValue(true);
      (compressionService.compressBuffer as jest.Mock).mockResolvedValue(
        Buffer.from('compressed')
      );
      
      const result = await s3Service.uploadFile(mockFile, key, bucket, true);
      
      expect(compressionService.shouldCompress).toHaveBeenCalledWith('text/plain');
      expect(compressionService.compressBuffer).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockSend).toHaveBeenCalled();
      expect(result).toEqual({
        key,
        bucket: 'private-bucket',
        url: 'https://private-bucket.s3.us-east-1.amazonaws.com/test/test.txt',
        cdnUrl: 'https://cdn.example.com/test/test.txt',
        isCompressed: true,
        compressedSize: 10
      });
    });
    
    it('should upload original file when compression is not beneficial', async () => {
      const mockFile = {
        buffer: Buffer.from('small'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 5
      } as Express.Multer.File;
      
      const key = 'test/test.txt';
      const bucket = 'public';
      
      const mockConfig = {
        region: 'us-east-1',
        s3: {
          publicBucket: 'public-bucket',
          privateBucket: 'private-bucket'
        },
        cloudfront: {
          domain: 'cdn.example.com'
        }
      };
      
      (awsConfig as any) = mockConfig;
      
      // Mock the S3 client send method
      const mockSend = jest.fn().mockResolvedValue({});
      (s3Service as any).s3Client.send = mockSend;
      
      // Mock compression service to return a larger buffer (not beneficial)
      (compressionService.shouldCompress as jest.Mock).mockReturnValue(true);
      (compressionService.compressBuffer as jest.Mock).mockResolvedValue(
        Buffer.from('larger compressed content')
      );
      
      const result = await s3Service.uploadFile(mockFile, key, bucket, true);
      
      expect(compressionService.shouldCompress).toHaveBeenCalledWith('text/plain');
      expect(compressionService.compressBuffer).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockSend).toHaveBeenCalled();
      // Should use original file since compressed version is larger
      expect(result).toEqual({
        key,
        bucket: 'public-bucket',
        url: 'https://public-bucket.s3.us-east-1.amazonaws.com/test/test.txt',
        cdnUrl: 'https://cdn.example.com/test/test.txt',
        isCompressed: false,
        compressedSize: undefined
      });
    });
    
    it('should continue with original file when compression fails', async () => {
      const mockFile = {
        buffer: Buffer.from('test content'),
        originalname: 'test.txt',
        mimetype: 'text/plain'
      } as Express.Multer.File;
      
      const key = 'test/test.txt';
      const bucket = 'public';
      
      const mockConfig = {
        region: 'us-east-1',
        s3: {
          publicBucket: 'public-bucket',
          privateBucket: 'private-bucket'
        },
        cloudfront: {
          domain: 'cdn.example.com'
        }
      };
      
      (awsConfig as any) = mockConfig;
      
      // Mock the S3 client send method
      const mockSend = jest.fn().mockResolvedValue({});
      (s3Service as any).s3Client.send = mockSend;
      
      // Mock compression service to throw an error
      (compressionService.shouldCompress as jest.Mock).mockReturnValue(true);
      (compressionService.compressBuffer as jest.Mock).mockRejectedValue(
        new Error('Compression failed')
      );
      
      const result = await s3Service.uploadFile(mockFile, key, bucket, true);
      
      expect(compressionService.shouldCompress).toHaveBeenCalledWith('text/plain');
      expect(compressionService.compressBuffer).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockSend).toHaveBeenCalled();
      // Should use original file since compression failed
      expect(result).toEqual({
        key,
        bucket: 'public-bucket',
        url: 'https://public-bucket.s3.us-east-1.amazonaws.com/test/test.txt',
        cdnUrl: 'https://cdn.example.com/test/test.txt',
        isCompressed: false,
        compressedSize: undefined
      });
    });
  });
  
  describe('deleteFile', () => {
    it('should delete a file from S3', async () => {
      const key = 'test/test.txt';
      const bucket = 'public';
      
      const mockConfig = {
        region: 'us-east-1',
        s3: {
          publicBucket: 'public-bucket',
          privateBucket: 'private-bucket'
        }
      };
      
      (awsConfig as any) = mockConfig;
      
      // Mock the S3 client send method
      const mockSend = jest.fn().mockResolvedValue({});
      (s3Service as any).s3Client.send = mockSend;
      
      await s3Service.deleteFile(key, bucket);
      
      expect(mockSend).toHaveBeenCalled();
    });
  });
  
  describe('getPresignedUploadUrl', () => {
    it('should generate a presigned upload URL', async () => {
      const key = 'test/test.txt';
      const contentType = 'text/plain';
      const bucket = 'public';
      const expiresIn = 3600;
      
      const mockConfig = {
        region: 'us-east-1',
        s3: {
          publicBucket: 'public-bucket',
          privateBucket: 'private-bucket'
        }
      };
      
      (awsConfig as any) = mockConfig;
      
      // Mock the getSignedUrl function
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      (getSignedUrl as jest.Mock).mockResolvedValue('https://presigned-url.com');
      
      const result = await s3Service.getPresignedUploadUrl(key, contentType, bucket, expiresIn);
      
      expect(getSignedUrl).toHaveBeenCalled();
      expect(result).toEqual({
        uploadUrl: 'https://presigned-url.com',
        key,
        bucket: 'public-bucket'
      });
    });
  });
  
  describe('getFileUrl', () => {
    it('should return CDN URL when CloudFront is configured', () => {
      const key = 'test/test.txt';
      const bucket = 'public';
      
      const mockConfig = {
        region: 'us-east-1',
        s3: {
          publicBucket: 'public-bucket',
          privateBucket: 'private-bucket'
        },
        cloudfront: {
          domain: 'cdn.example.com'
        }
      };
      
      (awsConfig as any) = mockConfig;
      
      const result = s3Service.getFileUrl(key, bucket);
      
      expect(result).toBe('https://cdn.example.com/test/test.txt');
    });
    
    it('should return S3 URL when CloudFront is not configured', () => {
      const key = 'test/test.txt';
      const bucket = 'public';
      
      const mockConfig = {
        region: 'us-east-1',
        s3: {
          publicBucket: 'public-bucket',
          privateBucket: 'private-bucket'
        },
        cloudfront: {
          domain: ''
        }
      };
      
      (awsConfig as any) = mockConfig;
      
      const result = s3Service.getFileUrl(key, bucket);
      
      expect(result).toBe('https://public-bucket.s3.us-east-1.amazonaws.com/test/test.txt');
    });
  });
});