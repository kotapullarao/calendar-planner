/**
 * Calendar Planner — ICS CORS proxy (Cloudflare Worker)
 *
 * Calendar providers (Google, Outlook, iCloud) do not send CORS headers on
 * their .ics feeds, so a browser app cannot fetch them directly. This tiny
 * worker fetches the feed server-side and returns it with CORS headers.
 *
 * Deploy (about five minutes, free tier is plenty):
 *   1. https://dash.cloudflare.com → Workers & Pages → Create → Worker
 *   2. Replace the generated code with this file, edit ALLOWED_ORIGINS below
 *   3. Deploy, then copy your worker URL, e.g. https://ics.yourname.workers.dev
 *   4. In Calendar Planner: Subscriptions → Settings → CORS proxy →
 *        https://ics.yourname.workers.dev/?url={url}
 *
 * Privacy: feed URLs (often secret) only pass through YOUR worker, and this
 * worker forwards nothing anywhere else and stores nothing.
 */

// Origins allowed to use this proxy. Add your own domains; '*' disables the
// check entirely (not recommended — anyone could relay traffic through your
// worker).
const ALLOWED_ORIGINS = [
  'https://kotapullarao.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000'
];

// Refuse to relay absurd payloads.
const MAX_BYTES = 5 * 1024 * 1024;

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    // No Origin header means a non-CORS client: opening the URL in a browser
    // tab, curl, or the in-app Test button on some browsers. The allowlist
    // exists to stop OTHER WEBSITES using this proxy from their pages — those
    // always send an Origin — so requests without one are allowed through.
    const allowed = !origin || ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin);

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowed ? (origin || '*') : 'null',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }
    if (!allowed) {
      return new Response('Origin not allowed', { status: 403, headers: corsHeaders });
    }

    const target = new URL(request.url).searchParams.get('url');
    if (!target) {
      // Friendly landing page so opening the worker URL in a browser shows
      // usage instead of an error.
      return new Response(
        'Calendar Planner ICS proxy is running.\n\n' +
        'Usage: ' + new URL(request.url).origin + '/?url=<encoded .ics feed URL>\n' +
        'In the app, set the proxy to: ' + new URL(request.url).origin + '/?url={url}\n',
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    let feedUrl;
    try {
      feedUrl = new URL(target.replace(/^webcal:\/\//i, 'https://'));
    } catch (e) {
      return new Response('Invalid feed URL', { status: 400, headers: corsHeaders });
    }
    // Only relay to public https calendar hosts — never internal addresses.
    if (feedUrl.protocol !== 'https:') {
      return new Response('Only https feeds are allowed', { status: 400, headers: corsHeaders });
    }
    const host = feedUrl.hostname;
    if (host === 'localhost' || /^(\d+\.){3}\d+$/.test(host) || host.endsWith('.local') || host.endsWith('.internal')) {
      return new Response('Host not allowed', { status: 400, headers: corsHeaders });
    }

    let upstream;
    try {
      upstream = await fetch(feedUrl.toString(), {
        redirect: 'follow',
        headers: { 'Accept': 'text/calendar, text/plain, */*', 'User-Agent': 'CalendarPlanner-ICS-Proxy/1.0' }
      });
    } catch (e) {
      return new Response('Upstream fetch failed: ' + e.message, { status: 502, headers: corsHeaders });
    }

    if (!upstream.ok) {
      return new Response(`Upstream returned HTTP ${upstream.status}`, { status: upstream.status, headers: corsHeaders });
    }

    const body = await upstream.text();
    if (body.length > MAX_BYTES) {
      return new Response('Feed too large', { status: 413, headers: corsHeaders });
    }
    if (!/BEGIN:VCALENDAR/i.test(body)) {
      return new Response('URL did not return calendar data', { status: 422, headers: corsHeaders });
    }

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }
};
