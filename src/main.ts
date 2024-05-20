import { Metrical } from './client';

declare global {
  interface Window {
    metricalClient: Metrical;
  }
}

window.metricalClient = new Metrical({ baseURL: 'http://localhost:8080', writeKey: 'test' });
