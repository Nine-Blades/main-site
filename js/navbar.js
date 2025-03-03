// Function to dynamically load the navbar
async function loadNavbar() {
    try {
        // Fetch the navbar HTML template
        const response = await fetch('/components/navbar.html');
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
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
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