import { EventPayload, PageViewEventPayload, Relations } from './model/eventPayload';
import { Identification } from './model/identification';
import { v4 as uuid } from 'uuid';

export interface PageViewsConfig {
  enabled: boolean;
  singlePageAppTracking?: 'path' | 'path-with-query' | 'any';
}

export interface DefaultTrackingConfig {
  pageViews?: PageViewsConfig;
}

export interface FullConfig {
  baseURL: string;
  writeKey: string;
  defaultTrackingConfig: DefaultTrackingConfig;
  requestConfig?: RequestInit;
}

export interface Config {
  baseURL?: string;
  writeKey: string;
  defaultTrackingConfig?: DefaultTrackingConfig;
  requestConfig?: RequestInit;
}

const IDENTIFICATION_KEY = 'metrical_analytics_identification';

export class Metrical {
  private readonly config: FullConfig;
  private identification: Identification;

  constructor(config: Config) {
    this.config = {
      baseURL: config.baseURL || 'https://api.metrical.io',
      defaultTrackingConfig: config.defaultTrackingConfig || {},
      ...config,
    };
    this.loadIdentification();
    this.initDefaultTracking(config.defaultTrackingConfig);
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
    const finalEvents = events.map((event) => ({
      ...event,
      relations: {
        ...this.getIdentificationRelations(),
        ...(event.relations || {}),
      },
    }));
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

  public async trackPageView(payload?: PageViewEventPayload) {
    const finalProperties = {
      title: document.title,
      location: window.location.href,
      protocol: window.location.protocol,
      domain: window.location.hostname,
      path: window.location.pathname,
      query: window.location.search,
      ...(payload?.properties || {}),
    };
    return await this.track({
      ...(payload || {}),
      event_name: payload?.event_name || 'Page View',
      properties: finalProperties,
    });
  }

  public identify(identification: Identification, config?: RequestInit) {
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

    this.identifyCallout(this.identification.anonymous_id, this.identification.user_id, config);

    delete this.identification.anonymous_id;

    this.saveIdentification();
  }

  public async reset() {
    this.identification = null;
    this.saveIdentification();
  }

  private async identifyCallout(anonymousId: string, userId: string, config?: RequestInit) {
    try {
      if (!anonymousId || !userId) {
        return;
      }

      this.assertConfig();

      await fetch(`${this.config.baseURL}/v1/ingestion/identify`, {
        ...this.config.requestConfig,
        ...config,
        method: 'POST',
        headers: {
          ...this.config.requestConfig?.headers,
          ...config?.headers,
          'x-write-key': this.config.writeKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ anonymous_id: anonymousId, user_id: userId }]),
      });
    } catch (e) {
      console.warn('Error occurred when making identify call', e);
    }
  }

  private getIdentificationRelations(): Relations {
    if (!this.identification) {
      this.identification = {
        anonymous_id: uuid(),
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

  private async initDefaultTracking(config: DefaultTrackingConfig) {
    if (config?.pageViews?.enabled) {
      await this.trackPageView();
      let lastUrlTracked = window.location.href;

      if (config?.pageViews?.singlePageAppTracking) {
        window.addEventListener('popstate', function () {
          window.dispatchEvent(new Event('metrical_location_change'));
        });

        window.addEventListener('hashchange', function () {
          window.dispatchEvent(new Event('metrical_location_change'));
        });

        const nativePushState = window.history.pushState;
        if (typeof nativePushState === 'function') {
          window.history.pushState = function (state, unused, url) {
            nativePushState.call(window.history, state, unused, url);
            window.dispatchEvent(new Event('metrical_location_change'));
          };
        }

        const nativeReplaceState = window.history.replaceState;
        if (typeof nativeReplaceState === 'function') {
          window.history.replaceState = function (state, unused, url) {
            nativeReplaceState.call(window.history, state, unused, url);
            window.dispatchEvent(new Event('metrical_location_change'));
          };
        }

        window.addEventListener(
          'metrical_location_change',
          async function () {
            const currentUrl = window.location.href;

            let track = false;
            if (config?.pageViews?.singlePageAppTracking === 'any') {
              track = currentUrl !== lastUrlTracked;
            } else if (config?.pageViews?.singlePageAppTracking === 'path-with-query') {
              track = currentUrl.split('#')[0] !== lastUrlTracked.split('#')[0];
            } else if (config?.pageViews?.singlePageAppTracking === 'path') {
              track = currentUrl.split('#')[0].split('?')[0] !== lastUrlTracked.split('#')[0].split('?')[0];
            }

            if (track) {
              await this.trackPageView();
              lastUrlTracked = currentUrl;
            }
          }.bind(this),
        );
      }
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
