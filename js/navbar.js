// Function to dynamically load the navbar
async function loadNavbar() {
    try {
        // Each language has its own navbar template: navbar.html is English,
        // navbar.fr.html is French, and so on. Only the English one exists
        // so far; a translated navbar is the first thing a new language needs.
        const lang = getLang();
        const template = lang === DEFAULT_LANG ? 'navbar.html' : `navbar.${lang}.html`;

        // Fetch the navbar HTML template
        const response = await fetch(`/components/${template}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch navbar: ${response.status}`);
        }

        const navbarHtml = await response.text();

        // Insert the navbar at the beginning of the body
        const navbarContainer = document.createElement('div');
        navbarContainer.innerHTML = navbarHtml;
        document.body.insertBefore(navbarContainer.firstElementChild, document.body.firstChild);

        // Initialize mobile menu functionality
        initMobileMenu();
        initLanguageSwitch();
        initTranslationNotice();
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
}

// Points the language switcher at the current page in the other language.
// Every page has a counterpart (French pages start as English placeholders),
// so the switch is always shown; it just leads to a not-yet-translated page
// that says so.
function initLanguageSwitch() {
    document.querySelectorAll('.lang-switch').forEach(link => {
        link.href = pathInLang(link.dataset.lang);
    });
}

// On a French page that is still an English placeholder, shows a banner
// saying so and linking to the English version. Removes itself (by not
// rendering) once the page's path is added to TRANSLATED_PATHS.
function initTranslationNotice() {
    if (getLang() === DEFAULT_LANG || isTranslated()) return;

    const notice = document.createElement('div');
    notice.className = 'translation-notice';
    notice.setAttribute('role', 'note');
    notice.innerHTML = `
        <span class="translation-notice-primary" lang="fr">${TRANSLATION_NOTICE.fr}</span>
        <span class="translation-notice-secondary" lang="en">${TRANSLATION_NOTICE.en}</span>
        <a href="${pathInLang(DEFAULT_LANG)}" hreflang="en" lang="en">${TRANSLATION_NOTICE.cta}</a>
    `;

    // Sits directly under the fixed navbar, above the page's own header.
    const header = document.querySelector('.header');
    if (header) {
        header.insertAdjacentElement('afterend', notice);
    } else {
        document.body.insertBefore(notice, document.body.firstChild);
    }

    // The page's first element reserves ~60px for the fixed navbar; the
    // notice now provides that clearance, so drop the duplicate gap.
    const after = notice.nextElementSibling;
    if (after) after.style.marginTop = '0';
}

// Mobile Menu Functionality
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (!mobileMenuBtn || !navMenu) return;

    mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-container')) {
            navMenu.classList.remove('active');
        }
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    });
}

// Load navbar when DOM is loaded
document.addEventListener('DOMContentLoaded', loadNavbar);