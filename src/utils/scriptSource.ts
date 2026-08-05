const RECORDING_BUNDLE_SUFFIX = '.recording';

const FALLBACK_RECORDING_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/@bigdelta/bigdelta-browser/dist/index.recording.iife.min.js';

const currentScriptSrc =
  typeof document !== 'undefined' && document.currentScript instanceof HTMLScriptElement
    ? document.currentScript.src
    : undefined;

export const getRecordingScriptUrl = (): string => {
  if (!currentScriptSrc) {
    return FALLBACK_RECORDING_SCRIPT_URL;
  }

  return currentScriptSrc.replace(/\/([^/.]+)(\.[^/]*)$/, `/$1${RECORDING_BUNDLE_SUFFIX}$2`);
};

export const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    if (existing) {
      resolve();

      return;
    }

    const script = document.createElement('script');

    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));

    document.head.appendChild(script);
  });
