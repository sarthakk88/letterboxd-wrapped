@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

:root {
    /* Authentic Letterboxd Colors */
    --letterboxd-bg: #14181c;
    --letterboxd-surface: #1f2937;
    --letterboxd-card: #242a33;
    --letterboxd-green: #00d735;
    --letterboxd-green-hover: #00b82f;
    --letterboxd-orange: #ff8000;
    --letterboxd-blue: #40bcf4;
    --letterboxd-text: #ffffff;
    --letterboxd-text-muted: #9ca3af;
    --letterboxd-text-dark: #6b7280;
    --letterboxd-border: #374151;
    --letterboxd-hover: #374151;

    /* Modern gradients */
    --gradient-primary: linear-gradient(135deg, var(--letterboxd-green) 0%, #00b82f 100%);
    --gradient-secondary: linear-gradient(135deg, var(--letterboxd-orange) 0%, #ff6b00 100%);
    --gradient-accent: linear-gradient(135deg, var(--letterboxd-blue) 0%, #3b94c7 100%);

    /* Shadows */
    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.2);
    --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.3);

    /* Border radius */
    --radius-sm: 6px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 24px;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: var(--letterboxd-bg);
    color: var(--letterboxd-text);
    line-height: 1.6;
    font-feature-settings: 'liga' 1, 'calt' 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

/* Modern Header */
.header {
    background: rgba(31, 41, 55, 0.95);
    backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid var(--letterboxd-border);
    position: sticky;
    top: 0;
    z-index: 100;
    padding: 1.5rem 0;
}

.header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
}

.logo {
    font-size: 1.75rem;
    font-weight: 800;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
    text-align: center;
}

/* Container */
.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 3rem 2rem;
}

/* Date Filter Controls */
.filter-controls {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding: 2rem;
    background: var(--letterboxd-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--letterboxd-border);
    align-items: end;
    flex-wrap: wrap;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.control-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--letterboxd-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.modern-input {
    padding: 0.75rem 1rem;
    border: 1.5px solid var(--letterboxd-border);
    border-radius: var(--radius-md);
    background: var(--letterboxd-card);
    color: var(--letterboxd-text);
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
    min-width: 140px;
}

.modern-input:focus {
    border-color: var(--letterboxd-green);
    box-shadow: 0 0 0 3px rgba(0, 215, 53, 0.1);
    transform: translateY(-1px);
}

.filter-button {
    padding: 0.875rem 2rem;
    border: none;
    border-radius: var(--radius-md);
    background: var(--gradient-primary);
    color: white;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.filter-button:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.clear-filters {
    padding: 0.875rem 1.5rem;
    border: 1px solid var(--letterboxd-border);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--letterboxd-text-muted);
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.clear-filters:hover {
    border-color: var(--letterboxd-orange);
    color: var(--letterboxd-orange);
    background: rgba(255, 128, 0, 0.05);
}

/* Filter Status */
.filter-status {
    background: rgba(0, 215, 53, 0.1);
    border: 1px solid rgba(0, 215, 53, 0.3);
    border-radius: var(--radius-md);
    padding: 0.75rem 1rem;
    margin-bottom: 2rem;
    color: var(--letterboxd-green);
    font-size: 0.9rem;
    font-weight: 500;
    display: none;
}

.filter-status.active {
    display: block;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Tab Navigation */
.tab-nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 3rem;
    background: var(--letterboxd-surface);
    padding: 0.5rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--letterboxd-border);
}

.tab-button {
    padding: 1rem 2rem;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--letterboxd-text-muted);
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex: 1;
    min-width: 120px;
}

.tab-button.active {
    background: var(--letterboxd-green);
    color: white;
    box-shadow: var(--shadow-md);
}

.tab-button:hover:not(.active) {
    background: var(--letterboxd-hover);
    color: var(--letterboxd-text);
}

/* Tab Content */
.tab-content {
    display: none;
    animation: fadeIn 0.4s ease-in-out;
}

.tab-content.active {
    display: block;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Loading State */
.loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    flex-direction: column;
    gap: 2rem;
}

.spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(0, 215, 53, 0.1);
    border-top: 3px solid var(--letterboxd-green);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading-text {
    color: var(--letterboxd-text-muted);
    font-size: 1.1rem;
    font-weight: 500;
}

/* Error State */
.error-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    flex-direction: column;
    gap: 1rem;
    text-align: center;
}

.error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: var(--letterboxd-orange);
}

.error-state h3 {
    color: var(--letterboxd-orange);
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.error-state p {
    color: var(--letterboxd-text-muted);
    font-size: 1rem;
    max-width: 500px;
}

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
}

.stat-card {
    background: var(--letterboxd-card);
    border: 1px solid var(--letterboxd-border);
    border-radius: var(--radius-lg);
    padding: 2.5rem 2rem;
    text-align: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}

.stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--gradient-primary);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.stat-card:hover {
    transform: translateY(-8px);
    box-shadow: var(--shadow-xl);
    border-color: var(--letterboxd-green);
}

.stat-card:hover::before {
    opacity: 1;
}

.stat-value {
    font-size: 3rem;
    font-weight: 800;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
    line-height: 1;
    letter-spacing: -0.02em;
}

.stat-label {
    color: var(--letterboxd-text-muted);
    font-size: 1rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Charts 2x2 Grid */
.charts-2x2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
    margin-bottom: 3rem;
}

.chart-section {
    background: var(--letterboxd-card);
    border: 1px solid var(--letterboxd-border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}

.chart-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--gradient-secondary);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.chart-section:hover {
    border-color: var(--letterboxd-orange);
    box-shadow: var(--shadow-lg);
}

.chart-section:hover::before {
    opacity: 1;
}

.chart-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: var(--letterboxd-text);
    letter-spacing: -0.01em;
}

.chart-container {
    position: relative;
    height: 300px;
    margin-bottom: 1rem;
}

/* Directors Grid */
.directors-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
    margin-bottom: 3rem;
}

/* Stats Lists Grid */
.stats-lists-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
}

/* Films Grid */
.films-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
    margin-bottom: 3rem;
}

/* Lists */
.list-container {
    background: var(--letterboxd-card);
    border: 1px solid var(--letterboxd-border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    margin-bottom: 2rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-container:hover {
    border-color: var(--letterboxd-blue);
    box-shadow: var(--shadow-lg);
}

.list-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: var(--letterboxd-text);
    letter-spacing: -0.01em;
}

.list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem;
    border-radius: var(--radius-md);
    margin-bottom: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--letterboxd-green);
    transform: translateX(8px);
}

.list-item-name {
    font-weight: 600;
    color: var(--letterboxd-text);
    font-size: 0.95rem;
}

.list-item-value {
    font-weight: 700;
    color: var(--letterboxd-green);
    font-size: 0.9rem;
}

/* Responsive Design */
@media (max-width: 768px) {
    .container {
        padding: 2rem 1rem;
    }

    .header-content {
        padding: 0 1rem;
    }

    .filter-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
        padding: 1.5rem;
    }

    .control-group {
        width: 100%;
    }

    .modern-input {
        min-width: 100%;
    }

    .stats-grid {
        grid-template-columns: 1fr;
    }

    .charts-2x2 {
        grid-template-columns: 1fr;
    }

    .directors-grid {
        grid-template-columns: 1fr;
    }

    .films-grid {
        grid-template-columns: 1fr;
    }

    .stats-lists-grid {
        grid-template-columns: 1fr;
    }

    .stat-value {
        font-size: 2.5rem;
    }

    .tab-nav {
        flex-direction: column;
        gap: 0.25rem;
    }

    .tab-button {
        padding: 0.875rem 1.5rem;
    }
}

@media (max-width: 480px) {
    .modern-input {
        font-size: 0.85rem;
    }

    .filter-button, .clear-filters {
        padding: 0.75rem 1.5rem;
        font-size: 0.85rem;
    }

    .chart-container {
        height: 250px;
    }
}

/* Utility Classes */
.hidden {
    display: none !important;
}

.fade-in {
    animation: fadeIn 0.6s ease-in-out;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    background: var(--letterboxd-surface);
}

::-webkit-scrollbar-thumb {
    background: var(--letterboxd-green);
    border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--letterboxd-green-hover);
}