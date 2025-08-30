import { compressionService } from '../services/compression.service';

describe('CompressionService', () => {
  describe('compressBuffer', () => {
    it('should compress a buffer using gzip', async () => {
      const inputBuffer = Buffer.from('Hello, World! This is a test string for compression.');
      const compressedBuffer = await compressionService.compressBuffer(inputBuffer);
      
      expect(compressedBuffer).toBeInstanceOf(Buffer);
      expect(compressedBuffer.length).toBeLessThan(inputBuffer.length);
    });
    
    it('should throw an error when compression fails', async () => {
      // Create a mock stream that emits an error
      const originalReadableFrom = require('stream').Readable.from;
      require('stream').Readable.from = jest.fn(() => {
        const stream = new require('stream').Readable();
        stream._read = () => {};
        process.nextTick(() => stream.emit('error', new Error('Stream error')));
        return stream;
      });
      
      const inputBuffer = Buffer.from('test');
      
      await expect(compressionService.compressBuffer(inputBuffer))
        .rejects
        .toThrow('Failed to compress buffer: Error: Stream error');
      
      // Restore the original function
      require('stream').Readable.from = originalReadableFrom;
    });
  });
  
 describe('decompressBuffer', () => {
    it('should decompress a gzipped buffer', async () => {
      const originalBuffer = Buffer.from('Hello, World! This is a test string for compression.');
      const compressedBuffer = await compressionService.compressBuffer(originalBuffer);
      const decompressedBuffer = await compressionService.decompressBuffer(compressedBuffer);
      
      expect(decompressedBuffer).toBeInstanceOf(Buffer);
      expect(decompressedBuffer.toString()).toBe(originalBuffer.toString());
    });
    
    it('should throw an error when decompression fails', async () => {
      // Create a mock stream that emits an error
      const originalReadableFrom = require('stream').Readable.from;
      require('stream').Readable.from = jest.fn(() => {
        const stream = new require('stream').Readable();
        stream._read = () => {};
        process.nextTick(() => stream.emit('error', new Error('Stream error')));
        return stream;
      });
      
      const inputBuffer = Buffer.from('invalid gzip data');
      
      await expect(compressionService.decompressBuffer(inputBuffer))
        .rejects
        .toThrow('Failed to decompress buffer: Error: Stream error');
      
      // Restore the original function
      require('stream').Readable.from = originalReadableFrom;
    });
  });
  
  describe('shouldCompress', () => {
    it('should return true for compressible MIME types', () => {
      const compressibleTypes = [
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'application/javascript',
        'application/json',
        'application/xml',
        'application/xhtml+xml',
        'application/rss+xml',
        'application/atom+xml',
        'application/vnd.ms-fontobject',
        'application/x-font-ttf',
        'application/x-font-opentype',
        'application/x-font-truetype',
        'application/x-javascript',
        'application/x-shockwave-flash',
        'application/x-tar',
        'application/x-www-form-urlencoded',
        'application/x-zip-compressed',
        'application/zip',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ];
      
      compressibleTypes.forEach(mimeType => {
        expect(compressionService.shouldCompress(mimeType)).toBe(true);
      });
    });
    
    it('should return false for non-compressible MIME types', () => {
      const nonCompressibleTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/ogg',
        'audio/mpeg',
        'audio/wav',
        'application/octet-stream',
        'application/x-binary'
      ];
      
      nonCompressibleTypes.forEach(mimeType => {
        expect(compressionService.shouldCompress(mimeType)).toBe(false);
      });
    });
  });
  
  describe('getCompressionRatio', () => {
    it('should calculate the correct compression ratio', () => {
      const originalSize = 1000;
      const compressedSize = 500;
      const ratio = compressionService.getCompressionRatio(originalSize, compressedSize);
      
      expect(ratio).toBe(50);
    });
    
    it('should return 0 when original size is 0', () => {
      const originalSize = 0;
      const compressedSize = 500;
      const ratio = compressionService.getCompressionRatio(originalSize, compressedSize);
      
      expect(ratio).toBe(0);
    });
    
    it('should handle cases where compressed size is larger than original', () => {
      const originalSize = 500;
      const compressedSize = 600;
      const ratio = compressionService.getCompressionRatio(originalSize, compressedSize);
      
      expect(ratio).toBe(-20);
    });
  });
});