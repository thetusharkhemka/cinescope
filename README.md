# CineScope

A frontend movie discovery web application built with vanilla HTML, CSS, and JavaScript. CineScope integrates with the TMDB (The Movie Database) API to deliver a cinematic browsing experience — search, filter, sort, and save movies with a polished, fully responsive interface.

---

## API

**The Movie Database (TMDB) API**
- Base URL: `https://api.themoviedb.org/3/`
- Docs: https://developer.themoviedb.org/docs
- Free to use — requires a free API key

---

## Features

### Core
- Auto-rotating cinematic hero banner with backdrop images and Ken Burns zoom effect
- Three movie sections: Trending Now, All-Time Greats, Now Playing
- Search movies by title with a live dropdown preview
- Filter by genre using interactive mood pill buttons
- Sort by popularity, rating, release date, or title
- Movie detail modal with cast, runtime, genre tags, and full description
- Save movies to a personal Watchlist with localStorage persistence
- Dark / Light mode toggle with preference saved to localStorage
- Skeleton card loaders while API data is fetching
- Toast notifications for all user actions
- Cursor glow effect (desktop)

### Bonus Features (All Implemented)
| Feature | Implementation |
|---|---|
| **Debouncing** | Search input: `debounce(fn, 350ms)` — prevents API calls on every keystroke |
| **Throttling** | Scroll events: `throttle(fn, 100ms)` — cursor glow and navbar scroll effect throttled |
| **Infinite Scroll** | `IntersectionObserver` on a sentinel element at the bottom of Now Playing — loads new pages automatically |
| **Loading Indicators** | Skeleton card placeholders while initial data loads; animated dot loader during infinite scroll |
| **localStorage** | Favorites (Watchlist) and theme preference persist across sessions |
| **Progressive Web App** | `manifest.json` + `sw.js` service worker with cache-first strategy for app shell and images, network-first for API |

---

## Technologies

- HTML5
- CSS3 (custom properties, grid, flexbox, CSS animations, backdrop-filter)
- JavaScript ES6+ (async/await, destructuring, optional chaining, IntersectionObserver)
- TMDB REST API
- Fetch API
- localStorage
- Service Worker (PWA)
- Array HOFs: `filter()`, `sort()`, `map()`, `find()`, `reduce()`, `findIndex()`

---

## Array HOF Reference

| HOF | Where Used | Purpose |
|---|---|---|
| `.filter()` | `applyFiltersAndSort()`, `doSearch()`, `openModal()` | Filter by genre, remove no-poster results, filter cast |
| `.sort()` | `sortMovies()` | Sort by popularity, rating, date, or title |
| `.map()` | `renderMovieGrid()`, `renderGenrePills()` | Build card HTML, genre pill HTML, cast HTML |
| `.find()` | `bindCardEvents()`, genre lookups | Find movie by ID, genre name by ID |
| `.findIndex()` | `toggleFavorite()` | Check if movie is already in favorites |
| `.reduce()` | `applyFiltersAndSort()` | Merge + deduplicate trending + topRated + nowPlaying |

---

## Project Structure

```
cinescope/
├── index.html       — Application markup
├── style.css        — Styles, variables, animations, responsive
├── app.js           — All logic: API, state, rendering, events
├── sw.js            — Service worker for PWA / offline support
├── manifest.json    — PWA web app manifest
├── icons/           — App icons (192x192, 512x512)
└── README.md
```

---

## Setup

### 1. Clone

```bash
git clone https://github.com/thetusharkhemka/cinescope.git
cd cinescope
```

### 2. Get a TMDB API key

Sign up at https://www.themoviedb.org/ → Settings → API → Request an API Key (free).

### 3. Add your key

Open `app.js`, line 13:

```js
const API_KEY = "your_actual_api_key_here";
```

### 4. Run

Open `index.html` in any modern browser. No install, no build step, no server needed.

> For PWA / Service Worker to work, serve from a local server:
> ```bash
> npx serve .
> ```

---

## Milestones

| Milestone | Description | Deadline |
|---|---|---|
| 1 | Project setup, README, planning | 23rd March |
| 2 | API integration, responsive UI | 1st April |
| 3 | Search, filter, sort, interactivity | 8th April |
| 4 | Final deployment and submission | 10th April |

---

## Author

**Tushar Khemka**  
GitHub: https://github.com/thetusharkhemka/cinescope
