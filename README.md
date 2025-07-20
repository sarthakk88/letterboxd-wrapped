# Letterboxd Dashboard Tracker

A beautiful, Letterboxd-inspired dashboard that scrapes your Letterboxd diary and displays comprehensive movie statistics with interactive visualizations.

## 🎬 Features

### Dashboard Tabs
- **Diary**: Your complete movie watching statistics
  - Films watched this year vs all time
  - Average rating and total watch time
  - Genre and rating distribution charts
  - Monthly activity tracking
  - Top directors and cast members
  - Recent activity feed

- **Stats**: Deep dive analytics  
  - Top rated decades analysis
  - Comprehensive genre breakdown
  - Country distribution statistics

- **List**: Movie rankings and ratings
  - Top rated films (all time & this year)
  - Sortable by rating and date

### 🎨 Design
- Authentic Letterboxd visual styling
- Dark theme with signature green accents (#00d735)
- Responsive grid layouts
- Interactive Chart.js visualizations
- Smooth animations and transitions

## 🚀 Quick Start

### Option 1: Local Setup
1. Clone this repository
2. Open `index.html` in your browser
3. The dashboard will load with sample data

### Option 2: GitHub Pages Deployment
1. Fork this repository
2. Enable GitHub Pages in repository settings
3. Set up GitHub Secrets for automatic data updates:
   - `LETTERBOXD_USERNAME`: Your Letterboxd username
   - `TMDB_API_KEY`: Your TMDb API key (optional, for enhanced data)

## 📊 Data Sources

The dashboard uses two main data files:
- `data/movies.csv`: Individual movie entries with ratings, dates, genres, etc.
- `data/stats.json`: Aggregate statistics and metadata

## 🤖 Automated Data Updates

The included GitHub Actions workflow (`scrape.yml`) automatically:
- Scrapes your latest Letterboxd diary entries daily
- Enriches movie data with TMDb information
- Updates the dashboard data files
- Commits changes back to your repository

## 🛠️ Technology Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js for beautiful data visualizations  
- **Scraping**: Python with BeautifulSoup4 and requests
- **Data Enhancement**: TMDb API integration
- **Automation**: GitHub Actions for scheduled updates
- **Deployment**: GitHub Pages ready

## 📁 Project Structure

```
letterboxd-tracker/
├── 📄 index.html          # Main dashboard page
├── 📄 styles.css          # Styling for the website  
├── 📄 script.js           # JavaScript for interactivity
├── 📄 README.md           # Project documentation
├── 📁 data/               # Data storage
│   ├── movies.csv         # Movie data from scraping
│   └── stats.json         # Calculated statistics
├── 📁 scraper/            # Python scraping tools
│   ├── scrape_letterboxd.py
│   └── requirements.txt
└── 📁 .github/workflows/  # Automation
    └── scrape.yml         # GitHub Actions workflow
```

## 🔧 Configuration

### Setting up TMDb API (Optional)
1. Create a free account at [TMDb](https://www.themoviedb.org/)
2. Get your API key from account settings
3. Add it as `TMDB_API_KEY` in GitHub Secrets or environment variables

### Customization
- Modify `styles.css` to change colors and layout
- Edit `script.js` to add new chart types or statistics
- Update `scrape_letterboxd.py` to scrape additional data fields

## 🐛 Troubleshooting

### Data Not Loading
- Ensure `movies.csv` and `stats.json` are in the `data/` folder
- Check browser console for fetch errors
- Verify file paths are correct for your hosting setup

### Charts Not Displaying  
- Charts require data to render - check that CSV parsing is working
- Ensure Chart.js CDN is loading properly
- Check for JavaScript errors in browser console

### GitHub Actions Issues
- Verify repository secrets are set correctly
- Check Actions tab for workflow execution logs
- Ensure write permissions are enabled for the workflow

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Inspired by [Letterboxd](https://letterboxd.com)'s beautiful interface
- Movie data enhanced by [The Movie Database (TMDb)](https://www.themoviedb.org/)
- Charts powered by [Chart.js](https://www.chartjs.org/)

---

**Note**: This is an unofficial tool and is not affiliated with Letterboxd. Please respect Letterboxd's terms of service when using the scraper.
