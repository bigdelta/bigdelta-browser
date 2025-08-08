import { getBrowserWithVersion, getOperatingSystem } from '../src/utils/userAgentParser';

describe('User Agent', () => {
  it('should detect iOS', async () => {
    const res = await getOperatingSystem(
      'Mozilla/5.0 (iPhone; CPU iPhone OS like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    );

    expect(res).toBe('iOS');
  });
  it('should parse iOS 17.5.1', async () => {
    const res = await getOperatingSystem(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    );

    expect(res).toBe('iOS 17.5.1');
  });
  it('should parse Mac OS X', async () => {
    const res = await getOperatingSystem(
      'Mozilla/5.0 (iPad; CPU OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    );

    expect(res).toBe('iOS 17.5.1');
  });
  it('should parse Mac OS X', async () => {
    const res = await getOperatingSystem(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    );

    expect(res).toBe('Mac OS X 14.5');
  });

  it('should parse Apple Safari 17.5', async () => {
    const { name, version } = getBrowserWithVersion(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    );
    expect(name).toBe('Apple Safari');
    expect(version).toBe('17.5');
  });

  it('should parse Apple Safari unknown version', async () => {
    const { name, version } = getBrowserWithVersion(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version Safari/605.1.15',
    );
    expect(name).toBe('Apple Safari');
    expect(version).toBe('Unknown');
  });
});
