function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getQuery(
  property: string,
  value: string | number | boolean,
  regex = false,
): Record<string, unknown> {
  const queryValue = regex
    ? { $regex: new RegExp(escapeRegex(String(value)), 'i') }
    : value;

  return { [property]: queryValue };
}

export function getORQuery(
  properties: string[],
  value: string | number | boolean,
  regex = false,
): Record<string, unknown> {
  return {
    $or: properties.map((property) => getQuery(property, value, regex)),
  };
}
