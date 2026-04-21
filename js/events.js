/**
 * Events.js - Handles dynamic loading of event data from the ORK API
 * 
 * This script fetches event data from the Amtgard ORK API and populates
 * the event cards on chapter pages.
 */

/**
 * Fetches event data for a specific Kingdom from the ORK API
 * @param {number} kingdomId - The ORK Kingdom ID
 * @returns {Promise<Object>} - Promise resolving to event data
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
        console.error('Error fetching event data:', error);
        return [];
    }
}

/**
 * Fetches event data for a specific Park from the ORK API
 * @param {number} parkId - The ORK Park ID
 * @returns {Promise<Object>} - Promise resolving to event data
 */
async function fetchParkEvents(parkId) {
    try {
        const response = await fetch(ORK_API_BASE + '?call=SearchService%2FEvent&date_order=true&name=&limit=200&park_id=' + parkId);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch events: ${response.status}`);
        }
        
        const data = await response.json();
        return data.Result || [];
    } catch (error) {
        console.error('Error fetching event data:', error);
        return [];
    }
}

/**
 * Creates a event card element for an event
 * @param {Object} event - Event data from the ORK
 * @returns {HTMLElement} - The event card element
 */
function createEventCard(event) {
    const card = document.createElement('a');
    card.className = 'event-card';
    card.href = `https://ork.amtgard.com/orkui/index.php?Route=Event/detail/${event.EventId}/${event.NextDetailId}`;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

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
    // Get the volunteers container
    const eventsGrid = document.querySelector('.events-grid');
    eventsGrid.innerHTML = '<div class="loading">Loading Events data...</div>';

    // Get the current chapter from the URL path
    const url = window.location.pathname.replace(/\/$/, '');
    const chapterSlug = url.slice(url.lastIndexOf('/') + 1);
    const currentPath = window.location.pathname;

    if (currentPath === "/" || chapterSlug === "chapters") {
        loadKingdomEvents(KINGDOM_ID);
    } else {
        // Get the park ID for this chapter
        const parkId = PARK_IDS[chapterSlug];
        loadParkEvents(parkId);
    }
}

/**
 * Loads events data for the current Kingdom
 */
async function loadKingdomEvents(kingdomId) {
    if (!kingdomId) {
        console.warn(`No kingdom Id configured for chapters`);
        return;
    }

    const events = await fetchKingdomEvents(kingdomId);

    addEventsToGrid(events);
}

/**
 * Loads events data for the current Park
 */
async function loadParkEvents(parkId) {
    if (!parkId) {
        console.warn(`No park Id configured for chapters`);
        return;
    }

    // Fetch event data
    const events = await fetchParkEvents(parkId);

    addEventsToGrid(events);
}

/**
 * Given a list of events, add them to the event grid if available on the current page
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
        eventsGrid.innerHTML = '<div class="no-data">No upcoming events</div>';
        return;
    }
    
    // Create and append event cards
    events.forEach(function(anEvent) {
        const eventDate = new Date(anEvent.NextDate);
        const today = new Date();
        // Set it back one day so that we get anything within 24 hours of today
        today.setDate(today.getDate() - 1);
        if (eventDate >= today) {
            const card = createEventCard(anEvent);
            eventsGrid.appendChild(card);
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadEvents);