// Global variables
let movieData = [];
let statsData = {};
let charts = {};
let filteredMovies = []; 

// Chart.js colors as specified
const chartColors = [
    '#00d735',  // Letterboxd signature green
    '#ff8000',  // Letterboxd orange
    '#40bcf4',  // Letterboxd blue
    '#ff6b6b',  // Modern coral red
    '#4ecdc4',  // Modern teal
    '#45b7d1',  // Sky blue
    '#96ceb4',  // Mint green
    '#feca57',  // Warm yellow
    '#ff9ff3',  // Soft pink
    '#54a0ff'   // Bright blue
];

// Initialize the application
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        showLoading(true);
        await loadData();
        setupEventListeners();
        updateAllViews();
        showLoading(false);
    } catch (error) {
        console.error('Failed to initialize app:', error);
        handleDataLoadError(error);
    }
}

function showLoading(show) {
    const loadingScreen = document.getElementById('loading-screen');
    const mainContent = document.getElementById('main-content');
    
    if (show) {
        loadingScreen.style.display = 'flex';
        mainContent.style.display = 'none';
    } else {
        loadingScreen.style.display = 'none';
        mainContent.style.display = 'block';
    }
}

async function loadData() {
    try {
        // Load CSV and JSON data from local data folder
        await loadCSVData();
        await loadJSONStats();
    } catch (error) {
        console.error('Could not load data files:', error);
        throw error;
    }
}

function loadCSVData() {
    return new Promise((resolve, reject) => {
        Papa.parse('data/movies.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.data && results.data.length > 0) {
                    // Populate movieData with entire dataset
                    movieData = results.data.map(row => ({
                        title:       row.title      || row.Title      || '',
                        year:        parseInt(row.year || row.Year)   || new Date().getFullYear(),
                        director:    row.director   || row.Director   || 'Unknown',
                        genre:       row.genre      || row.Genre      || 'Unknown',
                        rating:      parseFloat(row.rating || row.Rating) || 0,
                        watch_date: new Date(row.watch_date || row['Watch Date'] || row.date),
                        runtime:     parseInt(row.runtime || row.Runtime) || 90,
                        country:     row.country    || row.Country    || 'Unknown',
                        cast:        row.cast       || row.Cast       || ''
                    })).filter(m => !isNaN(m.watch_date));

                    const latestYear = Math.max(...movieData.map(m => m.watch_date.getFullYear()));
                    filteredMovies = movieData.filter(m => m.watch_date.getFullYear() === latestYear);

                    resolve();
                } else {
                    reject('No data found in CSV');
                }
            },
            error: function(error) {
                reject(error);
            }
        });
    });
}


async function loadJSONStats() {
    try {
        const response = await fetch('data/stats.json');
        if (response.ok) {
            statsData = await response.json();
        } else {
            throw new Error('Stats file not found');
        }
    } catch (error) {
        console.warn('Could not load stats.json, will calculate from movie data');
        statsData = {};
    }
}

function handleDataLoadError(error) {
    showLoading(false);

    const errorMessage = error?.message || (typeof error === 'string' ? error : 'Unknown error occurred');
    const errorStack = error?.stack || '';

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div style="text-align: center; padding: 4rem;">
            <h2>Data Loading Error</h2>
            <p>Could not load movie data. Please check the data files.</p>
            <pre style="color: red; font-size: 0.9rem; text-align: left; overflow-x: auto;">
            ${errorMessage}${errorStack ? `\n\nStack Trace:\n${errorStack}` : ''}
            </pre>
            <button onclick="location.reload()" class="btn btn--primary">Retry</button>
        </div>
    `;
    console.error('Data loading error:', error);
}

function setupEventListeners() {
    // Main tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab(this.dataset.tab);
        });
    });

    // **Correction 2**: Sub-tab navigation event listeners
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const subTab  = this.dataset.subtab;
            const mainTab = this.closest('.tab-panel');
            switchSubTab(subTab, mainTab);
        });
    });

    // Date filter event listeners
    document.getElementById('filterStart').addEventListener('change', applyFilters);
    document.getElementById('filterEnd').addEventListener('change', applyFilters);
    document.querySelector('.filter-button').addEventListener('click', applyFilters);
    document.querySelector('.clear-filters').addEventListener('click', clearFilters);
}

// Filter functions
function applyFilters() {
    const startDate = document.getElementById('filterStart').value;
    const endDate = document.getElementById('filterEnd').value;

    if (!startDate && !endDate) {
        alert('Please select at least one date to filter');
        return;
    }

    filteredMovies = movieData.filter(movie => {
        const movieDate = movie.watch_date;
        let includeMovie = true;

        if (startDate) {
            includeMovie = includeMovie && movieDate >= new Date(startDate);
        }

        if (endDate) {
            includeMovie = includeMovie && movieDate <= new Date(endDate);
        }

        return includeMovie;
    });

    // Update filter status
    let statusText = 'Filtered by: ';
    if (startDate) statusText += `From ${new Date(startDate).toLocaleDateString()}`;
    if (startDate && endDate) statusText += ' ';
    if (endDate) statusText += `To ${new Date(endDate).toLocaleDateString()}`;

    document.getElementById('filterStatus').textContent = statusText;
    document.getElementById('filterStatus').classList.add('active');

    // Refresh current tab
    refreshCurrentTab();
}

function clearFilters() {
    document.getElementById('filterStart').value = '';
    document.getElementById('filterEnd').value = '';
    document.getElementById('filterStatus').classList.remove('active');

    // Reset to all movies
    filteredMovies = [...movieData];

    // Refresh current tab
    refreshCurrentTab();
}

function refreshCurrentTab() {
    // Find the active main tab
    const activeMainTab = document.querySelector('.tab-panel.active');
    if (!activeMainTab) return;

    const mainTabId = activeMainTab.id; // "this-period-tab" or "all-time-tab"

    // Find the active sub-tab within that main tab
    const activeSubTab = activeMainTab.querySelector('.sub-tab-panel.active');
    if (!activeSubTab) return;

    const subTabId = activeSubTab.id; 
    // e.g., "diary-this-period", "stats-this-period", "diary-all-time", "stats-all-time"

    // Call the appropriate update function
    if (subTabId === 'diary-this-period') {
        updateDiaryTab('this-period', filteredMovies);
    } else if (subTabId === 'stats-this-period') {
        updateStatsTab('this-period', filteredMovies);
    } else if (subTabId === 'diary-all-time') {
        updateDiaryTab('all-time', movieData);
    } else if (subTabId === 'stats-all-time') {
        updateStatsTab('all-time', movieData);
    }
}

function switchTab(tabName) {
    console.log('Switching to tab:', tabName);

    // Update main tab buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    // Update main tab panels
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`${tabName}-tab`);
    if (panel) {
        panel.classList.add('active');

        // **Correction 3**: Reset to first sub-tab
        panel.querySelectorAll('.sub-tab-btn, .sub-tab-panel').forEach(el => el.classList.remove('active'));
        const firstBtn   = panel.querySelector('.sub-tab-btn');
        const firstPanel = panel.querySelector('.sub-tab-panel');
        firstBtn?.classList.add('active');
        firstPanel?.classList.add('active');

        // Load its content
        switchSubTab(firstBtn.dataset.subtab, panel);
    }
}

function switchSubTab(subTabName, mainTabEl) {
    // Activate the clicked sub-tab
    mainTabEl.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.subtab === subTabName));
    mainTabEl.querySelectorAll('.sub-tab-panel').forEach(p => p.classList.toggle('active', p.id === subTabName));

    // Load content
    if (subTabName === 'diary-this-period')      updateDiaryTab('this-period', filteredMovies);
    else if (subTabName === 'stats-this-period') updateStatsTab('this-period', filteredMovies);
    else if (subTabName === 'diary-all-time')    updateDiaryTab('all-time', movieData);
    else if (subTabName === 'stats-all-time')    updateStatsTab('all-time', movieData);
}

function updateAllViews() {
    // Load "This Period" by default
    updateDiaryTab('this-period', filteredMovies);

    // Other tabs (Stats This Period, Diary All Time, Stats All Time) will update via refreshCurrentTab()
}

function updateDiaryTab(scope, movies) {
    // Update stats cards (expects scope and movies)
    updateStatsCards(scope, movies);

    // Update charts (expects scope and movies)
    updateDiaryCharts(scope, movies);

    // Update directors lists (expects scope and movies)
    updateDirectorsLists(scope, movies);

    // Update recent activity (expects scope and movies)
    updateRecentActivity(scope, movies);
}

function updateStatsCards(scope, movies) {
    // Common calculations
    const totalFilms = movies.length;
    const ratedMovies = movies.filter(
        movie => movie.rating !== null &&
                 movie.rating !== undefined &&
                 movie.rating !== "" &&
                 Number(movie.rating) > 0
    );
    const averageRating = ratedMovies.length > 0
        ? (ratedMovies.reduce((sum, movie) => sum + parseFloat(movie.rating), 0) / ratedMovies.length).toFixed(1)
        : '0.0';
    const totalMinutes = movies.reduce((sum, movie) => sum + (movie.runtime || 0), 0);
    const totalHours = Math.round(totalMinutes / 60);

    // Update DOM based on scope
    if (scope === 'this-period') {
        document.getElementById('films-this-period').textContent = totalFilms;
        document.getElementById('average-rating-this-period').textContent = averageRating;
        document.getElementById('total-watch-time-this-period').textContent = totalHours + 'h';
    } else if (scope === 'all-time') {
        document.getElementById('films-all-time').textContent = totalFilms;
        document.getElementById('average-rating').textContent = averageRating;
        document.getElementById('total-watch-time').textContent = totalHours + 'h';
    }
}

function updateDiaryCharts(scope, movies) {
    // Genre Distribution (Pie Chart)
    const genreData = getGenreDistribution(movies);
    createChart(
        scope === 'this-period' ? 'genre-pie-chart-this-period' : 'genre-pie-chart',
        'pie',
        {
            labels: genreData.labels,
            datasets: [{
                data: genreData.data,
                backgroundColor: chartColors.slice(0, genreData.labels.length)
            }]
        }
    );

    // Rating Distribution (Bar Chart)
    const ratingData = getRatingDistribution(movies);
    createChart(
        scope === 'this-period' ? 'rating-bar-chart-this-period' : 'rating-bar-chart',
        'bar',
        {
            labels: ratingData.labels,
            datasets: [{
                label: 'Films',
                data: ratingData.data,
                backgroundColor: chartColors[0]
            }]
        }
    );

    // Monthly Activity Count (Line Chart)
    const monthlyCountData = getMonthlyActivityCount(movies);
    createChart(
        scope === 'this-period' ? 'monthly-count-chart-this-period' : 'monthly-count-chart',
        'line',
        {
            labels: monthlyCountData.labels,
            datasets: [{
                label: 'Films',
                data: monthlyCountData.data,
                borderColor: chartColors[1],
                backgroundColor: chartColors[1] + '20',
                fill: true,
                tension: 0.4
            }]
        }
    );

    // Monthly Activity Minutes (Line Chart)
    const monthlyMinutesData = getMonthlyActivityMinutes(movies);
    createChart(
        scope === 'this-period' ? 'monthly-minutes-chart-this-period' : 'monthly-minutes-chart',
        'line',
        {
            labels: monthlyMinutesData.labels,
            datasets: [{
                label: 'Minutes',
                data: monthlyMinutesData.data,
                borderColor: chartColors[2],
                backgroundColor: chartColors[2] + '20',
                fill: true,
                tension: 0.4
            }]
        }
    );
}

function updateDirectorsLists(scope, movies) {
    const directors = getTopDirectors(movies);

    if (scope === 'this-period') {
        updateDirectorsList('directors-this-period', directors);
    } else if (scope === 'all-time') {
        updateDirectorsList('directors-all-time', directors);
    }
}

function updateRecentActivity(scope, movies) {
    if (scope !== 'this-period') return; // Only update for This Period

    const recentMovies = [...movies]
        .sort((a, b) => new Date(b.watch_date) - new Date(a.watch_date))
        .slice(0, 5);

    const listHtml = recentMovies.map(movie => `
        <div class="movie-item">
            <div class="movie-title">${movie.title}</div>
            <div class="movie-meta">
                <span>${new Date(movie.watch_date).toLocaleDateString()}</span>
                <span class="movie-rating">★ ${movie.rating}</span>
            </div>
        </div>
    `).join('');

    document.getElementById('recent-activity-this-period').innerHTML = listHtml;
}

function updateStatsTab(scope, movies) {
    updateTopRatedDecades(
        scope === 'this-period' ? 'top-decades-this-period' : 'top-decades',
        movies
    );

    updateGenreBreakdown(
        scope === 'this-period' ? 'genre-breakdown-this-period' : 'genre-breakdown',
        movies
    );

    updateCountryCount(
        scope === 'this-period' ? 'country-count-this-period' : 'country-count',
        movies
    );

    updateTopRatedFilms(scope, movies);
}

function createChart(canvasId, type, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Destroy existing chart
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    // Create new chart
    charts[canvasId] = new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: type !== 'pie' && type !== 'doughnut' ? {
                x: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                y: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            } : {}
        }
    });
}

function getGenreDistribution(movies) {
    const genres = {};

    movies.forEach(movie => {
        const movieGenres = movie.genre
            .split(',')
            .map(g => g.trim());

        movieGenres.forEach(genre => {
            if (genre && genre !== 'Unknown') {
                genres[genre] = (genres[genre] || 0) + 1;
            }
        });
    });

    const sortedGenres = Object.entries(genres)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    return {
        labels: sortedGenres.map(([genre]) => genre),
        data: sortedGenres.map(([, count]) => count)
    };
}

function getRatingDistribution(movies) {
    const ratings = {};

    movies.forEach(movie => {
        const rating = Math.floor(movie.rating);
        if (rating > 0) {
            ratings[rating] = (ratings[rating] || 0) + 1;
        }
    });

    const sortedRatings = Object.keys(ratings)
        .map(Number)
        .sort((a, b) => a - b);

    return {
        labels: sortedRatings,
        data: sortedRatings.map(rating => ratings[rating])
    };
}

function getMonthlyActivityCount(movies) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthCounts = new Array(12).fill(0);

    movies.forEach(movie => {
        const watchDate = new Date(movie.watch_date);
        if (!isNaN(watchDate)) {
            const month = watchDate.getMonth();
            monthCounts[month]++;
        }
    });

    return {
        labels: months,
        data: monthCounts
    };
}

function getMonthlyActivityMinutes(movies) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mins   = new Array(12).fill(0);
    movies.forEach(m => {
        const d = new Date(m.watch_date);
        if (!isNaN(d)) mins[d.getMonth()] += m.runtime || 0;
    });
    return { labels: months, data: mins };
}

function getTopDirectors(movies) {
    const directors = {};
    movies.forEach(movie => {
        if (movie.director && movie.director !== 'Unknown') {
            directors[movie.director] = (directors[movie.director] || 0) + 1;
        }
    });
    
    return Object.entries(directors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
}

function updateDirectorsList(elementId, directors) {
    const listHtml = directors.map(([director, count]) => `
        <div class="director-item">
            <div class="director-name">${director}</div>
            <div class="director-count">${count} film${count > 1 ? 's' : ''}</div>
        </div>
    `).join('');
    
    document.getElementById(elementId).innerHTML = listHtml;
}

function updateTopRatedDecades(containerId, movies) {
    const decades = {};

    movies.forEach(movie => {
        if (
            movie.year &&
            movie.rating !== null &&
            movie.rating !== undefined &&
            movie.rating !== "" &&
            Number(movie.rating) > 0
        ) {
            const year = parseInt(movie.year);
            const rating = parseFloat(movie.rating);
            const decade = Math.floor(year / 10) * 10;

            if (!decades[decade]) {
                decades[decade] = { sum: 0, count: 0 };
            }

            decades[decade].sum += rating;
            decades[decade].count += 1;
        }
    });

    const sortedDecades = Object.entries(decades)
        .map(([decade, data]) => [decade, data.sum / data.count])
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    const listHtml = sortedDecades.map(([decade, avgRating]) => `
        <div class="decade-item">
            <div class="decade-name">${decade}s</div>
            <div class="decade-rating">
                <span class="rating-stars">★ ${avgRating.toFixed(1)}</span>
            </div>
        </div>
    `).join('');

    document.getElementById(containerId).innerHTML = listHtml;
}

function updateGenreBreakdown(containerId, movies) {
    const genreData = getGenreDistribution(movies);

    const listHtml = genreData.labels.map((genre, index) => `
        <div class="genre-item">
            <div class="genre-name">${genre}</div>
            <div class="genre-count">${genreData.data[index]} films</div>
        </div>
    `).join('');

    document.getElementById(containerId).innerHTML = listHtml;
}

function updateCountryCount(containerId, movies) {
    const countries = {};

    movies.forEach(movie => {
        if (movie.country && movie.country !== 'Unknown') {
            countries[movie.country] = (countries[movie.country] || 0) + 1;
        }
    });

    const sortedCountries = Object.entries(countries)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    const listHtml = sortedCountries.map(([country, count]) => `
        <div class="country-item">
            <div class="country-name">${country}</div>
            <div class="country-count">${count} films</div>
        </div>
    `).join('');

    document.getElementById(containerId).innerHTML = listHtml;
}

function updateTopRatedFilms(scope, movies) {
    const topRated = [...movies]
        .filter(movie => movie.rating !== null && movie.rating !== undefined && movie.rating !== "")
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10);

    const containerId = scope === 'this-period' ? 'top-rated-this-period' : 'top-rated-all-time';
    updateMovieList(containerId, topRated);
}

function updateMovieList(elementId, movies) {
    const listHtml = movies.map(movie => `
        <div class="movie-item">
            <div class="movie-title">${movie.title}</div>
            <div class="movie-meta">
                <span>${movie.director}</span>
                <span class="movie-rating">★ ${movie.rating}</span>
            </div>
        </div>
    `).join('');
    
    document.getElementById(elementId).innerHTML = listHtml;
}
