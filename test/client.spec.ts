import { MetricalAnalytics } from '../src';

describe('MetricalAnalytics', () => {
  describe('track', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('should perform http request', async () => {
      const client = new MetricalAnalytics({ writeKey: 'key' });

      await client.track([]);

      expect(global.fetch).toHaveBeenCalledWith('https://api.metrical.io/v1/ingestion/event', {
        body: '[]',
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should respect configuration parameters', async () => {
      const client = new MetricalAnalytics({ baseURL: 'http://localhost:8080', writeKey: 'key' });

      await client.track([]);

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/v1/ingestion/event', {
        body: '[]',
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should assert configuration parameters', async () => {
      const client = new MetricalAnalytics({ writeKey: null });
      const t = () => client.track([]);

      await expect(t()).rejects.toThrow('Assert failed: writeKey is required');
    });
  });
});
