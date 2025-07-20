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
            } else {
                // Use sample data if files don't exist
                this.data = this.getSampleData();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.data = this.getSampleData();
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        const movies = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const movie = {};
            
            headers.forEach((header, index) => {
                movie[header.trim()] = values[index] ? values[index].trim() : '';
            });
            
            movies.push(movie);
        }

        return movies;
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
                    watchDate: `${currentYear}-03-15`
                },
                {
                    title: 'Pulp Fiction',
                    year: '1994',
                    director: 'Quentin Tarantino',
                    genre: 'Crime',
                    rating: '4.8',
                    watchDate: `${currentYear}-04-22`
                },
                {
                    title: 'Inception',
                    year: '2010',
                    director: 'Christopher Nolan',
                    genre: 'Sci-Fi',
                    rating: '4.6',
                    watchDate: `${currentYear}-05-10`
                }
            ],
            stats: {
                totalMovies: 342,
                totalRuntime: 28456,
                averageRating: 3.8,
                monthlyData: months.map(month => Math.floor(Math.random() * 20) + 5),
                genreDistribution: {
                    'Drama': 45,
                    'Comedy': 32,
                    'Action': 28,
                    'Thriller': 25,
                    'Sci-Fi': 18,
                    'Horror': 15
                },
                ratingDistribution: {
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
                lastUpdated: new Date().toISOString()
            }
        };
    }

    updateStats() {
        const currentYear = new Date().getFullYear();
        const currentYearMovies = this.data.movies.filter(movie => 
            movie.watchDate && movie.watchDate.startsWith(currentYear.toString())
        );

        // Update main stats
        document.getElementById('movies-this-year').textContent = currentYearMovies.length;
        document.getElementById('total-movies').textContent = this.data.stats.totalMovies;
        document.getElementById('average-rating').textContent = this.data.stats.averageRating.toFixed(1);
        
        // Convert runtime to days
        const days = Math.floor(this.data.stats.totalRuntime / (24 * 60));
        document.getElementById('total-runtime').textContent = days;
    }

    updateDirectors() {
        // Count directors for current year
        const currentYear = new Date().getFullYear();
        const currentYearMovies = this.data.movies.filter(movie => 
            movie.watchDate && movie.watchDate.startsWith(currentYear.toString())
        );

        const directorCounts = {};
        const allDirectorCounts = {};

        // Count current year directors
        currentYearMovies.forEach(movie => {
            if (movie.director) {
                directorCounts[movie.director] = (directorCounts[movie.director] || 0) + 1;
            }
        });

        // Count all directors
        this.data.movies.forEach(movie => {
            if (movie.director) {
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
        list.innerHTML = sorted.map(([director, count]) => `
            <li>
                <span class="director-name">${director}</span>
                <span class="director-count">${count}</span>
            </li>
        `).join('');
    }

    createCharts() {
        this.createGenreChart();
        this.createRatingChart();
        this.createMonthlyChart();
    }

    createGenreChart() {
        const ctx = document.getElementById('genreChart').getContext('2d');
        const genres = this.data.stats.genreDistribution;

        this.charts.genreChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(genres),
                datasets: [{
                    data: Object.values(genres),
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#f093fb',
                        '#f5576c',
                        '#4facfe',
                        '#00f2fe'
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
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    createRatingChart() {
        const ctx = document.getElementById('ratingChart').getContext('2d');
        const ratings = this.data.stats.ratingDistribution;

        this.charts.ratingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(ratings),
                datasets: [{
                    label: 'Number of Movies',
                    data: Object.values(ratings),
                    backgroundColor: '#667eea',
                    borderRadius: 4
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
                            stepSize: 10
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Rating'
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
                    label: 'Movies Watched',
                    data: this.data.stats.monthlyData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4
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
                            stepSize: 5
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
            if (!movie.watchDate) return false;
            const watchDate = new Date(movie.watchDate);
            return watchDate.getMonth() === currentMonth && 
                   watchDate.getFullYear() === currentYear;
        }).length;

        // Current year movies
        const currentYearMovies = this.data.movies.filter(movie => {
            if (!movie.watchDate) return false;
            return movie.watchDate.startsWith(currentYear.toString());
        }).length;

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
            .filter(movie => movie.watchDate)
            .sort((a, b) => new Date(b.watchDate) - new Date(a.watchDate))
            .slice(0, 5);

        const container = document.getElementById('recent-movies');
        container.innerHTML = recentMovies.map(movie => `
            <div class="recent-movie">
                <div class="movie-poster">🎬</div>
                <div class="movie-info">
                    <h4>${movie.title} (${movie.year})</h4>
                    <p>Rating: ${'⭐'.repeat(Math.floor(parseFloat(movie.rating || 0)))} • ${this.formatDate(movie.watchDate)}</p>
                </div>
            </div>
        `).join('');
    }

    updateLastUpdated() {
        const lastUpdated = new Date(this.data.stats.lastUpdated);
        document.getElementById('last-updated-text').textContent = 
            `Last updated: ${this.formatDate(lastUpdated.toISOString().split('T')[0])}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    showError() {
        const container = document.querySelector('.dashboard-grid');
        container.innerHTML = `
            <div class="card" style="grid-column: span 2; text-align: center; padding: 40px;">
                <h2>⚠️ Unable to Load Data</h2>
                <p>There was an error loading your Letterboxd data. Please check that your data files are properly configured.</p>
            </div>
        `;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LetterboxdDashboard();
});

// Auto-refresh every 5 minutes
setInterval(() => {
    location.reload();
}, 300000);
