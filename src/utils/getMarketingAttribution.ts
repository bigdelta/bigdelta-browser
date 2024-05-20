const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

const CLICK_ID_PARAMS = [
  'dclid',
  'fbclid',
  'gbraid',
  'gclid',
  'ko_click_id',
  'li_fat_id',
  'msclkid',
  'rtd_cid',
  'ttclid',
  'twclid',
  'wbraid',
];

export const getMarketingAttributionParameters = (url: string): Record<string, string> => {
  return {
    ...getQueryParams(url, UTM_PARAMS),
    ...getQueryParams(url, CLICK_ID_PARAMS),
  };
};

const getQueryParams = (url: string, params: string[]): Record<string, string> => {
  let queryString = url?.split('?')[1];
  return Object.fromEntries(
    Array.from(new URLSearchParams(queryString).entries()).filter(([key, value]) => params.includes(key)),
  );
};
