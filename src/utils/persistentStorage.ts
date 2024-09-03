import { ClientState, FullConfig } from '../model/config';
import { Identification } from '../model/identification';
import Cookies, { CookieAttributes } from 'js-cookie';
import { getCookieDomain } from './getCookieDomain';
import { Session } from '../model/session';

export const IDENTIFICATION_KEY = 'bigdelta_analytics_identification';
export const TRACKING_ENABLED_STATE_KEY = 'bigdelta_analytics_tracking_enabled';
export const TRACK_IP_AND_GEOLOCATION_STATE_KEY = 'bigdelta_analytics_track_ip_and_geolocation';
export const SESSION_KEY = 'bigdelta_analytics_session';

export class PersistentStorage {
  constructor(private config: FullConfig) {}

  public saveIdentification(identification: Identification) {
    if (!identification) {
      this.remove(IDENTIFICATION_KEY);
    } else {
      this.persist(IDENTIFICATION_KEY, JSON.stringify(identification));
    }
  }

  public loadIdentification(): Identification {
    const item = this.get(IDENTIFICATION_KEY);
    if (!item || item.length < 1) {
      return null;
    }

    try {
      return JSON.parse(item);
    } catch (e) {
      return null;
    }
  }

  public saveClientState(clientState: ClientState) {
    if (typeof clientState.trackingEnabled === 'boolean') {
      this.persist(TRACKING_ENABLED_STATE_KEY, clientState.trackingEnabled.toString());
    }

    if (typeof clientState.trackIpAndGeolocation === 'boolean') {
      this.persist(TRACK_IP_AND_GEOLOCATION_STATE_KEY, clientState.trackIpAndGeolocation.toString());
    }
  }

  public loadClientState() {
    let trackingEnabled = !this.config.disableTrackingByDefault;
    let trackIpAndGeolocation = this.config.trackIpAndGeolocation !== false;

    const trackingEnabledCookie = this.get(TRACKING_ENABLED_STATE_KEY);
    const trackIpAndGeolocationCookie = this.get(TRACK_IP_AND_GEOLOCATION_STATE_KEY);

    if (trackingEnabledCookie && trackingEnabledCookie.length > 0) {
      trackingEnabled = trackingEnabledCookie === 'true';
    }

    if (trackIpAndGeolocationCookie && trackIpAndGeolocationCookie.length > 0) {
      trackIpAndGeolocation = trackIpAndGeolocationCookie === 'true';
    }

    return {
      trackingEnabled,
      trackIpAndGeolocation,
    };
  }

  public saveSession(session: Session) {
    if (!session) {
      this.remove(SESSION_KEY);
    } else {
      this.persist(SESSION_KEY, JSON.stringify(session));
    }
  }

  public loadSession(): Session {
    const session = this.get(SESSION_KEY);
    if (!session || session.length < 1) {
      return null;
    }

    try {
      return JSON.parse(session);
    } catch (e) {
      return null;
    }
  }

  private get(name: string) {
    if (this.config.storageType === 'cookies') {
      this.getCookie(name);
    } else if (this.config.storageType === 'localStorage') {
      this.getFromLocalStorage(name);
    } else {
      const cookieValue = this.getCookie(name);
      return cookieValue ? cookieValue : this.getFromLocalStorage(name);
    }
  }

  private persist(name: string, value: string) {
    if (this.config.storageType === 'cookies') {
      this.setCookie(name, value);
    } else if (this.config.storageType === 'localStorage') {
      this.setInLocalStorage(name, value);
    } else {
      const isSet = this.setCookie(name, value);
      if (!isSet) {
        this.setInLocalStorage(name, value);
      }
    }
  }

  private remove(name: string) {
    if (this.config.storageType === 'cookies') {
      this.removeCookie(name);
    } else if (this.config.storageType === 'localStorage') {
      this.removeFromLocalStorage(name);
    } else {
      this.removeCookie(name);
      this.removeFromLocalStorage(name);
    }
  }

  private getCookie(name: string) {
    if (typeof document === 'undefined') {
      return null;
    }

    return Cookies.get(name);
  }

  private setCookie(name: string, value: string, options: CookieAttributes = {}) {
    if (typeof document === 'undefined') {
      return false;
    }

    const cookieDomain = getCookieDomain(this.config);

    Cookies.set(name, value, { domain: cookieDomain, expires: 365, path: '/', ...options });

    return document.cookie.indexOf(name) !== -1;
  }

  private removeCookie(name: string, options: CookieAttributes = {}) {
    if (typeof document === 'undefined') {
      return;
    }

    const cookieDomain = getCookieDomain(this.config);

    Cookies.remove(name, { domain: cookieDomain, path: '/', ...options });
  }

  private getFromLocalStorage(name: string) {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(name);
  }

  private setInLocalStorage(name: string, value: string) {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    localStorage.setItem(name, value);
    return true;
  }

  private removeFromLocalStorage(name: string) {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(name);
  }
}
