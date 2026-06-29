import { Session } from '../model/session';
import { EventPayload } from '../model/eventPayload';
import { DateTime, Interval } from 'luxon';
import { initialAttributionProperties } from './attribution';

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
        .toObject().seconds ?? 0,
    ),
    $event_count: session.event_count,
    $pageview_count: session.pageview_count,
    $is_bounce: session.event_count === 1,
    $end_event: lastEvent.event_name,
    $end_location: lastEvent.properties?.['$location'],
    $end_path: lastEvent.properties?.['$path'],
  };
};

export const initialSessionProperties = (firstEvent: EventPayload): Record<string, any> => {
  return {
    $start_event: firstEvent.event_name,
    $start_location: firstEvent.properties?.['$location'],
    $start_path: firstEvent.properties?.['$path'],
    ...initialAttributionProperties(firstEvent.properties),
  };
};
