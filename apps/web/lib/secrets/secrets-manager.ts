/**
 * Secrets Manager
 * Handles secure retrieval and management of secrets
 * Supports multiple backends: environment variables, AWS Secrets Manager, Vault
 */

export interface SecretConfig {
  name: string;
  backend?: 'env' | 'aws' | 'vault';
  required?: boolean;
  default?: string;
}

export interface SecretsManagerOptions {
  backend?: 'env' | 'aws' | 'vault';
  awsRegion?: string;
  vaultUrl?: string;
  vaultToken?: string;
}

/**
 * Base secrets manager interface
 */
interface ISecretsBackend {
  getSecret(name: string): Promise<string | undefined>;
  setSecret(name: string, value: string): Promise<void>;
  deleteSecret(name: string): Promise<void>;
  listSecrets(): Promise<string[]>;
}

/**
 * Environment variable backend
 */
class EnvSecretsBackend implements ISecretsBackend {
  async getSecret(name: string): Promise<string | undefined> {
    return process.env[name];
  }

  async setSecret(name: string, value: string): Promise<void> {
    process.env[name] = value;
  }

  async deleteSecret(name: string): Promise<void> {
    delete process.env[name];
  }

  async listSecrets(): Promise<string[]> {
    return Object.keys(process.env).filter(key => !key.startsWith('_'));
  }
}

/**
 * AWS Secrets Manager backend
 */
class AWSSecretsBackend implements ISecretsBackend {
  private client: any;

  constructor(region: string = 'us-east-1') {
    // Initialize AWS Secrets Manager client
    // This would require @aws-sdk/client-secrets-manager
    // For now, we'll provide the interface
  }

  async getSecret(name: string): Promise<string | undefined> {
    try {
      // Implementation would use AWS SDK
      // const response = await this.client.getSecretValue({ SecretId: name });
      // return response.SecretString;
      return undefined;
    } catch (error) {
      console.error(`Failed to get secret ${name}:`, error);
      return undefined;
    }
  }

  async setSecret(name: string, value: string): Promise<void> {
    try {
      // Implementation would use AWS SDK
      // await this.client.putSecretValue({ SecretId: name, SecretString: value });
    } catch (error) {
      console.error(`Failed to set secret ${name}:`, error);
    }
  }

  async deleteSecret(name: string): Promise<void> {
    try {
      // Implementation would use AWS SDK
      // await this.client.deleteSecret({ SecretId: name });
    } catch (error) {
      console.error(`Failed to delete secret ${name}:`, error);
    }
  }

  async listSecrets(): Promise<string[]> {
    try {
      // Implementation would use AWS SDK
      // const response = await this.client.listSecrets();
      // return response.SecretList?.map(s => s.Name) || [];
      return [];
    } catch (error) {
      console.error('Failed to list secrets:', error);
      return [];
    }
  }
}

/**
 * HashiCorp Vault backend
 */
class VaultSecretsBackend implements ISecretsBackend {
  private vaultUrl: string;
  private vaultToken: string;

  constructor(vaultUrl: string, vaultToken: string) {
    this.vaultUrl = vaultUrl;
    this.vaultToken = vaultToken;
  }

  async getSecret(name: string): Promise<string | undefined> {
    try {
      const response = await fetch(`${this.vaultUrl}/v1/secret/data/${name}`, {
        headers: {
          'X-Vault-Token': this.vaultToken,
        },
      });

      if (!response.ok) {
        return undefined;
      }

      const data = await response.json();
      return data.data?.data?.value;
    } catch (error) {
      console.error(`Failed to get secret ${name}:`, error);
      return undefined;
    }
  }

  async setSecret(name: string, value: string): Promise<void> {
    try {
      await fetch(`${this.vaultUrl}/v1/secret/data/${name}`, {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.vaultToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { value } }),
      });
    } catch (error) {
      console.error(`Failed to set secret ${name}:`, error);
    }
  }

  async deleteSecret(name: string): Promise<void> {
    try {
      await fetch(`${this.vaultUrl}/v1/secret/data/${name}`, {
        method: 'DELETE',
        headers: {
          'X-Vault-Token': this.vaultToken,
        },
      });
    } catch (error) {
      console.error(`Failed to delete secret ${name}:`, error);
    }
  }

  async listSecrets(): Promise<string[]> {
    try {
      const response = await fetch(`${this.vaultUrl}/v1/secret/metadata`, {
        headers: {
          'X-Vault-Token': this.vaultToken,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.data?.keys || [];
    } catch (error) {
      console.error('Failed to list secrets:', error);
      return [];
    }
  }
}

/**
 * Secrets Manager
 */
export class SecretsManager {
  private backend: ISecretsBackend;
  private cache: Map<string, string> = new Map();
  private cacheTTL: number = 3600000; // 1 hour
  private cacheTimestamps: Map<string, number> = new Map();

  constructor(options: SecretsManagerOptions = {}) {
    const backendType = options.backend || 'env';

    switch (backendType) {
      case 'aws':
        this.backend = new AWSSecretsBackend(options.awsRegion);
        break;
      case 'vault':
        this.backend = new VaultSecretsBackend(
          options.vaultUrl || '',
          options.vaultToken || ''
        );
        break;
      case 'env':
      default:
        this.backend = new EnvSecretsBackend();
    }
  }

  /**
   * Get a secret
   */
  async getSecret(name: string, options?: { cache?: boolean; ttl?: number }): Promise<string | undefined> {
    const useCache = options?.cache !== false;
    const ttl = options?.ttl || this.cacheTTL;

    // Check cache
    if (useCache && this.cache.has(name)) {
      const timestamp = this.cacheTimestamps.get(name) || 0;
      if (Date.now() - timestamp < ttl) {
        return this.cache.get(name);
      }
    }

    // Get from backend
    const secret = await this.backend.getSecret(name);

    // Cache result
    if (secret && useCache) {
      this.cache.set(name, secret);
      this.cacheTimestamps.set(name, Date.now());
    }

    return secret;
  }

  /**
   * Get required secret (throws if not found)
   */
  async getRequiredSecret(name: string): Promise<string> {
    const secret = await this.getSecret(name);
    if (!secret) {
      throw new Error(`Required secret not found: ${name}`);
    }
    return secret;
  }

  /**
   * Set a secret
   */
  async setSecret(name: string, value: string): Promise<void> {
    await this.backend.setSecret(name, value);
    // Invalidate cache
    this.cache.delete(name);
    this.cacheTimestamps.delete(name);
  }

  /**
   * Delete a secret
   */
  async deleteSecret(name: string): Promise<void> {
    await this.backend.deleteSecret(name);
    // Invalidate cache
    this.cache.delete(name);
    this.cacheTimestamps.delete(name);
  }

  /**
   * List all secrets
   */
  async listSecrets(): Promise<string[]> {
    return this.backend.listSecrets();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Get multiple secrets
   */
  async getSecrets(names: string[]): Promise<Record<string, string | undefined>> {
    const results: Record<string, string | undefined> = {};
    for (const name of names) {
      results[name] = await this.getSecret(name);
    }
    return results;
  }
}

/**
 * Global secrets manager instance
 */
let globalSecretsManager: SecretsManager | null = null;

/**
 * Initialize global secrets manager
 */
export function initializeSecretsManager(options?: SecretsManagerOptions): SecretsManager {
  globalSecretsManager = new SecretsManager(options);
  return globalSecretsManager;
}

/**
 * Get global secrets manager
 */
export function getSecretsManager(): SecretsManager {
  if (!globalSecretsManager) {
    globalSecretsManager = new SecretsManager();
  }
  return globalSecretsManager;
}

/**
 * Convenience function to get a secret
 */
export async function getSecret(name: string): Promise<string | undefined> {
  return getSecretsManager().getSecret(name);
}

/**
 * Convenience function to get a required secret
 */
export async function getRequiredSecret(name: string): Promise<string> {
  return getSecretsManager().getRequiredSecret(name);
}

/**
 * Convenience function to set a secret
 */
export async function setSecret(name: string, value: string): Promise<void> {
  return getSecretsManager().setSecret(name, value);
}

/**
 * Convenience function to delete a secret
 */
export async function deleteSecret(name: string): Promise<void> {
  return getSecretsManager().deleteSecret(name);
}

/**
 * Mask sensitive values in logs
 */
export function maskSensitiveValue(value: string, visibleChars: number = 4): string {
  if (value.length <= visibleChars) {
    return '*'.repeat(value.length);
  }
  return value.substring(0, visibleChars) + '*'.repeat(value.length - visibleChars);
}

/**
 * Validate secret format
 */
export function validateSecretFormat(name: string, value: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!value) {
    errors.push('Secret value cannot be empty');
  }

  if (value.length < 8) {
    errors.push('Secret value should be at least 8 characters');
  }

  if (name.includes(' ')) {
    errors.push('Secret name cannot contain spaces');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

