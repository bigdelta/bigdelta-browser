import { getMarketingAttributionParameters } from '../src/utils/marketingAttribution';

describe('Marketing attribution parameters', () => {
  it('should capture utm parameters', () => {
    const result = getMarketingAttributionParameters('https://site.com/?utm_source=google&utm_medium=cpc');

    expect(result).toEqual({ $utm_source: 'google', $utm_medium: 'cpc' });
  });

  it('should capture the ChatGPT ad click id', () => {
    const result = getMarketingAttributionParameters('https://site.com/?oppref=gAAAAABq&olref=gAAAAABh');

    expect(result).toEqual({ $oppref: 'gAAAAABq', $olref: 'gAAAAABh' });
  });

  it('should capture the Google AI Mode query id', () => {
    const result = getMarketingAttributionParameters('https://site.com/?adview_query_id=abc123');

    expect(result).toEqual({ $adview_query_id: 'abc123' });
  });

  it('should store the Snapchat click id under a lowercase property name', () => {
    const result = getMarketingAttributionParameters('https://site.com/?ScCid=snap123');

    expect(result).toEqual({ $sccid: 'snap123' });
  });

  it('should capture newer platform click ids', () => {
    const result = getMarketingAttributionParameters('https://site.com/?rdt_cid=r1&epik=p1&irclickid=i1');

    expect(result).toEqual({ $rdt_cid: 'r1', $epik: 'p1', $irclickid: 'i1' });
  });

  it('should ignore unrelated query parameters', () => {
    const result = getMarketingAttributionParameters('https://site.com/?foo=bar&campaign_id=cmpn_1');

    expect(result).toEqual({});
  });

  it('should return nothing when the url has no query string', () => {
    expect(getMarketingAttributionParameters('https://site.com/')).toEqual({});
  });
});
