/**
 * Make a download link safe to click from an https page.
 *
 * The API builds absolute links (e.g. signed APK/attachment URLs) and, behind a
 * TLS-terminating proxy, can emit them as http://. Clicking such a link from an
 * https page makes the browser upgrade it (an http→https 307 hop) which Chrome
 * blocks as an "insecure download". The signed signature is relative, so the
 * safest fix is to drop to a same-origin relative link: the browser then keeps
 * the page's own (https) origin. Cross-origin links (the native app pointing at
 * the API host) keep their host but are upgraded to https.
 */
export function safeDownloadUrl(url: string): string {
  if (typeof location === "undefined") return url;
  try {
    const u = new URL(url, location.href);
    if (u.host === location.host) return u.pathname + u.search + u.hash;
    if (location.protocol === "https:" && u.protocol === "http:") u.protocol = "https:";
    return u.toString();
  } catch {
    return url;
  }
}
