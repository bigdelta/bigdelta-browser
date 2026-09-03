import { getChannelType } from './channelType';

const CLICK_ID_PROPERTIES = [
  '$dclid',
  '$fbclid',
  '$gbraid',
  '$gclid',
  '$ko_click_id',
  '$li_fat_id',
  '$msclkid',
  '$rtd_cid',
  '$ttclid',
  '$twclid',
  '$wbraid',
];

const buildAttribution = (properties: Record<string, any> | null | undefined, prefix: string): Record<string, any> => {
  properties = properties || {};
  return {
    [`${prefix}initial_utm_source`]: properties['$utm_source'],
    [`${prefix}initial_utm_medium`]: properties['$utm_medium'],
    [`${prefix}initial_utm_campaign`]: properties['$utm_campaign'],
    [`${prefix}initial_utm_term`]: properties['$utm_term'],
    [`${prefix}initial_utm_content`]: properties['$utm_content'],
    [`${prefix}initial_referring_domain`]: properties['$referring_domain'],
    [`${prefix}initial_dclid`]: properties['$dclid'],
    [`${prefix}initial_fbclid`]: properties['$fbclid'],
    [`${prefix}initial_gbraid`]: properties['$gbraid'],
    [`${prefix}initial_gclid`]: properties['$gclid'],
    [`${prefix}initial_ko_click_id`]: properties['$ko_click_id'],
    [`${prefix}initial_li_fat_id`]: properties['$li_fat_id'],
    [`${prefix}initial_msclkid`]: properties['$msclkid'],
    [`${prefix}initial_rtd_cid`]: properties['$rtd_cid'],
    [`${prefix}initial_ttclid`]: properties['$ttclid'],
    [`${prefix}initial_twclid`]: properties['$twclid'],
    [`${prefix}initial_wbraid`]: properties['$wbraid'],
    [`${prefix}channel_type`]: getChannelType(
      properties['$utm_campaign'],
      properties['$utm_medium'],
      properties['$utm_source'],
      properties['$referring_domain'],
      CLICK_ID_PROPERTIES.some((key) => !!properties[key]),
    ),
  };
};

// System ($-prefixed) attribution, used on events and the session record.
export const initialAttributionProperties = (properties: Record<string, any> | null | undefined): Record<string, any> =>
  buildAttribution(properties, '$');

// Plain-named attribution, used as set_once on identified user/account records.
export const initialAttributionRecordProperties = (
  properties: Record<string, any> | null | undefined,
): Record<string, any> => buildAttribution(properties, '');
