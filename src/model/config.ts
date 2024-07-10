export type StorageType = 'cookies' | 'localStorage';

export interface SessionsConfig {
  enabled: boolean;
  excludeEvents?: string[];
}

export interface PageViewsConfig {
  enabled: boolean;
  singlePageAppTracking?: 'path' | 'path-with-query' | 'any' | 'disabled';
}

export interface FormsConfig {
  enabled: boolean;
  excludedFormIds?: string[];
  excludedInputFieldNames?: string[];
}

export interface DefaultTrackingConfig {
  pageViews?: PageViewsConfig;
  forms?: FormsConfig;
  marketingAttribution?: boolean;
  sessions?: SessionsConfig;
}

export interface FullConfig {
  baseURL: string;
  writeKey: string;
  defaultTrackingConfig: DefaultTrackingConfig;
  requestConfig?: RequestInit;
  cookieDomain?: string;
  disableTrackingByDefault?: boolean;
  trackIpAndGeolocation?: boolean;
  storageType?: StorageType;
}

export interface Config {
  baseURL?: string;
  writeKey: string;
  cookieDomain?: string;
  defaultTrackingConfig?: DefaultTrackingConfig;
  requestConfig?: RequestInit;
  disableTrackingByDefault?: boolean;
  trackIpAndGeolocation?: boolean;
  storageType?: StorageType;
}

export interface ClientState {
  trackingEnabled: boolean;
  trackIpAndGeolocation: boolean;
}
