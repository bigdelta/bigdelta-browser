import { record } from 'rrweb';
import type { eventWithTime } from '@rrweb/types';
import { v4 as uuid } from 'uuid';
import { SessionRecorderOptions } from '../model/sessionRecording';
import { getWindowId } from '../utils/windowId';

const DEFAULT_FLUSH_INTERVAL_MS = 15000;
const DEFAULT_MAX_CHUNK_EVENTS = 200;
const DEFAULT_MAX_CHUNK_SIZE_BYTES = 512 * 1024;
const DEFAULT_MAX_RECORDING_DURATION_MS = 30 * 60 * 1000;

const MASK_TEXT_CLASS = 'bigdelta-mask';
const BLOCK_CLASS = 'bigdelta-block';
const ALL_TEXT_SELECTOR = '*';

const ALWAYS_MASKED_INPUTS = {
  password: true,
  email: true,
  tel: true,
} as const;

export class SessionRecorder {
  private readonly pageLoadId = uuid();
  private readonly windowId = getWindowId();
  private readonly startedAt = new Date().toISOString();

  private buffer: eventWithTime[] = [];
  private bufferSizeBytes = 0;
  private stopRecording: (() => void) | null = null;
  private flushIntervalId: ReturnType<typeof setInterval> | null = null;

  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      void this.flush();
    }
  };

  private readonly handlePageHide = () => {
    this.flush(true);
  };

  constructor(private config: SessionRecorderOptions) {}

  public start(): void {
    if (this.stopRecording) {
      return;
    }

    this.stopRecording =
      record({
        emit: (event) => this.onEvent(event),
        maskAllInputs: true,
        maskInputOptions: ALWAYS_MASKED_INPUTS,
        maskTextClass: MASK_TEXT_CLASS,
        maskTextSelector: this.buildMaskTextSelector(),
        maskTextFn: this.config.unmaskTextSelector ? (text, element) => this.maskText(text, element) : undefined,
        blockClass: BLOCK_CLASS,
        blockSelector: this.config.blockSelector,
        recordCanvas: false,
        collectFonts: false,
      }) ?? null;

    this.flushIntervalId = setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS);

    window.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pagehide', this.handlePageHide);
  }

  public stop(): void {
    if (!this.stopRecording) {
      return;
    }

    this.stopRecording();
    this.stopRecording = null;

    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }

    window.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('pagehide', this.handlePageHide);

    this.flush(true);
  }

  private onEvent(event: eventWithTime): void {
    if (this.hasReachedDurationLimit()) {
      this.stop();

      return;
    }

    this.buffer.push(event);
    this.bufferSizeBytes += JSON.stringify(event).length;

    const reachedEventLimit = this.buffer.length >= (this.config.maxChunkEvents ?? DEFAULT_MAX_CHUNK_EVENTS);
    const reachedSizeLimit = this.bufferSizeBytes >= (this.config.maxChunkSizeBytes ?? DEFAULT_MAX_CHUNK_SIZE_BYTES);

    if (reachedEventLimit || reachedSizeLimit) {
      void this.flush();
    }
  }

  private maskText(text: string, element: HTMLElement | null): string {
    if (element && this.config.unmaskTextSelector && element.closest(this.config.unmaskTextSelector)) {
      return text;
    }

    return text.replace(/[\S]/g, '*');
  }

  private buildMaskTextSelector(): string | undefined {
    if (this.config.maskAllText) {
      return ALL_TEXT_SELECTOR;
    }

    return this.config.maskTextSelector;
  }

  private hasReachedDurationLimit(): boolean {
    const maxDurationMs = this.config.maxRecordingDurationMs ?? DEFAULT_MAX_RECORDING_DURATION_MS;

    return Date.now() - Date.parse(this.startedAt) >= maxDurationMs;
  }

  private buildPayload(events: eventWithTime[]) {
    return {
      session_id: this.config.getSessionId(),
      window_id: this.windowId,
      page_load_id: this.pageLoadId,
      started_at: this.startedAt,
      chunk_started_at_ms: events[0].timestamp,
      relation_ids: this.config.getRelationIds(),
      page_url: window.location.href,
      events,
    };
  }

  private flush(keepalive = false): Promise<void> | void {
    if (this.buffer.length === 0) {
      return;
    }

    const events = this.buffer;

    this.buffer = [];
    this.bufferSizeBytes = 0;

    return this.upload(JSON.stringify(this.buildPayload(events)), keepalive);
  }

  private async upload(body: string, keepalive: boolean): Promise<void> {
    try {
      await fetch(`${this.config.baseURL}/v1/ingestion/recordings`, {
        method: 'POST',
        keepalive,
        headers: {
          'x-tracking-key': this.config.trackingKey,
          'Content-Type': 'application/json',
        },
        body,
      });
    } catch (e) {
      console.warn('Error occurred when uploading session recording chunk', e);
    }
  }
}
