import { Bigdelta } from './client';

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
  },
});
