export const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

export const PAID_CLICK_ID_PARAMS = [
  'adview_query_id',
  'cjevent',
  'dclid',
  'epik',
  'fbclid',
  'gad_source',
  'gbraid',
  'gclid',
  'irclickid',
  'ko_click_id',
  'li_fat_id',
  'msclkid',
  'oppref',
  'qclid',
  'rdt_cid',
  'rtd_cid',
  'ScCid',
  'ttclid',
  'twclid',
  'wbraid',
];

export const AI_CLICK_ID_PARAMS = ['adview_query_id', 'oppref'];

const PASSIVE_CLICK_ID_PARAMS = ['olref', 'srsltid'];

export const CLICK_ID_PARAMS = [...PAID_CLICK_ID_PARAMS, ...PASSIVE_CLICK_ID_PARAMS];

export const ATTRIBUTION_PARAMS = [...UTM_PARAMS, 'referring_domain', ...CLICK_ID_PARAMS];

export const toAttributionPropertyName = (param: string): string => param.toLowerCase();

export const getMarketingAttributionParameters = (url: string): Record<string, string> => {
  return {
    ...getPropertiesFromQueryParams(url, UTM_PARAMS),
    ...getPropertiesFromQueryParams(url, CLICK_ID_PARAMS),
  };
};

const getPropertiesFromQueryParams = (url: string, params: string[]): Record<string, string> => {
  let queryString = url?.split('?')[1];
  return Object.fromEntries(
    Array.from(new URLSearchParams(queryString).entries())
      .filter(([key]) => params.includes(key))
      .map(([key, value]) => [`$${toAttributionPropertyName(key)}`, value]),
  );
};
