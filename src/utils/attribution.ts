import { getChannelType } from './channelType';
import {
  AI_CLICK_ID_PARAMS,
  ATTRIBUTION_PARAMS,
  PAID_CLICK_ID_PARAMS,
  toAttributionPropertyName,
} from './marketingAttribution';

const hasAnyParam = (properties: Record<string, any>, params: string[]): boolean =>
  params.some((param) => !!properties[`$${toAttributionPropertyName(param)}`]);

const buildAttribution = (properties: Record<string, any> | null | undefined, prefix: string): Record<string, any> => {
  properties = properties || {};

  const initialProperties = Object.fromEntries(
    ATTRIBUTION_PARAMS.map((param) => {
      const name = toAttributionPropertyName(param);

      return [`${prefix}initial_${name}`, properties[`$${name}`]];
    }),
  );

  return {
    ...initialProperties,
    [`${prefix}channel_type`]: getChannelType(
      properties['$utm_campaign'],
      properties['$utm_medium'],
      properties['$utm_source'],
      properties['$referring_domain'],
      hasAnyParam(properties, PAID_CLICK_ID_PARAMS),
      hasAnyParam(properties, AI_CLICK_ID_PARAMS),
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
