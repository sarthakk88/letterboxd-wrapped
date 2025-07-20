# Letterboxd Wrapped

A beautiful, automated dashboard that tracks your Letterboxd movie-watching statistics using GitHub Pages and GitHub Actions.

## 🌟 Features

- **Automated Data Collection**: Scrapes your Letterboxd data daily using GitHub Actions
- **Beautiful Dashboard**: Responsive web interface with interactive charts
- **Comprehensive Statistics**: 
  - Movies watched this year vs all-time
  - Average ratings and total runtime
  - Director analysis and favorite filmmakers
  - Genre distribution with visual charts
  - Monthly viewing patterns
  - Goal tracking with progress bars

## 🚀 Quick Setup

### 1. Fork this Repository

Click the "Fork" button to create your own copy of this dashboard.

### 2. Configure GitHub Secrets

In your repository settings, go to "Secrets and variables" > "Actions" and add:

- `LETTERBOXD_USERNAME`: Your Letterboxd username (without @)

### 3. Enable GitHub Pages

1. Go to repository "Settings"
2. Scroll to "Pages" section
3. Set source to "Deploy from a branch"
4. Choose "main" branch
5. Click "Save"

Your dashboard will be available at: `https://yourusername.github.io/repository-name`

### 4. Enable Actions

1. Go to the "Actions" tab
2. Click "I understand my workflows, go ahead and enable them"
3. The scraper will run automatically daily at 8 AM UTC

## 📊 Dashboard Features

### Overview Statistics
- Movies watched this year (highlighted)
- Total movies all-time
- Average rating across all films  
- Total runtime converted to days

### Visual Analytics
- **Genre Distribution**: Interactive doughnut chart showing your viewing preferences
- **Rating Distribution**: Bar chart of how you rate movies
- **Monthly Activity**: Line chart tracking viewing patterns throughout the year

### Director Analysis
- Most-watched directors this year
- All-time favorite directors with movie counts

### Goal Tracking
- Monthly viewing goals with progress bars
- Yearly targets with visual indicators
- Customizable targets (edit in `script.js`)

## 🛠️ Customization

### Adjust Viewing Goals

Edit the goals in `script.js`:

