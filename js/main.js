// Configuration
const ORK_API_BASE = 'https://ork.amtgard.com/orkservice/Json/index.php';

const KINGDOM_ID = 31;

// Map of chapter slugs to their ORK park IDs
const PARK_IDS = {
    'twilight-peak': 79, // Replace with actual ORK park ID
    'felfrost': 277,      // Replace with actual ORK park ID
    'linnagond': 494,     // Replace with actual ORK park ID
    'heathens-cove': 901, // Replace with actual ORK park ID
    'lichwood-grove': 615, // Replace with actual ORK park ID
    'bellhollow': 609,    // Replace with actual ORK park ID
    'silva-urbem': 404,   // Replace with actual ORK park ID
    'legends-library': 1059, // Replace with actual ORK park ID
    'grandes-fourches': 1093, // Replace with actual ORK park ID
    'wolvenfang': 77 // Replace with actual ORK park ID
};

// Officer roles as the ORK names them, in the order we display them.
const OFFICER_ROLES = ['Monarch', 'Regent', 'Prime Minister', 'Champion', 'GMR'];

// Map of ORK officer roles to their display names, per language.
const OFFICER_POSITIONS = {
    en: {
        'Monarch': 'Monarch',
        'Regent': 'Regent',
        'Prime Minister': 'Prime Minister',
        'Champion': 'Champion',
        'GMR': 'GMR'
    },
    fr: {
        'Monarch': 'Monarque',
        'Regent': 'Régent',
        'Prime Minister': 'Premier ministre',
        'Champion': 'Champion',
        'GMR': 'GMR'
    }
};

/* ------------------------------------------------------------------ *
 * Language support
 *
 * English is served from the site root (/chapters/). Every other
 * language is served from a matching path prefix (/fr/chapters/), so a
 * page's language can always be derived from its URL.
 * ------------------------------------------------------------------ */

const DEFAULT_LANG = 'en';

// Languages served from a /<lang>/ prefix. Add a language here once its
// pages exist.
const TRANSLATED_LANGS = ['fr'];

// Pages whose French version has actually been translated, listed by their
// English path (normalized: leading and trailing slash, no index.html).
//
// Every English page has an /fr/ counterpart, so the language switcher is
// always shown. This list is the one that says which of those counterparts
// are *real French* rather than English placeholders: a page NOT in this
// list shows the "not translated yet" notice. Add a page's path here as the
// final step of translating it (see the banner in each /fr/ page).
const TRANSLATED_PATHS = [];

// User-facing strings used by the scripts that build cards at runtime.
// Anything baked into the HTML is translated in the page itself.
//
// To add French, add an `fr` block with the same keys. Any key a language
// is missing falls back to English, so a partial block is fine.
const UI_STRINGS = {
    en: {
        volunteersLoading: 'Loading volunteer data...',
        volunteersError: 'Error loading Volunteer data',
        volunteersNone: 'No volunteer data available',
        vacant: 'Vacant',
        eventsLoading: 'Loading event data...',
        eventsNone: 'No upcoming events'
    }
};

// The banner shown at the top of a French page that is still an English
// placeholder. These are editable — reword the French line if you like; it's
// a system notice, not page content.
const TRANSLATION_NOTICE = {
    fr: 'Cette page n’est pas encore traduite. Voici la version anglaise.',
    en: 'This page hasn’t been translated to French yet — showing the English version.',
    cta: 'View the English page'
};

/**
 * The language of the current page, taken from its URL prefix.
 * @returns {string} - A language code, e.g. 'en' or 'fr'
 */
function getLang() {
    const prefix = window.location.pathname.split('/')[1];
    return TRANSLATED_LANGS.includes(prefix) ? prefix : DEFAULT_LANG;
}

/**
 * Looks up a UI string in the current language, falling back to English.
 * @param {string} key - A key from UI_STRINGS
 * @returns {string} - The translated string
 */
function t(key) {
    const strings = UI_STRINGS[getLang()] || {};
    return strings[key] || UI_STRINGS[DEFAULT_LANG][key] || key;
}

/**
 * Looks up an officer's job title in the current language.
 * @param {string} role - The officer role as the ORK names it
 * @returns {string} - The translated job title
 */
function officerTitle(role) {
    const titles = OFFICER_POSITIONS[getLang()] || {};
    return titles[role] || role;
}

/**
 * Formats an ORK date for display in the current language.
 * @param {string} value - A date the ORK gave us
 * @returns {string} - The date, written the way the current language writes dates
 */
function formatDate(value) {
    const locale = getLang() === 'en' ? 'en-CA' : getLang() + '-CA';
    return new Date(value).toLocaleDateString(locale, {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
}

/**
 * Reduces a path to a comparable form: no index.html, always a trailing slash.
 * @param {string} path - A URL path
 * @returns {string} - The normalized path
 */
function normalizePath(path) {
    return path.replace(/index\.html$/, '').replace(/\/?$/, '/');
}

/**
 * Rewrites a path to point at its counterpart in another language.
 * @param {string} lang - The language code to switch to
 * @param {string} [path] - The path to rewrite; defaults to the current page
 * @returns {string} - The path in the requested language
 */
function pathInLang(lang, path) {
    const segments = (path || window.location.pathname).split('/');

    // Drop the existing language prefix, if the path has one.
    if (TRANSLATED_LANGS.includes(segments[1])) {
        segments.splice(1, 1);
    }

    const basePath = segments.join('/') || '/';
    return lang === DEFAULT_LANG ? basePath : '/' + lang + basePath;
}

/**
 * Whether a page's French version is real French rather than an English
 * placeholder. Judged by the page's English path, so it gives the same
 * answer whether you ask from the English or the French URL.
 * @param {string} [path] - The path to check; defaults to the current page
 * @returns {boolean} - True if the page has been translated
 */
function isTranslated(path) {
    return TRANSLATED_PATHS.includes(normalizePath(pathInLang(DEFAULT_LANG, path)));
}

// Theme Toggle Functionality
function initThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    if (!themeToggle) return;
    
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        themeToggle.textContent = document.body.classList.contains('dark-mode') ? '🌞' : '🌓';
    });

    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '🌞';
    }
}

// Scroll Effects
function initScrollEffects() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Add/remove scrolled class based on scroll position
        if (currentScroll > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initScrollEffects();
});