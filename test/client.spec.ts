import { Bigdelta } from '../src';
import * as uuid from 'uuid';
import Cookies from 'js-cookie';
import { getCookieDomain } from '../src/utils/getCookieDomain';
import { IDENTIFICATION_KEY, TRACKING_ENABLED_STATE_KEY } from '../src/utils/persistentStorage';
import { DateTime, Settings } from 'luxon';

jest.mock('uuid');

describe('Bigdelta', () => {
  describe('track', () => {
    const anonymousId = 'f3f7e6b2-0074-457b-9197-6eae16aedf13';
    const originalLuxonNow = Settings.now;

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
        configurable: true,
      });
      jest.spyOn(uuid, 'v4').mockReturnValue(anonymousId);
      Settings.now = originalLuxonNow;
    });

    it('should perform http request', async () => {
      const client = new Bigdelta({ trackingKey: 'key', defaultTrackingConfig: { sessions: { enabled: false } } });

      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenCalledWith('https://eu.api.bigdelta.com/v1/ingestion/events', {
        body: JSON.stringify({
          events: [
            {
              event_name: 'Page Viewed',
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
              relations: [{ object_slug: 'anonymous', record_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13' }],
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should respect configuration parameters', async () => {
      const client = new Bigdelta({
        baseURL: 'http://localhost:8080',
        trackingKey: 'key',
        defaultTrackingConfig: { sessions: { enabled: false } },
      });

      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/v1/ingestion/events', {
        body: JSON.stringify({
          events: [
            {
              event_name: 'Page Viewed',
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
              relations: [{ object_slug: 'anonymous', record_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13' }],
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should include identification relations', async () => {
      const client = new Bigdelta({ trackingKey: 'key', defaultTrackingConfig: { sessions: { enabled: false } } });

      await client.identify({ users: 'user' });

      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenCalledWith('https://eu.api.bigdelta.com/v1/ingestion/events', {
        body: JSON.stringify({
          events: [
            {
              event_name: 'Page Viewed',
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
              relations: [{ object_slug: 'users', record_id: 'user' }],
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should include anonymous id when not identified and not include it when identified', async () => {
      const client = new Bigdelta({ trackingKey: 'key', defaultTrackingConfig: { sessions: { enabled: false } } });

      await client.track({ event_name: 'Page Viewed' });
      await client.identify({ users: 'user', leads: 'lead' });
      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenNthCalledWith(1, 'https://eu.api.bigdelta.com/v1/ingestion/events', {
        body: JSON.stringify({
          events: [
            {
              event_name: 'Page Viewed',
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
              relations: [{ object_slug: 'anonymous', record_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13' }],
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
      expect(global.fetch).toHaveBeenNthCalledWith(2, 'https://eu.api.bigdelta.com/v1/ingestion/identify', {
        body: JSON.stringify({
          identify: [
            {
              anonymous: 'f3f7e6b2-0074-457b-9197-6eae16aedf13',
              users: 'user',
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
      expect(global.fetch).toHaveBeenNthCalledWith(3, 'https://eu.api.bigdelta.com/v1/ingestion/events', {
        body: JSON.stringify({
          events: [
            {
              event_name: 'Page Viewed',
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
              relations: [
                { object_slug: 'users', record_id: 'user' },
                { object_slug: 'leads', record_id: 'lead' },
              ],
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should set cookie on top accessible domain by default', async () => {
      const client = new Bigdelta({ trackingKey: 'key' });

      await client.identify({ users: 'user' });

      expect(document.cookie).toContain(IDENTIFICATION_KEY);
      // cookie is set on .com domain because in test environment it's permitted
      // in a browser it would be set on the top level domain instead
      // so this still correctly tests if we're selecting the top level domain from the root level upwards
      expect(document.cookie).toContain('domain=.com;');
    });

    it('should honor tracking disabled by default flag', async () => {
      const client = new Bigdelta({
        trackingKey: 'key',
        disableTrackingByDefault: true,
      });

      await client.identify({ users: 'user' });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should load tracking enabled flag from cookies', async () => {
      Cookies.set(TRACKING_ENABLED_STATE_KEY, 'true', { domain: getCookieDomain({} as any), expires: 365 });

      const client = new Bigdelta({
        trackingKey: 'key',
        disableTrackingByDefault: true,
      });

      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should toggle tracking using enable and disable calls', async () => {
      const client = new Bigdelta({ trackingKey: 'key', defaultTrackingConfig: { sessions: { enabled: false } } });

      await client.track({ event_name: 'Page Viewed' });

      client.disableTracking();

      await client.track({ event_name: 'Page Viewed' });

      client.enableTracking();

      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should include default properties on page view track', async () => {
      const client = new Bigdelta({ trackingKey: 'key', defaultTrackingConfig: { sessions: { enabled: false } } });

      await client.trackPageView();

      expect(global.fetch).toHaveBeenCalledWith('https://eu.api.bigdelta.com/v1/ingestion/events', {
        body: JSON.stringify({
          events: [
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
                $utm_campaign: 'campaign',
                $gclid: 'id',
              },
              relations: [{ object_slug: 'anonymous', record_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13' }],
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should use custom name and include override properties on page view track', async () => {
      const client = new Bigdelta({ trackingKey: 'key', defaultTrackingConfig: { sessions: { enabled: false } } });

      await client.trackPageView({ event_name: 'Custom Page View', properties: { my_prop: 'prop_value' } });

      expect(global.fetch).toHaveBeenCalledWith('https://eu.api.bigdelta.com/v1/ingestion/events', {
        body: JSON.stringify({
          events: [
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
                $utm_campaign: 'campaign',
                $gclid: 'id',
                my_prop: 'prop_value',
              },
              relations: [{ object_slug: 'anonymous', record_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13' }],
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should not include marketing attribution on page view track if disabled', async () => {
      const client = new Bigdelta({
        trackingKey: 'key',
        defaultTrackingConfig: { marketingAttribution: false, sessions: { enabled: false } },
      });

      await client.trackPageView();

      expect(global.fetch).toHaveBeenCalledWith('https://eu.api.bigdelta.com/v1/ingestion/events', {
        body: JSON.stringify({
          events: [
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
              relations: [{ object_slug: 'anonymous', record_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13' }],
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should include disabled ip and geolocation tracking flag when it is disabled', async () => {
      const client = new Bigdelta({
        trackingKey: 'key',
        trackIpAndGeolocation: false,
        defaultTrackingConfig: { sessions: { enabled: false } },
      });

      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenCalledWith('https://eu.api.bigdelta.com/v1/ingestion/events', {
        body: JSON.stringify({
          events: [
            {
              event_name: 'Page Viewed',
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
              relations: [{ object_slug: 'anonymous', record_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13' }],
              track_ip_and_geolocation: false,
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should save anonymous id to storage', async () => {
      const client = new Bigdelta({ trackingKey: 'key', defaultTrackingConfig: { sessions: { enabled: false } } });

      await client.track({ event_name: 'Page Viewed' });

      expect(global.fetch).toHaveBeenCalled();
      expect(document.cookie).toContain(IDENTIFICATION_KEY);
    });

    it('should track session excluding certain events', async () => {
      const client = new Bigdelta({
        trackingKey: 'key',
        defaultTrackingConfig: { sessions: { enabled: true, excludeEvents: ['Excluded Event'] } },
      });

      const now = DateTime.utc(2024, 1, 1, 0, 0, 0);

      Settings.now = () => now.toMillis();
      await client.trackPageView();
      await client.track({ event_name: 'Excluded Event' });
      await client.track({ event_name: 'Stale Event', created_at: '2024-12-31T00:00:00.000Z' });

      Settings.now = () => now.plus({ minute: 1 }).toMillis();
      await client.track({ event_name: 'Included Event' });

      const sessionId = client.getSessionId();

      expect(global.fetch).toHaveBeenNthCalledWith(1, 'https://eu.api.bigdelta.com/v1/ingestion/events', {
        body: JSON.stringify({
          events: [
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
                $utm_campaign: 'campaign',
                $gclid: 'id',
              },
              relations: [
                { object_slug: 'anonymous', record_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13' },
                {
                  object_slug: 'sessions',
                  record_id: sessionId,
                  set_once: {
                    $start_event: 'Page View',
                    $start_location: 'https://domain.com/path/index.html?foo=bar&utm_campaign=campaign&gclid=id',
                    $start_path: '/path/index.html',
                    $initial_utm_campaign: 'campaign',
                    $initial_referring_domain: 'www.google.com',
                    $initial_gclid: 'id',
                    $channel_type: 'Paid Search',
                  },
                  set: {
                    $session_start: '2024-01-01T00:00:00.000Z',
                    $session_end: '2024-01-01T00:30:00.000Z',
                    $session_duration_seconds: 1800,
                    $event_count: 1,
                    $pageview_count: 1,
                    $is_bounce: true,
                    $end_event: 'Page View',
                    $end_location: 'https://domain.com/path/index.html?foo=bar&utm_campaign=campaign&gclid=id',
                    $end_path: '/path/index.html',
                  },
                },
              ],
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });

      expect(global.fetch).toHaveBeenNthCalledWith(2, 'https://eu.api.bigdelta.com/v1/ingestion/events', {
        body: JSON.stringify({
          events: [
            {
              event_name: 'Excluded Event',
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
              relations: [{ object_slug: 'anonymous', record_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13' }],
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });

      expect(global.fetch).toHaveBeenNthCalledWith(3, 'https://eu.api.bigdelta.com/v1/ingestion/events', {
        body: JSON.stringify({
          events: [
            {
              event_name: 'Stale Event',
              created_at: '2024-12-31T00:00:00.000Z',
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
              relations: [{ object_slug: 'anonymous', record_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13' }],
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });

      expect(global.fetch).toHaveBeenNthCalledWith(4, 'https://eu.api.bigdelta.com/v1/ingestion/events', {
        body: JSON.stringify({
          events: [
            {
              event_name: 'Included Event',
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
              relations: [
                { object_slug: 'anonymous', record_id: 'f3f7e6b2-0074-457b-9197-6eae16aedf13' },
                {
                  object_slug: 'sessions',
                  record_id: sessionId,
                  set_once: {},
                  set: {
                    $session_start: '2024-01-01T00:00:00.000Z',
                    $session_end: '2024-01-01T00:31:00.000Z',
                    $session_duration_seconds: 1860,
                    $event_count: 2,
                    $pageview_count: 1,
                    $is_bounce: false,
                    $end_event: 'Included Event',
                  },
                },
              ],
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should return identifier that was set', async () => {
      const client = new Bigdelta({ trackingKey: 'key' });

      await client.identify({ identifier_key: 'identifier_value' });
      expect(client.getIdentifier('identifier_key')).toEqual('identifier_value');
      expect(client.getIdentifier('not_existing_key')).toBeUndefined();
    });

    it('should set record properties', async () => {
      const client = new Bigdelta({ trackingKey: 'key' });

      const records = [
        {
          id: 'd63506b4-cea0-4fde-9a0e-cb2edee48929',
          slug: 'user',
          properties: {
            set: {
              name: 'user',
            },
            set_once: {
              email: 'user@email.com',
            },
          },
        },
        {
          id: 'a1514d79-845e-4e6e-947a-d5151f5ec93c',
          slug: 'account',
          properties: {
            set: {
              title: 'account',
            },
            set_once: {
              owner: 'account@email.com',
            },
          },
        },
      ];

      await client.setRecordProperties(records);

      expect(global.fetch).toHaveBeenCalledWith('https://eu.api.bigdelta.com/v1/ingestion/records', {
        body: JSON.stringify({ records }),
        headers: {
          'Content-Type': 'application/json',
          'x-write-key': 'key',
        },
        method: 'POST',
      });
    });

    it('should not track bots', async () => {
      Object.defineProperty(global.window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      });

      const client = new Bigdelta({ trackingKey: 'key' });

      await client.trackPageView();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
