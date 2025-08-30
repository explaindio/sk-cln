import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable, Writable } from 'stream';

export class CompressionService {
  /**
   * Compress a buffer using gzip
   */
  async compressBuffer(buffer: Buffer): Promise<Buffer> {
    try {
      const gzip = createGzip();
      const compressedBuffer = await pipeline(
        Readable.from(buffer),
        gzip,
        async (stream) => {
          const chunks: Buffer[] = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          return Buffer.concat(chunks);
        }
      );
      return compressedBuffer;
    } catch (error) {
      throw new Error(`Failed to compress buffer: ${error}`);
    }
  }

  /**
   * Decompress a buffer using gunzip
   */
  async decompressBuffer(buffer: Buffer): Promise<Buffer> {
    try {
      const gunzip = createGunzip();
      const decompressedBuffer = await pipeline(
        Readable.from(buffer),
        gunzip,
        async (stream) => {
          const chunks: Buffer[] = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          return Buffer.concat(chunks);
        }
      );
      return decompressedBuffer;
    } catch (error) {
      throw new Error(`Failed to decompress buffer: ${error}`);
    }
  }

  /**
   * Check if a file should be compressed based on its MIME type
   */
  shouldCompress(mimeType: string): boolean {
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

    return compressibleTypes.includes(mimeType);
  }

  /**
   * Get compression ratio
   */
  getCompressionRatio(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) return 0;
    return ((originalSize - compressedSize) / originalSize) * 100;
  }
}

export const compressionService = new CompressionService();