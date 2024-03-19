import { IngestionTrackEventPayload } from './model/ingestionTrackEventPayload';

export interface FullConfig {
  baseURL: string;
  writeKey: string;
}

export interface Config {
  baseURL?: string;
  writeKey: string;
}

export class MetricalAnalytics {
  private readonly config: FullConfig;

  constructor(config: Config) {
    this.config = {
      baseURL: config.baseURL || 'https://api.metrical.io',
      ...config,
    };
  }

  public async track(payload: IngestionTrackEventPayload, config?: RequestInit) {
    this.assertConfig();

    const { baseURL, writeKey } = this.config;

    await fetch(`${baseURL}/v1/ingestion/event`, {
      ...config,
      method: 'POST',
      headers: {
        ...(config?.headers || {}),
        'x-write-key': writeKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  private assertConfig() {
    assert(!!this.config.baseURL, 'baseURL is required');
    assert(!!this.config.writeKey, 'writeKey is required');
  }
}

const assert = function (condition: boolean, message: string): void {
  if (!condition) {
    throw Error('Assert failed: ' + (message || ''));
  }
};
