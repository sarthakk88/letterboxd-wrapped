// Global variables
let movieData = [];
let statsData = {};
let charts = {};

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
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        showLoading(true);
        await loadData();
        setupEventListeners();
        updateAllViews();
        showLoading(false);
    } catch (error) {
        console.error('Failed to initialize app:', error);
        handleDataLoadError();
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
                    movieData = results.data.map(row => ({
                        title: row.title || row.Title || '',
                        year: parseInt(row.year || row.Year) || new Date().getFullYear(),
                        director: row.director || row.Director || 'Unknown',
                        genre: row.genre || row.Genre || 'Unknown',
                        rating: parseFloat(row.rating || row.Rating) || 0,
                        watch_date: row.watch_date || row['Watch Date'] || row.date || new Date().toISOString().split('T')[0],
                        runtime: parseInt(row.runtime || row.Runtime) || 90,
                        country: row.country || row.Country || 'Unknown',
                        cast: row.cast || row.Cast || ''
                    }));
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


function handleDataLoadError() {
    showLoading(false);
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div style="text-align: center; padding: 4rem;">
            <h2>Data Loading Error</h2>
            <p>Could not load movie data. Please check the data files.</p>
            <button onclick="location.reload()" class="btn btn--primary">Retry</button>
        </div>
    `;
}

function setupEventListeners() {
    // Tab navigation - Fixed event listener
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    console.log('Switching to tab:', tabName); // Debug log
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const activePanel = document.getElementById(`${tabName}-tab`);
    if (activePanel) {
        activePanel.classList.add('active');
    }

    // Update content based on active tab
    if (tabName === 'stats') {
        updateStatsTab();
    } else if (tabName === 'lists') {
        updateListsTab();
    }
}

function updateAllViews() {
    updateDiaryTab();
    // Don't load other tabs immediately, load them when switched to
}

function updateDiaryTab() {
    updateStatsCards();
    updateDiaryCharts();
    updateDirectorsLists();
    updateRecentActivity();
}

function updateStatsCards() {
    const totalFilms = movieData.length;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const filmsThisPeriod = movieData.filter(movie => new Date(movie.watch_date).getFullYear() === currentYear).length;
    const averageRating = movieData.length > 0 ? (movieData.reduce((sum, movie) => sum + movie.rating, 0) / movieData.length).toFixed(1) : 0;
    const totalMinutes = movieData.reduce((sum, movie) => sum + (movie.runtime || 0), 0);
    const totalHours = Math.round(totalMinutes / 60);

    document.getElementById('films-this-period').textContent = filmsThisPeriod;
    document.getElementById('films-all-time').textContent = totalFilms;
    document.getElementById('average-rating').textContent = averageRating;
    document.getElementById('total-watch-time').textContent = totalHours + 'h';
}

function updateDiaryCharts() {
    // Genre Distribution (Pie Chart)
    const genreData = getGenreDistribution();
    createChart('genre-pie-chart', 'pie', {
        labels: genreData.labels,
        datasets: [{
            data: genreData.data,
            backgroundColor: chartColors.slice(0, genreData.labels.length)
        }]
    });

    // Rating Distribution (Bar Chart)
    const ratingData = getRatingDistribution();
    createChart('rating-bar-chart', 'bar', {
        labels: ratingData.labels,
        datasets: [{
            label: 'Films',
            data: ratingData.data,
            backgroundColor: chartColors[0]
        }]
    });

    // Monthly Activity Count (Line Chart)
    const monthlyCountData = getMonthlyActivityCount();
    createChart('monthly-count-chart', 'line', {
        labels: monthlyCountData.labels,
        datasets: [{
            label: 'Films',
            data: monthlyCountData.data,
            borderColor: chartColors[1],
            backgroundColor: chartColors[1] + '20',
            fill: true,
            tension: 0.4
        }]
    });

    // Monthly Activity Minutes (Line Chart)
    const monthlyMinutesData = getMonthlyActivityMinutes();
    createChart('monthly-minutes-chart', 'line', {
        labels: monthlyMinutesData.labels,
        datasets: [{
            label: 'Minutes',
            data: monthlyMinutesData.data,
            borderColor: chartColors[2],
            backgroundColor: chartColors[2] + '20',
            fill: true,
            tension: 0.4
        }]
    });
}

function updateDirectorsLists() {
    // Top Directors This Period
    const currentYear = new Date().getFullYear();
    const thisYearMovies = movieData.filter(movie => new Date(movie.watch_date).getFullYear() === currentYear);
    const directorsThisPeriod = getTopDirectors(thisYearMovies);
    updateDirectorsList('directors-this-period', directorsThisPeriod);

    // Top Directors All Time
    const directorsAllTime = getTopDirectors(movieData);
    updateDirectorsList('directors-all-time', directorsAllTime);
}

function updateRecentActivity() {
    const recentMovies = [...movieData]
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
    
    document.getElementById('recent-activity').innerHTML = listHtml;
}

function updateStatsTab() {
    updateTopRatedDecades();
    updateGenreBreakdown();
    updateCountryCount();
}

function updateListsTab() {
    updateTopRatedFilms();
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

// Data processing functions
function getGenreDistribution() {
    const genres = {};
    movieData.forEach(movie => {
        const movieGenres = movie.genre.split(',').map(g => g.trim());
        movieGenres.forEach(genre => {
            if (genre && genre !== 'Unknown') {
                genres[genre] = (genres[genre] || 0) + 1;
            }
        });
    });
    
    const sortedGenres = Object.entries(genres)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8);
    
    return {
        labels: sortedGenres.map(([genre]) => genre),
        data: sortedGenres.map(([,count]) => count)
    };
}

function getRatingDistribution() {
    const ratings = {};
    movieData.forEach(movie => {
        const rating = Math.floor(movie.rating);
        if (rating > 0) {
            ratings[rating] = (ratings[rating] || 0) + 1;
        }
    });
    
    return {
        labels: Object.keys(ratings).sort(),
        data: Object.values(ratings)
    };
}

function getMonthlyActivityCount() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthCounts = new Array(12).fill(0);
    
    movieData.forEach(movie => {
        const month = new Date(movie.watch_date).getMonth();
        monthCounts[month]++;
    });
    
    return {
        labels: months,
        data: monthCounts
    };
}

function getMonthlyActivityMinutes() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthMinutes = new Array(12).fill(0);
    
    movieData.forEach(movie => {
        const month = new Date(movie.watch_date).getMonth();
        monthMinutes[month] += movie.runtime || 0;
    });
    
    return {
        labels: months,
        data: monthMinutes
    };
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

function updateTopRatedDecades() {
    const decades = {};
    movieData.forEach(movie => {
        const decade = Math.floor(movie.year / 10) * 10;
        if (!decades[decade]) {
            decades[decade] = { sum: 0, count: 0 };
        }
        decades[decade].sum += movie.rating;
        decades[decade].count += 1;
    });
    
    const sortedDecades = Object.entries(decades)
        .map(([decade, data]) => [decade, data.sum / data.count])
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    const listHtml = sortedDecades.map(([decade, avgRating]) => `
        <div class="decade-item">
            <div class="decade-name">${decade}s</div>
            <div class="decade-rating">
                <span class="rating-stars">★ ${avgRating.toFixed(1)}</span>
            </div>
        </div>
    `).join('');
    
    document.getElementById('top-decades').innerHTML = listHtml;
}

function updateGenreBreakdown() {
    const genreData = getGenreDistribution();
    const listHtml = genreData.labels.map((genre, index) => `
        <div class="genre-item">
            <div class="genre-name">${genre}</div>
            <div class="genre-count">${genreData.data[index]} films</div>
        </div>
    `).join('');
    
    document.getElementById('genre-breakdown').innerHTML = listHtml;
}

function updateCountryCount() {
    const countries = {};
    movieData.forEach(movie => {
        if (movie.country && movie.country !== 'Unknown') {
            countries[movie.country] = (countries[movie.country] || 0) + 1;
        }
    });
    
    const sortedCountries = Object.entries(countries)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    const listHtml = sortedCountries.map(([country, count]) => `
        <div class="country-item">
            <div class="country-name">${country}</div>
            <div class="country-count">${count} films</div>
        </div>
    `).join('');
    
    document.getElementById('country-count').innerHTML = listHtml;
}

function updateTopRatedFilms() {
    // Top Rated Films This Period
    const currentYear = new Date().getFullYear();
    const thisYearMovies = movieData.filter(movie => new Date(movie.watch_date).getFullYear() === currentYear);
    const topRatedThisPeriod = [...thisYearMovies]
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10);
    
    updateMovieList('top-rated-this-period', topRatedThisPeriod);

    // Top Rated Films All Time
    const topRatedAllTime = [...movieData]
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10);
    
    updateMovieList('top-rated-all-time', topRatedAllTime);
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