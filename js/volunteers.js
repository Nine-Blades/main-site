/**
 * Volunteers.js - Handles dynamic loading of volunteer data from the ORK API
 * 
 * This script fetches officer data from the Amtgard ORK API and populates
 * the volunteer cards on chapter pages.
 */

// Configuration
const ORK_API_BASE = 'https://api.amtgard.com/ork/v3';

// Map of chapter slugs to their ORK park IDs
const PARK_IDS = {
    'twilight-peak': 79, // Replace with actual ORK park ID
    'felfrost': 277,      // Replace with actual ORK park ID
    'linnagond': 494,     // Replace with actual ORK park ID
    'heathens-cove': 901, // Replace with actual ORK park ID
    'lichwood-grove': 615, // Replace with actual ORK park ID
    'bellhollow': 609,    // Replace with actual ORK park ID
    'silva-urbem': 404,   // Replace with actual ORK park ID
    'legends-library': 505 // Replace with actual ORK park ID
};

// Map of officer positions to their display names
const OFFICER_POSITIONS = {
    'Monarch': 'Monarch',
    'Regent': 'Regent',
    'Prime Minister': 'Prime Minister',
    'Champion': 'Champion',
    'GMR': 'GMR'
};

/**
 * Fetches officer data for a specific park from the ORK API
 * @param {number} parkId - The ORK park ID
 * @returns {Promise<Object>} - Promise resolving to officer data
 */
async function fetchOfficers(parkId) {
    try {
        const response = await fetch('https://ork.amtgard.com/orkservice/Json/index.php?request=&call=Park/GetOfficers&request[ParkId]=' + parkId);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch officers: ${response.status}`);
        }
        
        const data = await response.json();
        return data.Officers || [];
    } catch (error) {
        console.error('Error fetching officer data:', error);
        return [];
    }
}

/**
 * Creates a volunteer card element for an officer
 * @param {Object} officer - Officer data from the ORK
 * @returns {HTMLElement} - The volunteer card element
 */
function createVolunteerCard(officer) {
    const card = document.createElement('div');
    card.className = 'volunteer-card';
    
    const position = OFFICER_POSITIONS[officer.OfficerRole] || officer.OfficerRole;
    
    card.innerHTML = `
        <div class="volunteer-header">${position}</div>
        <div class="volunteer-content">
            <div class="volunteer-name">${officer.Persona || 'Vacant'}</div>
        </div>
    `;
    
    return card;
}

/**
 * Loads volunteer data for the current chapter page
 */
async function loadVolunteers() {
    // Get the current chapter from the URL path
    const url = window.location.href.replace(/\/$/, ''); 
    const chapterSlug = url.substr(url.lastIndexOf('/') + 1);
    
    // Get the park ID for this chapter
    const parkId = PARK_IDS[chapterSlug];
    
    if (!parkId) {
        console.warn(`No park ID configured for chapter: ${chapterSlug}`);
        return;
    }
    
    // Get the volunteers container
    const volunteersGrid = document.querySelector('.volunteers-grid');
    
    if (!volunteersGrid) {
        console.warn('No volunteers grid found on page');
        return;
    }
    
    // Show loading state
    volunteersGrid.innerHTML = '<div class="loading">Loading volunteer data...</div>';
    
    // Fetch officer data
    const officers = await fetchOfficers(parkId);
    
    // Clear loading state
    volunteersGrid.innerHTML = '';
    
    // If no officers found, show message
    if (!officers.length) {
        volunteersGrid.innerHTML = '<div class="no-data">No volunteer data available</div>';
        return;
    }
    
    // Create and append volunteer cards
    for (const position of Object.keys(OFFICER_POSITIONS)) {
        const officer = officers.find(o => o.OfficerRole === OFFICER_POSITIONS[position]) || { position };
        const card = createVolunteerCard(officer);
        volunteersGrid.appendChild(card);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadVolunteers);