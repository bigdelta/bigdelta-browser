import { initialAttributionProperties, initialAttributionRecordProperties } from '../src/utils/attribution';

describe('Initial attribution', () => {
  describe('record properties', () => {
    it('should send the initial campaign as an ad campaign struct', () => {
      const result = initialAttributionRecordProperties({ $utm_campaign: '24059342099', $utm_source: 'google' });

      expect(result.initial_utm_campaign).toEqual({ $type: 'ad_campaign', id: '24059342099' });
      expect(result.initial_utm_source).toBe('google');
    });

    it('should leave the initial campaign empty when no campaign was captured', () => {
      const result = initialAttributionRecordProperties({ $referring_domain: 'www.google.com' });

      expect(result.initial_utm_campaign).toBeUndefined();
      expect(result.initial_referring_domain).toBe('www.google.com');
    });

    it('should not wrap an empty campaign value', () => {
      const result = initialAttributionRecordProperties({ $utm_campaign: '' });

      expect(result.initial_utm_campaign).toBe('');
    });

    it('should classify the channel from the raw campaign value', () => {
      const result = initialAttributionRecordProperties({
        $utm_campaign: 'spring_launch',
        $referring_domain: 'www.google.com',
        $gclid: 'id',
      });

      expect(result.channel_type).toBe('Paid Search');
    });
  });

  describe('system properties', () => {
    it('should keep the initial campaign as a plain string on sessions and events', () => {
      const result = initialAttributionProperties({ $utm_campaign: '24059342099' });

      expect(result.$initial_utm_campaign).toBe('24059342099');
    });
  });
});
