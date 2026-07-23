/**
 * Volunteers.js - Handles dynamic loading of volunteer data from the ORK API
 * 
 * This script fetches officer data from the Amtgard ORK API and populates
 * the volunteer cards on chapter pages.
 * 
 * requires main.js
 */

/**
 * Fetches officer data for a specific park from the ORK API
 * @param {number} parkId - The ORK park ID
 * @returns {Promise<Object>} - Promise resolving to officer data
 */
async function fetchParkOfficers(parkId) {
    try {
        const response = await fetch(ORK_API_BASE + '?request=&call=Park/GetOfficers&request[ParkId]=' + parkId);
        
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
 * Fetches officer data for a specific Kingdom from the ORK API
 * @param {number} kingdomId - The ORK Kingdom ID
 * @returns {Promise<Object>} - Promise resolving to officer data
 */
async function fetchKingdomOfficers(kingdomId) {
    try {
        const response = await fetch(ORK_API_BASE + '?request=&call=Kingdom/GetOfficers&request[KingdomId]=' + kingdomId);
        
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
    
    const position = officerTitle(officer.OfficerRole);

    const volunteerName = officer.Persona ? `<a href="https://ork.amtgard.com/orkui/index.php?Route=Player/index/${officer.MundaneId}"  target="_blank">${officer.Persona}</a>` : t('vacant');
    card.innerHTML = `
        <div class="volunteer-header">${position}</div>
        <div class="volunteer-content">
            <div class="volunteer-name">${volunteerName}</div>
        </div>
    `;
    
    return card;
}

/**
 * Loads volunteer data for the current page
 */
async function loadVolunteers() {
    // Show loading state
    const volunteersGrid = document.querySelector('.volunteers-grid');
    volunteersGrid.innerHTML = `<div class="loading">${t('volunteersLoading')}</div>`;
    // Get the current chapter from the URL path
    const url = window.location.pathname.replace(/\/$/, '');
    const chapterSlug = url.slice(url.lastIndexOf('/') + 1);

    // Load park officers on a chapter page; otherwise fall back to kingdom
    // officers (chapters index, /index.html, or file:// filesystem paths).
    const parkId = PARK_IDS[chapterSlug];
    if (parkId) {
        loadParkVolunteers(parkId).catch((error) => {
            volunteersGrid.innerHTML = `<div class="loading">${t('volunteersError')}</div>`;
        });
    } else {
        loadKingdomVolunteers(KINGDOM_ID).catch((error) => {
            volunteersGrid.innerHTML = `<div class="loading">${t('volunteersError')}</div>`;
        });
    }
}

/**
 * Loads volunteer data for the current chapter page
 */
async function loadParkVolunteers(parkId) {
    if (!parkId) {
        throw new Error("No Park ID given");
    }

    // Fetch officer data
    const officers = await fetchParkOfficers(parkId);

    addOfficersToGrid(officers);
}

/**
 * Loads volunteer data for the current Kingdom
 */
async function loadKingdomVolunteers(kingdomId) {
    if (!kingdomId) {
        throw new Error("No Kingdom ID given");
    }

    // Fetch officer data
    const officers = await fetchKingdomOfficers(kingdomId);

    addOfficersToGrid(officers);
}

/**
 * Given a list of officers, add them to the volunteer grid if available on the current page
 */
async function addOfficersToGrid(officers) {
    
    // Get the volunteers container
    const volunteersGrid = document.querySelector('.volunteers-grid');
    
    if (!volunteersGrid) {
        console.warn('No volunteers grid found on page');
        return;
    }
    
    // Show loading state
    volunteersGrid.innerHTML = `<div class="loading">${t('volunteersLoading')}</div>`;
        
    // Clear loading state
    volunteersGrid.innerHTML = '';
    
    // If no officers found, show message
    if (!officers.length) {
        volunteersGrid.innerHTML = `<div class="no-data">${t('volunteersNone')}</div>`;
        return;
    }
    
    // Create and append volunteer cards
    for (const role of OFFICER_ROLES) {
        const officer = officers.find(o => o.OfficerRole === role) || { OfficerRole: role };
        const card = createVolunteerCard(officer);
        volunteersGrid.appendChild(card);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadVolunteers);