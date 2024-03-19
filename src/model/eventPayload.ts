export type Relations = { [key: string]: string };

export type NestedObject = {
  [key: string]: string | boolean | number | null | (string | boolean | number | null)[] | NestedObject;
};

export type EventPayload = {
  event_name: string;
  properties?: null | NestedObject;
  relations?: null | Relations;
  created_at?: null | string;
};
