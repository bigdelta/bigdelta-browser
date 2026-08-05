import { v4 as uuid } from 'uuid';

export const WINDOW_KEY = 'bigdelta_analytics_window';

export const getWindowId = (): string => {
  if (typeof sessionStorage === 'undefined') {
    return uuid();
  }

  try {
    const existingWindowId = sessionStorage.getItem(WINDOW_KEY);

    if (existingWindowId) {
      return existingWindowId;
    }

    const windowId = uuid();

    sessionStorage.setItem(WINDOW_KEY, windowId);

    return windowId;
  } catch {
    return uuid();
  }
};
