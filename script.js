// Load real data from data/movies.csv and data/stats.json
document.addEventListener('DOMContentLoaded', async function() {
    await loadData();
    initializeTabs();
    initializeFilters();
    updateFilterStatus();
    updateDashboard();
    loadDiaryContent();
});

let movieData = {
    stats: {},
    movies: []
};
let currentMovies = [];
let filteredMovies = [];

// Chart instances
let genreChart, ratingChart, monthlyCountChart, monthlyMinutesChart;

async function loadData() {
    try {
        console.log('Loading data from files...');
        // Fetch CSV and JSON files
        const [csvText, statsJson] = await Promise.all([
            fetch('data/movies.csv').then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status} - ${r.statusText}`);
                return r.text();
            }),
            fetch('data/stats.json').then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status} - ${r.statusText}`);
                return r.json();
            })
        ]);

        movieData.stats = statsJson;
        document.getElementById('lastUpdated').textContent = 
            `Last updated: ${new Date(statsJson.last_updated).toLocaleString()}`;

        // Parse CSV with robust handling
        movieData.movies = parseCSV(csvText).map(movie => {
            // Set default runtime if missing or 0
            if (!movie.runtime || movie.runtime === 0) {
                movie.runtime = 100;
            }
            return movie;
        });

        currentMovies = [...movieData.movies];
        filteredMovies = [...currentMovies];

        console.log(`Loaded ${currentMovies.length} movies`);

    } catch (error) {
        console.error('Data load error:', error);
        document.getElementById('lastUpdated').textContent = 'Unable to load data';

        // Fallback to empty data
        movieData.stats = {
            total_films: 0,
            films_this_year: 0,
            average_rating: 0,
            total_runtime: 0,
            last_updated: new Date().toISOString()
        };
        movieData.movies = [];
        currentMovies = [];
        filteredMovies = [];
    }
}

function parseCSV(txt) {
    const lines = txt.trim().split('\n');
    const header = lines[0];
    const dataLines = lines.slice(1);

    const keys = header.split(',');

    return dataLines.map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);

        const obj = {};
        keys.forEach((key, index) => {
            let value = values[index] || '';
            // Remove surrounding quotes
            value = value.replace(/^"|"$/g, '');
            obj[key] = value;
        });

        // Parse numeric fields
        obj.runtime = Number(obj.runtime) || 0;
        obj.rating = parseFloat(obj.rating) || 0;

        // Keep cast as string - don't modify it here
        obj.cast = obj.cast || '';
        
        return obj;
    });
}

// Tab functionality
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Add active class to current tab
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');

            // Destroy existing charts to prevent overlap
            Object.values({ genreChart, ratingChart, monthlyCountChart, monthlyMinutesChart }).forEach(chart => {
                if (chart) {
                    chart.destroy();
                }
            });

            // Load content based on tab with slight delay
            setTimeout(() => {
                if (targetTab === 'diary') {
                    loadDiaryContent();
                } else if (targetTab === 'stats') {
                    loadStatsContent();
                } else if (targetTab === 'list') {
                    loadListContent();
                }
            }, 50);
        });
    });
}

// Filter functionality
function initializeFilters() {
    const applyButton = document.getElementById('applyFilter');
    const clearButton = document.getElementById('clearFilter');

    applyButton.addEventListener('click', applyDateFilter);
    clearButton.addEventListener('click', clearDateFilter);
}

function applyDateFilter() {
    const startDateValue = document.getElementById('startDate').value;
    const endDateValue = document.getElementById('endDate').value;

    if (startDateValue || endDateValue) {
        filteredMovies = currentMovies.filter(movie => {
            const movieDate = new Date(movie.watch_date);
            let includeMovie = true;

            if (startDateValue) {
                const startDate = new Date(startDateValue);
                includeMovie = includeMovie && movieDate >= startDate;
            }

            if (endDateValue) {
                const endDate = new Date(endDateValue);
                // Set end date to end of day to include movies on the end date
                endDate.setHours(23, 59, 59, 999);
                includeMovie = includeMovie && movieDate <= endDate;
            }

            return includeMovie;
        });
    } else {
        filteredMovies = [...currentMovies];
    }

    updateFilterStatus();
    updateDashboard();

    // Refresh current tab content
    const activeTab = document.querySelector('.nav-tab.active').getAttribute('data-tab');
    setTimeout(() => {
        if (activeTab === 'diary') {
            loadDiaryContent();
        } else if (activeTab === 'stats') {
            loadStatsContent();
        } else if (activeTab === 'list') {
            loadListContent();
        }
    }, 50);
}

function clearDateFilter() {
    // Clear the input fields
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';

    // Reset filtered movies to all movies
    filteredMovies = [...currentMovies];

    // Update the status and dashboard
    updateFilterStatus();
    updateDashboard();

    // Refresh current tab content
    const activeTab = document.querySelector('.nav-tab.active').getAttribute('data-tab');
    setTimeout(() => {
        if (activeTab === 'diary') {
            loadDiaryContent();
        } else if (activeTab === 'stats') {
            loadStatsContent();
        } else if (activeTab === 'list') {
            loadListContent();
        }
    }, 50);
}

function updateFilterStatus() {
    const statusElement = document.getElementById('filterStatusText');
    const startDateValue = document.getElementById('startDate').value;
    const endDateValue = document.getElementById('endDate').value;

    if (startDateValue || endDateValue) {
        statusElement.textContent = `Showing ${filteredMovies.length} of ${currentMovies.length} films`;
    } else {
        statusElement.textContent = `Showing all ${currentMovies.length} films`;
    }
}

// Update dashboard overview
function updateDashboard() {
    const thisYear = new Date().getFullYear();
    const thisYearMovies = filteredMovies.filter(movie => new Date(movie.watch_date).getFullYear() === thisYear);

    const totalRuntime = filteredMovies.reduce((sum, movie) => sum + (movie.runtime || 0), 0);

    // Calculate average rating only for movies where a user provided a rating (ignore null, undefined, empty, or 0)
    const ratedMovies = filteredMovies.filter(
        movie => movie.rating !== null && movie.rating !== undefined && movie.rating !== "" && Number(movie.rating) > 0
    );
    const avgRating = ratedMovies.length > 0
      ? (ratedMovies.reduce((sum, movie) => sum + parseFloat(movie.rating), 0) / ratedMovies.length).toFixed(1)
      : '0.0';

    document.getElementById('filmsThisYear').textContent = thisYearMovies.length;
    document.getElementById('filmsAllTime').textContent = filteredMovies.length;
    document.getElementById('averageRating').textContent = `${avgRating}★`;
    document.getElementById('totalWatchTime').textContent = `${totalRuntime.toLocaleString()} min`;
}

// Load Diary Tab Content
function loadDiaryContent() {
    createCharts();
    loadLeaders();
    loadRecentActivity();
}

// Create charts
function createCharts() {
    // Small delay to ensure canvas elements are visible
    setTimeout(() => {
        createGenreChart();
        createRatingChart();
        createMonthlyCharts();
    }, 100);
}

function createGenreChart() {
    const ctx = document.getElementById('genreChart');
    if (!ctx) return;

    if (genreChart) {
        genreChart.destroy();
    }

    const genreCount = {};
    filteredMovies.forEach(movie => {
        if (movie.genre) {
            const genres = movie.genre.split(', ');
            genres.forEach(genre => {
                genre = genre.trim();
                if (genre) {
                    genreCount[genre] = (genreCount[genre] || 0) + 1;
                }
            });
        }
    });

    const sortedGenres = Object.entries(genreCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8);

    genreChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedGenres.map(([genre]) => genre),
            datasets: [{
                data: sortedGenres.map(([, count]) => count),
                backgroundColor: [
                    '#00d735', '#1FB8CD', '#FFC185', '#B4413C', 
                    '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { 
                        color: '#ffffff', 
                        font: { size: 12 },
                        boxWidth: 12
                    }
                }
            }
        }
    });
}

function createRatingChart() {
    const ctx = document.getElementById('ratingChart');
    if (!ctx) return;

    if (ratingChart) {
        ratingChart.destroy();
    }

    const ratingCount = {};
    for (let i = 0.5; i <= 5.0; i += 0.5) {
        ratingCount[i.toString()] = 0;
    }

    filteredMovies.forEach(movie => {
        const rating = parseFloat(movie.rating);
        if (rating >= 0.5 && rating <= 5.0) {
            ratingCount[rating.toString()] = (ratingCount[rating.toString()] || 0) + 1;
        }
    });

    ratingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(ratingCount).map(r => `${r}★`),
            datasets: [{
                data: Object.values(ratingCount),
                backgroundColor: '#00d735',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { 
                    ticks: { color: '#ffffff' },
                    grid: { color: '#445566' }
                },
                y: { 
                    ticks: { color: '#ffffff' },
                    grid: { color: '#445566' }
                }
            }
        }
    });
}

function createMonthlyCharts() {
    const monthlyData = {};
    const currentYear = new Date().getFullYear();

    // Initialize months
    for (let i = 1; i <= 12; i++) {
        const monthName = new Date(currentYear, i - 1).toLocaleString('default', { month: 'short' });
        monthlyData[monthName] = { count: 0, minutes: 0 };
    }

    filteredMovies.forEach(movie => {
        const date = new Date(movie.watch_date);
        if (date.getFullYear() === currentYear) {
            const monthName = date.toLocaleString('default', { month: 'short' });
            if (monthlyData[monthName]) {
                monthlyData[monthName].count++;
                monthlyData[monthName].minutes += movie.runtime || 0;
            }
        }
    });

    const months = Object.keys(monthlyData);
    const counts = Object.values(monthlyData).map(d => d.count);
    const minutes = Object.values(monthlyData).map(d => d.minutes);

    // Monthly count chart
    const countCtx = document.getElementById('monthlyCountChart');
    if (countCtx) {
        if (monthlyCountChart) {
            monthlyCountChart.destroy();
        }

        monthlyCountChart = new Chart(countCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    data: counts,
                    borderColor: '#00d735',
                    backgroundColor: 'rgba(0, 215, 53, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { 
                        ticks: { color: '#ffffff' },
                        grid: { color: '#445566' }
                    },
                    y: { 
                        ticks: { color: '#ffffff' },
                        grid: { color: '#445566' }
                    }
                }
            }
        });
    }

    // Monthly minutes chart
    const minutesCtx = document.getElementById('monthlyMinutesChart');
    if (minutesCtx) {
        if (monthlyMinutesChart) {
            monthlyMinutesChart.destroy();
        }

        monthlyMinutesChart = new Chart(minutesCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    data: minutes,
                    borderColor: '#00d735',
                    backgroundColor: 'rgba(0, 215, 53, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { 
                        ticks: { color: '#ffffff' },
                        grid: { color: '#445566' }
                    },
                    y: { 
                        ticks: { color: '#ffffff' },
                        grid: { color: '#445566' }
                    }
                }
            }
        });
    }
}

// Load leaders data
function loadLeaders() {
    const currentYear = new Date().getFullYear();
    const thisYearMovies = filteredMovies.filter(movie => new Date(movie.watch_date).getFullYear() === currentYear);

    // Directors
    loadTopDirectors(thisYearMovies, 'topDirectorsYear');
    loadTopDirectors(filteredMovies, 'topDirectorsAll');

    // Cast
    loadTopCast(thisYearMovies, 'topCastYear');
    loadTopCast(filteredMovies, 'topCastAll');
}

function loadTopDirectors(movies, elementId) {
    const directorCount = {};
    movies.forEach(movie => {
        if (movie.director && movie.director.trim()) {
            directorCount[movie.director] = (directorCount[movie.director] || 0) + 1;
        }
    });

    const topDirectors = Object.entries(directorCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = topDirectors.map(([director, count]) => `
            <div class="leader-item">
                <span class="leader-name">${director}</span>
                <span class="leader-count">(${count})</span>
            </div>
        `).join('') || '<div class="leader-item"><span class="leader-name">No data available</span></div>';
    }
}

function loadTopCast(movies, elementId) {
    const castCount = {};

    movies.forEach(movie => {
        let cast = movie.cast;

        // Ensure cast is an actual array
        if (typeof cast === 'string') {
            try {
                // Handle bad JSON (single quotes instead of double)
                const cleaned = cast.replace(/'/g, '"');
                const parsed = JSON.parse(cleaned);

                if (Array.isArray(parsed)) {
                    cast = parsed;
                } else {
                    cast = [];
                }
            } catch (e) {
                cast = [];
            }
        }

        if (Array.isArray(cast) && cast.length > 0) {
            cast.forEach(actor => {
                if (actor && actor !== '[]') {
                    castCount[actor] = (castCount[actor] || 0) + 1;
                }
            });
        }
    });

    const topCast = Object.entries(castCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = topCast.map(([actor, count]) => `
            <div class="leader-item">
                <span class="leader-name">${actor}</span>
                <span class="leader-count">(${count})</span>
            </div>
        `).join('') || '<div class="leader-item"><span class="leader-name">No data available</span></div>';
    }
}

// Load recent activity
function loadRecentActivity() {
    const recentMovies = [...filteredMovies]
        .sort((a, b) => new Date(b.watch_date) - new Date(a.watch_date))
        .slice(0, 10);

    const element = document.getElementById('recentActivityList');
    if (element) {
        element.innerHTML = recentMovies.map(movie => `
            <div class="activity-item">
                <div class="movie-title">${movie.title} (${movie.year})</div>
                <div class="movie-details">${movie.rating}★ — ${movie.runtime} min</div>
            </div>
        `).join('') || '<div class="activity-item"><div class="movie-title">No recent activity</div></div>';
    }
}

// Load Stats Tab Content
function loadStatsContent() {
    loadDecadeStats();
    loadGenreBreakdown();
    loadCountryStats();
}

function loadDecadeStats() {
    const decadeStats = {};

    filteredMovies.forEach(movie => {
        // Only consider movies with a valid, non-empty, non-zero rating
        if (movie.year && movie.rating !== null && movie.rating !== undefined && movie.rating !== "" && Number(movie.rating) > 0) {
            const year = parseInt(movie.year);
            const decade = Math.floor(year / 10) * 10;
            const decadeLabel = `${decade}s`;

            if (!decadeStats[decadeLabel]) {
                decadeStats[decadeLabel] = { total: 0, sum: 0 };
            }

            decadeStats[decadeLabel].total++;
            decadeStats[decadeLabel].sum += parseFloat(movie.rating);
        }
    });

    const sortedDecades = Object.entries(decadeStats)
        .map(([decade, data]) => [decade, (data.total > 0 ? (data.sum / data.total).toFixed(2) : '0.00')])
        .sort(([,a], [,b]) => parseFloat(b) - parseFloat(a));

    const element = document.getElementById('decadeStats');
    if (element) {
        element.innerHTML = sortedDecades.map(([decade, avg]) => `
            <div class="stat-row">
                <span class="stat-label">${decade}</span>
                <span class="stat-value-small">${avg}★</span>
            </div>
        `).join('') || '<div class="stat-row"><span class="stat-label">No data available</span></div>';
    }
}

function loadGenreBreakdown() {
    const genreCount = {};

    filteredMovies.forEach(movie => {
        if (movie.genre) {
            const genres = movie.genre.split(', ');
            genres.forEach(genre => {
                genre = genre.trim();
                if (genre) {
                    genreCount[genre] = (genreCount[genre] || 0) + 1;
                }
            });
        }
    });

    const sortedGenres = Object.entries(genreCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

    const element = document.getElementById('genreBreakdown');
    if (element) {
        element.innerHTML = sortedGenres.map(([genre, count]) => `
            <div class="stat-row">
                <span class="stat-label">${genre}</span>
                <span class="stat-value-small">${count}</span>
            </div>
        `).join('') || '<div class="stat-row"><span class="stat-label">No data available</span></div>';
    }
}

function loadCountryStats() {
    const countryCount = {};

    filteredMovies.forEach(movie => {
        if (movie.country && movie.country.trim()) {
            countryCount[movie.country] = (countryCount[movie.country] || 0) + 1;
        }
    });

    const sortedCountries = Object.entries(countryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

    const element = document.getElementById('countryStats');
    if (element) {
        element.innerHTML = sortedCountries.map(([country, count]) => `
            <div class="stat-row">
                <span class="stat-label">${country}</span>
                <span class="stat-value-small">${count}</span>
            </div>
        `).join('') || '<div class="stat-row"><span class="stat-label">No data available</span></div>';
    }
}

// Load List Tab Content
function loadListContent() {
    const currentYear = new Date().getFullYear();
    const thisYearMovies = filteredMovies.filter(movie => new Date(movie.watch_date).getFullYear() === currentYear);

    loadTopRatedMovies(thisYearMovies, 'topRatedYear');
    loadTopRatedMovies(filteredMovies, 'topRatedAll');
}

function loadTopRatedMovies(movies, elementId) {
    const sortedMovies = [...movies]
        .filter(movie => movie.rating > 0) // Only show movies with ratings
        .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
        .slice(0, 20);

    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = sortedMovies.map(movie => `
            <div class="movie-item">
                <div class="movie-info">
                    <div class="movie-name">${movie.title}</div>
                    <div class="movie-year">${movie.year}</div>
                </div>
                <div class="movie-rating">${movie.rating}★</div>
            </div>
        `).join('') || '<div class="movie-item"><div class="movie-info"><div class="movie-name">No rated movies available</div></div></div>';
    }
}
