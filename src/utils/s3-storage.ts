/**
 * S3 Storage Implementation
 * Separated to avoid module resolution issues when AWS SDK is not installed
 */

import path from 'path';

export interface StorageConfig {
  type: 'local' | 's3' | 'gcs';
  basePath?: string;
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

/**
 * Get storage path for a file
 */
function getStoragePath(fileId: string, fileName: string): string {
  const ext = path.extname(fileName);
  return `${fileId}${ext}`;
}

/**
 * S3 storage operations
 * Only imported when STORAGE_TYPE=s3
 */
export class S3Storage {
  private bucket: string;
  private region: string;
  private client: any; // S3Client from @aws-sdk/client-s3
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket || '';
    this.region = config.region || 'us-east-1';
    this.config = config;
    // Client will be initialized lazily on first use
  }

  /**
   * Initialize S3 client lazily
   */
  private async initClient() {
    if (this.client) return;

    if (this.config.type !== 's3') {
      throw new Error('S3 storage not configured');
    }

    try {
      // Dynamic import for AWS SDK
      const AWS = await import('@aws-sdk/client-s3');
      this.client = new AWS.S3Client({
        region: this.region,
        credentials: this.config.accessKeyId
          ? {
              accessKeyId: this.config.accessKeyId,
              secretAccessKey: this.config.secretAccessKey || '',
            }
          : undefined,
        endpoint: this.config.endpoint,
      });
    } catch (error) {
      throw new Error('AWS SDK not available. Install @aws-sdk/client-s3 for S3 storage.');
    }
  }

  /**
   * Save file to S3
   */
  async saveFile(fileId: string, fileName: string, buffer: Buffer): Promise<string> {
    await this.initClient();

    const AWS = await import('@aws-sdk/client-s3');
    const storagePath = getStoragePath(fileId, fileName);

    const command = new AWS.PutObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
      Body: buffer,
      ContentType: 'application/sla',
    });

    await this.client.send(command);
    return storagePath;
  }

  /**
   * Read file from S3
   */
  async readFile(storagePath: string): Promise<Buffer> {
    await this.initClient();

    const AWS = await import('@aws-sdk/client-s3');
    const command = new AWS.GetObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
    });

    const response = await this.client.send(command);
    const chunks: Uint8Array[] = [];

    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Delete file from S3
   */
  async deleteFile(storagePath: string): Promise<void> {
    await this.initClient();

    const AWS = await import('@aws-sdk/client-s3');
    const command = new AWS.DeleteObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
    });

    await this.client.send(command);
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(storagePath: string): Promise<boolean> {
    await this.initClient();

    const AWS = await import('@aws-sdk/client-s3');
    try {
      const command = new AWS.HeadObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}
