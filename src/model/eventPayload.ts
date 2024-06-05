import {NestedObject} from "./nestedObject";

export type Relations = { [key: string]: string };


export type EventPayload = {
  event_name: string;
  properties?: null | NestedObject;
  relations?: null | Relations;
  created_at?: null | string;
};

export type PageViewEventPayload = {
  event_name?: null | string;
  properties?: null | NestedObject;
  relations?: null | Relations;
  created_at?: null | string;
};
