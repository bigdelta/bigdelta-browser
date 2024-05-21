import { EventPayload, PageViewEventPayload, Relations } from './model/eventPayload';
import { Identification } from './model/identification';
import { v4 as uuid } from 'uuid';
import Cookies, { CookieAttributes } from 'js-cookie';
import { getCookieDomain } from './utils/getCookieDomain';
import { ClientState, Config, DefaultTrackingConfig, FullConfig } from './model/config';
import { getMarketingAttributionParameters } from './utils/getMarketingAttribution';
import { getBrowserWithVersion, getDeviceType, getOperatingSystem } from './utils/userAgentParser';

interface PageContext {
  location: Location;
  document: Document;
}

export const IDENTIFICATION_KEY = 'metrical_analytics_identification';
export const TRACKING_ENABLED_STATE_KEY = 'metrical_analytics_tracking_enabled';
export const TRACK_IP_AND_GEOLOCATION_STATE_KEY = 'metrical_analytics_track_ip_and_geolocation';

export class Metrical {
  private readonly config: FullConfig;
  private identification: Identification;
  private state: ClientState;

  constructor(config: Config) {
    this.config = {
      baseURL: config.baseURL || 'https://api.metrical.io',
      defaultTrackingConfig: config.defaultTrackingConfig || {},
      ...config,
    };
    this.initializeState();

    this.loadIdentification();
    this.initDefaultTracking(config.defaultTrackingConfig);
  }

  public async track(payload: EventPayload | EventPayload[], config?: RequestInit) {
    if (!payload || !this.state.trackingEnabled) {
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
      ...(this.state.trackIpAndGeolocation === false
        ? {
            track_ip_and_geolocation: this.state.trackIpAndGeolocation,
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

  public identify(identification: Identification, config?: RequestInit) {
    if (!this.state.trackingEnabled) {
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

    this.saveIdentification();
  }

  public async reset() {
    this.identification = null;
    this.saveIdentification();
  }

  public async trackPageViewOf(pageContext: PageContext, payload?: PageViewEventPayload) {
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

  public disableTracking() {
    this.setState({
      ...this.state,
      trackingEnabled: false,
    });
  }

  public enableTracking() {
    this.setState({
      ...this.state,
      trackingEnabled: true,
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

  private getIdentificationRelations(): Relations {
    if (!this.identification) {
      this.identification = {
        anonymous_id: uuid(),
      };
    }

    return this.identification;
  }

  private initializeState() {
    let trackingEnabled = !this.config.disableTrackingByDefault;
    let trackIpAndGeolocation = this.config.trackIpAndGeolocation !== false;

    if (typeof document !== 'undefined') {
      const trackingEnabledCookie = Cookies.get(TRACKING_ENABLED_STATE_KEY);
      const trackIpAndGeolocationCookie = Cookies.get(TRACK_IP_AND_GEOLOCATION_STATE_KEY);

      if (trackingEnabledCookie && trackingEnabledCookie.length > 0) {
        trackingEnabled = trackingEnabledCookie === 'true';
      }

      if (trackIpAndGeolocationCookie && trackIpAndGeolocationCookie.length > 0) {
        trackIpAndGeolocation = trackIpAndGeolocationCookie === 'true';
      }
    }

    this.setState({
      trackingEnabled,
      trackIpAndGeolocation,
    });
  }

  private setState(state: ClientState) {
    this.state = state;

    if (typeof document !== 'undefined') {
      if (typeof this.state.trackingEnabled === 'boolean') {
        this.setCookie(TRACKING_ENABLED_STATE_KEY, this.state.trackingEnabled.toString());
      }

      if (typeof this.state.trackIpAndGeolocation === 'boolean') {
        this.setCookie(TRACK_IP_AND_GEOLOCATION_STATE_KEY, this.state.trackIpAndGeolocation.toString());
      }
    }
  }

  private loadIdentification() {
    if (typeof document === 'undefined') {
      return;
    }

    const item = Cookies.get(IDENTIFICATION_KEY);
    if (!item || item.length < 1) {
      return;
    }

    try {
      this.identification = JSON.parse(item);
    } catch (e) {}
  }

  private saveIdentification() {
    if (typeof document === 'undefined') {
      return;
    }

    if (!this.identification) {
      this.removeCookie(IDENTIFICATION_KEY);
    } else {
      this.setCookie(IDENTIFICATION_KEY, JSON.stringify(this.identification));
    }
  }

  private async initDefaultTracking(config: DefaultTrackingConfig) {
    if (typeof window === 'undefined') {
      return;
    }

    if (config?.pageViews?.enabled) {
      const pageContext = currentPageContext();
      await this.trackPageViewOf(pageContext);
      let lastUrlTracked = pageContext.location.href;

      if (config?.pageViews?.singlePageAppTracking) {
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
            if (config?.pageViews?.singlePageAppTracking === 'any') {
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

  private setCookie(name: string, value: string, options: CookieAttributes = {}) {
    const cookieDomain = getCookieDomain(this.config);

    Cookies.set(name, value, { domain: cookieDomain, expires: 365, path: '/', ...options });
  }

  private removeCookie(name: string, options: CookieAttributes = {}) {
    const cookieDomain = getCookieDomain(this.config);

    Cookies.remove(name, { domain: cookieDomain, path: '/', ...options });
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
