import { parseReferringDomain } from '../src/utils/referringDomain';

describe('Referring domain', () => {
  it('should return the hostname of an external referrer', () => {
    expect(parseReferringDomain('https://www.google.com/search?q=test', 'domain.com')).toBe('www.google.com');
  });

  it('should return undefined when there is no referrer', () => {
    expect(parseReferringDomain(undefined, 'domain.com')).toBeUndefined();
  });

  it('should return undefined for an empty referrer', () => {
    expect(parseReferringDomain('', 'domain.com')).toBeUndefined();
  });

  it('should return undefined for a malformed referrer', () => {
    expect(parseReferringDomain('not-a-url', 'domain.com')).toBeUndefined();
  });

  describe('self-referral exclusion', () => {
    it('should exclude a referrer from the same host', () => {
      expect(parseReferringDomain('https://domain.com/pricing', 'domain.com')).toBeUndefined();
    });

    it('should exclude a www referrer for a bare current host', () => {
      expect(parseReferringDomain('https://www.domain.com/pricing', 'domain.com')).toBeUndefined();
    });

    it('should exclude a bare referrer for a www current host', () => {
      expect(parseReferringDomain('https://domain.com/pricing', 'www.domain.com')).toBeUndefined();
    });

    it('should exclude a self-referral regardless of case', () => {
      expect(parseReferringDomain('https://DOMAIN.com/pricing', 'domain.com')).toBeUndefined();
    });

    it('should exclude localhost self-referrals', () => {
      expect(parseReferringDomain('https://localhost:5173/funnels', 'localhost')).toBeUndefined();
    });

    it('should not exclude a different host that shares a suffix', () => {
      expect(parseReferringDomain('https://notdomain.com/x', 'domain.com')).toBe('notdomain.com');
    });

    it('should keep a subdomain referrer, which is a distinct host', () => {
      expect(parseReferringDomain('https://app.domain.com/x', 'domain.com')).toBe('app.domain.com');
    });

    it('should not exclude a different domain sharing a public suffix', () => {
      expect(parseReferringDomain('https://bbc.co.uk/news', 'mysite.co.uk')).toBe('bbc.co.uk');
    });

    it('should keep the referrer when the current hostname is unknown', () => {
      expect(parseReferringDomain('https://domain.com/pricing', undefined)).toBe('domain.com');
    });
  });
});
