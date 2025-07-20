// Dashboard Data Management with Enhanced Features
class LetterboxdDashboard {
    constructor() {
        this.data = null;
        this.charts = {};
        this.filteredMovies = null;
        this.tmdbApiKey = null; // Add your TMDB API key here
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.setupNavigation();
            this.setupDateFilter();
            this.updateStats();
            this.updateDirectors();
            this.createCharts();
            this.updateGoals();
            this.updateRecentActivity();
            this.updateLastUpdated();
            this.setupStatsPage();
            this.setupListsPage();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError();
        }
    }

    // Navigation Setup
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const pages = document.querySelectorAll('.page-content');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetPage = item.getAttribute('data-page');
                
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Show target page
                pages.forEach(page => page.classList.remove('active'));
                const targetPageElement = document.getElementById(`${targetPage}-page`);
                if (targetPageElement) {
                    targetPageElement.classList.add('active');
                }
                
                // Update page-specific content
                if (targetPage === 'stats') {
                    this.updateStatsPage();
                } else if (targetPage === 'lists') {
                    this.updateListsPage();
                }
            });
        });
    }

    // Date Filter Setup
    setupDateFilter() {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const applyButton = document.getElementById('applyFilter');
        const clearButton = document.getElementById('clearFilter');
        const filterStatus = document.getElementById('filterStatus');

        applyButton.addEventListener('click', () => {
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;
            
            if (!startDate || !endDate) {
                filterStatus.textContent = 'Please select both start and end dates.';
                filterStatus.style.color = '#dc2626';
                return;
            }
            
            if (new Date(startDate) > new Date(endDate)) {
                filterStatus.textContent = 'Start date must be before end date.';
                filterStatus.style.color = '#dc2626';
                return;
            }
            
            this.applyDateFilter(startDate, endDate);
        });

        clearButton.addEventListener('click', () => {
            startDateInput.value = '';
            endDateInput.value = '';
            this.clearDateFilter();
        });
    }

    applyDateFilter(startDate, endDate) {
        this.filteredMovies = this.data.movies.filter(movie => {
            if (!movie.watch_date) return false;
            const movieDate = new Date(movie.watch_date);
            return movieDate >= new Date(startDate) && movieDate <= new Date(endDate);
        });

        const filterStatus = document.getElementById('filterStatus');
        filterStatus.textContent = `Showing ${this.filteredMovies.length} films from ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;
        filterStatus.style.color = '#00d735';

        // Update all dashboard components with filtered data
        this.updateStats();
        this.updateDirectors();
        this.updateCharts();
        this.updateGoals();
        this.updateRecentActivity();
    }

    clearDateFilter() {
        this.filteredMovies = null;
        const filterStatus = document.getElementById('filterStatus');
        filterStatus.textContent = '';
        
        // Update all dashboard components with original data
        this.updateStats();
        this.updateDirectors();
        this.updateCharts();
        this.updateGoals();
        this.updateRecentActivity();
    }

    getMoviesForDisplay() {
        return this.filteredMovies || this.data.movies;
    }

    // Enhanced Movie Data Loading with TMDB Integration
    async loadData() {
        try {
            const [moviesResponse, statsResponse] = await Promise.all([
                fetch('data/movies.csv').catch(() => null),
                fetch('data/stats.json').catch(() => null)
            ]);

            if (moviesResponse && statsResponse) {
                const csvText = await moviesResponse.text();
                const stats = await statsResponse.json();
                
                this.data = {
                    movies: this.parseCSV(csvText),
                    stats: stats
                };

                // Enhance movies with additional data
                await this.enhanceMoviesWithTMDB();
                
                console.log('Loaded data:', this.data);
            } else {
                this.data = this.getSampleData();
                console.log('Using sample data');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.data = this.getSampleData();
        }
    }

    // TMDB Integration for Director and Genre Data
    async enhanceMoviesWithTMDB() {
        if (!this.tmdbApiKey) {
            console.log('TMDB API key not provided. Using existing director/genre data.');
            return;
        }

        const moviesWithMissingData = this.data.movies.filter(movie => 
            !movie.director || !movie.genre
        );

        console.log(`Enhancing ${moviesWithMissingData.length} movies with TMDB data...`);

        for (let i = 0; i < Math.min(moviesWithMissingData.length, 50); i++) {
            const movie = moviesWithMissingData[i];
            try {
                await this.enhanceMovieWithTMDB(movie);
                // Rate limiting - wait between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Error enhancing movie ${movie.title}:`, error);
            }
        }
    }

    async enhanceMovieWithTMDB(movie) {
        const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${this.tmdbApiKey}&query=${encodeURIComponent(movie.title)}&year=${movie.year}`;
        
        try {
            const response = await fetch(searchUrl);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const tmdbMovie = data.results[0];
                
                // Get detailed movie information
                const detailsUrl = `https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=${this.tmdbApiKey}&append_to_response=credits`;
                const detailsResponse = await fetch(detailsUrl);
                const details = await detailsResponse.json();
                
                // Extract director
                if (details.credits && details.credits.crew) {
                    const director = details.credits.crew.find(person => person.job === 'Director');
                    if (director && !movie.director) {
                        movie.director = director.name;
                    }
                }
                
                // Extract genres
                if (details.genres && details.genres.length > 0 && !movie.genre) {
                    movie.genre = details.genres.map(g => g.name).join(', ');
                }
            }
        } catch (error) {
            console.error(`TMDB API error for ${movie.title}:`, error);
        }
    }

    parseCSV(csvText) {
        try {
            const lines = csvText.trim().split('\n');
            if (lines.length === 0) return [];
            
            const headers = lines[0].split(',').map(h => h.trim());
            const movies = [];

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const values = this.parseCSVLine(lines[i]);
                if (values.length === 0) continue;
                
                const movie = {};
                headers.forEach((header, index) => {
                    movie[header] = values[index] ? values[index].trim().replace(/^"|"$/g, '') : '';
                });
                
                if (movie.title && movie.watch_date) {
                    movies.push(movie);
                }
            }

            console.log(`Parsed ${movies.length} movies from CSV`);
            return movies;
        } catch (error) {
            console.error('Error parsing CSV:', error);
            return [];
        }
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    getSampleData() {
        const currentYear = new Date().getFullYear();
        
        return {
            movies: [
                {
                    title: 'The Matrix',
                    year: '1999',
                    director: 'The Wachowskis',
                    genre: 'Action, Sci-Fi',
                    rating: '4.5',
                    watch_date: `${currentYear}-03-15`
                },
                {
                    title: 'Pulp Fiction',
                    year: '1994',
                    director: 'Quentin Tarantino',
                    genre: 'Crime, Drama',
                    rating: '4.8',
                    watch_date: `${currentYear}-04-22`
                },
                {
                    title: 'Inception',
                    year: '2010',
                    director: 'Christopher Nolan',
                    genre: 'Action, Sci-Fi, Thriller',
                    rating: '4.6',
                    watch_date: `${currentYear}-05-10`
                }
            ],
            stats: {
                total_films: 342,
                films_this_year: 58,
                total_runtime: 28456,
                average_rating: 3.8,
                monthly_data: [4, 6, 6, 10, 11, 16, 5, 8, 12, 9, 7, 3],
                genre_distribution: {
                    'Drama': 45,
                    'Comedy': 32,
                    'Action': 28,
                    'Thriller': 25,
                    'Sci-Fi': 18,
                    'Horror': 15
                },
                rating_distribution: {
                    '0.5': 2,
                    '1.0': 5,
                    '1.5': 8,
                    '2.0': 15,
                    '2.5': 25,
                    '3.0': 45,
                    '3.5': 68,
                    '4.0': 89,
                    '4.5': 65,
                    '5.0': 32
                },
                last_updated: new Date().toISOString()
            }
        };
    }

    updateStats() {
        const movies = this.getMoviesForDisplay();
        const currentYear = new Date().getFullYear();
        const currentYearMovies = movies.filter(movie => 
            movie.watch_date && movie.watch_date.startsWith(currentYear.toString())
        );

        const totalMovies = this.filteredMovies ? movies.length : this.data.stats.total_films;
        const yearMovies = this.filteredMovies ? currentYearMovies.length : this.data.stats.films_this_year;

        document.getElementById('movies-this-year').textContent = yearMovies;
        document.getElementById('total-movies').textContent = totalMovies;
        
        // Calculate average rating for current set
        const ratedMovies = movies.filter(movie => movie.rating && parseFloat(movie.rating) > 0);
        const avgRating = ratedMovies.length > 0 ? 
            ratedMovies.reduce((sum, movie) => sum + parseFloat(movie.rating), 0) / ratedMovies.length :
            this.data.stats.average_rating;
        
        document.getElementById('average-rating').textContent = avgRating.toFixed(1);
        
        const days = Math.floor((this.filteredMovies ? movies.length * 110 : this.data.stats.total_runtime) / (24 * 60));
        document.getElementById('total-runtime').textContent = days;
    }

    updateDirectors() {
        const movies = this.getMoviesForDisplay();
        const currentYear = new Date().getFullYear();
        const currentYearMovies = movies.filter(movie => 
            movie.watch_date && movie.watch_date.startsWith(currentYear.toString())
        );

        const directorCounts = {};
        const allDirectorCounts = {};

        currentYearMovies.forEach(movie => {
            if (movie.director && movie.director.trim()) {
                directorCounts[movie.director] = (directorCounts[movie.director] || 0) + 1;
            }
        });

        movies.forEach(movie => {
            if (movie.director && movie.director.trim()) {
                allDirectorCounts[movie.director] = (allDirectorCounts[movie.director] || 0) + 1;
            }
        });

        this.displayDirectorList('top-directors-year', directorCounts, 5);
        this.displayDirectorList('top-directors-all', allDirectorCounts, 5);
    }

    displayDirectorList(elementId, directors, limit) {
        const sorted = Object.entries(directors)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit);

        const list = document.getElementById(elementId);
        
        if (sorted.length === 0) {
            list.innerHTML = '<div class="director-item"><span class="director-name">No data available</span></div>';
            return;
        }

        list.innerHTML = sorted.map(([director, count]) => `
            <div class="director-item">
                <span class="director-name">${this.escapeHtml(director)}</span>
                <span class="director-count">${count}</span>
            </div>
        `).join('');
    }

    createCharts() {
        this.createGenreChart();
        this.createRatingChart();
        this.createMonthlyChart();
    }

    updateCharts() {
        // Destroy existing charts
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
        
        // Recreate charts with filtered data
        this.createCharts();
    }

    createGenreChart() {
        const ctx = document.getElementById('genreChart').getContext('2d');
        
        let genreData;
        if (this.filteredMovies) {
            genreData = this.calculateGenreDistribution(this.getMoviesForDisplay());
        } else {
            genreData = this.data.stats.genre_distribution;
        }
        
        const hasData = Object.values(genreData).some(value => value > 0);

        if (!hasData) {
            ctx.font = '14px Graphik';
            ctx.fillStyle = '#9ab';
            ctx.textAlign = 'center';
            ctx.fillText('No genre data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        this.charts.genreChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(genreData),
                datasets: [{
                    data: Object.values(genreData),
                    backgroundColor: [
                        '#00d735',
                        '#4ade80',
                        '#22c55e',
                        '#16a34a',
                        '#15803d',
                        '#166534'
                    ],
                    borderWidth: 2,
                    borderColor: '#1f2937'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#9ab',
                            font: {
                                family: 'Graphik',
                                size: 12
                            },
                            padding: 15
                        }
                    }
                }
            }
        });
    }

    calculateGenreDistribution(movies) {
        const genreCount = {};
        
        movies.forEach(movie => {
            if (movie.genre) {
                const genres = movie.genre.split(',').map(g => g.trim());
                genres.forEach(genre => {
                    if (genre) {
                        genreCount[genre] = (genreCount[genre] || 0) + 1;
                    }
                });
            }
        });
        
        return genreCount;
    }

    createRatingChart() {
        const ctx = document.getElementById('ratingChart').getContext('2d');
        
        let ratingData;
        if (this.filteredMovies) {
            ratingData = this.calculateRatingDistribution(this.getMoviesForDisplay());
        } else {
            ratingData = this.data.stats.rating_distribution;
        }

        this.charts.ratingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(ratingData),
                datasets: [{
                    label: 'Number of Films',
                    data: Object.values(ratingData),
                    backgroundColor: '#00d735',
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 2,
                            color: '#9ab',
                            font: {
                                family: 'Graphik',
                                size: 11
                            }
                        },
                        grid: {
                            color: '#445566'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#9ab',
                            font: {
                                family: 'Graphik',
                                size: 11
                            }
                        },
                        grid: {
                            color: '#445566'
                        }
                    }
                }
            }
        });
    }

    calculateRatingDistribution(movies) {
        const ratingCount = {
            '0.5': 0, '1.0': 0, '1.5': 0, '2.0': 0, '2.5': 0,
            '3.0': 0, '3.5': 0, '4.0': 0, '4.5': 0, '5.0': 0
        };
        
        movies.forEach(movie => {
            if (movie.rating) {
                const rating = parseFloat(movie.rating).toFixed(1);
                if (ratingCount.hasOwnProperty(rating)) {
                    ratingCount[rating]++;
                }
            }
        });
        
        return ratingCount;
    }

    createMonthlyChart() {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        let monthlyData;
        if (this.filteredMovies) {
            monthlyData = this.calculateMonthlyData(this.getMoviesForDisplay());
        } else {
            monthlyData = this.data.stats.monthly_data;
        }

        this.charts.monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Films Watched',
                    data: monthlyData,
                    borderColor: '#00d735',
                    backgroundColor: 'rgba(0, 215, 53, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#00d735',
                    pointBorderColor: '#1f2937',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 2,
                            color: '#9ab',
                            font: {
                                family: 'Graphik',
                                size: 11
                            }
                        },
                        grid: {
                            color: '#445566'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#9ab',
                            font: {
                                family: 'Graphik',
                                size: 11
                            }
                        },
                        grid: {
                            color: '#445566'
                        }
                    }
                }
            }
        });
    }

    calculateMonthlyData(movies) {
        const monthlyCount = new Array(12).fill(0);
        const currentYear = new Date().getFullYear();
        
        movies.forEach(movie => {
            if (movie.watch_date && movie.watch_date.startsWith(currentYear.toString())) {
                const month = new Date(movie.watch_date).getMonth();
                monthlyCount[month]++;
            }
        });
        
        return monthlyCount;
    }

    updateGoals() {
        const movies = this.getMoviesForDisplay();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const currentMonthMovies = movies.filter(movie => {
            if (!movie.watch_date) return false;
            const watchDate = new Date(movie.watch_date);
            return watchDate.getMonth() === currentMonth && 
                   watchDate.getFullYear() === currentYear;
        }).length;

        const currentYearMovies = movies.filter(movie => {
            if (!movie.watch_date) return false;
            return movie.watch_date.startsWith(currentYear.toString());
        }).length;

        const monthlyGoal = 10;
        const monthlyProgress = Math.min((currentMonthMovies / monthlyGoal) * 100, 100);
        document.getElementById('monthly-progress').style.width = monthlyProgress + '%';
        document.getElementById('monthly-progress-text').textContent = `${currentMonthMovies}/${monthlyGoal}`;

        const yearlyGoal = 100;
        const yearlyProgress = Math.min((currentYearMovies / yearlyGoal) * 100, 100);
        document.getElementById('yearly-progress').style.width = yearlyProgress + '%';
        document.getElementById('yearly-progress-text').textContent = `${currentYearMovies}/${yearlyGoal}`;
    }

    updateRecentActivity() {
        const movies = this.getMoviesForDisplay();
        const recentMovies = movies
            .filter(movie => movie.watch_date)
            .sort((a, b) => new Date(b.watch_date) - new Date(a.watch_date))
            .slice(0, 8);

        const container = document.getElementById('recent-movies');
        
        if (recentMovies.length === 0) {
            container.innerHTML = '<div class="recent-film"><span>No recent activity</span></div>';
            return;
        }

        container.innerHTML = recentMovies.map(movie => {
            const rating = parseFloat(movie.rating) || 0;
            const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
            
            return `
                <div class="recent-film">
                    <div class="film-poster">
                        <span>🎬</span>
                    </div>
                    <div class="film-info">
                        <div class="film-title">${this.escapeHtml(movie.title)} (${movie.year})</div>
                        <div class="film-meta">
                            ${rating > 0 ? `<span class="rating-stars">${stars}</span>` : ''}
                            ${this.formatDate(movie.watch_date)}
                            ${movie.director ? ` • Dir: ${this.escapeHtml(movie.director)}` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Stats Page Setup
    setupStatsPage() {
        // Initialize stats page content
        this.updateStatsPage();
    }

    updateStatsPage() {
        const movies = this.getMoviesForDisplay();
        
        // Top Rated Decades
        this.updateDecadesList(movies);
        
        // Genre Breakdown
        this.updateGenresBreakdown(movies);
        
        // Countries List
        this.updateCountriesList(movies);
        
        // Runtime Analysis
        this.updateRuntimeAnalysis(movies);
    }

    updateDecadesList(movies) {
        const decadeCount = {};
        const decadeRatings = {};
        
        movies.forEach(movie => {
            if (movie.year && movie.rating) {
                const decade = Math.floor(parseInt(movie.year) / 10) * 10;
                const rating = parseFloat(movie.rating);
                
                if (!decadeCount[decade]) {
                    decadeCount[decade] = 0;
                    decadeRatings[decade] = [];
                }
                
                decadeCount[decade]++;
                decadeRatings[decade].push(rating);
            }
        });
        
        const decadeStats = Object.keys(decadeCount)
            .map(decade => ({
                decade: `${decade}s`,
                count: decadeCount[decade],
                avgRating: decadeRatings[decade].reduce((a, b) => a + b, 0) / decadeRatings[decade].length
            }))
            .sort((a, b) => b.avgRating - a.avgRating);
        
        const container = document.getElementById('decades-list');
        container.innerHTML = decadeStats.map(stat => `
            <div class="stat-item">
                <span class="stat-name">${stat.decade}</span>
                <span class="stat-value">${stat.avgRating.toFixed(1)} ★ (${stat.count} films)</span>
            </div>
        `).join('');
    }

    updateGenresBreakdown(movies) {
        const genreDistribution = this.calculateGenreDistribution(movies);
        const sortedGenres = Object.entries(genreDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        const container = document.getElementById('genres-breakdown');
        container.innerHTML = sortedGenres.map(([genre, count]) => `
            <div class="stat-item">
                <span class="stat-name">${genre}</span>
                <span class="stat-value">${count} films</span>
            </div>
        `).join('');
    }

    updateCountriesList(movies) {
        // This would require country data - placeholder for now
        const container = document.getElementById('countries-list');
        container.innerHTML = `
            <div class="stat-item">
                <span class="stat-name">United States</span>
                <span class="stat-value">156 films</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">United Kingdom</span>
                <span class="stat-value">89 films</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">France</span>
                <span class="stat-value">45 films</span>
            </div>
        `;
    }

    updateRuntimeAnalysis(movies) {
        const ratedMovies = movies.filter(m => m.rating && parseFloat(m.rating) > 0);
        const totalRuntime = ratedMovies.length * 110; // Estimate 110 min per movie
        const avgRating = ratedMovies.reduce((sum, m) => sum + parseFloat(m.rating), 0) / ratedMovies.length;
        
        const container = document.getElementById('runtime-analysis');
        container.innerHTML = `
            <div class="stat-item">
                <span class="stat-name">Total Runtime</span>
                <span class="stat-value">${Math.floor(totalRuntime / 60)} hours</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Average Rating</span>
                <span class="stat-value">${avgRating.toFixed(1)} ★</span>
            </div>
            <div class="stat-item">
                <span class="stat-name">Films per Month</span>
                <span class="stat-value">${(ratedMovies.length / 12).toFixed(1)}</span>
            </div>
        `;
    }

    // Lists Page Setup
    setupListsPage() {
        this.updateListsPage();
    }

    updateListsPage() {
        const movies = this.getMoviesForDisplay();
        
        this.updateTopRatedList(movies);
        this.updateRecentFavoritesList(movies);
        this.updateGenreLists(movies);
    }

    updateTopRatedList(movies) {
        const topRated = movies
            .filter(movie => movie.rating && parseFloat(movie.rating) >= 4.0)
            .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
            .slice(0, 10);
        
        const container = document.getElementById('top-rated-list');
        container.innerHTML = topRated.map(movie => `
            <div class="list-item">
                <div class="list-item-title">${this.escapeHtml(movie.title)} (${movie.year})</div>
                <div class="list-item-meta">
                    ${'★'.repeat(Math.floor(parseFloat(movie.rating)))} ${movie.rating}
                    ${movie.director ? ` • ${this.escapeHtml(movie.director)}` : ''}
                </div>
            </div>
        `).join('');
    }

    updateRecentFavoritesList(movies) {
        const recentFavorites = movies
            .filter(movie => movie.rating && parseFloat(movie.rating) >= 4.0 && movie.watch_date)
            .sort((a, b) => new Date(b.watch_date) - new Date(a.watch_date))
            .slice(0, 10);
        
        const container = document.getElementById('recent-favorites-list');
        container.innerHTML = recentFavorites.map(movie => `
            <div class="list-item">
                <div class="list-item-title">${this.escapeHtml(movie.title)} (${movie.year})</div>
                <div class="list-item-meta">
                    ${'★'.repeat(Math.floor(parseFloat(movie.rating)))} ${movie.rating} • ${this.formatDate(movie.watch_date)}
                </div>
            </div>
        `).join('');
    }

    updateGenreLists(movies) {
        const genreDistribution = this.calculateGenreDistribution(movies);
        const topGenres = Object.entries(genreDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        const container = document.getElementById('genre-lists');
        container.innerHTML = topGenres.map(([genre, count]) => `
            <div class="genre-list-item">
                <h4>${genre}</h4>
                <p>${count} films</p>
            </div>
        `).join('');
    }

    updateLastUpdated() {
        const lastUpdated = new Date(this.data.stats.last_updated);
        document.getElementById('last-updated-text').textContent = 
            `Last updated: ${this.formatDate(lastUpdated.toISOString().split('T')[0])}`;
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showError() {
        const container = document.querySelector('.dashboard-grid');
        container.innerHTML = `
            <div class="error-card">
                <h2>Unable to Load Data</h2>
                <p>There was an error loading your Letterboxd data. Please check that your data files are properly configured and try refreshing the page.</p>
            </div>
        `;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LetterboxdDashboard();
});
