import { getWindowId, WINDOW_KEY } from '../src/utils/windowId';

describe('getWindowId', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('persists the same id across calls within a tab', () => {
    const windowId = getWindowId();

    expect(getWindowId()).toEqual(windowId);
    expect(sessionStorage.getItem(WINDOW_KEY)).toEqual(windowId);
  });

  it('reuses an id already stored for the tab', () => {
    sessionStorage.setItem(WINDOW_KEY, 'existing-window-id');

    expect(getWindowId()).toEqual('existing-window-id');
  });

  it('generates a new id when the tab has none', () => {
    const windowId = getWindowId();

    expect(windowId).toHaveLength(36);
  });

  it('falls back to a generated id when session storage is unavailable', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(getWindowId()).toHaveLength(36);

    jest.restoreAllMocks();
  });
});
