import { EventPayload, PageViewEventPayload, Relations } from './model/eventPayload';
import { Identification } from './model/identification';
import { v4 as uuid } from 'uuid';
import { ClientState, Config, DefaultTrackingConfig, FullConfig } from './model/config';
import { getMarketingAttributionParameters } from './utils/getMarketingAttribution';
import { getBrowserWithVersion, getDeviceType, getOperatingSystem } from './utils/userAgentParser';
import { PersistentStorage } from './utils/persistentStorage';
import { FormTracker } from './formTracker';
import {NestedObject} from "./model/nestedObject";

interface PageContext {
  location: Location;
  document: Document;
}

export class Metrical {
  private readonly config: FullConfig;
  private persistentStorage: PersistentStorage;

  private identification: Identification;
  private clientState: ClientState;

  constructor(config: Config) {
    this.config = {
      baseURL: config.baseURL || 'https://api.metrical.io',
      defaultTrackingConfig: config.defaultTrackingConfig || {},
      ...config,
    };
    this.persistentStorage = new PersistentStorage(this.config);

    this.clientState = this.persistentStorage.loadClientState();
    this.identification = this.persistentStorage.loadIdentification();

    this.initDefaultTracking(config.defaultTrackingConfig);
  }

  public async track(payload: EventPayload | EventPayload[], config?: RequestInit) {
    if (!payload || !this.clientState.trackingEnabled) {
      return;
    }

    const events = Array.isArray(payload) ? payload : [payload];

    if (events.length === 0) {
      return;
    }

    this.assertConfig();

    const browserWithVersion = window ? getBrowserWithVersion(window.navigator.userAgent) : undefined;
    const operatingSystem = window ? await getOperatingSystem(window.navigator.userAgent) : undefined;
    const deviceType = window ? getDeviceType(window.navigator.userAgent) : undefined;
    const referrer = document ? document.referrer : undefined;
    const referringDomain = this.parseReferringDomain(referrer);

    const finalEvents = events.map((event) => ({
      ...event,
      relations: {
        ...this.getIdentificationRelations(),
        ...(event.relations || {}),
      },
      properties: {
        $screen_height: window ? window.screen.height : undefined,
        $screen_width: window ? window.screen.width : undefined,
        $referrer: referrer,
        $referring_domain: referringDomain,
        $operating_system: operatingSystem,
        $device_type: deviceType,
        $browser: browserWithVersion?.name,
        $browser_version: browserWithVersion?.version,
        ...(event.properties || {}),
      },
      ...(this.clientState.trackIpAndGeolocation === false
        ? {
            track_ip_and_geolocation: this.clientState.trackIpAndGeolocation,
          }
        : {}),
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
      body: JSON.stringify({
        events: finalEvents,
      }),
    });
  }

  public async trackPageView(payload?: PageViewEventPayload) {
    return await this.trackPageViewOf(currentPageContext(), payload);
  }

  public trackEventOnFormSubmit(selector: string, eventName: string) {
    const formTracker = new FormTracker(selector, async (form, callback) => {
      try {
        const formData = new FormData(form);
        const formEntries = Array.from(formData.entries());
        const stringEntries: [string, string][] = formEntries
          .filter(([_, value]) => typeof value === 'string')
          .map(([key, value]) => [key, value.toString()]);

        const properties = Object.fromEntries(stringEntries);

        await this.track({
          event_name: eventName,
          properties,
        });
      } catch (e) {
        console.log('Error tracking form submit', e);
      }

      callback();
    });

    formTracker.init();
  }

  public identify(identification: Identification, config?: RequestInit) {
    if (!this.clientState.trackingEnabled) {
      return;
    }

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

    this.persistentStorage.saveIdentification(this.identification);
  }

  public setUserProperties(properties: NestedObject, userId?: string, config?: RequestInit) {
    if (!this.clientState.trackingEnabled) {
      return;
    }

    const relations = this.getIdentificationRelations();
    if (!userId) {
      if (!relations?.user_id) {
        return;
      }
      userId = relations.user_id;
    }

    this.setUserPropertiesCallout(userId, properties, config);
  }

  public async reset() {
    this.identification = null;
    this.persistentStorage.saveIdentification(null);
  }

  public disableTracking() {
    this.setState({
      ...this.clientState,
      trackingEnabled: false,
    });
  }

  public enableTracking() {
    this.setState({
      ...this.clientState,
      trackingEnabled: true,
    });
  }

  private async trackPageViewOf(pageContext: PageContext, payload?: PageViewEventPayload) {
    const isAttributionEnabled =
      this.config?.defaultTrackingConfig?.marketingAttribution === undefined ||
      this.config?.defaultTrackingConfig?.marketingAttribution;

    const finalProperties = {
      $title: pageContext.document.title,
      $location: pageContext.location.href,
      $protocol: pageContext.location.protocol,
      $domain: pageContext.location.hostname,
      $path: pageContext.location.pathname,
      $query: pageContext.location.search,
      ...(isAttributionEnabled ? getMarketingAttributionParameters(pageContext.location.href) : {}),
      ...(payload?.properties || {}),
    };

    return await this.track({
      ...(payload || {}),
      event_name: payload?.event_name || 'Page View',
      properties: finalProperties,
    });
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

  private async setUserPropertiesCallout(userId: string, properties: NestedObject, config?: RequestInit) {
    try {
      if (!userId) {
        return;
      }

      this.assertConfig();

      await fetch(`${this.config.baseURL}/v1/ingestion/user`, {
        ...this.config.requestConfig,
        ...config,
        method: 'POST',
        headers: {
          ...this.config.requestConfig?.headers,
          ...config?.headers,
          'x-write-key': this.config.writeKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({users: [{ id: userId, properties }]}),
      });
    } catch (e) {
      console.warn('Error occurred when making ingest user call', e);
    }
  }

  private getIdentificationRelations(): Relations {
    if (!this.identification) {
      this.identification = {
        anonymous_id: uuid(),
      };

      this.persistentStorage.saveIdentification(this.identification);
    }

    return this.identification;
  }

  private setState(clientState: ClientState) {
    this.clientState = clientState;
    this.persistentStorage.saveClientState(clientState);
  }

  private async initDefaultTracking(config: DefaultTrackingConfig) {
    if (typeof window === 'undefined') {
      return;
    }

    if (config?.pageViews?.enabled) {
      const pageContext = currentPageContext();
      await this.trackPageViewOf(pageContext);
      let lastUrlTracked = pageContext.location.href;

      if (config?.pageViews?.singlePageAppTracking !== 'disabled') {
        window.addEventListener('popstate', function () {
          window.dispatchEvent(new CustomEvent('metrical_location_change', { detail: currentPageContext() }));
        });

        window.addEventListener('hashchange', function () {
          window.dispatchEvent(new CustomEvent('metrical_location_change', { detail: currentPageContext() }));
        });

        const nativePushState = window.history.pushState;
        if (typeof nativePushState === 'function') {
          window.history.pushState = function (state, unused, url) {
            nativePushState.call(window.history, state, unused, url);
            window.dispatchEvent(
              new CustomEvent('metrical_location_change', {
                detail: currentPageContext(),
              }),
            );
          };
        }

        const nativeReplaceState = window.history.replaceState;
        if (typeof nativeReplaceState === 'function') {
          window.history.replaceState = function (state, unused, url) {
            nativeReplaceState.call(window.history, state, unused, url);
            window.dispatchEvent(
              new CustomEvent('metrical_location_change', {
                detail: currentPageContext(),
              }),
            );
          };
        }

        window.addEventListener(
          'metrical_location_change',
          async function (event: CustomEvent<PageContext>) {
            const trackedUrl = event.detail.location.href;

            let track = false;
            if (!config?.pageViews?.singlePageAppTracking || config?.pageViews?.singlePageAppTracking === 'any') {
              track = trackedUrl !== lastUrlTracked;
            } else if (config?.pageViews?.singlePageAppTracking === 'path-with-query') {
              track = trackedUrl.split('#')[0] !== lastUrlTracked.split('#')[0];
            } else if (config?.pageViews?.singlePageAppTracking === 'path') {
              track = trackedUrl.split('#')[0].split('?')[0] !== lastUrlTracked.split('#')[0].split('?')[0];
            }

            if (track) {
              await this.trackPageView();
              lastUrlTracked = trackedUrl;
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

  private parseReferringDomain(referrer: string) {
    try {
      if (!referrer) {
        return undefined;
      }
      return new URL(referrer).hostname;
    } catch (e) {
      return undefined;
    }
  }
}

const currentPageContext = (): PageContext => {
  return { location: window.location, document: document };
};

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw Error('Assert failed: ' + (message || ''));
  }
};
