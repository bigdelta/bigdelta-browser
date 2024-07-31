import { EventPayload, PageViewEventPayload, Relation } from './model/eventPayload';
import { Identification } from './model/identification';
import { v4 as uuid } from 'uuid';
import {
  ClientState,
  Config,
  DefaultTrackingConfig,
  FormsConfig,
  FullConfig,
  PageViewsConfig,
  SessionsConfig,
} from './model/config';
import { getMarketingAttributionParameters } from './utils/marketingAttribution';
import { getBrowserWithVersion, getDeviceType, getOperatingSystem, isBotUserAgent } from './utils/userAgentParser';
import { PersistentStorage } from './utils/persistentStorage';
import { FormTracker } from './utils/formTracker';
import { Session } from './model/session';
import { DateTime } from 'luxon';
import { initialSessionProperties, sessionProperties } from './utils/sessionMapper';
import { SetRecordProperties } from './model/record';

const PAGE_VIEW_EVENT_NAME = 'Page View';

interface PageContext {
  location: Location;
  document: Document;
}

interface SessionInfo {
  shouldTrack: boolean;
  isNew?: boolean;
}

export class Metrical {
  private readonly config: FullConfig;
  private persistentStorage: PersistentStorage;

  private identification: Identification;
  private clientState: ClientState;
  private session: Session;

  constructor(config: Config) {
    this.config = {
      baseURL: config.baseURL || 'https://eu.api.metrical.io',
      defaultTrackingConfig: config.defaultTrackingConfig || {},
      ...config,
    };
    this.persistentStorage = new PersistentStorage(this.config);

    this.clientState = this.persistentStorage.loadClientState();
    this.identification = this.persistentStorage.loadIdentification();
    this.session = this.persistentStorage.loadSession();

    if (isBotUserAgent(window.navigator.userAgent)) {
      this.disableTracking();
    }

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

    try {
      this.assertConfig();

      const browserWithVersion = window ? getBrowserWithVersion(window.navigator.userAgent) : undefined;
      const operatingSystem = window ? await getOperatingSystem(window.navigator.userAgent) : undefined;
      const deviceType = window ? getDeviceType(window.navigator.userAgent) : undefined;
      const referrer = document ? document.referrer : undefined;
      const referringDomain = this.parseReferringDomain(referrer);

      const eventsWithProperties = events.map((event) => ({
        ...event,
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
      }));

      const sessionInfo = this.tryUpdateSessionState(events);
      const [initialSessionProperties, sessionProperties] = this.getSessionProperties(
        sessionInfo,
        eventsWithProperties,
      );

      const finalEvents = eventsWithProperties.map((event) => ({
        ...event,
        relations: [
          ...this.getIdentificationRelations(),
          ...(sessionInfo.shouldTrack && this.isInSessionScope(event, this.config.defaultTrackingConfig.sessions)
            ? [
                {
                  id: { session_id: this.session.id },
                  set_once: { ...initialSessionProperties },
                  set: { ...sessionProperties },
                },
              ]
            : []),
          ...(event.relations || []),
        ],
        ...(this.clientState.trackIpAndGeolocation === false
          ? {
              track_ip_and_geolocation: this.clientState.trackIpAndGeolocation,
            }
          : {}),
      }));

      await fetch(`${this.config.baseURL}/v1/ingestion/events`, {
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
    } catch (e) {
      console.warn('Error occurred when making track call', e);
    }
  }

  public async trackPageView(payload?: PageViewEventPayload) {
    return await this.trackWithPageContext(currentPageContext(), payload);
  }

  public async identify(identification: Identification, config?: RequestInit) {
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

    await this.identifyCallout(this.identification.anonymous_id, this.identification.user_id, config);

    delete this.identification.anonymous_id;

    this.persistentStorage.saveIdentification(this.identification);
  }

  public getIdentifier(key: string) {
    return this.identification ? this.identification[key] : undefined;
  }

  public async setRecordProperties(records: SetRecordProperties | SetRecordProperties[], config?: RequestInit) {
    if (!records || !this.clientState.trackingEnabled) {
      return;
    }

    await this.setRecordPropertiesCallout(Array.isArray(records) ? records : [records], config);
  }

  public async reset() {
    this.identification = null;
    this.persistentStorage.saveIdentification(null);
    this.session = null;
    this.persistentStorage.saveSession(null);
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

  public getSessionId() {
    return this.session?.id;
  }

  private tryUpdateSessionState(events: EventPayload[]): SessionInfo {
    const sessionsConfig = this.config.defaultTrackingConfig.sessions;

    if (!sessionsConfig || sessionsConfig.enabled) {
      const eligibleEvents = events.filter((e) => this.isInSessionScope(e, sessionsConfig));

      if (eligibleEvents.length === 0) {
        return { shouldTrack: false };
      }

      const currentBatchEventCount = eligibleEvents.length;
      const currentBatchPageViewCount = eligibleEvents.filter((e) => e.event_name === PAGE_VIEW_EVENT_NAME).length;

      const now = DateTime.now().toUTC();

      if (this.session && now.toISO() < this.session.session_end) {
        this.session = {
          ...this.session,
          session_end: now.plus({ minute: 30 }).toISO(),
          event_count: this.session.event_count + currentBatchEventCount,
          pageview_count: this.session.pageview_count + currentBatchPageViewCount,
        };
        this.persistentStorage.saveSession(this.session);
        return { shouldTrack: true, isNew: false };
      } else {
        this.session = {
          id: uuid(),
          session_start: now.toISO(),
          session_end: now.plus({ minute: 30 }).toISO(),
          event_count: currentBatchEventCount,
          pageview_count: currentBatchPageViewCount,
        };
        this.persistentStorage.saveSession(this.session);
        return { shouldTrack: true, isNew: true };
      }
    }

    return { shouldTrack: false };
  }

  private isInSessionScope(event: EventPayload, sessionsConfig?: SessionsConfig) {
    return !event.created_at && !(sessionsConfig?.excludeEvents || []).includes(event.event_name);
  }

  private getSessionProperties(sessionInfo: SessionInfo, events: EventPayload[]) {
    if (sessionInfo.shouldTrack) {
      const eligibleEvents = events.filter((e) => this.isInSessionScope(e, this.config.defaultTrackingConfig.sessions));
      const firstEvent = eligibleEvents[0];
      const lastEvent = eligibleEvents[eligibleEvents.length - 1];

      return [
        sessionInfo.isNew ? initialSessionProperties(firstEvent) : {},
        sessionProperties(this.session, lastEvent),
      ];
    }
    return [{}, {}];
  }

  private async trackWithPageContext(pageContext: PageContext, payload?: PageViewEventPayload) {
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
      event_name: payload?.event_name || PAGE_VIEW_EVENT_NAME,
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
        body: JSON.stringify({ identify: [{ anonymous_id: anonymousId, user_id: userId }] }),
      });
    } catch (e) {
      console.warn('Error occurred when making identify call', e);
    }
  }

  private async setRecordPropertiesCallout(records: SetRecordProperties[], config?: RequestInit) {
    try {
      if (!records || records.length === 0) {
        return;
      }

      this.assertConfig();

      await fetch(`${this.config.baseURL}/v1/ingestion/records`, {
        ...this.config.requestConfig,
        ...config,
        method: 'POST',
        headers: {
          ...this.config.requestConfig?.headers,
          ...config?.headers,
          'x-write-key': this.config.writeKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records }),
      });
    } catch (e) {
      console.warn('Error occurred when making ingest record call', e);
    }
  }

  private getIdentificationRelations(): Relation[] {
    if (!this.identification) {
      this.identification = {
        anonymous_id: uuid(),
      };

      this.persistentStorage.saveIdentification(this.identification);
    }

    return Object.entries(this.identification).map(([key, value]) => {
      return { id: { [key]: value } };
    });
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
      await this.initPageViewsTracking(config?.pageViews);
    }

    if (config?.forms?.enabled) {
      this.initFormsTracking(config?.forms);
    }
  }

  private async initPageViewsTracking(config: PageViewsConfig) {
    const pageContext = currentPageContext();
    await this.trackWithPageContext(pageContext);
    let lastUrlTracked = pageContext.location.href;

    if (config?.singlePageAppTracking !== 'disabled') {
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
          if (!config?.singlePageAppTracking || config?.singlePageAppTracking === 'any') {
            track = trackedUrl !== lastUrlTracked;
          } else if (config?.singlePageAppTracking === 'path-with-query') {
            track = trackedUrl.split('#')[0] !== lastUrlTracked.split('#')[0];
          } else if (config?.singlePageAppTracking === 'path') {
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

  private initFormsTracking(config: FormsConfig) {
    new FormTracker(
      config?.excludedFormIds || [],
      config?.excludedInputFieldNames || [],
      async (formId: string, formData: Record<string, string>) =>
        await this.trackWithPageContext(currentPageContext(), {
          event_name: 'Form Submitted',
          properties:  { $form_data: formData, $form_id: formId },
        }),
    ).init();
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
