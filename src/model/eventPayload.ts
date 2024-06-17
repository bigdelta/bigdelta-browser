import { NestedObject } from './nestedObject';
import { PropertyChanges } from './record';

export type Relation = PropertyChanges & {
  id: { [key: string]: string };
};

export type EventPayload = {
  event_name: string;
  properties?: null | NestedObject;
  relations?: null | Relation[];
  created_at?: null | string;
};

export type PageViewEventPayload = {
  event_name?: null | string;
  properties?: null | NestedObject;
  relations?: null | Relation[];
  created_at?: null | string;
};
