// One-off diagnostic: can a GitHub Actions runner fetch the Amtgard ORK events
// endpoint, and does the Cloudflare bypass header let it through?
//
// It runs a baseline request (no header — expected to be Cloudflare-blocked),
// and, if ORK_BUILD_KEY is set, a second request carrying the token in the
// `x-nb-build` header (expected to return JSON once the CF skip rule is live).
//
// The CF rule this matches:
//   Hostname eq ork.amtgard.com AND URI Path starts_with /orkservice/
//   AND Header x-nb-build eq <token>   -> skip challenge
//
// Exit 0 = got JSON. Exit 1 = still blocked. Reads only; delete after use.

const ENDPOINT =
  'https://ork.amtgard.com/orkservice/Json/index.php' +
  '?call=SearchService%2FEvent&date_order=true&name=&limit=200&kingdom_id=31';

const HEADER = 'x-nb-build';
const KEY = process.env.ORK_BUILD_KEY || '';

const attempts = [
  { label: 'baseline, no header (expect Cloudflare block)', headers: {} },
];
if (KEY) {
  attempts.push({
    label: 'with x-nb-build header (expect JSON if the CF rule is live)',
    headers: { [HEADER]: KEY },
  });
} else {
  console.log('NOTE: ORK_BUILD_KEY is not set — running only the baseline request.');
}

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
      console.log('RESULT: Cloudflare challenge — no JSON.');
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
  console.log('VERDICT: ✅ ORK reachable from CI. The plain-fetch + header plan works.');
} else if (KEY) {
  console.log('VERDICT: ❌ Still blocked with the header. Check the CF rule:');
  console.log('         - header name is exactly x-nb-build and value equals the token');
  console.log('         - ORK_BUILD_KEY (GitHub secret) matches that token exactly');
  console.log('         - the rule is ordered ABOVE whatever issues the challenge');
  console.log('         - its action skips that challenge feature for this match');
} else {
  console.log('VERDICT: ❌ Blocked (as expected without a header). Set ORK_BUILD_KEY to test the bypass.');
}
process.exit(reachable ? 0 : 1);
