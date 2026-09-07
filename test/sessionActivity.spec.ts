import { Bigdelta } from '../src';
import { SESSION_KEY } from '../src/utils/persistentStorage';
import { Session } from '../src/model/session';
import { DateTime, Settings } from 'luxon';

const ACTIVITY_INTERVAL_MS = 30000;

describe('Session activity', () => {
  const originalLuxonNow = Settings.now;
  const start = DateTime.utc(2024, 1, 1, 0, 0, 0);

  const clients: Bigdelta[] = [];

  const buildClient = () => {
    const client = new Bigdelta({
      trackingKey: 'key',
      storageType: 'localStorage',
      defaultTrackingConfig: { sessions: { enabled: true } },
    });

    clients.push(client);

    return client;
  };

  const storedSession = (): Session => JSON.parse(window.localStorage.getItem(SESSION_KEY));

  const at = (minutes: number) => {
    Settings.now = () => start.plus({ minute: minutes }).toMillis();
  };

  const activeAt = (minutes: number, event = 'mousemove') => {
    at(minutes);
    window.dispatchEvent(new Event(event));
    jest.advanceTimersByTime(ACTIVITY_INTERVAL_MS);
  };

  const recordCalls = () =>
    (global.fetch as jest.Mock).mock.calls.filter((call) => call[0].endsWith('/v1/ingestion/records'));

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    window.localStorage.clear();
    at(0);
  });

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.reset()));
    jest.useRealTimers();
    Settings.now = originalLuxonNow;
  });

  it('should extend the session while the visitor is active without navigating', async () => {
    const client = buildClient();

    await client.track({ event_name: 'Page View' });
    expect(storedSession().expires_at).toEqual(start.plus({ minute: 30 }).toISO());

    activeAt(25);

    expect(storedSession().expires_at).toEqual(start.plus({ minute: 55 }).toISO());
    expect(storedSession().last_activity_at).toEqual(start.plus({ minute: 25 }).toISO());
  });

  it('should expire relative to the activity, not to the tick that observed it', async () => {
    const client = buildClient();

    await client.track({ event_name: 'Page View' });

    at(10);
    window.dispatchEvent(new Event('mousemove'));

    at(10.4);
    jest.advanceTimersByTime(ACTIVITY_INTERVAL_MS);

    expect(storedSession().last_activity_at).toEqual(start.plus({ minute: 10 }).toISO());
    expect(storedSession().expires_at).toEqual(start.plus({ minute: 40 }).toISO());
  });

  it('should keep the same session for an event that follows recent activity', async () => {
    const client = buildClient();

    await client.track({ event_name: 'Page View' });
    const sessionId = client.getSessionId();

    activeAt(25, 'scroll');

    at(40);
    await client.track({ event_name: 'Page View' });

    expect(client.getSessionId()).toEqual(sessionId);
  });

  it('should start a new session once the timeout passes with no activity', async () => {
    const client = buildClient();

    await client.track({ event_name: 'Page View' });
    const sessionId = client.getSessionId();

    at(31);
    await client.track({ event_name: 'Page View' });

    expect(client.getSessionId()).not.toEqual(sessionId);
  });

  it('should not extend a session that has already expired', async () => {
    const client = buildClient();

    await client.track({ event_name: 'Page View' });

    activeAt(31, 'click');

    expect(storedSession().expires_at).toEqual(start.plus({ minute: 30 }).toISO());
  });

  it('should report the real duration rather than the timeout window', async () => {
    const client = buildClient();

    await client.track({ event_name: 'Page View' });

    at(2);
    await client.track({ event_name: 'Page View' });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls.at(-1)[1].body);
    const sessionRelation = body.events[0].relations.find((relation) => relation.object_slug === 'sessions');

    expect(sessionRelation.set.$session_end).toEqual(start.plus({ minute: 2 }).toISO());
    expect(sessionRelation.set.$session_duration_seconds).toEqual(120);
  });

  it('should flush the final activity time on pagehide', async () => {
    const client = buildClient();

    await client.track({ event_name: 'Page View' });

    at(5);
    window.dispatchEvent(new Event('mousemove'));
    window.dispatchEvent(new Event('pagehide'));
    await Promise.resolve();

    const calls = recordCalls();

    expect(calls).toHaveLength(1);

    const body = JSON.parse(calls[0][1].body);

    expect(body.records[0].slug).toEqual('sessions');
    expect(body.records[0].id).toEqual(client.getSessionId());
    expect(body.records[0].properties.set.$session_end).toEqual(start.plus({ minute: 5 }).toISO());
    expect(body.records[0].properties.set.$session_duration_seconds).toEqual(300);
    expect(calls[0][1].keepalive).toBe(true);
  });

  it('should not repeat the flush when activity has not moved on', async () => {
    const client = buildClient();

    await client.track({ event_name: 'Page View' });

    at(5);
    window.dispatchEvent(new Event('mousemove'));
    window.dispatchEvent(new Event('pagehide'));
    await Promise.resolve();

    Object.defineProperty(global.document, 'visibilityState', { value: 'hidden', configurable: true });
    window.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();

    expect(recordCalls()).toHaveLength(1);
  });

  it('should leave a stored session alone when session tracking is disabled', async () => {
    const seeded: Session = {
      id: 'seeded-session',
      session_start: start.toISO(),
      last_activity_at: start.toISO(),
      expires_at: start.plus({ minute: 30 }).toISO(),
      event_count: 1,
      pageview_count: 1,
    };

    window.localStorage.setItem(SESSION_KEY, JSON.stringify(seeded));

    clients.push(
      new Bigdelta({
        trackingKey: 'key',
        storageType: 'localStorage',
        defaultTrackingConfig: { sessions: { enabled: false } },
      }),
    );

    at(5);
    window.dispatchEvent(new Event('mousemove'));
    window.dispatchEvent(new Event('pagehide'));
    await Promise.resolve();

    expect(storedSession()).toEqual(seeded);
    expect(recordCalls()).toHaveLength(0);
  });

  it('should measure a full visit that spans reading, navigation and leaving', async () => {
    const client = buildClient();

    await client.trackPageView();
    const sessionId = client.getSessionId();

    at(9);
    window.dispatchEvent(new Event('scroll'));

    at(10);
    await client.trackPageView();

    at(24);
    window.dispatchEvent(new Event('mousemove'));

    window.dispatchEvent(new Event('pagehide'));
    await Promise.resolve();

    expect(client.getSessionId()).toEqual(sessionId);

    const beacon = JSON.parse(recordCalls()[0][1].body).records[0].properties.set;

    expect(beacon.$session_end).toEqual(start.plus({ minute: 24 }).toISO());
    expect(beacon.$session_duration_seconds).toEqual(24 * 60);
  });

  it('should report the true end time when the visitor idles out before leaving', async () => {
    const client = buildClient();

    await client.trackPageView();

    at(4);
    window.dispatchEvent(new Event('click'));

    at(90);
    window.dispatchEvent(new Event('pagehide'));
    await Promise.resolve();

    const beacon = JSON.parse(recordCalls()[0][1].body).records[0].properties.set;

    expect(beacon.$session_end).toEqual(start.plus({ minute: 4 }).toISO());
    expect(beacon.$session_duration_seconds).toEqual(4 * 60);
  });

  it('should not flush when no time passed since the session started', async () => {
    const client = buildClient();

    await client.track({ event_name: 'Page View' });

    window.dispatchEvent(new Event('pagehide'));
    await Promise.resolve();

    expect(recordCalls()).toHaveLength(0);
  });
});
