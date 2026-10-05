import { Bigdelta } from '../src';
import { DateTime, Settings } from 'luxon';

const ACTIVITY_INTERVAL_MS = 30000;

describe('Presence', () => {
  const originalLuxonNow = Settings.now;
  const start = DateTime.utc(2024, 1, 1, 0, 0, 0);

  const clients: Bigdelta[] = [];

  const buildClient = () => {
    const client = new Bigdelta({
      trackingKey: 'key',
      storageType: 'localStorage',
    });

    clients.push(client);

    return client;
  };

  const at = (minutes: number) => {
    Settings.now = () => start.plus({ minute: minutes }).toMillis();
  };

  const tickAt = async (minutes: number) => {
    at(minutes);
    await jest.advanceTimersByTimeAsync(ACTIVITY_INTERVAL_MS);
  };

  const presenceCalls = () => (global.fetch as jest.Mock).mock.calls.filter((call) => call[0].endsWith('/v1/presence'));

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

  it('should not send presence while the visitor is inactive', async () => {
    const client = buildClient();

    await client.track({ event_name: 'Page View' });
    await tickAt(1);

    expect(presenceCalls()).toHaveLength(1);
  });

  it('should keep sending presence while a touch visitor taps', async () => {
    const client = buildClient();

    await client.track({ event_name: 'Page View' });

    at(1);
    window.dispatchEvent(new Event('touchstart'));
    await tickAt(1.2);

    expect(presenceCalls()).toHaveLength(2);
  });

  it('should keep sending presence while the visitor scrolls inside a scroll container', async () => {
    const client = buildClient();
    const container = document.createElement('div');
    document.body.appendChild(container);

    await client.track({ event_name: 'Page View' });

    at(1);
    container.dispatchEvent(new Event('scroll', { bubbles: false }));
    await tickAt(1.2);

    expect(presenceCalls()).toHaveLength(2);

    container.remove();
  });

  it('should stop counting activity after tracking is disabled', async () => {
    const client = buildClient();

    await client.track({ event_name: 'Page View' });

    client.disableTracking();

    at(1);
    window.dispatchEvent(new Event('touchstart'));
    await tickAt(1.2);

    expect(presenceCalls()).toHaveLength(1);
  });
});
