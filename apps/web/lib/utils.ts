import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCDNUrl(s3Url: string): string {
  if (!s3Url) return '';

  // Extract key from S3 URL
  const match = s3Url.match(/amazonaws\.com\/(.+)$/);
  if (!match) return s3Url;

  const key = match[1];
  return `https://${process.env.NEXT_PUBLIC_CDN_DOMAIN}/${key}`;
}