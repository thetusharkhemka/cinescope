
"use strict";

const API_KEY   = "YOUR_TMDB_API_KEY_HERE"; 
const BASE      = "https://api.themoviedb.org/3";
const IMG       = "https://image.tmdb.org/t/p";
const FALLBACK  = "https://placehold.co/342x513/14141f/555?text=No+Image";


const state = {
  trending:       [],
  topRated:       [],
  nowPlaying:     [],
  searchResults:  [],
  genres:         [],
  favorites:      [],
  heroMovies:     [],
  heroIndex:      0,
  heroInterval:   null,
  activeGenre:    null,
  sortBy:         "popularity.desc",
  currentMovie:   null,
  searchTimer:    null,
  infinitePage:   1,
  infiniteLoading:false,
  infiniteDone:   false,
};


const $ = id => document.getElementById(id);

const D = {
  heroBg:          $("heroBg"),
  heroTitle:       $("heroTitle"),
  heroMeta:        $("heroMeta"),
  heroDesc:        $("heroDesc"),
  heroDots:        $("heroDots"),
  heroDetailsBtn:  $("heroDetailsBtn"),
  heroFavBtn:      $("heroFavBtn"),
  genrePills:      $("genrePills"),
  filterInfo:      $("filterInfo"),
  sortSelect:      $("sortSelect"),
  clearFilters:    $("clearFilters"),
  trendingGrid:    $("trendingGrid"),
  topRatedGrid:    $("topRatedGrid"),
  nowPlayingGrid:  $("nowPlayingGrid"),
  trendingSection: $("trendingSection"),
  topRatedSection: $("topRatedSection"),
  nowPlayingSection:$("nowPlayingSection"),
  favoritesSection:$("favoritesSection"),
  favoritesGrid:   $("favoritesGrid"),
  emptyFav:        $("emptyFav"),
  searchResultsSection: $("searchResultsSection"),
  searchResultsGrid:    $("searchResultsGrid"),
  searchResultCount:    $("searchResultCount"),
  resultsTitle:    $("resultsTitle"),
  searchInput:     $("searchInput"),
  searchClearBtn:  $("searchClearBtn"),
  searchDropdown:  $("searchDropdown"),
  modalOverlay:    $("modalOverlay"),
  modalHeroBand:   $("modalHeroBand"),
  modalBackdrop:   $("modalBackdrop"),
  modalPoster:     $("modalPoster"),
  modalTitle:      $("modalTitle"),
  modalGenres:     $("modalGenres"),
  modalRating:     $("modalRating"),
  modalYear:       $("modalYear"),
  modalRuntime:    $("modalRuntime"),
  modalLang:       $("modalLang"),
  modalOverview:   $("modalOverview"),
  modalCastLabel:  $("modalCastLabel"),
  modalCast:       $("modalCast"),
  modalFavBtn:     $("modalFavBtn"),
  modalFavText:    $("modalFavText"),
  modalClose:      $("modalClose"),
  themeToggle:     $("themeToggle"),
  favToggleBtn:    $("favToggleBtn"),
  favCount:        $("favCount"),
  toast:           $("toast"),
  scrollSentinel:  $("scrollSentinel"),
  scrollLoader:    $("scrollLoader"),
  cursorGlow:      $("cursorGlow"),
};


/** Debounce: delays fn by ms, resets on each call */
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Throttle: ensures fn runs at most once per ms interval */
function throttle(fn, ms) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn(...args);
    }
  };
}

const posterUrl   = (p, s = "w342") => p ? `${IMG}/${s}${p}` : FALLBACK;
const backdropUrl = (p, s = "w1280") => p ? `${IMG}/${s}${p}` : "";


async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${BASE}${endpoint}`);
  url.searchParams.set("api_key", API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[CineScope] API error on ${endpoint}:`, err.message);
    return null;
  }
}


async function init() {
  loadFavorites();
  loadTheme();

  // Show skeletons immediately
  renderSkeletons(D.trendingGrid, 8);
  renderSkeletons(D.topRatedGrid, 8);
  renderSkeletons(D.nowPlayingGrid, 8);

  // Parallel API calls for fast load
  const [trending, topRated, nowPlaying, genres] = await Promise.all([
    apiFetch("/trending/movie/week"),
    apiFetch("/movie/top_rated"),
    apiFetch("/movie/now_playing"),
    apiFetch("/genre/movie/list"),
  ]);

  if (genres?.genres) {
    state.genres = genres.genres;
    renderGenrePills();
  }

  if (trending?.results) {
    state.trending    = trending.results;
    state.heroMovies  = trending.results.slice(0, 6);
    renderHero(0);
    startHeroRotation();
    renderMovieGrid(D.trendingGrid, state.trending);
  }

  if (topRated?.results) {
    state.topRated = topRated.results;
    renderMovieGrid(D.topRatedGrid, state.topRated);
  }

  if (nowPlaying?.results) {
    state.nowPlaying = nowPlaying.results;
    state.infinitePage = 1;
    renderMovieGrid(D.nowPlayingGrid, state.nowPlaying);
  }

  renderFavorites();
  updateFavCount();
  bindEvents();
  setupInfiniteScroll();
  setupCursorGlow();
  registerServiceWorker();
}


function renderHero(index) {
  const m = state.heroMovies[index];
  if (!m) return;
  state.heroIndex = index;

  // Fade out, swap, fade in
  D.heroBg.style.opacity = "0";
  D.heroBg.classList.remove("loaded");

  setTimeout(() => {
    if (m.backdrop_path) {
      D.heroBg.style.backgroundImage = `url(${backdropUrl(m.backdrop_path)})`;
    }
    D.heroBg.style.opacity    = "1";
    D.heroBg.classList.add("loaded");
    D.heroTitle.textContent   = m.title || m.name || "—";
    D.heroDesc.textContent    = m.overview || "";

    const isFav = state.favorites.some(f => f.id === m.id);
    D.heroFavBtn.textContent  = isFav ? "✓ In Watchlist" : "+ Watchlist";

    D.heroMeta.innerHTML = `
      <span class="hero-rating">★ ${m.vote_average?.toFixed(1) || "N/A"}</span>
      <span class="hero-dot-sep"></span>
      <span>${m.release_date?.slice(0,4) || "—"}</span>
      <span class="hero-dot-sep"></span>
      <span>${m.original_language?.toUpperCase() || ""}</span>
    `;
  }, 380);

  // Dots
  D.heroDots.innerHTML = state.heroMovies
    .map((_, i) => `<div class="hero-dot ${i === index ? "active" : ""}" data-i="${i}"></div>`)
    .join("");

  D.heroDots.querySelectorAll(".hero-dot").forEach(dot => {
    dot.addEventListener("click", () => {
      clearInterval(state.heroInterval);
      renderHero(+dot.dataset.i);
      startHeroRotation();
    });
  });
}

function startHeroRotation() {
  clearInterval(state.heroInterval);
  state.heroInterval = setInterval(() => {
    renderHero((state.heroIndex + 1) % state.heroMovies.length);
  }, 6500);
}


function renderGenrePills() {
  const all = `<button class="genre-pill active" data-id="">All</button>`;
  // HOF: .map over genres array
  const pills = state.genres
    .map(g => `<button class="genre-pill" data-id="${g.id}">${g.name}</button>`)
    .join("");
  D.genrePills.innerHTML = all + pills;

  D.genrePills.querySelectorAll(".genre-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      D.genrePills.querySelectorAll(".genre-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeGenre = btn.dataset.id ? Number(btn.dataset.id) : null;
      applyFiltersAndSort();
    });
  });
}


function applyFiltersAndSort() {
  // Merge + deduplicate with .reduce (HOF)
  const all = [...state.trending, ...state.topRated, ...state.nowPlaying]
    .reduce((acc, m) => {
      if (!acc.find(x => x.id === m.id)) acc.push(m);
      return acc;
    }, []);

  // FILTER by genre using .filter (HOF)
  const filtered = state.activeGenre
    ? all.filter(m => Array.isArray(m.genre_ids) && m.genre_ids.includes(state.activeGenre))
    : all;

  // SORT using .sort (HOF)
  const sorted = sortMovies(filtered, state.sortBy);

  const genreName = state.activeGenre
    ? (state.genres.find(g => g.id === state.activeGenre)?.name || "Genre")
    : "All Genres";

  D.filterInfo.textContent = `${genreName} · ${sorted.length} movies`;

  if (state.activeGenre) {
    hideMainSections();
    D.searchResultsSection.style.display = "";
    D.resultsTitle.textContent   = genreName;
    D.searchResultCount.textContent = `${sorted.length} films`;
    renderMovieGrid(D.searchResultsGrid, sorted);
  } else {
    showMainSections();
    D.searchResultsSection.style.display = "none";
    renderMovieGrid(D.trendingGrid,   sortMovies(state.trending,   state.sortBy));
    renderMovieGrid(D.topRatedGrid,   sortMovies(state.topRated,   state.sortBy));
    renderMovieGrid(D.nowPlayingGrid, sortMovies(state.nowPlaying, state.sortBy));
  }
}

// HOF: .sort — spread to avoid mutation
function sortMovies(movies, sortBy) {
  return [...movies].sort((a, b) => {
    switch (sortBy) {
      case "popularity.desc":   return (b.popularity    || 0) - (a.popularity    || 0);
      case "vote_average.desc": return (b.vote_average  || 0) - (a.vote_average  || 0);
      case "release_date.desc": return new Date(b.release_date || 0) - new Date(a.release_date || 0);
      case "release_date.asc":  return new Date(a.release_date || 0) - new Date(b.release_date || 0);
      case "title.asc":         return (a.title || "").localeCompare(b.title || "");
      default:                  return 0;
    }
  });
}

// Debounced handler — fires 350ms after user stops typing
const debouncedSearch = debounce(async (q) => {
  if (!q) { closeDropdown(); showMainSections(); return; }
  const data = await apiFetch("/search/movie", { query: q, include_adult: false });
  if (!data?.results) return;

  // HOF: .filter to keep only movies with posters
  const results = data.results.filter(m => m.poster_path);
  state.searchResults = results;

  // HOF: .map to build dropdown HTML
  const html = results.slice(0, 7).map(m => `
    <div class="sr-item" data-id="${m.id}">
      <img class="sr-thumb"
           src="${posterUrl(m.poster_path, "w92")}"
           alt="${m.title}"
           loading="lazy"
           onerror="this.src='${FALLBACK}'" />
      <div class="sr-info">
        <div class="sr-title">${m.title}</div>
        <div class="sr-meta">${m.release_date?.slice(0,4) || "—"} · ★ ${m.vote_average?.toFixed(1) || "?"}</div>
      </div>
    </div>
  `).join("") || `<div class="sr-empty">No results for "${q}"</div>`;

  D.searchDropdown.innerHTML = html;
  D.searchDropdown.classList.add("open");

  D.searchDropdown.querySelectorAll(".sr-item[data-id]").forEach(el => {
    el.addEventListener("click", () => {
      const movie = results.find(m => m.id === Number(el.dataset.id));
      if (movie) openModal(movie);
      closeDropdown();
    });
  });
}, 350);

function setupSearch() {
  D.searchInput.addEventListener("input", () => {
    const q = D.searchInput.value.trim();
    D.searchClearBtn.classList.toggle("visible", q.length > 0);
    debouncedSearch(q);
  });

  D.searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const q = D.searchInput.value.trim();
      if (!q) return;
      closeDropdown();
      showSearchFullResults(q, state.searchResults);
    }
    if (e.key === "Escape") {
      D.searchInput.value = "";
      D.searchClearBtn.classList.remove("visible");
      closeDropdown();
      showMainSections();
    }
  });

  D.searchClearBtn.addEventListener("click", () => {
    D.searchInput.value = "";
    D.searchClearBtn.classList.remove("visible");
    closeDropdown();
    showMainSections();
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".search-wrap")) closeDropdown();
  });
}

function showSearchFullResults(q, results) {
  hideMainSections();
  D.searchResultsSection.style.display  = "";
  D.resultsTitle.textContent            = `Results for "${q}"`;
  D.searchResultCount.textContent       = `${results.length} found`;
  renderMovieGrid(D.searchResultsGrid, results);
}

function closeDropdown() {
  D.searchDropdown.classList.remove("open");
}



function setupInfiniteScroll() {
  if (!D.scrollSentinel) return;

  const onIntersect = throttle(async (entries) => {
    const entry = entries[0];
    if (!entry.isIntersecting) return;
    if (state.infiniteLoading || state.infiniteDone) return;
    // Only do infinite scroll on the main (default) view
    if (D.searchResultsSection.style.display !== "none") return;

    state.infiniteLoading = true;
    D.scrollLoader.style.display = "flex";

    const nextPage = state.infinitePage + 1;
    const data = await apiFetch("/movie/now_playing", { page: nextPage });

    if (data?.results?.length) {
      // HOF: .filter to remove duplicates already loaded
      const fresh = data.results.filter(
        m => !state.nowPlaying.find(x => x.id === m.id) && m.poster_path
      );
      state.nowPlaying = [...state.nowPlaying, ...fresh];
      state.infinitePage = nextPage;
      appendMoviesToGrid(D.nowPlayingGrid, fresh);
      if (data.page >= data.total_pages) state.infiniteDone = true;
    } else {
      state.infiniteDone = true;
    }

    D.scrollLoader.style.display = "none";
    state.infiniteLoading = false;
  }, 100); // throttle: max once per 100ms

  const observer = new IntersectionObserver(onIntersect, {
    root: null,
    rootMargin: "200px",
    threshold: 0,
  });

  observer.observe(D.scrollSentinel);
}



function renderSkeletons(container, n) {
  container.innerHTML = Array.from({ length: n }).map(() => `
    <div class="skel-card">
      <div class="skel-poster"></div>
      <div class="skel-line"></div>
      <div class="skel-line s"></div>
    </div>
  `).join("");
}

function buildCardHTML(m, index) {
  const isFav = state.favorites.some(f => f.id === m.id);
  // HOF: .map on genre_ids to get names
  const genreLabel = (m.genre_ids || [])
    .map(id => state.genres.find(g => g.id === id)?.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  return `
    <div class="movie-card" data-id="${m.id}" style="animation-delay:${Math.min(index,12)*0.04}s">
      <div class="poster-wrap">
        <img class="movie-poster"
             src="${posterUrl(m.poster_path)}"
             alt="${m.title}"
             loading="lazy"
             onerror="this.src='${FALLBACK}'" />
        <div class="rating-badge">${m.vote_average?.toFixed(1) || "?"}</div>
        <button class="card-fav-btn ${isFav ? "active" : ""}" data-id="${m.id}">
          ${isFav ? "♥" : "♡"}
        </button>
        <div class="poster-overlay">
          <span class="poster-genre">${genreLabel}</span>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title">${m.title}</div>
        <div class="card-year">${m.release_date?.slice(0,4) || "—"}</div>
      </div>
    </div>
  `;
}

function renderMovieGrid(container, movies) {
  if (!movies?.length) {
    container.innerHTML = `<p class="empty-state">No movies found.</p>`;
    return;
  }
  // HOF: .map to build all card HTML
  container.innerHTML = movies.map((m, i) => buildCardHTML(m, i)).join("");
  bindCardEvents(container, movies);
}

function appendMoviesToGrid(container, movies) {
  const frag = document.createDocumentFragment();
  movies.forEach((m, i) => {
    const el = document.createElement("div");
    el.innerHTML = buildCardHTML(m, i);
    const card = el.firstElementChild;
    frag.appendChild(card);
  });
  container.appendChild(frag);
  bindCardEvents(container, movies);
}

function bindCardEvents(container, movies) {
  container.querySelectorAll(".movie-card").forEach(card => {
    const id    = Number(card.dataset.id);
    // HOF: .find to locate movie object
    const movie = [...state.trending, ...state.topRated, ...state.nowPlaying,
                   ...state.searchResults, ...state.favorites].find(m => m.id === id);

    card.addEventListener("click", e => {
      if (e.target.closest(".card-fav-btn")) return;
      if (movie) openModal(movie);
    });

    const favBtn = card.querySelector(".card-fav-btn");
    if (favBtn && movie) {
      favBtn.addEventListener("click", e => {
        e.stopPropagation();
        toggleFavorite(movie);
        const isFav = state.favorites.some(f => f.id === id);
        favBtn.classList.toggle("active", isFav);
        favBtn.textContent = isFav ? "♥" : "♡";
      });
    }
  });
}



async function openModal(movie) {
  state.currentMovie = movie;

  // Immediate paint from local data
  D.modalTitle.textContent    = movie.title;
  D.modalOverview.textContent = movie.overview || "No description available.";
  D.modalRating.textContent   = `★ ${movie.vote_average?.toFixed(1) || "?"}`;
  D.modalYear.textContent     = movie.release_date?.slice(0,4) || "—";
  D.modalRuntime.textContent  = "";
  D.modalLang.textContent     = movie.original_language?.toUpperCase() || "";
  D.modalPoster.src           = posterUrl(movie.poster_path, "w500");
  D.modalPoster.alt           = movie.title;
  D.modalCast.innerHTML       = "";
  D.modalCastLabel.textContent = "";

  D.modalBackdrop.style.backgroundImage = movie.backdrop_path
    ? `url(${backdropUrl(movie.backdrop_path, "w780")})`
    : "none";

  // HOF: .map genre_ids
  const genreNames = (movie.genre_ids || [])
    .map(id => state.genres.find(g => g.id === id)?.name)
    .filter(Boolean);
  D.modalGenres.innerHTML = genreNames.map(n => `<span class="mgene">${n}</span>`).join("");

  const isFav = state.favorites.some(f => f.id === movie.id);
  D.modalFavBtn.classList.toggle("active", isFav);
  D.modalFavText.textContent = isFav ? "In Watchlist" : "Add to Watchlist";

  D.modalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";

  // Fetch richer data in parallel
  const [details, credits] = await Promise.all([
    apiFetch(`/movie/${movie.id}`),
    apiFetch(`/movie/${movie.id}/credits`),
  ]);

  if (details?.runtime) {
    const h = Math.floor(details.runtime / 60);
    const m = details.runtime % 60;
    D.modalRuntime.textContent = `${h}h ${m}m`;
  }

  if (credits?.cast?.length) {
    D.modalCastLabel.textContent = "Cast";
    // HOF: .filter + .slice + .map on cast
    const castHTML = credits.cast
      .filter(c => c.profile_path)
      .slice(0, 8)
      .map(c => `
        <div class="cast-item">
          <img class="cast-avatar"
               src="${IMG}/w92${c.profile_path}"
               alt="${c.name}"
               loading="lazy"
               onerror="this.src='${FALLBACK}'" />
          <span class="cast-name">${c.name}</span>
        </div>
      `).join("");
    D.modalCast.innerHTML = castHTML;
  }
}

function closeModal() {
  D.modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
  state.currentMovie = null;
}



function loadFavorites() {
  try {
    state.favorites = JSON.parse(localStorage.getItem("cinescope_fav")) || [];
  } catch { state.favorites = []; }
}

function saveFavorites() {
  localStorage.setItem("cinescope_fav", JSON.stringify(state.favorites));
}

function toggleFavorite(movie) {
  // HOF: .findIndex
  const idx = state.favorites.findIndex(f => f.id === movie.id);
  if (idx === -1) {
    state.favorites.push(movie);
    showToast(`Added "${movie.title}" to Watchlist`);
  } else {
    state.favorites.splice(idx, 1);
    showToast(`Removed "${movie.title}" from Watchlist`);
  }
  saveFavorites();
  updateFavCount();
  renderFavorites();

  // Sync modal button
  if (state.currentMovie?.id === movie.id) {
    const isFav = state.favorites.some(f => f.id === movie.id);
    D.modalFavBtn.classList.toggle("active", isFav);
    D.modalFavText.textContent = isFav ? "In Watchlist" : "Add to Watchlist";
  }
  // Sync hero button
  const hero = state.heroMovies[state.heroIndex];
  if (hero?.id === movie.id) {
    const isFav = state.favorites.some(f => f.id === hero.id);
    D.heroFavBtn.textContent = isFav ? "✓ In Watchlist" : "+ Watchlist";
  }
}

function updateFavCount() {
  D.favCount.textContent = state.favorites.length;
  D.favCount.classList.add("bump");
  setTimeout(() => D.favCount.classList.remove("bump"), 300);
}

function renderFavorites() {
  if (state.favorites.length === 0) {
    D.emptyFav.style.display = "block";
    D.favoritesGrid.innerHTML = "";
  } else {
    D.emptyFav.style.display = "none";
    renderMovieGrid(D.favoritesGrid, state.favorites);
  }
}



function loadTheme() {
  const saved = localStorage.getItem("cinescope_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
}

function toggleTheme() {
  const curr = document.documentElement.getAttribute("data-theme");
  const next = curr === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("cinescope_theme", next);
  showToast(next === "dark" ? "Dark mode on" : "Light mode on");
}



let toastTimer;
function showToast(msg) {
  D.toast.textContent = msg;
  D.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => D.toast.classList.remove("show"), 2600);
}


function setupCursorGlow() {
  if (window.matchMedia("(hover: none)").matches) return; // skip on touch
  const moveGlow = throttle(e => {
    D.cursorGlow.style.left = e.clientX + "px";
    D.cursorGlow.style.top  = e.clientY + "px";
  }, 16); // ~60fps
  document.addEventListener("mousemove", moveGlow, { passive: true });
}



function setupNavbarScroll() {
  const navbar = document.getElementById("navbar");
  const onScroll = throttle(() => {
    const scrolled = window.scrollY > 50;
    navbar.style.background = scrolled ? "var(--glass)" : "transparent";
    navbar.style.borderBottomColor = scrolled ? "var(--glass-b)" : "transparent";
  }, 100);
  window.addEventListener("scroll", onScroll, { passive: true });
}



function hideMainSections() {
  D.trendingSection.style.display    = "none";
  D.topRatedSection.style.display    = "none";
  D.nowPlayingSection.style.display  = "none";
  D.favoritesSection.style.display   = "none";
}

function showMainSections() {
  D.trendingSection.style.display    = "";
  D.topRatedSection.style.display    = "";
  D.nowPlayingSection.style.display  = "";
  D.searchResultsSection.style.display = "none";
  if (state.favorites.length > 0) D.favoritesSection.style.display = "";
  state.activeGenre = null;
  D.genrePills.querySelectorAll(".genre-pill")
    .forEach((b, i) => b.classList.toggle("active", i === 0));
}



function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .then(reg => console.log("[CineScope] SW registered:", reg.scope))
      .catch(err => console.warn("[CineScope] SW registration failed:", err));
  }
}


function bindEvents() {
  D.themeToggle.addEventListener("click", toggleTheme);

  D.favToggleBtn.addEventListener("click", () => {
    const open = D.favoritesSection.style.display !== "none";
    if (open) {
      D.favoritesSection.style.display = "none";
    } else {
      showMainSections();
      D.favoritesSection.style.display = "";
      setTimeout(() => D.favoritesSection.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  });

  D.sortSelect.addEventListener("change", () => {
    state.sortBy = D.sortSelect.value;
    if (state.activeGenre || D.searchResultsSection.style.display !== "none") {
      applyFiltersAndSort();
    } else {
      renderMovieGrid(D.trendingGrid,   sortMovies(state.trending,   state.sortBy));
      renderMovieGrid(D.topRatedGrid,   sortMovies(state.topRated,   state.sortBy));
      renderMovieGrid(D.nowPlayingGrid, sortMovies(state.nowPlaying, state.sortBy));
    }
  });

  D.clearFilters.addEventListener("click", () => {
    state.activeGenre = null;
    state.sortBy = "popularity.desc";
    D.sortSelect.value = "popularity.desc";
    D.searchInput.value = "";
    D.searchClearBtn.classList.remove("visible");
    closeDropdown();
    showMainSections();
    D.filterInfo.textContent = "All · Reset";
    showToast("Filters cleared");
  });

  D.heroDetailsBtn.addEventListener("click", () => {
    const m = state.heroMovies[state.heroIndex];
    if (m) openModal(m);
  });
  D.heroFavBtn.addEventListener("click", () => {
    const m = state.heroMovies[state.heroIndex];
    if (m) toggleFavorite(m);
  });

  D.modalClose.addEventListener("click", closeModal);
  D.modalOverlay.addEventListener("click", e => {
    if (e.target === D.modalOverlay) closeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && D.modalOverlay.classList.contains("open")) closeModal();
  });

  D.modalFavBtn.addEventListener("click", () => {
    if (state.currentMovie) toggleFavorite(state.currentMovie);
  });

  setupSearch();
  setupNavbarScroll();
}

init();
