import { minioService } from '../lib/minio';
import * as Minio from 'minio';
import { minioConfig } from '../config/minio.config';

// Mock the Minio client
jest.mock('minio');

// Mock the minio config
jest.mock('../config/minio.config');

describe('MinioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a Minio client with correct configuration', () => {
      const mockConfig = {
        endPoint: 'localhost',
        port: 9000,
        useSSL: false,
        accessKey: 'access-key',
        secretKey: 'secret-key'
      };
      
      (minioConfig as any) = mockConfig;
      
      // Mock the Minio Client constructor
      const mockClient = { putObject: jest.fn() };
      (Minio.Client as jest.Mock).mockImplementation(() => mockClient);
      
      const service = new (minioService.constructor as any)();
      
      expect(Minio.Client).toHaveBeenCalledWith({
        endPoint: 'localhost',
        port: 9000,
        useSSL: false,
        accessKey: 'access-key',
        secretKey: 'secret-key'
      });
    });
  });

  describe('uploadFile', () => {
    it('should upload a file to Minio', async () => {
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.txt';
      const bucket = 'test-bucket';
      const mimeType = 'text/plain';
      
      // Mock the Minio client methods
      const mockPutObject = jest.fn().mockResolvedValue('etag-123');
      const mockClient = { putObject: mockPutObject };
      
      // Set the mock client on the service
      (minioService as any).minioClient = mockClient;
      
      const result = await minioService.uploadFile(fileBuffer, fileName, bucket, mimeType);
      
      expect(mockPutObject).toHaveBeenCalledWith(
        bucket,
        fileName,
        fileBuffer,
        fileBuffer.length,
        { 'Content-Type': 'text/plain' }
      );
      
      expect(result).toEqual({
        key: fileName,
        bucket,
        url: 'http://undefined:undefined/test-bucket/test.txt',
        etag: 'etag-123'
      });
    });
    
    it('should use default content type when not provided', async () => {
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.txt';
      const bucket = 'test-bucket';
      
      // Mock the Minio client methods
      const mockPutObject = jest.fn().mockResolvedValue('etag-123');
      const mockClient = { putObject: mockPutObject };
      
      // Set the mock client on the service
      (minioService as any).minioClient = mockClient;
      
      const result = await minioService.uploadFile(fileBuffer, fileName, bucket);
      
      expect(mockPutObject).toHaveBeenCalledWith(
        bucket,
        fileName,
        fileBuffer,
        fileBuffer.length,
        { 'Content-Type': 'application/octet-stream' }
      );
      
      expect(result).toEqual({
        key: fileName,
        bucket,
        url: 'http://undefined:undefined/test-bucket/test.txt',
        etag: 'etag-123'
      });
    });
    
    it('should throw an error when upload fails', async () => {
      const fileBuffer = Buffer.from('test content');
      const fileName = 'test.txt';
      const bucket = 'test-bucket';
      
      // Mock the Minio client methods to throw an error
      const mockPutObject = jest.fn().mockRejectedValue(new Error('Upload failed'));
      const mockClient = { putObject: mockPutObject };
      
      // Set the mock client on the service
      (minioService as any).minioClient = mockClient;
      
      await expect(minioService.uploadFile(fileBuffer, fileName, bucket))
        .rejects
        .toThrow('Failed to upload file to Minio: Error: Upload failed');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file from Minio', async () => {
      const bucket = 'test-bucket';
      const fileName = 'test.txt';
      
      // Mock the Minio client methods
      const mockRemoveObject = jest.fn().mockResolvedValue(undefined);
      const mockClient = { removeObject: mockRemoveObject };
      
      // Set the mock client on the service
      (minioService as any).minioClient = mockClient;
      
      await minioService.deleteFile(bucket, fileName);
      
      expect(mockRemoveObject).toHaveBeenCalledWith(bucket, fileName);
    });
    
    it('should throw an error when delete fails', async () => {
      const bucket = 'test-bucket';
      const fileName = 'test.txt';
      
      // Mock the Minio client methods to throw an error
      const mockRemoveObject = jest.fn().mockRejectedValue(new Error('Delete failed'));
      const mockClient = { removeObject: mockRemoveObject };
      
      // Set the mock client on the service
      (minioService as any).minioClient = mockClient;
      
      await expect(minioService.deleteFile(bucket, fileName))
        .rejects
        .toThrow('Failed to delete file from Minio: Error: Delete failed');
    });
  });

  describe('getFileStream', () => {
    it('should get a file stream from Minio', async () => {
      const bucket = 'test-bucket';
      const fileName = 'test.txt';
      const mockStream = {};
      
      // Mock the Minio client methods
      const mockGetObject = jest.fn().mockResolvedValue(mockStream);
      const mockClient = { getObject: mockGetObject };
      
      // Set the mock client on the service
      (minioService as any).minioClient = mockClient;
      
      const result = await minioService.getFileStream(bucket, fileName);
      
      expect(mockGetObject).toHaveBeenCalledWith(bucket, fileName);
      expect(result).toBe(mockStream);
    });
    
    it('should throw an error when getting file stream fails', async () => {
      const bucket = 'test-bucket';
      const fileName = 'test.txt';
      
      // Mock the Minio client methods to throw an error
      const mockGetObject = jest.fn().mockRejectedValue(new Error('Get object failed'));
      const mockClient = { getObject: mockGetObject };
      
      // Set the mock client on the service
      (minioService as any).minioClient = mockClient;
      
      await expect(minioService.getFileStream(bucket, fileName))
        .rejects
        .toThrow('Failed to get file stream from Minio: Error: Get object failed');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists in Minio', async () => {
      const bucket = 'test-bucket';
      const fileName = 'test.txt';
      
      // Mock the Minio client methods
      const mockStatObject = jest.fn().mockResolvedValue({});
      const mockClient = { statObject: mockStatObject };
      
      // Set the mock client on the service
      (minioService as any).minioClient = mockClient;
      
      const result = await minioService.fileExists(bucket, fileName);
      
      expect(mockStatObject).toHaveBeenCalledWith(bucket, fileName);
      expect(result).toBe(true);
    });
    
    it('should return false when file does not exist in Minio', async () => {
      const bucket = 'test-bucket';
      const fileName = 'test.txt';
      
      // Mock the Minio client methods to throw an error
      const mockStatObject = jest.fn().mockRejectedValue(new Error('File not found'));
      const mockClient = { statObject: mockStatObject };
      
      // Set the mock client on the service
      (minioService as any).minioClient = mockClient;
      
      const result = await minioService.fileExists(bucket, fileName);
      
      expect(mockStatObject).toHaveBeenCalledWith(bucket, fileName);
      expect(result).toBe(false);
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate a presigned URL for a file', async () => {
      const bucket = 'test-bucket';
      const fileName = 'test.txt';
      const expiry = 3600;
      const mockUrl = 'https://minio.example.com/test-bucket/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=minio&X-Amz-Date=20230101T00000Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=signature';
      
      // Mock the Minio client methods
      const mockPresignedGetObject = jest.fn().mockResolvedValue(mockUrl);
      const mockClient = { presignedGetObject: mockPresignedGetObject };
      
      // Set the mock client on the service
      (minioService as any).minioClient = mockClient;
      
      const result = await minioService.getPresignedUrl(bucket, fileName, expiry);
      
      expect(mockPresignedGetObject).toHaveBeenCalledWith(bucket, fileName, expiry);
      expect(result).toBe(mockUrl);
    });
    
    it('should throw an error when generating presigned URL fails', async () => {
      const bucket = 'test-bucket';
      const fileName = 'test.txt';
      
      // Mock the Minio client methods to throw an error
      const mockPresignedGetObject = jest.fn().mockRejectedValue(new Error('Presigned URL failed'));
      const mockClient = { presignedGetObject: mockPresignedGetObject };
      
      // Set the mock client on the service
      (minioService as any).minioClient = mockClient;
      
      await expect(minioService.getPresignedUrl(bucket, fileName))
        .rejects
        .toThrow('Failed to generate presigned URL: Error: Presigned URL failed');
    });
  });
});