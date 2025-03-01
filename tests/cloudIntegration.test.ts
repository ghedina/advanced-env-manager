import AWS from 'aws-sdk';
import { fetchCloudSecrets } from '../src/cloudIntegration';

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockGetSecretValue = jest.fn();
  return {
    config: {
      update: jest.fn()
    },
    SecretsManager: jest.fn(() => ({
      getSecretValue: mockGetSecretValue
    }))
  };
});

describe('Cloud Integration', () => {
  let mockSecretsManager: jest.Mocked<AWS.SecretsManager>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    mockSecretsManager = new AWS.SecretsManager() as jest.Mocked<AWS.SecretsManager>;
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  test('should fetch secrets from AWS Secrets Manager', async () => {
    // Setup mock response
    mockSecretsManager.getSecretValue.mockReturnValue({
      promise: () => Promise.resolve({
        SecretString: JSON.stringify({
          TEST_SECRET: 'test-value'
        })
      })
    } as any);

    const secrets = await fetchCloudSecrets();
    
    // Verify AWS config was updated
    expect(AWS.config.update).toHaveBeenCalledWith({
      region: 'us-east-1'
    });

    // Verify secrets were fetched
    expect(secrets).toHaveProperty('TEST_SECRET', 'test-value');
  });

  test('should handle AWS errors gracefully', async () => {
    // Setup mock error
    mockSecretsManager.getSecretValue.mockReturnValue({
      promise: () => Promise.reject(new Error('AWS Error'))
    } as any);

    // Verify error is thrown in test environment
    await expect(fetchCloudSecrets()).rejects.toThrow('AWS Error');
  });

  test('should handle missing SecretString', async () => {
    // Setup mock response without SecretString
    mockSecretsManager.getSecretValue.mockReturnValue({
      promise: () => Promise.resolve({})
    } as any);

    await expect(fetchCloudSecrets()).rejects.toThrow('No secret string found');
  });
}); 