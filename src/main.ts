import { Bigdelta } from './client';
import './browser/recording';

declare global {
  interface Window {
    bigdeltaClient: Bigdelta;
  }
}

window.bigdeltaClient = new Bigdelta({
  baseURL: 'http://localhost:8080',
  trackingKey: 'testKey',
  defaultTrackingConfig: {
    pageViews: {
      enabled: true,
      singlePageAppTracking: 'any',
    },
    sessionRecording: {
      enabled: true,
    },
  },
});
