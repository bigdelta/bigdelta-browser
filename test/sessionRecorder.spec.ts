import type { eventWithTime } from '@rrweb/types';
import { record } from 'rrweb';
import { SessionRecorder } from '../src/recording/sessionRecorder';

jest.mock('rrweb', () => ({
  record: jest.fn(),
}));

const recordMock = record as unknown as jest.Mock;

const buildEvent = (timestamp: number): eventWithTime => ({ type: 3, data: {}, timestamp }) as eventWithTime;

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

    expect(firstChunk.chunk_started_at_ms).toEqual(1000);
    expect(secondChunk.chunk_started_at_ms).toEqual(20000);
    expect(firstChunk.page_load_id).toEqual(secondChunk.page_load_id);
  });

  it('flushes early once the event limit is reached', () => {
    const recorder = buildRecorder();
    recorder.start();

    for (let i = 0; i < 199; i++) {
      emit(buildEvent(1000 + i));
    }

    expect(global.fetch).not.toHaveBeenCalled();

    emit(buildEvent(1199));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(lastRequestBody().events).toHaveLength(200);
  });

  it('does not upload when there is nothing buffered', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    jest.advanceTimersByTime(45000);

    expect(global.fetch).not.toHaveBeenCalled();
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

  it('flushes what is buffered when stopped', () => {
    const recorder = buildRecorder({ flushIntervalMs: 15000 });
    recorder.start();

    emit(buildEvent(1000));
    recorder.stop();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][1].keepalive).toEqual(true);
  });
});
