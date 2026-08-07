import { record } from 'rrweb';
import type { eventWithTime } from '@rrweb/types';
import { v4 as uuid } from 'uuid';
import { DateTime } from 'luxon';
import { SessionRecorderOptions } from '../model/sessionRecording';
import { getWindowId } from '../utils/windowId';

const DEFAULT_FLUSH_INTERVAL_MS = 15000;
const MIN_FLUSH_INTERVAL_MS = 5000;
const MAX_FLUSH_INTERVAL_MS = 30000;

const DEFAULT_MAX_RECORDING_DURATION_MS = 30 * 60 * 1000;
const MIN_MAX_RECORDING_DURATION_MS = 60 * 1000;
const MAX_MAX_RECORDING_DURATION_MS = 2 * 60 * 60 * 1000;

const MAX_CHUNK_EVENTS = 200;
const MAX_CHUNK_SIZE_BYTES = 512 * 1024;

const KEEPALIVE_MAX_BYTES = 64 * 1024;

const MASK_TEXT_CLASS = 'bigdelta-mask';
const BLOCK_CLASS = 'bigdelta-block';
const ALL_TEXT_SELECTOR = '*';

export const PAGE_CONTEXT_TAG = 'bigdelta.page_context';

const ALWAYS_MASKED_INPUTS = {
  password: true,
  email: true,
  tel: true,
} as const;

export class SessionRecorder {
  private readonly pageLoadId = uuid();
  private readonly windowId = getWindowId();
  private readonly startedAt = DateTime.now().toUTC();
  private readonly flushIntervalMs: number;
  private readonly maxRecordingDurationMs: number;

  private buffer: eventWithTime[] = [];
  private bufferSizeBytes = 0;
  private stopRecording: (() => void) | null = null;
  private flushIntervalId: ReturnType<typeof setInterval> | null = null;
  private pagePath = '';
  private isEmittingPageContext = false;
  private needsPageContext = false;

  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      void this.flush();
    }
  };

  private readonly handlePageHide = () => {
    this.flush(true);
  };

  constructor(private config: SessionRecorderOptions) {
    this.flushIntervalMs = SessionRecorder.clamp(
      config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
      MIN_FLUSH_INTERVAL_MS,
      MAX_FLUSH_INTERVAL_MS,
    );
    this.maxRecordingDurationMs = SessionRecorder.clamp(
      config.maxRecordingDurationMs ?? DEFAULT_MAX_RECORDING_DURATION_MS,
      MIN_MAX_RECORDING_DURATION_MS,
      MAX_MAX_RECORDING_DURATION_MS,
    );
  }

  private static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  public start(): void {
    if (this.stopRecording) {
      return;
    }

    this.pagePath = SessionRecorder.getPagePath();

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
    }, this.flushIntervalMs);

    window.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pagehide', this.handlePageHide);

    this.emitPageContext();
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

    if (this.needsPageContext || SessionRecorder.getPagePath() !== this.pagePath) {
      this.emitPageContext();
    }

    this.buffer.push(event);
    this.bufferSizeBytes += JSON.stringify(event).length;

    const reachedEventLimit = this.buffer.length >= MAX_CHUNK_EVENTS;
    const reachedSizeLimit = this.bufferSizeBytes >= MAX_CHUNK_SIZE_BYTES;

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
    return DateTime.now().diff(this.startedAt).toMillis() >= this.maxRecordingDurationMs;
  }

  private static getPagePath(): string {
    return `${window.location.origin}${window.location.pathname}`;
  }

  private static getDocumentHeight(): number {
    const { documentElement, body } = document;

    return Math.max(
      documentElement?.scrollHeight ?? 0,
      documentElement?.offsetHeight ?? 0,
      body?.scrollHeight ?? 0,
      body?.offsetHeight ?? 0,
    );
  }

  private emitPageContext(): void {
    if (!this.stopRecording || this.isEmittingPageContext) {
      return;
    }

    this.isEmittingPageContext = true;
    this.needsPageContext = false;
    this.pagePath = SessionRecorder.getPagePath();

    try {
      record.addCustomEvent(PAGE_CONTEXT_TAG, {
        url: window.location.href,
        documentHeight: SessionRecorder.getDocumentHeight(),
      });
    } finally {
      this.isEmittingPageContext = false;
    }
  }

  private buildPayload(events: eventWithTime[]) {
    return {
      session_id: this.config.getSessionId(),
      window_id: this.windowId,
      page_load_id: this.pageLoadId,
      started_at: this.startedAt.toISO(),
      chunk_started_at_ms: events[0].timestamp,
      relation_ids: this.config.getRelationIds(),
      page_url: window.location.href,
      events,
    };
  }

  private flush(keepalive = false): void {
    if (this.buffer.length === 0) {
      return;
    }

    const events = this.buffer;

    this.buffer = [];
    this.bufferSizeBytes = 0;
    this.needsPageContext = true;

    return this.upload(JSON.stringify(this.buildPayload(events)), keepalive);
  }

  private upload(body: string, keepalive: boolean): void {
    void fetch(`${this.config.baseURL}/v1/ingestion/recordings`, {
      method: 'POST',
      keepalive: keepalive && new Blob([body]).size <= KEEPALIVE_MAX_BYTES,
      headers: {
        'x-tracking-key': this.config.trackingKey,
        'Content-Type': 'application/json',
      },
      body,
    }).catch((e) => console.warn('Error occurred when uploading session recording chunk', e));
  }
}
