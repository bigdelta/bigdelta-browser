import { SessionRecordingConfig } from './config';

export interface SessionRecorderOptions extends SessionRecordingConfig {
  baseURL: string;
  trackingKey: string;
  getSessionId: () => string | undefined;
  getRelationIds: () => Record<string, string>;
}
