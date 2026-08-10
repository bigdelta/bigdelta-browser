import type { eventWithTime } from '@rrweb/types';
import { record } from 'rrweb';
import { PAGE_CONTEXT_TAG, SessionRecorder } from '../src/recording/sessionRecorder';

jest.mock('rrweb', () => ({
  record: Object.assign(jest.fn(), { addCustomEvent: jest.fn() }),
}));

const recordMock = record as unknown as jest.Mock;
const addCustomEventMock = record.addCustomEvent as unknown as jest.Mock;

const buildEvent = (timestamp: number): eventWithTime => ({ type: 3, data: {}, timestamp }) as eventWithTime;

interface RecordedEvent {
  type: number;
  timestamp: number;
  data?: { tag?: string; payload?: { url: string; documentHeight: number } };
}

const pageContextEvents = (events: RecordedEvent[]) =>
  events.filter((event) => event.type === 5 && event.data?.tag === PAGE_CONTEXT_TAG);

const buildRecorder = (overrides = {}) =>
  new SessionRecorder({
    enabled: true,
    baseURL: 'https://api.test',
    trackingKey: 'tracking-key',
    getSessionId: () => 'session-1',
    getRelationIds: () => ({ users: 'user-1' }),
    ...overrides,
  });

const lastRequestBody = () => {
  const calls = (global.fetch as jest.Mock).mock.calls;

  return JSON.parse(calls[calls.length - 1][1].body);
};

describe('SessionRecorder', () => {
  let emit: (event: eventWithTime) => void;

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    recordMock.mockImplementation((options: { emit: (event: eventWithTime) => void }) => {
      emit = options.emit;

      return jest.fn();
    });
    addCustomEventMock.mockImplementation((tag: string, payload: unknown) => {
      emit({ type: 5, data: { tag, payload }, timestamp: Date.now() } as unknown as eventWithTime);
    });
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('uploads the buffered events on the flush interval', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    emit(buildEvent(1000));
    expect(global.fetch).not.toHaveBeenCalled();

    jest.advanceTimersByTime(15000);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toEqual('https://api.test/v1/ingestion/recordings');
  });

  it('sends the session, window and page load identifiers with each chunk', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    emit(buildEvent(1000));
    jest.advanceTimersByTime(15000);

    const body = lastRequestBody();

    expect(body.session_id).toEqual('session-1');
    expect(body.window_id).toHaveLength(36);
    expect(body.page_load_id).toHaveLength(36);
    expect(body.relation_ids).toEqual({ users: 'user-1' });
  });

  it('derives chunk_started_at_ms from the first event so chunks do not collide', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    emit(buildEvent(1000));
    jest.advanceTimersByTime(15000);
    const firstChunk = lastRequestBody();

    emit(buildEvent(20000));
    jest.advanceTimersByTime(15000);
    const secondChunk = lastRequestBody();

    expect(firstChunk.chunk_started_at_ms).toEqual(firstChunk.events[0].timestamp);
    expect(secondChunk.chunk_started_at_ms).toEqual(secondChunk.events[0].timestamp);
    expect(firstChunk.chunk_started_at_ms).not.toEqual(secondChunk.chunk_started_at_ms);
    expect(firstChunk.page_load_id).toEqual(secondChunk.page_load_id);
  });

  it('flushes early once the event limit is reached', () => {
    const recorder = buildRecorder();
    recorder.start();

    for (let i = 0; i < 198; i++) {
      emit(buildEvent(1000 + i));
    }

    expect(global.fetch).not.toHaveBeenCalled();

    emit(buildEvent(1199));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(lastRequestBody().events).toHaveLength(200);
    expect(pageContextEvents(lastRequestBody().events)).toHaveLength(1);
  });

  it('does not keep uploading while the page sits idle', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    jest.advanceTimersByTime(45000);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('stops recording once the maximum duration is reached', () => {
    const stopRecording = jest.fn();
    recordMock.mockImplementation((options: { emit: (event: eventWithTime) => void }) => {
      emit = options.emit;

      return stopRecording;
    });

    const recorder = buildRecorder({ maxRecordingDurationMs: 60000 });
    recorder.start();

    jest.advanceTimersByTime(61000);
    emit(buildEvent(Date.now()));

    expect(stopRecording).toHaveBeenCalled();
  });

  it('clamps a flush interval below the minimum', () => {
    const recorder = buildRecorder({ flushIntervalMs: 100 });
    recorder.start();

    emit(buildEvent(1000));
    jest.advanceTimersByTime(100);

    expect(global.fetch).not.toHaveBeenCalled();

    jest.advanceTimersByTime(4900);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('clamps a maximum recording duration below the minimum', () => {
    const stopRecording = jest.fn();
    recordMock.mockImplementation((options: { emit: (event: eventWithTime) => void }) => {
      emit = options.emit;

      return stopRecording;
    });

    const recorder = buildRecorder({ maxRecordingDurationMs: 1000 });
    recorder.start();

    jest.advanceTimersByTime(2000);
    emit(buildEvent(Date.now()));

    expect(stopRecording).not.toHaveBeenCalled();

    jest.advanceTimersByTime(59000);
    emit(buildEvent(Date.now()));

    expect(stopRecording).toHaveBeenCalled();
  });

  it('starts each chunk with the page context so a chunk describes its own page', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    emit(buildEvent(1000));
    jest.advanceTimersByTime(15000);

    const contexts = pageContextEvents(lastRequestBody().events);

    expect(contexts).toHaveLength(1);
    expect(contexts[0].data?.payload?.url).toEqual('http://subdomain.mytestdomain.com/');
  });

  it('emits the page context again when the path changes', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    emit(buildEvent(1000));
    window.history.pushState({}, '', '/settings');
    emit(buildEvent(2000));

    jest.advanceTimersByTime(15000);

    const contexts = pageContextEvents(lastRequestBody().events);

    expect(contexts.map((context) => context.data?.payload?.url)).toEqual([
      'http://subdomain.mytestdomain.com/',
      'http://subdomain.mytestdomain.com/settings',
    ]);
  });

  it('emits the page context before the event that follows the navigation', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    window.history.pushState({}, '', '/settings');
    emit(buildEvent(2000));

    jest.advanceTimersByTime(15000);

    const events = lastRequestBody().events;
    const contextIndex = events.findIndex(
      (event) => event.data?.tag === PAGE_CONTEXT_TAG && event.data.payload.url.endsWith('/settings'),
    );
    const eventIndex = events.findIndex((event) => event.timestamp === 2000);

    expect(contextIndex).toBeLessThan(eventIndex);
  });

  it('does not emit the page context when only query parameters change', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    emit(buildEvent(1000));
    window.history.pushState({}, '', '/?query=a');
    emit(buildEvent(2000));
    window.history.pushState({}, '', '/?query=ab');
    emit(buildEvent(3000));

    jest.advanceTimersByTime(15000);

    expect(pageContextEvents(lastRequestBody().events)).toHaveLength(1);
  });

  it('emits the page context once per navigation rather than recursing', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    window.history.pushState({}, '', '/settings');
    emit(buildEvent(2000));

    jest.advanceTimersByTime(15000);

    expect(addCustomEventMock).toHaveBeenCalledTimes(2);
  });

  it('reports the document height with the page context', () => {
    jest.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(4321);

    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    emit(buildEvent(1000));
    jest.advanceTimersByTime(15000);

    expect(pageContextEvents(lastRequestBody().events)[0].data?.payload?.documentHeight).toEqual(4321);
  });

  it('does not emit a page context after recording has stopped', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    emit(buildEvent(1000));
    addCustomEventMock.mockClear();

    recorder.stop();

    expect(addCustomEventMock).not.toHaveBeenCalled();
  });

  it('flushes what is buffered when stopped', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    emit(buildEvent(1000));
    recorder.stop();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][1].keepalive).toEqual(true);
  });

  it('drops keepalive on a final upload that would exceed the 64KiB limit', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    emit({ type: 3, data: { text: 'x'.repeat(70 * 1024) }, timestamp: 1000 } as unknown as eventWithTime);
    recorder.stop();

    const request = (global.fetch as jest.Mock).mock.calls[0][1];

    expect(request.body.length).toBeGreaterThan(64 * 1024);
    expect(request.keepalive).toEqual(false);
  });

  it('sends the final upload uncompressed so unload never waits on compression', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    emit(buildEvent(1000));
    recorder.stop();

    const request = (global.fetch as jest.Mock).mock.calls[0][1];

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(request.headers['Content-Encoding']).toBeUndefined();
    expect(typeof request.body).toEqual('string');
  });

  it('uploads uncompressed when the browser has no CompressionStream', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    emit(buildEvent(1000));
    jest.advanceTimersByTime(15000);

    const request = (global.fetch as jest.Mock).mock.calls[0][1];

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(request.headers['Content-Encoding']).toBeUndefined();
    expect(JSON.parse(request.body).events).toHaveLength(2);
  });
});
