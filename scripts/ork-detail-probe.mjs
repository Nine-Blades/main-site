// Discovery probe (Path B), round 2: Event/GetEvent with the request[...] param
// style returned a REAL event object last run. Dump it in full so we can see
// where end date, full description, venue/address, and fee live (they may be
// nested or unusually named).
//
// Runs in CI with the x-nb-build header. Reads only; delete after we know the
// fields. Override the sample event via workflow inputs (EVENT_ID / DETAIL_ID).

const BASE = 'https://ork.amtgard.com/orkservice/Json/index.php';
const E = process.env.EVENT_ID || '18686';   // Brawl-o-ween (spans Oct 17–18)
const D = process.env.DETAIL_ID || '9245';
const KEY = process.env.ORK_BUILD_KEY || '';

const enc = (e, d) => `request%5BEventId%5D=${e}&request%5BDetailId%5D=${d}`;

// Try the winning call with a few param shapes to learn what DetailId changes.
const ATTEMPTS = [
  { label: 'EventId + DetailId', qs: enc(E, D) },
  { label: 'EventId only',       qs: `request%5BEventId%5D=${E}` },
  { label: 'DetailId only',      qs: `request%5BDetailId%5D=${D}` },
];

function isChallenge(body, ct) {
  return /just a moment|challenge-platform|cf[-_]mitigated/i.test(body) || (ct || '').includes('text/html');
}

// Print keys recursively so nested date/description/location structures show up.
function outline(obj, prefix = '') {
  if (Array.isArray(obj)) {
    console.log(`${prefix}[array length ${obj.length}]`);
    if (obj.length) outline(obj[0], prefix + '  ');
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const t = Array.isArray(v) ? `array[${v.length}]` : v === null ? 'null' : typeof v;
      const preview = (t === 'string' || t === 'number' || t === 'boolean') ? ` = ${JSON.stringify(v)}`.slice(0, 80) : '';
      console.log(`${prefix}${k}: ${t}${preview}`);
      if (v && typeof v === 'object') outline(v, prefix + '  ');
    }
  }
}

for (const a of ATTEMPTS) {
  console.log(`\n========== Event/GetEvent — ${a.label} ==========`);
  const url = `${BASE}?call=Event%2FGetEvent&${a.qs}`;
  try {
    const res = await fetch(url, { headers: { 'x-nb-build': KEY }, signal: AbortSignal.timeout(15000) });
    const ct = res.headers.get('content-type') || '';
    const body = await res.text();
    if (isChallenge(body, ct)) { console.log('  [Cloudflare challenge]'); continue; }
    let data;
    try { data = JSON.parse(body); } catch { console.log(`  [not JSON, status ${res.status}]`); continue; }

    const obj = data.Result ?? data.Event ?? data.Detail ?? data;
    const target = Array.isArray(obj) ? obj[0] : obj;
    if (!target || !target.Name) {
      console.log('  [error envelope / no event]:', JSON.stringify(data).slice(0, 200));
      continue;
    }
    console.log('  --- field outline (nested) ---');
    outline(target, '  ');
    console.log('  --- full JSON ---');
    console.log(JSON.stringify(target, null, 2).split('\n').map((l) => '  ' + l).join('\n'));
  } catch (err) {
    console.log(`  [${err.name}: ${err.message}]`);
  }
  await new Promise((r) => setTimeout(r, 150));
}
