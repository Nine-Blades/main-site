// Discovery probe (Path B): find the ORK JSON endpoint that returns a single
// event's full detail — end date, full description, venue/address, fee — none
// of which the SearchService/Event list carries.
//
// The card links to the UI route Event/detail/{EventId}/{DetailId}; this tries
// the likely JSON *service* calls that mirror it. Runs in CI with the
// x-nb-build header (ORK_BUILD_KEY). Reads only; delete after we know the call.
//
// Override the sample event via workflow inputs (EVENT_ID / DETAIL_ID).

const BASE = 'https://ork.amtgard.com/orkservice/Json/index.php';
const E = process.env.EVENT_ID || '18686';   // Brawl-o-ween (spans Oct 17–18)
const D = process.env.DETAIL_ID || '9245';
const KEY = process.env.ORK_BUILD_KEY || '';

// Candidate service calls to try.
const CALLS = [
  'Event/GetDetail',
  'Event/Detail',
  'Event/Get',
  'Event/GetEvent',
  'EventService/GetDetail',
  'EventService/Detail',
  'EventService/GetEvent',
  'SearchService/EventDetail',
];

// Candidate parameter stylings (the list endpoint uses snake_case query params;
// GetOfficers uses request[Xxx] — so try both, plus id-only forms).
const PARAM_STYLES = [
  (e, d) => `event_id=${e}&detail_id=${d}`,
  (e, d) => `request%5BEventId%5D=${e}&request%5BDetailId%5D=${d}`,
  (e, d) => `id=${d}`,
];

function isChallenge(body, ct) {
  return /just a moment|challenge-platform|cf[-_]mitigated/i.test(body) || (ct || '').includes('text/html');
}

// Fields that would tell us this is the detail we want.
const WANTED = /(end|stop|finish|start|begin|address|street|location|venue|city|province|description|fee|price|cost|latitude|longitude)/i;

const hits = [];

for (const call of CALLS) {
  for (const style of PARAM_STYLES) {
    const url = `${BASE}?call=${encodeURIComponent(call)}&${style(E, D)}`;
    try {
      const res = await fetch(url, { headers: { 'x-nb-build': KEY }, signal: AbortSignal.timeout(15000) });
      const ct = res.headers.get('content-type') || '';
      const body = await res.text();
      if (isChallenge(body, ct)) { console.log(`MISS  ${call}  [challenge]`); continue; }
      let data;
      try { data = JSON.parse(body); } catch { console.log(`MISS  ${call}  [not JSON, ${res.status}]`); continue; }

      // Unwrap common envelopes to inspect the meaningful object.
      const payload = data.Result ?? data.Detail ?? data.Event ?? data;
      const sample = Array.isArray(payload) ? payload[0] : payload;
      const keys = sample && typeof sample === 'object' ? Object.keys(sample) : [];
      const interesting = keys.filter((k) => WANTED.test(k));

      if (keys.length && interesting.length) {
        console.log(`\n★ HIT  call=${call}  style=(${style('E', 'D')})  status=${res.status}`);
        console.log(`  useful fields: ${interesting.join(', ')}`);
        console.log(`  all fields:    ${keys.join(', ')}`);
        console.log('  sample:');
        console.log(JSON.stringify(sample, null, 2).split('\n').map((l) => '    ' + l).join('\n'));
        hits.push({ call, style: style('E', 'D'), interesting });
      } else if (keys.length) {
        console.log(`~     ${call}  [JSON but no detail fields: ${keys.slice(0, 8).join(', ')}${keys.length > 8 ? '…' : ''}]`);
      } else {
        console.log(`~     ${call}  [empty/again ${res.status}]`);
      }
    } catch (err) {
      console.log(`MISS  ${call}  [${err.name}]`);
    }
    await new Promise((r) => setTimeout(r, 150)); // be polite
  }
}

console.log('\n==================================================');
if (hits.length) {
  console.log(`Found ${hits.length} candidate detail endpoint(s):`);
  for (const h of hits) console.log(`  call=${h.call}  (${h.style})  -> ${h.interesting.join(', ')}`);
} else {
  console.log('No detail endpoint found among the candidates.');
  console.log('If you know the call+params from jsork, share it and I\'ll wire it in directly.');
}
