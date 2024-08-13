import { NestedObject } from './nestedObject';

export type PropertyChanges = {
  set?: null | NestedObject;
  set_once?: null | NestedObject;
};

export type SetRecordProperties = {
  id: string;
  slug: string;
  properties: PropertyChanges;
};
