import { Metrical } from '../src';
import * as uuid from 'uuid';
import Cookies from 'js-cookie';
import { IDENTIFICATION_KEY, TRACKING_ENABLED_STATE_KEY } from '../src/client';
import { getCookieDomain } from '../src/utils/getCookieDomain';

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
      Object.defineProperty(global.document, 'title', {
        value: 'Page Title',
      });
      Object.defineProperty(global.document, 'referrer', {
        value: 'https://www.google.com/',
      });
      Object.defineProperty(global.window, 'location', {
        value: {
          href: 'https://domain.com/path/index.html?foo=bar&utm_campaign=campaign&gclid=id',
          protocol: 'https:',
          hostname: 'domain.com',
          pathname: '/path/index.html',
          search: '?foo=bar&utm_campaign=campaign&gclid=id',
        },
      });
      Object.defineProperty(global.window, 'screen', {
        value: {
          height: 768,
          width: 1024,
        },
      });
      Object.defineProperty(global.window.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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
            properties: {
              $screen_height: 768,
              $screen_width: 1024,
              $referrer: 'https://www.google.com/',
              $referring_domain: 'www.google.com',
              $operating_system: 'Mac OS X 10.15.7',
              $device_type: 'Desktop',
              $browser: 'Google Chrome',
              $browser_version: '124.0',
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
            properties: {
              $screen_height: 768,
              $screen_width: 1024,
              $referrer: 'https://www.google.com/',
              $referring_domain: 'www.google.com',
              $operating_system: 'Mac OS X 10.15.7',
              $device_type: 'Desktop',
              $browser: 'Google Chrome',
              $browser_version: '124.0',
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
            properties: {
              $screen_height: 768,
              $screen_width: 1024,
              $referrer: 'https://www.google.com/',
              $referring_domain: 'www.google.com',
              $operating_system: 'Mac OS X 10.15.7',
              $device_type: 'Desktop',
              $browser: 'Google Chrome',
              $browser_version: '124.0',
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
            properties: {
              $screen_height: 768,
              $screen_width: 1024,
              $referrer: 'https://www.google.com/',
              $referring_domain: 'www.google.com',
              $operating_system: 'Mac OS X 10.15.7',
              $device_type: 'Desktop',
              $browser: 'Google Chrome',
              $browser_version: '124.0',
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
            properties: {
              $screen_height: 768,
              $screen_width: 1024,
              $referrer: 'https://www.google.com/',
              $referring_domain: 'www.google.com',
              $operating_system: 'Mac OS X 10.15.7',
              $device_type: 'Desktop',
              $browser: 'Google Chrome',
              $browser_version: '124.0',
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

    it('should honor tracking disabled by default flag', async () => {
      const client = new Metrical({ writeKey: 'key', disableTrackingByDefault: true });

      client.identify({ user_id: 'user' });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(document.cookie).toContain(`${TRACKING_ENABLED_STATE_KEY}=false`);
    });

    it('should load tracking enabled flag from cookies', async () => {
      Cookies.set(TRACKING_ENABLED_STATE_KEY, 'true', { domain: getCookieDomain({} as any), expires: 365 });

      const client = new Metrical({ writeKey: 'key', disableTrackingByDefault: true });

      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenCalled();
      expect(document.cookie).toContain(`${TRACKING_ENABLED_STATE_KEY}=true`);
    });

    it('should toggle tracking using enable and disable calls', async () => {
      const client = new Metrical({ writeKey: 'key' });

      await client.track({ event_name: 'Page Viewed' });

      client.disableTracking();

      await client.track({ event_name: 'Page Viewed' });

      client.enableTracking();

      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(document.cookie).toContain(`${TRACKING_ENABLED_STATE_KEY}=true`);
    });

    it('should include default properties on page view track', async () => {
      const client = new Metrical({ writeKey: 'key' });

      await client.trackPageView();

      expect(global.fetch).toHaveBeenCalledWith('https://api.metrical.io/v1/ingestion/event', {
        body: JSON.stringify([
          {
            event_name: 'Page View',
            properties: {
              $screen_height: 768,
              $screen_width: 1024,
              $referrer: 'https://www.google.com/',
              $referring_domain: 'www.google.com',
              $operating_system: 'Mac OS X 10.15.7',
              $device_type: 'Desktop',
              $browser: 'Google Chrome',
              $browser_version: '124.0',
              $title: 'Page Title',
              $location: 'https://domain.com/path/index.html?foo=bar&utm_campaign=campaign&gclid=id',
              $protocol: 'https:',
              $domain: 'domain.com',
              $path: '/path/index.html',
              $query: '?foo=bar&utm_campaign=campaign&gclid=id',
              utm_campaign: 'campaign',
              gclid: 'id',
            },
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

    it('should use custom name and include override properties on page view track', async () => {
      const client = new Metrical({ writeKey: 'key' });

      await client.trackPageView({ event_name: 'Custom Page View', properties: { my_prop: 'prop_value' } });

      expect(global.fetch).toHaveBeenCalledWith('https://api.metrical.io/v1/ingestion/event', {
        body: JSON.stringify([
          {
            event_name: 'Custom Page View',
            properties: {
              $screen_height: 768,
              $screen_width: 1024,
              $referrer: 'https://www.google.com/',
              $referring_domain: 'www.google.com',
              $operating_system: 'Mac OS X 10.15.7',
              $device_type: 'Desktop',
              $browser: 'Google Chrome',
              $browser_version: '124.0',
              $title: 'Page Title',
              $location: 'https://domain.com/path/index.html?foo=bar&utm_campaign=campaign&gclid=id',
              $protocol: 'https:',
              $domain: 'domain.com',
              $path: '/path/index.html',
              $query: '?foo=bar&utm_campaign=campaign&gclid=id',
              utm_campaign: 'campaign',
              gclid: 'id',
              my_prop: 'prop_value',
            },
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

    it('should not include marketing attribution on page view track if disabled', async () => {
      const client = new Metrical({ writeKey: 'key', defaultTrackingConfig: { marketingAttribution: false } });

      await client.trackPageView();

      expect(global.fetch).toHaveBeenCalledWith('https://api.metrical.io/v1/ingestion/event', {
        body: JSON.stringify([
          {
            event_name: 'Page View',
            properties: {
              $screen_height: 768,
              $screen_width: 1024,
              $referrer: 'https://www.google.com/',
              $referring_domain: 'www.google.com',
              $operating_system: 'Mac OS X 10.15.7',
              $device_type: 'Desktop',
              $browser: 'Google Chrome',
              $browser_version: '124.0',
              $title: 'Page Title',
              $location: 'https://domain.com/path/index.html?foo=bar&utm_campaign=campaign&gclid=id',
              $protocol: 'https:',
              $domain: 'domain.com',
              $path: '/path/index.html',
              $query: '?foo=bar&utm_campaign=campaign&gclid=id',
            },
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
  });
});
