import { EventPayload, Relations } from './model/eventPayload';
import { Identification } from './model/identification';
import { v4 as uuid } from 'uuid';

export interface FullConfig {
  baseURL: string;
  writeKey: string;
  requestConfig?: RequestInit;
}

export interface Config {
  baseURL?: string;
  requestConfig?: RequestInit;
  writeKey: string;
}

const IDENTIFICATION_KEY = 'metrical_analytics_identification';

export class MetricalAnalytics {
  private readonly config: FullConfig;
  private identification: Identification;

  constructor(config: Config) {
    this.config = {
      baseURL: config.baseURL || 'https://api.metrical.io',
      ...config,
    };
    this.loadIdentification();
  }

  public async track(payload: EventPayload | EventPayload[], config?: RequestInit) {
    if (!payload) {
      return;
    }

    const events = Array.isArray(payload) ? payload : [payload];

    if (events.length === 0) {
      return;
    }

    this.assertConfig();
    const finalEvents = events.map(event => ({
      ...event,
      relations: {
        ...this.getIdentificationRelations(),
        ...(event.relations || {})
      }
    }))
    await fetch(`${this.config.baseURL}/v1/ingestion/event`, {
      ...this.config.requestConfig,
      ...config,
      method: 'POST',
      headers: {
        ...this.config.requestConfig?.headers,
        ...config?.headers,
        'x-write-key': this.config.writeKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalEvents),
    });
  }

  public identify(identification: Identification) {
    const keys = Object.keys(identification || {});
    if (keys.length === 0) {
      return;
    }

    this.identification = keys.reduce((agg, key) => {
      const value = identification[key];
      if (typeof value !== 'string' && typeof value !== 'number' && value !== null) {
        return agg;
      }

      agg[key] = value === null ? null : value.toString();
      return agg;
    }, this.identification || {});

    delete this.identification.anonymous_id;

    this.saveIdentification();
  }

  public async reset() {
    this.identification = null;
    this.saveIdentification();
  }

  private getIdentificationRelations(): Relations {
    if (!this.identification) {
      this.identification = {
        anonymous_id: uuid()
      };
    }

    return this.identification;
  }

  private loadIdentification() {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const item = localStorage.getItem(IDENTIFICATION_KEY);
    if (!item || item.length < 1) {
      return;
    }

    try {
      this.identification = JSON.parse(item);
    } catch (e) {}
  }

  private saveIdentification() {
    if (typeof localStorage === 'undefined') {
      return;
    }

    if (!this.identification) {
      localStorage.removeItem(IDENTIFICATION_KEY);
    } else {
      localStorage.setItem(IDENTIFICATION_KEY, JSON.stringify(this.identification));
    }
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
