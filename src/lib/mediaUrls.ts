export function mediaPath(value: string, projectUrl: string): string | null {
  try {
    const url = new URL(value);
    if (url.origin !== new URL(projectUrl).origin) return null;
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/noticed-media\/(.+)$/);
    if (!match) return null;
    const path = decodeURIComponent(match[1]);
    if (path.split('/').some(part => !part || part === '.' || part === '..')) return null;
    return path;
  } catch { return null; }
}

export function mapMediaStrings<T>(value: T, transform: (value: string) => string): T {
  if (typeof value === 'string') return transform(value) as T;
  if (Array.isArray(value)) return value.map(item => mapMediaStrings(item, transform)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapMediaStrings(item, transform)])) as T;
  }
  return value;
}

export function canonicalizeMedia<T>(value: T, projectUrl: string): T {
  return mapMediaStrings(value, url => {
    const path = mediaPath(url, projectUrl);
    return path ? `${new URL(projectUrl).origin}/storage/v1/object/authenticated/noticed-media/${path.split('/').map(encodeURIComponent).join('/')}` : url;
  });
}
