export const cdnConfig = {
  enabled: process.env.CDN_ENABLED === 'true',
  provider: process.env.CDN_PROVIDER || 'cloudfront',
  domain: process.env.CDN_DOMAIN || '',
  region: process.env.CDN_REGION || process.env.AWS_REGION || 'us-east-1',
  keyPairId: process.env.CDN_KEY_PAIR_ID || '',
  privateKey: process.env.CDN_PRIVATE_KEY || '',
  // CloudFront specific settings
  cloudfront: {
    distributionDomain: process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN || '',
    distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID || '',
    signingEnabled: process.env.CLOUDFRONT_SIGNING_ENABLED === 'true',
  },
  // Generic CDN settings
  cacheControl: process.env.CDN_CACHE_CONTROL || 'public, max-age=31536000', // 1 year
  defaultTtl: parseInt(process.env.CDN_DEFAULT_TTL || '86400'), // 24 hours
  maxTtl: parseInt(process.env.CDN_MAX_TTL || '31536000'), // 1 year
};