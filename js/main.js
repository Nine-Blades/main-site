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

// Map of officer positions to their display names
const OFFICER_POSITIONS = {
    'Monarch': 'Monarch',
    'Regent': 'Regent',
    'Prime Minister': 'Prime Minister',
    'Champion': 'Champion',
    'GMR': 'GMR'
};

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