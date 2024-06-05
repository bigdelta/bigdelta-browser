export type NestedObject = {
  [key: string]: string | boolean | number | null | (string | boolean | number | null)[] | NestedObject;
};