// Where to send someone after they sign in (?next=…), but only ever a page on
// this site (SEC-02). "/\evil.example" or "/<tab>/evil.example" look like
// local paths but browsers read them as another website, so the value is
// parsed as a real URL and must keep this site's origin. Anything else is "/".

export function safeNext(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return '/';
  // backslashes and control characters (tabs, new lines…) are never in our paths
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return '/';
  try {
    const here = typeof window !== 'undefined' ? window.location.origin : 'https://www.mtani.ge';
    const url = new URL(raw, here);
    if (url.origin !== here) return '/';
    return `${url.pathname}${url.search}${url.hash}` || '/';
  } catch {
    return '/';
  }
}
