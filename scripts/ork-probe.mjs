// One-off diagnostic: can a GitHub Actions runner fetch the Amtgard ORK events
// endpoint (the same one js/events.js uses), or does Cloudflare challenge it?
//
// Exit 0  = reachable from CI, got JSON  -> the simple plain-fetch plan works.
// Exit 1  = Cloudflare challenge / no JSON -> needs an ORK-side allowlist or a
//           headless browser (Playwright) in the Action.
//
// Reads only, writes nothing. Safe to delete (with its workflow) after use.

const ENDPOINT =
  'https://ork.amtgard.com/orkservice/Json/index.php' +
  '?call=SearchService%2FEvent&date_order=true&name=&limit=200&kingdom_id=31';

// Try a naive fetch first, then one dressed up to look like the browser call in
// js/events.js — to learn whether headers alone are enough to get past the edge.
const attempts = [
  { label: 'plain fetch (naive Node)', headers: {} },
  {
    label: 'browser-like headers',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-CA,en;q=0.9',
      Referer: 'https://nineblades.ca/',
    },
  },
];

function looksLikeChallenge(body, contentType) {
  return (
    /just a moment|challenge-platform|cf[-_]mitigated|__cf_chl|cf-browser-verification/i.test(body) ||
    (contentType || '').includes('text/html')
  );
}

let reachable = false;

for (const attempt of attempts) {
  console.log(`\n--- ${attempt.label} ---`);
  try {
    const res = await fetch(ENDPOINT, {
      headers: attempt.headers,
      signal: AbortSignal.timeout(20000),
    });
    const contentType = res.headers.get('content-type') || '';
    const cfRay = res.headers.get('cf-ray');
    const body = await res.text();

    console.log(`status: ${res.status} | content-type: ${contentType} | bytes: ${body.length}` +
      (cfRay ? ` | cf-ray: ${cfRay}` : ''));

    if (looksLikeChallenge(body, contentType)) {
      console.log('RESULT: Cloudflare challenge — no JSON. First 160 chars:');
      console.log('  ' + body.slice(0, 160).replace(/\s+/g, ' '));
      continue;
    }

    try {
      const data = JSON.parse(body);
      const events = data.Result || [];
      console.log(`RESULT: ✅ JSON OK — ${events.length} event(s). ` +
        `Sample: ${(events[0] && events[0].Name) || '(none)'}`);
      reachable = true;
    } catch {
      console.log('RESULT: HTTP 200 but body is not JSON. First 160 chars:');
      console.log('  ' + body.slice(0, 160).replace(/\s+/g, ' '));
    }
  } catch (err) {
    console.log(`RESULT: fetch error — ${err.name}: ${err.message}`);
  }
}

console.log('\n==================================================');
if (reachable) {
  console.log('VERDICT: ✅ ORK is reachable from CI. The plain Node-fetch plan works.');
} else {
  console.log('VERDICT: ❌ ORK is blocked from CI (Cloudflare).');
  console.log('         Options: ORK-side WAF skip rule (secret header), or');
  console.log('         Playwright (real Chromium) in the Action.');
}
process.exit(reachable ? 0 : 1);
