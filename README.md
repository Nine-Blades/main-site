# Kingdom of the Nine Blades Website

## Project Overview
This is a redesigned version of the nineblades.ca website for the Kingdom of the Nine Blades Amtgard LARP community in Canada. The website serves as a hub for information about Amtgard, a medieval combat sport/LARP with chapters across North America.

## Project Structure

```
/
├── index.html              # Homepage
├── css/
│   ├── styles.css         # Main stylesheet
│   └── navbar.css         # Navbar-specific styles
├── js/
│   ├── main.js            # Main JavaScript functionality
│   └── navbar.js          # Navbar dynamic loading script
├── components/
│   └── navbar.html        # Reusable navbar component
├── about/
│   └── index.html         # About Amtgard page
├── guides/
│   ├── index.html         # Main guides listing page
│   └── scout/             # Example class guide
│       └── index.html     # Scout class guide
├── chapters/
│   ├── index.html         # Main chapters directory page
│   ├── twilight-peak/     # Toronto chapter
│   │   └── index.html     # Twilight Peak chapter page
│   ├── felfrost/          # Ottawa chapter
│   │   └── index.html     # Felfrost chapter page
│   ├── linnagond/         # Sudbury chapter
│   │   └── index.html     # Linnagond chapter page
│   ├── heathens-cove/     # Kingston chapter
│   │   └── index.html     # Heathens Cove chapter page
│   ├── lichwood-grove/    # Kitchener chapter
│   │   └── index.html     # Lichwood Grove chapter page
│   ├── bellhollow/        # Brantford chapter
│   │   └── index.html     # Bellhollow chapter page
│   ├── silva-urbem/       # London chapter
│   │   └── index.html     # Silva Urbem chapter page
│   └── legends-library/   # Barrie chapter
│       └── index.html     # Legends Library chapter page
└── getting-started/
    └── index.html         # Getting started guide
```

## Features
- Responsive design that works on mobile, tablet, and desktop
- Dark/light theme toggle with local storage persistence
- Dynamic navbar loading for consistent navigation across all pages
- Comprehensive guides and information about Amtgard
- Chapter directory with detailed information for each chapter
- Dynamic volunteer information pulled from ORK data

## Technologies Used
- HTML5
- CSS3 (with CSS variables for theming)
- Vanilla JavaScript (no frameworks)
- Google Fonts (Roboto and MedievalSharp)

## Setup and Development
1. Clone the repository
2. Open the project in your preferred code editor
3. Use a local development server to view the site (e.g., Live Server extension for VS Code)

## Deployment
The site is designed to be deployed to any standard web hosting service. Simply upload all files and directories to your web server's root directory.

## Future Improvements
- Add more class guides beyond the Scout example
- Add all of the parks
- Add a calendar/events system for chapter meetups and kingdom events
- Add image galleries for past events