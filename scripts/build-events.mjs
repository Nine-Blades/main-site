// Prerender upcoming Kingdom events into the static HTML at build time, so
// crawlers (and users with JS off) see a populated events section plus
// schema.org/Event JSON-LD — instead of the empty grid the client-side
// js/events.js leaves behind.
//
// Data source:
//   - live:    fetch the ORK with the x-nb-build header (ORK_BUILD_KEY secret)
//   - testing: set ORK_FIXTURE=path/to/events.json to render from a file
//
// GUARD: if the fetch fails, is Cloudflare-challenged, isn't JSON, or yields no
// upcoming events, the script writes NOTHING and exits 0 — the last good render
// stays on the page. It never blanks the events section.
//
// Injects between these markers (must already exist in each target page):
//   <!-- EVENTS:START -->        ... event cards ...        <!-- EVENTS:END -->
//   <!-- EVENTS-JSONLD:START --> ... <script> JSON-LD ...   <!-- EVENTS-JSONLD:END -->

import { readFile, writeFile } from 'node:fs/promises';

const ENDPOINT =
  'https://ork.amtgard.com/orkservice/Json/index.php' +
  '?call=SearchService%2FEvent&date_order=true&name=&limit=200&kingdom_id=31';

const TARGETS = ['index.html', 'events/index.html'];

const ORG = { '@type': 'Organization', name: 'Kingdom of the Nine Blades', url: 'https://nineblades.ca' };

// ParkId -> street address, derived from the chapter pages. Update if a park
// moves. Events at these parks get a full PostalAddress in their JSON-LD;
// events elsewhere (or kingdom-wide, ParkId 0) render as a card without
// location-bearing structured data rather than a faked address.
const PARK_ADDRESSES = {
  79:   { name: 'Twilight Peak',   streetAddress: '145 Hilton Ave',     addressLocality: 'Toronto',    addressRegion: 'ON', postalCode: 'M5R 3E9' },
  277:  { name: 'Felfrost',        streetAddress: "600 Hog's Back Road", addressLocality: 'Ottawa',     addressRegion: 'ON' },
  494:  { name: 'Linnagond',       streetAddress: '610 Parkhill Rd W',  addressLocality: 'Peterborough', addressRegion: 'ON' },
  609:  { name: 'Bellhollow',      streetAddress: '12 Catharine Ave',   addressLocality: 'Brantford',  addressRegion: 'ON' },
  615:  { name: 'Lichwood Grove',  streetAddress: '90 Westmount Rd N',  addressLocality: 'Waterloo',   addressRegion: 'ON' },
  901:  { name: "Heathen's Cove",  streetAddress: '99 University Ave',  addressLocality: 'Kingston',   addressRegion: 'ON' },
  1059: { name: 'Legends Library', streetAddress: '265 Sunnidale Rd',   addressLocality: 'Barrie',     addressRegion: 'ON' },
  1093: { name: 'Grandes Fourches', streetAddress: '700 Rue du Cégep',  addressLocality: 'Sherbrooke', addressRegion: 'QC', postalCode: 'J1E 2K1' },
  77:   { name: 'Wolvenfang',      streetAddress: '1918 Main St',       addressLocality: 'Val Caron',  addressRegion: 'ON' },
};

// ---- helpers ---------------------------------------------------------------

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function torontoToday() {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}

// Offset America/Toronto has at a given wall-clock time — DST-correct, no
// hardcoded switch dates. "2026-10-17T10:00:00" -> "-04:00".
function torontoOffset(localIso) {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto', timeZoneName: 'shortOffset',
  }).formatToParts(new Date(localIso + 'Z')).find((x) => x.type === 'timeZoneName').value;
  const m = name.match(/GMT([+-]?)(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return '-05:00';
  const sign = m[1] === '-' ? '-' : '+';
  return `${sign}${String(Math.abs(+m[2])).padStart(2, '0')}:${m[3] || '00'}`;
}

function parseEvent(ev) {
  const localIso = ev.NextDate.replace(' ', 'T');       // "2026-10-17T10:00:00"
  const offset = torontoOffset(localIso);
  const startDate = localIso + offset;                   // ISO 8601 with offset
  const instant = new Date(startDate);
  const display = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', weekday: 'short', month: 'short', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(instant);
  const url = `https://ork.amtgard.com/orkui/index.php?Route=Event/detail/${ev.EventId}/${ev.NextDetailId}`;
  return { ev, startDate, display, url, description: cleanDescription(ev.ShortDescription) };
}

// The ORK pre-truncates ShortDescription (often mid-word). Collapse whitespace,
// drop light markdown, and if it looks cut off, trim to a word boundary + "…".
function cleanDescription(raw) {
  if (!raw) return '';
  let s = String(raw).replace(/[\r\n]+/g, ' ').replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/[#*`_]+/g, '').replace(/\s+/g, ' ').trim();
  const truncated = /\s$/.test(raw) || s.length >= 90;
  if (truncated) {
    s = s.replace(/[\s,;:.–-]+\S*$/, '').trim()
         .replace(/\s+(and|or|the|a|an|to|of|for|with|in|on|at|&)$/i, '').trim() + '…';
  }
  return s;
}

function locationFor(ev) {
  const a = PARK_ADDRESSES[ev.ParkId];
  if (!a) return null; // no reliable address -> no location-bearing JSON-LD
  const address = { '@type': 'PostalAddress', streetAddress: a.streetAddress,
    addressLocality: a.addressLocality, addressRegion: a.addressRegion, addressCountry: 'CA' };
  if (a.postalCode) address.postalCode = a.postalCode;
  return { '@type': 'Place', name: a.name, address };
}

// ---- rendering -------------------------------------------------------------

function cardHtml({ ev, display, url, description }) {
  const rows = [`            <div class="event-date">${esc(display)}</div>`];
  if (ev.ParkName) rows.push(`            <div class="event-date">${esc(ev.ParkName)}</div>`);
  if (description) rows.push(`            <div class="event-description">${esc(description)}</div>`);
  return `        <a class="event-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
          <div class="event-header">${esc(ev.Name)}</div>
          <div class="event-content">
${rows.join('\n')}
          </div>
        </a>`;
}

function jsonLdBlock(parsed) {
  const events = parsed
    .map(({ ev, startDate, url, description }) => {
      const location = locationFor(ev);
      if (!location) return null; // mark up only events we can place accurately
      const obj = {
        '@context': 'https://schema.org', '@type': 'Event',
        name: ev.Name, startDate,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location, organizer: ORG, url,
      };
      if (description) obj.description = description;
      return obj;
    })
    .filter(Boolean);
  if (!events.length) return '';
  const json = JSON.stringify(events.length === 1 ? events[0] : events, null, 2)
    .replace(/</g, '\\u003c'); // never let a "<" break out of the script tag
  return `    <script type="application/ld+json">\n${json}\n    </script>`;
}

function injectBetween(html, start, end, content) {
  const s = html.indexOf(start);
  const e = html.indexOf(end);
  if (s === -1 || e === -1 || e < s) {
    throw new Error(`markers not found or out of order: ${start} / ${end}`);
  }
  return html.slice(0, s + start.length) + '\n' + content + '\n' + html.slice(e).replace(/^\s*/, '    ');
}

// ---- data source -----------------------------------------------------------

async function loadEvents() {
  if (process.env.ORK_FIXTURE) {
    const data = JSON.parse(await readFile(process.env.ORK_FIXTURE, 'utf8'));
    return Array.isArray(data) ? data : (data.Result || []);
  }
  const key = process.env.ORK_BUILD_KEY;
  if (!key) { console.error('GUARD: ORK_BUILD_KEY not set — leaving pages unchanged.'); return null; }
  try {
    const res = await fetch(ENDPOINT, { headers: { 'x-nb-build': key }, signal: AbortSignal.timeout(20000) });
    const ct = res.headers.get('content-type') || '';
    const body = await res.text();
    if (/just a moment|challenge-platform|cf[-_]mitigated/i.test(body) || ct.includes('text/html')) {
      console.error('GUARD: Cloudflare challenge / non-JSON — leaving pages unchanged.');
      return null;
    }
    return JSON.parse(body).Result || [];
  } catch (err) {
    console.error(`GUARD: fetch failed (${err.name}: ${err.message}) — leaving pages unchanged.`);
    return null;
  }
}

// ---- main ------------------------------------------------------------------

const raw = await loadEvents();
if (!raw) process.exit(0); // guard already logged; nothing written

const today = torontoToday();
const upcoming = raw
  .filter((ev) => ev && ev.NextDate && ev.NextDate.slice(0, 10) >= today)
  .sort((a, b) => (a.NextDate < b.NextDate ? -1 : a.NextDate > b.NextDate ? 1 : a.EventId - b.EventId));

if (!upcoming.length) {
  console.error('GUARD: no upcoming events returned — leaving pages unchanged.');
  process.exit(0);
}

const parsed = upcoming.map(parseEvent);
const cards = parsed.map(cardHtml).join('\n');
const jsonld = jsonLdBlock(parsed);

let wrote = 0;
for (const file of TARGETS) {
  const before = await readFile(file, 'utf8');
  let after = injectBetween(before, '<!-- EVENTS:START -->', '<!-- EVENTS:END -->', cards);
  after = injectBetween(after, '<!-- EVENTS-JSONLD:START -->', '<!-- EVENTS-JSONLD:END -->', jsonld);
  if (after !== before) { await writeFile(file, after); wrote++; }
  console.log(`${file}: ${after !== before ? 'updated' : 'unchanged'}`);
}

const marked = parsed.filter((p) => locationFor(p.ev)).length;
console.log(`\n${upcoming.length} upcoming event(s); ${marked} with JSON-LD location; ${wrote} file(s) changed.`);
