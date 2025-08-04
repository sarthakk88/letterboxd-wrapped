// Global variables
let currentTab = 'diary';
let charts = {};
let allMovies = [];
let stats = {};

// Data loading and initialization
document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

async function loadData() {
    try {
        // Show loading state
        showLoading();

        // Load both CSV and JSON data
        const [moviesData, statsData] = await Promise.all([
            loadCSV('data/movies.csv'),
            loadJSON('data/stats.json')
        ]);

        allMovies = moviesData;
        stats = statsData;

        // Process and display data
        processData();
        displayData();

        // Hide loading and show content
        hideLoading();
        showContent();

    } catch (error) {
        console.error('Error loading data:', error);
        showError();
    }
}

function loadCSV(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length > 0) {
                    console.warn('CSV parsing warnings:', results.errors);
                }
                resolve(results.data);
            },
            error: function(error) {
                reject(error);
            }
        });
    });
}

async function loadJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

function processData() {
    // Process movies data for charts and lists
    allMovies = allMovies.map(movie => ({
        ...movie,
        watch_date: new Date(movie.watch_date),
        rating: parseFloat(movie.rating) || 0,
        runtime: parseInt(movie.runtime) || 100,
        year: parseInt(movie.year) || 0
    })).filter(movie => !isNaN(movie.watch_date.getTime()));

    // Sort by watch date (most recent first)
    allMovies.sort((a, b) => b.watch_date - a.watch_date);
}

function displayData() {
    displayTabData(currentTab);
}

function displayTabData(tabName) {
    if (tabName === 'diary') {
        updateStats();
        createDiaryCharts();
        createDiaryLists();
    } else if (tabName === 'stats') {
        createStatsLists();
    } else if (tabName === 'lists') {
        createTopRatedLists();
    }
}

function updateStats() {
    const currentYear = new Date().getFullYear();
    const thisYearMovies = allMovies.filter(movie => movie.watch_date.getFullYear() === currentYear);

    // Use data from stats.json or calculate from movies
    const filmsThisYear = stats.films_this_year || thisYearMovies.length;
    const filmsAllTime = stats.total_films || allMovies.length;
    const averageRating = stats.average_rating || (allMovies.reduce((sum, movie) => sum + movie.rating, 0) / allMovies.length);
    const totalMinutes = stats.total_runtime || allMovies.reduce((sum, movie) => sum + movie.runtime, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    // Update UI
    document.getElementById('filmsThisYear').textContent = filmsThisYear.toLocaleString();
    document.getElementById('filmsAllTime').textContent = filmsAllTime.toLocaleString();
    document.getElementById('averageRating').textContent = averageRating.toFixed(1);
    document.getElementById('totalWatchTime').textContent = `${totalHours}h ${remainingMinutes}m`;
}

function createDiaryCharts() {
    // Genre Distribution (Pie Chart)
    const genreData = getGenreDistribution();
    createChart('genreChart', 'pie', genreData, getLetterboxdColors());

    // Rating Distribution (Bar Chart)
    const ratingData = getRatingDistribution();
    createChart('ratingChart', 'bar', ratingData, ['#00d735']);

    // Monthly Activity (Count) - Line Graph
    const monthlyCountData = getMonthlyActivity('count');
    createChart('monthlyCountChart', 'line', monthlyCountData, ['#40bcf4']);

    // Monthly Activity (Minutes) - Line Graph
    const monthlyMinutesData = getMonthlyActivity('minutes');
    createChart('monthlyMinutesChart', 'line', monthlyMinutesData, ['#ff8000']);
}

function createDiaryLists() {
    const currentYear = new Date().getFullYear();

    // Top Directors (This Period)
    const thisYearDirectors = getTopDirectors(allMovies.filter(m => m.watch_date.getFullYear() === currentYear));
    createList('topDirectorsThisYear', thisYearDirectors, 'count');

    // Top Directors (All Time)
    const allTimeDirectors = getTopDirectors(allMovies);
    createList('topDirectorsAllTime', allTimeDirectors, 'count');

    // Recent Activity
    const recentMovies = allMovies.slice(0, 10).map(movie => ({
        name: movie.title,
        date: movie.watch_date.toISOString().split('T')[0],
        rating: movie.rating
    }));
    createList('recentActivity', recentMovies, 'date');
}

function createStatsLists() {
    // Top Rated Decades
    const decadeData = getTopRatedDecades();
    createList('topRatedDecades', decadeData, 'rating');

    // Genre Breakdown
    const genreData = getGenreDistribution();
    const genreList = Object.entries(genreData).map(([name, count]) => ({ name, count }));
    createList('genreBreakdown', genreList, 'count');

    // Country Count
    const countryData = getCountryDistribution();
    const countryList = Object.entries(countryData).map(([name, count]) => ({ name, count }));
    createList('countryCount', countryList, 'count');
}

function createTopRatedLists() {
    const currentYear = new Date().getFullYear();

    // Top Rated Films (This Period)
    const thisYearFilms = allMovies
        .filter(m => m.watch_date.getFullYear() === currentYear && m.rating > 0)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 15)
        .map(movie => ({
            name: movie.title,
            rating: movie.rating,
            year: movie.year
        }));
    createList('topRatedThisYear', thisYearFilms, 'rating');

    // Top Rated Films (All Time)
    const allTimeFilms = allMovies
        .filter(m => m.rating > 0)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 15)
        .map(movie => ({
            name: movie.title,
            rating: movie.rating,
            year: movie.year
        }));
    createList('topRatedAllTime', allTimeFilms, 'rating');
}

// Data processing functions
function getGenreDistribution() {
    const genreCounts = {};
    allMovies.forEach(movie => {
        if (movie.genre) {
            // Handle both comma-separated and array formats
            let genres = [];
            if (typeof movie.genre === 'string') {
                genres = movie.genre.split(',').map(g => g.trim());
            } else if (Array.isArray(movie.genre)) {
                genres = movie.genre;
            }

            genres.forEach(genre => {
                if (genre && genre !== '') {
                    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                }
            });
        }
    });

    // Return top 8 genres
    return Object.entries(genreCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .reduce((obj, [genre, count]) => {
            obj[genre] = count;
            return obj;
        }, {});
}

function getRatingDistribution() {
    const ratingCounts = { '1★': 0, '2★': 0, '3★': 0, '4★': 0, '5★': 0 };

    allMovies.forEach(movie => {
        if (movie.rating > 0) {
            const stars = Math.ceil(movie.rating);
            const starKey = `${stars}★`;
            if (ratingCounts[starKey] !== undefined) {
                ratingCounts[starKey]++;
            }
        }
    });

    return ratingCounts;
}

function getMonthlyActivity(type) {
    const monthlyData = {
        'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0, 'May': 0, 'Jun': 0,
        'Jul': 0, 'Aug': 0, 'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
    };

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    allMovies.forEach(movie => {
        const monthIndex = movie.watch_date.getMonth();
        const monthName = monthNames[monthIndex];

        if (type === 'count') {
            monthlyData[monthName]++;
        } else if (type === 'minutes') {
            monthlyData[monthName] += movie.runtime;
        }
    });

    return monthlyData;
}

function getTopRatedDecades() {
    const decadeRatings = {};
    const decadeCounts = {};

    allMovies.forEach(movie => {
        if (movie.year > 0 && movie.rating > 0) {
            const decade = Math.floor(movie.year / 10) * 10;
            const decadeKey = `${decade}s`;

            if (!decadeRatings[decadeKey]) {
                decadeRatings[decadeKey] = 0;
                decadeCounts[decadeKey] = 0;
            }

            decadeRatings[decadeKey] += movie.rating;
            decadeCounts[decadeKey]++;
        }
    });

    // Calculate average ratings and return top decades
    return Object.entries(decadeRatings)
        .map(([decade, totalRating]) => ({
            name: decade,
            rating: (totalRating / decadeCounts[decade]).toFixed(1)
        }))
        .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
        .slice(0, 10);
}

function getCountryDistribution() {
    const countryCounts = {};

    allMovies.forEach(movie => {
        if (movie.country) {
            // Handle both comma-separated and array formats
            let countries = [];
            if (typeof movie.country === 'string') {
                countries = movie.country.split(',').map(c => c.trim());
            } else if (Array.isArray(movie.country)) {
                countries = movie.country;
            }

            countries.forEach(country => {
                if (country && country !== '') {
                    countryCounts[country] = (countryCounts[country] || 0) + 1;
                }
            });
        }
    });

    return Object.entries(countryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((obj, [country, count]) => {
            obj[country] = count;
            return obj;
        }, {});
}

function getTopDirectors(movies) {
    const directorCounts = {};

    movies.forEach(movie => {
        if (movie.director) {
            // Handle both comma-separated and array formats
            let directors = [];
            if (typeof movie.director === 'string') {
                directors = movie.director.split(',').map(d => d.trim());
            } else if (Array.isArray(movie.director)) {
                directors = movie.director;
            }

            directors.forEach(director => {
                if (director && director !== '') {
                    directorCounts[director] = (directorCounts[director] || 0) + 1;
                }
            });
        }
    });

    return Object.entries(directorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
}

// Chart creation function
function createChart(canvasId, type, data, colors) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const chartConfig = {
        type: type,
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: colors.length >= Object.keys(data).length 
                    ? colors.slice(0, Object.keys(data).length)
                    : colors.concat(colors).slice(0, Object.keys(data).length),
                borderColor: colors.map(color => color + '80'),
                borderWidth: 2,
                tension: type === 'line' ? 0.4 : undefined
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: type === 'pie',
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: 500
                        },
                        padding: 20
                    }
                }
            },
            scales: (type === 'line' || type === 'bar') ? {
                y: {
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            } : {}
        }
    };

    charts[canvasId] = new Chart(ctx, chartConfig);
}

// List creation function
function createList(containerId, items, valueKey = 'count') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    items.slice(0, 15).forEach((item, index) => {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';

        const name = document.createElement('span');
        name.className = 'list-item-name';
        name.textContent = item.name + (item.year ? ` (${item.year})` : '');

        const value = document.createElement('span');
        value.className = 'list-item-value';

        if (valueKey === 'rating') {
            if (typeof item[valueKey] === 'number') {
                const stars = Math.floor(item[valueKey]);
                const hasHalf = item[valueKey] % 1 >= 0.5;
                value.textContent = '★'.repeat(stars) + (hasHalf ? '½' : '') + ` ${item[valueKey]}`;
            } else {
                value.textContent = item[valueKey];
            }
        } else if (valueKey === 'date') {
            value.textContent = new Date(item[valueKey]).toLocaleDateString();
        } else {
            value.textContent = item[valueKey];
        }

        listItem.appendChild(name);
        listItem.appendChild(value);
        container.appendChild(listItem);

        // Add stagger animation
        listItem.style.animationDelay = `${index * 0.1}s`;
        listItem.style.animation = 'fadeIn 0.6s ease-in-out forwards';
        listItem.style.opacity = '0';
    });
}

// Tab switching function
function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.classList.add('hidden');
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName + '-tab');
    selectedTab.classList.remove('hidden');
    selectedTab.classList.add('active');

    currentTab = tabName;

    // Load data for the current tab
    displayTabData(tabName);
}

// UI state functions
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showContent() {
    document.getElementById('diary-tab').classList.remove('hidden');
    document.getElementById('diary-tab').classList.add('active');
}

function showError() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
}

// Utility functions
function getLetterboxdColors() {
    return ['#00d735', '#ff8000', '#40bcf4', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
}