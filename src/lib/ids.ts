const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route params come from the URL; reject anything that isn't a record id before querying. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
