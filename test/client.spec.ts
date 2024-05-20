import { Metrical } from '../src';
import * as uuid from 'uuid';
import Cookies from 'js-cookie';
import { IDENTIFICATION_KEY } from '../src/client';

jest.mock('uuid');

describe('Metrical', () => {
  describe('track', () => {
    const anonymousId = 'f3f7e6b2-0074-457b-9197-6eae16aedf13';

    beforeEach(() => {
      global.fetch = jest.fn();
      Object.defineProperty(global.document, 'cookie', {
        writable: true,
        value: '',
      });

      jest.spyOn(uuid, 'v4').mockReturnValue(anonymousId);
    });

    it('should perform http request', async () => {
      const client = new Metrical({ writeKey: 'key' });

      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenCalledWith('https://api.metrical.io/v1/ingestion/event', {
        body: JSON.stringify([
          {
            event_name: 'Page Viewed',
            relations: {
              anonymous_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13',
            },
          },
        ]),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should respect configuration parameters', async () => {
      const client = new Metrical({ baseURL: 'http://localhost:8080', writeKey: 'key' });

      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/v1/ingestion/event', {
        body: JSON.stringify([
          {
            event_name: 'Page Viewed',
            relations: {
              anonymous_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13',
            },
          },
        ]),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should assert configuration parameters', async () => {
      const client = new Metrical({ writeKey: null });
      const t = () => client.track({ event_name: 'Page Viewed' });

      await expect(t()).rejects.toThrow('Assert failed: writeKey is required');
    });

    it('should include identification relations', async () => {
      const client = new Metrical({ writeKey: 'key' });

      client.identify({ user_id: 'user' });

      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenCalledWith('https://api.metrical.io/v1/ingestion/event', {
        body: JSON.stringify([
          {
            event_name: 'Page Viewed',
            relations: {
              user_id: 'user',
            },
          },
        ]),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should include anonymous id when not identified and not include it when identified', async () => {
      const client = new Metrical({ writeKey: 'key' });

      await client.track({ event_name: 'Page Viewed' });
      client.identify({ user_id: 'user' });
      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenNthCalledWith(1, 'https://api.metrical.io/v1/ingestion/event', {
        body: JSON.stringify([
          {
            event_name: 'Page Viewed',
            relations: {
              anonymous_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13',
            },
          },
        ]),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
      expect(global.fetch).toHaveBeenNthCalledWith(2, 'https://api.metrical.io/v1/ingestion/identify', {
        body: JSON.stringify([
          {
            anonymous_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13',
            user_id: 'user',
          },
        ]),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
      expect(global.fetch).toHaveBeenNthCalledWith(3, 'https://api.metrical.io/v1/ingestion/event', {
        body: JSON.stringify([
          {
            event_name: 'Page Viewed',
            relations: {
              user_id: 'user',
            },
          },
        ]),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should set cookie on top accessible domain by default', async () => {
      const client = new Metrical({ writeKey: 'key' });

      client.identify({ user_id: 'user' });

      expect(document.cookie).toContain(IDENTIFICATION_KEY);
      // cookie is set on .com domain because in test environment it's permitted
      // in a browser it would be set on the top level domain instead
      // so this still correctly tests if we're selecting the top level domain from the root level upwards
      expect(document.cookie).toContain('domain=.com;');
    });
  });
});
