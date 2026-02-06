/**
 * Events.js - Handles dynamic loading of event data from the ORK API
 * 
 * This script fetches event data from the Amtgard ORK API and populates
 * the event cards on chapter pages.
 */

// Configuration
const ORK_API_BASE = 'https://ork.amtgard.com/orkservice/Json/index.php';
// const ORK_API_BASE = 'http://localhost:19080/orkservice/Json/index.php'

var KINGDOM_ID = 31;

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
        return data.Result || [];
    } catch (error) {
        console.error('Error fetching officer data:', error);
        return [];
    }
}

/**
 * Fetches event data for a specific Kingdom from the ORK API
 * @param {number} kingdomId - The ORK Kingdom ID
 * @returns {Promise<Object>} - Promise resolving to officer data
 */
async function fetchKingdomEvents(kingdomId) {
    try {
        const response = await fetch(ORK_API_BASE + '?call=SearchService%2FEvent&date_order=true&name=&limit=200&kingdom_id=' + kingdomId);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch events: ${response.status}`);
        }
        
        const data = await response.json();
        return data.Result || [];
    } catch (error) {
        console.error('Error fetching officer data:', error);
        return [];
    }
}

/**
 * Creates a event card element for an event
 * @param {Object} event - Event data from the ORK
 * @returns {HTMLElement} - The event card element
 */
function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';
    
    // const volunteerName = officer.Persona ? `<a href="https://ork.amtgard.com/orkui/index.php?Route=Player/index/${officer.MundaneId}"  target="_blank">${officer.Persona}</a>` : `Vacant`;
    if (event.ParkName) {
        card.innerHTML = `
            <div class="event-header">${event.Name}</div>
            <div class="event-content">
                <div class="event-date">${new Date(event.NextDate).toDateString()}</div>
                <div class="event-date">${event.ParkName}</div>
                <div class="event-description">${event.ShortDescription}</div>
            </div>
        `;
    } else {
        card.innerHTML = `
            <div class="event-header">${event.Name}</div>
            <div class="event-content">
                <div class="event-date">${new Date(event.NextDate).toDateString()}</div>
                <div class="event-description">${event.ShortDescription}</div>
            </div>
        `;
    }
    
    return card;
}

/**
 * Loads event data for the current page
 */
async function loadEvents() {
    // Get the current chapter from the URL path
    const url = window.location.href.replace(/\/$/, ''); 
    const chapterSlug = url.slice(url.lastIndexOf('/') + 1);

    if (chapterSlug === "chapters") {
        loadKingdomEvents(KINGDOM_ID);
    } else {
        // Get the park ID for this chapter
        const parkId = PARK_IDS[chapterSlug];
        loadParkEvents(parkId);
    }
}

/**
 * Loads event data for the current chapter page
 */
async function loadParkVolunteers(parkId) {
    if (!parkId) {
        console.warn(`No park ID configured for chapter: ${chapterSlug}`);
        return;
    }

    // Fetch officer data
    const officers = await fetchParkOfficers(parkId);

    addOfficersToGrid(officers);
}

/**
 * Loads volunteer data for the current Kingdom
 */
async function loadKingdomEvents(kingdomId) {
    if (!kingdomId) {
        console.warn(`No kingdom Id configured for chapters`);
        return;
    }

    // Fetch officer data
    const events = await fetchKingdomEvents(kingdomId);

    addEventsToGrid(events);
}

/**
 * Given a list of officers, add them to the volunteer grid if available on the current page
 */
async function addEventsToGrid(events) {
    
    // Get the events container
    const eventsGrid = document.querySelector('.events-grid');
    
    if (!eventsGrid) {
        console.warn('No events grid found on page');
        return;
    }
    
    // Show loading state
    eventsGrid.innerHTML = '<div class="loading">Loading event data...</div>';
        
    // Clear loading state
    eventsGrid.innerHTML = '';
    
    // If no events found, show message
    if (!events.length) {
        eventsGrid.innerHTML = '<div class="no-data">No event data found</div>';
        return;
    }
    
    // Create and append event cards
    events.forEach(function(anEvent) {
        const card = createEventCard(anEvent);
        eventsGrid.appendChild(card);
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadEvents);