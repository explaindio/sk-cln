import sharp from 'sharp';
import { s3Service } from './s3.service';

interface ImageVariant {
  width: number;
  height?: number;
  quality?: number;
  suffix: string;
}

const IMAGE_VARIANTS: ImageVariant[] = [
  { width: 150, height: 150, quality: 80, suffix: 'thumb' },
  { width: 400, quality: 85, suffix: 'small' },
  { width: 800, quality: 85, suffix: 'medium' },
  { width: 1200, quality: 90, suffix: 'large' },
];

export class ImageService {
  async processAndUploadImage(
    file: Express.Multer.File,
    basePath: string,
    generateVariants: boolean = true
  ) {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const results = [];

    // Upload original
    const originalKey = `${basePath}/${fileName}-original.${fileExtension}`;
    const originalUpload = await s3Service.uploadFile(file, originalKey);
    results.push({
      type: 'original',
      ...originalUpload,
    });

    if (generateVariants && file.mimetype.startsWith('image/')) {
      // Generate and upload variants
      for (const variant of IMAGE_VARIANTS) {
        const processedImage = await this.processImage(
          file.buffer,
          variant
        );

        const variantKey = `${basePath}/${fileName}-${variant.suffix}.webp`;
        const variantUpload = await s3Service.uploadFile(
          {
            ...file,
            buffer: processedImage,
            mimetype: 'image/webp',
          } as Express.Multer.File,
          variantKey
        );

        results.push({
          type: variant.suffix,
          ...variantUpload,
        });
      }
    }

    return results;
  }

  private async processImage(
    buffer: Buffer,
    variant: ImageVariant
  ): Promise<Buffer> {
    let sharpInstance = sharp(buffer);

    // Resize
    if (variant.height) {
      sharpInstance = sharpInstance.resize(variant.width, variant.height, {
        fit: 'cover',
        position: 'center',
      });
    } else {
      sharpInstance = sharpInstance.resize(variant.width, null, {
        withoutEnlargement: true,
      });
    }

    // Convert to WebP and optimize
    return sharpInstance
      .webp({ quality: variant.quality || 85 })
      .toBuffer();
  }

  async generateAvatarFromInitials(
    initials: string,
    size: number = 200
  ): Promise<Buffer> {
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="#${Math.floor(Math.random()*16777215).toString(16)}"/>
        <text x="50%" y="50%" font-family="Arial" font-size="${size/3}" fill="white" text-anchor="middle" dy=".35em">
          ${initials.toUpperCase()}
        </text>
      </svg>
    `;

    return sharp(Buffer.from(svg))
      .png()
      .toBuffer();
  }
}

export const imageService = new ImageService();