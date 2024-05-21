export interface PageViewsConfig {
  enabled: boolean;
  singlePageAppTracking?: 'path' | 'path-with-query' | 'any';
}

export interface DefaultTrackingConfig {
  pageViews?: PageViewsConfig;
  marketingAttribution?: boolean;
}

export interface FullConfig {
  baseURL: string;
  writeKey: string;
  defaultTrackingConfig: DefaultTrackingConfig;
  requestConfig?: RequestInit;
  cookieDomain?: string;
  disableTrackingByDefault?: boolean;
  trackIpAndGeolocation?: boolean;
}

export interface Config {
  baseURL?: string;
  writeKey: string;
  cookieDomain?: string;
  defaultTrackingConfig?: DefaultTrackingConfig;
  requestConfig?: RequestInit;
  disableTrackingByDefault?: boolean;
  trackIpAndGeolocation?: boolean;
}

export interface ClientState {
  trackingEnabled: boolean;
  trackIpAndGeolocation: boolean;
}
