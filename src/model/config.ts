export type StorageType = 'cookies' | 'localStorage';

export interface SessionsConfig {
  enabled: boolean;
  excludeEvents?: string[];
}

export interface PageViewsConfig {
  enabled: boolean;
  singlePageAppTracking?: 'path' | 'path-with-query' | 'any' | 'disabled';
}

export interface SessionRecordingConfig {
  enabled: boolean;
  maskAllText?: boolean;
  maskTextSelector?: string;
  unmaskTextSelector?: string;
  blockSelector?: string;
  flushIntervalMs?: number;
  maxChunkEvents?: number;
  maxChunkSizeBytes?: number;
  maxRecordingDurationMs?: number;
}

export interface DefaultTrackingConfig {
  pageViews?: PageViewsConfig;
  marketingAttribution?: boolean;
  sessions?: SessionsConfig;
  sessionRecording?: SessionRecordingConfig;
}

export interface FullConfig {
  baseURL: string;
  trackingKey: string;
  defaultTrackingConfig: DefaultTrackingConfig;
  requestConfig?: RequestInit;
  cookieDomain?: string;
  disableTrackingByDefault?: boolean;
  trackIpAndGeolocation?: boolean;
  storageType?: StorageType;
}

export interface Config {
  baseURL?: string;
  trackingKey: string;
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
