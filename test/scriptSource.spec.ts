import { getRecordingScriptUrl } from '../src/utils/scriptSource';

const setCurrentScript = (src: string | undefined) => {
  Object.defineProperty(document, 'currentScript', {
    configurable: true,
    value: src ? Object.assign(document.createElement('script'), { src }) : null,
  });
};

describe('getRecordingScriptUrl', () => {
  afterEach(() => {
    jest.resetModules();
    setCurrentScript(undefined);
  });

  it.each([
    [
      'https://cdn.jsdelivr.net/npm/@bigdelta/bigdelta-browser/dist/index.iife.min.js',
      'https://cdn.jsdelivr.net/npm/@bigdelta/bigdelta-browser/dist/index.recording.iife.min.js',
    ],
    [
      'https://cdn.jsdelivr.net/npm/@bigdelta/bigdelta-browser@1.29.0/dist/index.iife.min.js',
      'https://cdn.jsdelivr.net/npm/@bigdelta/bigdelta-browser@1.29.0/dist/index.recording.iife.min.js',
    ],
    ['https://example.com/js/index.iife.js', 'https://example.com/js/index.recording.iife.js'],
    ['https://example.com/js/index.iife.min.js?v=2', 'https://example.com/js/index.recording.iife.min.js?v=2'],
    [
      'https://bigdelta.com/vendor/bigdelta-browser-1.29.0.min.js',
      'https://bigdelta.com/vendor/bigdelta-browser-1.29.0.recording.min.js',
    ],
    [
      'https://bigdelta.com/vendor/bigdelta-browser-1.29.0.min.js?v=3',
      'https://bigdelta.com/vendor/bigdelta-browser-1.29.0.recording.min.js?v=3',
    ],
    [
      'https://bigdelta.com/vendor/bigdelta-browser-1.29.0.js',
      'https://bigdelta.com/vendor/bigdelta-browser-1.29.0.recording.js',
    ],
    [
      'https://bigdelta.com/vendor/bigdelta-browser.min.js',
      'https://bigdelta.com/vendor/bigdelta-browser.recording.min.js',
    ],
  ])('derives the recording bundle url from %s', async (src, expected) => {
    setCurrentScript(src);

    const { getRecordingScriptUrl: derive } = await import('../src/utils/scriptSource');

    expect(derive()).toEqual(expected);
  });

  it('falls back to the published bundle when there is no current script', () => {
    expect(getRecordingScriptUrl()).toEqual(
      'https://cdn.jsdelivr.net/npm/@bigdelta/bigdelta-browser/dist/index.recording.iife.min.js',
    );
  });
});
