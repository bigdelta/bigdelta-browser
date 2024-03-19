export type NestedObject = {
  [key: string]: string | boolean | number | null | (string | boolean | number | null)[] | NestedObject;
};

export type EventPayload = {
  event_name: string;
  properties?: null | NestedObject;
  relations?: null | { [key: string]: string };
  created_at?: null | string;
};

export type IngestionTrackEventPayload = EventPayload[];
