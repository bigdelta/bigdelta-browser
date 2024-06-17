import { Session } from '../model/session';
import { EventPayload } from '../model/eventPayload';
import { DateTime, Interval } from 'luxon';
import { getChannelType } from './channelType';

export const sessionProperties = (session: Session, lastEvent: EventPayload) => {
  return {
    $session_start: session.session_start,
    $session_end: session.session_end,
    $session_duration_seconds: Math.round(
      Interval.fromDateTimes(
        DateTime.fromISO(session.session_start).toUTC(),
        DateTime.fromISO(session.session_end).toUTC(),
      )
        .toDuration('seconds')
        .toObject().seconds,
    ),
    $event_count: session.event_count,
    $pageview_count: session.pageview_count,
    $is_bounce: session.event_count === 1,
    $end_event: lastEvent.event_name,
    $end_location: lastEvent.properties['$location'],
    $end_path: lastEvent.properties['$path'],
  };
};

export const initialSessionProperties = (firstEvent: EventPayload): Record<string, any> => {
  return {
    $start_event: firstEvent.event_name,
    $start_location: firstEvent.properties['$location'],
    $start_path: firstEvent.properties['$path'],
    $initial_utm_source: firstEvent.properties['$utm_source'],
    $initial_utm_medium: firstEvent.properties['$utm_medium'],
    $initial_utm_campaign: firstEvent.properties['$utm_campaign'],
    $initial_utm_term: firstEvent.properties['$utm_term'],
    $initial_utm_content: firstEvent.properties['$utm_content'],
    $initial_referring_domain: firstEvent.properties['$referring_domain'],
    $initial_dclid: firstEvent.properties['$dclid'],
    $initial_fbclid: firstEvent.properties['$fbclid'],
    $initial_gbraid: firstEvent.properties['$gbraid'],
    $initial_gclid: firstEvent.properties['$gclid'],
    $initial_ko_click_id: firstEvent.properties['$ko_click_id'],
    $initial_li_fat_id: firstEvent.properties['$li_fat_id'],
    $initial_msclkid: firstEvent.properties['$msclkid'],
    $initial_rtd_cid: firstEvent.properties['$rtd_cid'],
    $initial_ttclid: firstEvent.properties['$ttclid'],
    $initial_twclid: firstEvent.properties['$twclid'],
    $initial_wbraid: firstEvent.properties['$wbraid'],
    $channel_type: getChannelType(
      String(firstEvent.properties['$utm_campaign']),
      String(firstEvent.properties['$utm_medium']),
      String(firstEvent.properties['$utm_source']),
      String(firstEvent.properties['$referring_domain']),
      !!firstEvent.properties['$dclid'] ||
        !!firstEvent.properties['$fbclid'] ||
        !!firstEvent.properties['$gbraid'] ||
        !!firstEvent.properties['$gclid'] ||
        !!firstEvent.properties['$ko_click_id'] ||
        !!firstEvent.properties['$li_fat_id'] ||
        !!firstEvent.properties['$msclkid'] ||
        !!firstEvent.properties['$rtd_cid'] ||
        !!firstEvent.properties['$ttclid'] ||
        !!firstEvent.properties['$twclid'] ||
        !!firstEvent.properties['$wbraid'],
    ),
  };
};
