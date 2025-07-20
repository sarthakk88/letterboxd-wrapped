// Dashboard Data Management
class LetterboxdDashboard {
    constructor() {
        this.data = null;
        this.charts = {};
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.updateStats();
            this.updateDirectors();
            this.createCharts();
            this.updateGoals();
            this.updateRecentActivity();
            this.updateLastUpdated();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError();
        }
    }

    async loadData() {
        try {
            // Try to load from data files
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
                console.log('Loaded data:', this.data);
            } else {
                // Use sample data if files don't exist
                this.data = this.getSampleData();
                console.log('Using sample data');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.data = this.getSampleData();
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
                
                // Only add if we have essential data
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
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        return {
            movies: [
                {
                    title: 'The Matrix',
                    year: '1999',
                    director: 'The Wachowskis',
                    genre: 'Sci-Fi',
                    rating: '4.5',
                    watch_date: `${currentYear}-03-15`
                },
                {
                    title: 'Pulp Fiction',
                    year: '1994',
                    director: 'Quentin Tarantino',
                    genre: 'Crime',
                    rating: '4.8',
                    watch_date: `${currentYear}-04-22`
                },
                {
                    title: 'Inception',
                    year: '2010',
                    director: 'Christopher Nolan',
                    genre: 'Sci-Fi',
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
        const currentYear = new Date().getFullYear();
        const currentYearMovies = this.data.movies.filter(movie => 
            movie.watch_date && movie.watch_date.startsWith(currentYear.toString())
        );

        // Update main stats
        document.getElementById('movies-this-year').textContent = this.data.stats.films_this_year || currentYearMovies.length;
        document.getElementById('total-movies').textContent = this.data.stats.total_films;
        document.getElementById('average-rating').textContent = this.data.stats.average_rating.toFixed(1);
        
        // Convert runtime to days
        const days = Math.floor(this.data.stats.total_runtime / (24 * 60));
        document.getElementById('total-runtime').textContent = days;
    }

    updateDirectors() {
        // Count directors for current year
        const currentYear = new Date().getFullYear();
        const currentYearMovies = this.data.movies.filter(movie => 
            movie.watch_date && movie.watch_date.startsWith(currentYear.toString())
        );

        const directorCounts = {};
        const allDirectorCounts = {};

        // Count current year directors
        currentYearMovies.forEach(movie => {
            if (movie.director && movie.director.trim()) {
                directorCounts[movie.director] = (directorCounts[movie.director] || 0) + 1;
            }
        });

        // Count all directors
        this.data.movies.forEach(movie => {
            if (movie.director && movie.director.trim()) {
                allDirectorCounts[movie.director] = (allDirectorCounts[movie.director] || 0) + 1;
            }
        });

        // Display top directors
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

    createGenreChart() {
        const ctx = document.getElementById('genreChart').getContext('2d');
        const genres = this.data.stats.genre_distribution;
        const hasData = Object.values(genres).some(value => value > 0);

        if (!hasData) {
            // Show placeholder for no genre data
            ctx.font = '14px Graphik';
            ctx.fillStyle = '#9ab';
            ctx.textAlign = 'center';
            ctx.fillText('Genre data not available', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        this.charts.genreChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(genres),
                datasets: [{
                    data: Object.values(genres),
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

    createRatingChart() {
        const ctx = document.getElementById('ratingChart').getContext('2d');
        const ratings = this.data.stats.rating_distribution;

        this.charts.ratingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(ratings),
                datasets: [{
                    label: 'Number of Films',
                    data: Object.values(ratings),
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
                            stepSize: 5,
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

    createMonthlyChart() {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        this.charts.monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Films Watched',
                    data: this.data.stats.monthly_data,
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

    updateGoals() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Current month movies
        const currentMonthMovies = this.data.movies.filter(movie => {
            if (!movie.watch_date) return false;
            const watchDate = new Date(movie.watch_date);
            return watchDate.getMonth() === currentMonth && 
                   watchDate.getFullYear() === currentYear;
        }).length;

        // Current year movies
        const currentYearMovies = this.data.stats.films_this_year || 0;

        // Monthly goal (example: 10 movies per month)
        const monthlyGoal = 10;
        const monthlyProgress = Math.min((currentMonthMovies / monthlyGoal) * 100, 100);
        document.getElementById('monthly-progress').style.width = monthlyProgress + '%';
        document.getElementById('monthly-progress-text').textContent = `${currentMonthMovies}/${monthlyGoal}`;

        // Yearly goal (example: 100 movies per year)
        const yearlyGoal = 100;
        const yearlyProgress = Math.min((currentYearMovies / yearlyGoal) * 100, 100);
        document.getElementById('yearly-progress').style.width = yearlyProgress + '%';
        document.getElementById('yearly-progress-text').textContent = `${currentYearMovies}/${yearlyGoal}`;
    }

    updateRecentActivity() {
        const recentMovies = this.data.movies
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
                        <span>📽</span>
                    </div>
                    <div class="film-info">
                        <div class="film-title">${this.escapeHtml(movie.title)} (${movie.year})</div>
                        <div class="film-meta">
                            ${rating > 0 ? `<span class="rating-stars">${stars}</span>` : ''}
                            ${this.formatDate(movie.watch_date)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
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

// Auto-refresh every 10 minutes
setInterval(() => {
    window.location.reload();
}, 600000);
