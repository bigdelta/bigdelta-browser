import { getChannelType } from '../src/utils/channelType';

describe('Channel type', () => {
  describe('direct traffic', () => {
    it('should classify a visit with no referrer and no utms as Direct', () => {
      expect(getChannelType(undefined, undefined, undefined, undefined, false)).toBe('Direct');
    });

    it('should classify null attribution as Direct', () => {
      expect(getChannelType(null, null, null, null, false)).toBe('Direct');
    });

    it('should classify empty string attribution as Direct', () => {
      expect(getChannelType('', '', '', '', false)).toBe('Direct');
    });

    it('should classify the $direct sentinel as Direct', () => {
      expect(getChannelType(undefined, undefined, undefined, '$direct', false)).toBe('Direct');
    });

    it('should classify an explicit direct utm source as Direct', () => {
      expect(getChannelType(undefined, undefined, '(direct)', undefined, false)).toBe('Direct');
    });

    it('should not classify as Direct when a utm medium is present', () => {
      expect(getChannelType(undefined, 'referral', undefined, undefined, false)).toBe('Referral');
    });

    it('should not classify as Direct when a referrer is present', () => {
      expect(getChannelType(undefined, undefined, undefined, 'www.google.com', false)).toBe('Organic Search');
    });
  });

  describe('normalization', () => {
    it('should match utm medium and source case-insensitively', () => {
      expect(getChannelType(undefined, 'CPC', 'Google', undefined, false)).toBe('Paid Search');
    });

    it('should match referring domain case-insensitively', () => {
      expect(getChannelType(undefined, undefined, undefined, 'WWW.Google.COM', false)).toBe('Organic Search');
    });

    it('should match the cross-network campaign case-insensitively', () => {
      expect(getChannelType('Cross-Network', undefined, undefined, undefined, false)).toBe('Cross Network');
    });

    it('should ignore surrounding whitespace', () => {
      expect(getChannelType(undefined, ' cpc ', ' google ', undefined, false)).toBe('Paid Search');
    });

    it('should not throw on non-string input', () => {
      expect(() => getChannelType(1 as any, {} as any, [] as any, true as any, false)).not.toThrow();
    });
  });

  describe('existing classifications', () => {
    it('should classify a click id with no other signal as Paid Unknown', () => {
      expect(getChannelType(undefined, undefined, undefined, undefined, true)).toBe('Paid Unknown');
    });

    it('should classify an unrecognised referrer as Referral', () => {
      expect(getChannelType(undefined, undefined, undefined, 'some-random-blog.com', false)).toBe('Referral');
    });

    it('should prefer a specific channel over the Referral fallback', () => {
      expect(getChannelType(undefined, undefined, undefined, 'www.google.com', false)).toBe('Organic Search');
    });

    it('should classify an unrecognised utm source with no referrer as Unknown', () => {
      expect(getChannelType(undefined, undefined, 'some-partner', undefined, false)).toBe('Unknown');
    });

    it('should classify an email medium as Email', () => {
      expect(getChannelType(undefined, 'email', undefined, undefined, false)).toBe('Email');
    });
  });
});
