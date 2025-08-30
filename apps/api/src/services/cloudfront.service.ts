import { getSignedUrl as getCloudFrontSignedUrl } from '@aws-sdk/cloudfront-signer';
import { awsConfig } from '../config/aws.config';
import fs from 'fs';
import path from 'path';

export class CloudFrontService {
  private privateKey: string;

  constructor() {
    // Load CloudFront private key
    const keyPath = path.join(process.cwd(), 'cloudfront-private-key.pem');
    this.privateKey = fs.readFileSync(keyPath, 'utf8');
  }

  generateSignedUrl(
    objectKey: string,
    expiresIn: number = 3600 // 1 hour default
  ): string {
    const url = `https://${awsConfig.cloudfront.domain}/${objectKey}`;
    const expireTime = Math.floor(Date.now() / 1000) + expiresIn;

    return getCloudFrontSignedUrl({
      url,
      keyPairId: awsConfig.cloudfront.keyPairId,
      privateKey: this.privateKey,
      dateLessThan: new Date(expireTime * 1000).toISOString(),
    });
  }

  generateSignedCookies(
    resource: string = '*',
    expiresIn: number = 86400 // 24 hours default
  ) {
    const expireTime = Math.floor(Date.now() / 1000) + expiresIn;

    const policy = {
      Statement: [
        {
          Resource: `https://${awsConfig.cloudfront.domain}/${resource}`,
          Condition: {
            DateLessThan: {
              'AWS:EpochTime': expireTime,
            },
          },
        },
      ],
    };

    // Implementation would continue with cookie generation
    // This is a simplified version
    return {
      'CloudFront-Policy': Buffer.from(JSON.stringify(policy)).toString('base64'),
      'CloudFront-Key-Pair-Id': awsConfig.cloudfront.keyPairId,
      'CloudFront-Signature': 'generated-signature',
    };
  }
}

export const cloudFrontService = new CloudFrontService();