# Letterboxd Dashboard Tracker

A beautiful, Letterboxd-inspired dashboard that displays comprehensive movie statistics with interactive visualizations. This project creates a personal dashboard to track and visualize your movie watching habits with an authentic Letterboxd design.

## 🎬 Features

### Dashboard Tabs

#### **Diary Tab**
Your complete movie watching statistics including:
- Films watched this year vs all time
- Average rating and total watch time  
- Genre and rating distribution charts
- Monthly activity tracking (count and minutes)
- Top directors and cast members (this year and all time)
- Recent activity feed with latest watches

#### **Stats Tab**
Deep dive analytics featuring:
- Top rated decades analysis
- Comprehensive genre breakdown
- Country distribution statistics

#### **List Tab** 
Movie rankings and ratings:
- Top rated films (all time & this year)
- Complete with ratings and release years
- Sortable and filterable data

### 🎨 Design Features
- **Authentic Letterboxd styling** with dark theme
- **Signature green accents** (#00d735)
- **Responsive grid layouts** that work on all devices  
- **Interactive Chart.js visualizations**
- **Smooth animations and transitions**
- **No emojis** - clean, professional design
- **Date filtering** across all sections

## 🚀 Quick Start

### Option 1: Local Setup
1. Clone or download this repository
2. Open `index.html` in your browser
3. The dashboard loads with your actual movie data from `data/` folder

### Option 2: GitHub Pages Deployment  
1. Fork this repository to your GitHub account
2. Enable GitHub Pages in repository settings
3. Set up GitHub Secrets for automatic data updates:
   - `LETTERBOXD_USERNAME`: Your Letterboxd username (e.g., "sarthkk88")
   - `TMDB_API_KEY`: Your TMDb API key (optional, for enhanced metadata)

## 📊 Data Structure

The dashboard uses two main data files:

### `data/movies.csv`
Contains individual movie entries with columns:
- `title`: Movie title
- `year`: Release year
- `director`: Director name
- `genre`: Comma-separated genres
- `rating`: Your rating (0.5-5.0 stars)
- `watch_date`: Date watched (YYYY-MM-DD format)
- `runtime`: Duration in minutes
- `country`: Production country
- `cast`: Semicolon-separated main cast members

### `data/stats.json`
Contains aggregate statistics:
```json
{
  "total_films": 262,
  "films_this_year": 58, 
  "average_rating": 3.4,
  "total_runtime": 28812,
  "last_updated": "2025-07-20T13:33:16.160453"
}
```

## 🤖 Automated Data Updates

The included GitHub Actions workflow automatically:
- **Scrapes** your latest Letterboxd diary entries daily at 8:00 UTC
- **Enriches** movie data with TMDb information (directors, cast, genres, runtimes)
- **Updates** the dashboard data files (`movies.csv` and `stats.json`)  
- **Commits** changes back to your repository
- **Handles errors** gracefully with retry logic and rate limiting

## 🛠️ Technology Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js for beautiful, interactive data visualizations
- **Scraping**: Python with BeautifulSoup and requests
- **Data Enhancement**: TMDb API integration
- **Automation**: GitHub Actions for daily updates
- **Deployment**: GitHub Pages compatible

## 📁 Project Structure

```
letterboxd-tracker/
├── index.html          # Main dashboard page
├── styles.css          # Letterboxd-inspired styling  
├── script.js           # Interactive JavaScript
├── README.md           # This documentation
├── data/               # Your movie data
│   ├── movies.csv      # Individual movie entries
│   └── stats.json      # Aggregate statistics
├── scraper/            # Python scraping tools
│   ├── scrape_letterboxd.py  # Enhanced scraper with TMDb
│   └── requirements.txt       # Python dependencies  
└── .github/workflows/  # GitHub Actions automation
    └── scrape.yml      # Daily data update workflow
```

## 🔧 Local Development

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.7+ (for scraper)
- TMDb API key (optional, for enhanced data)

### Setup Steps
1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd letterboxd-tracker
   ```

2. **Install scraper dependencies** (optional)
   ```bash
   cd scraper
   pip install -r requirements.txt
   ```

3. **Configure scraper** (optional)
   - Edit `scraper/scrape_letterboxd.py` 
   - Set your Letterboxd username
   - Add TMDb API key for enhanced data

4. **Run locally**
   - Open `index.html` in your browser
   - Or use a local server: `python -m http.server 8000`

## 🎯 Key Features Explained

### Smart Data Loading
- **Robust CSV parsing** handles quoted fields and special characters
- **Fallback runtime** of 100 minutes for movies with missing data
- **Error handling** with graceful degradation
- **Real-time filtering** without page reloads

### Interactive Charts  
- **Genre distribution** doughnut chart with top 8 genres
- **Rating distribution** bar chart across all rating levels
- **Monthly activity** line charts for both count and minutes
- **Responsive design** adapts to screen size

### Date Filtering
- **Flexible date ranges** with start and/or end dates
- **Real-time updates** across all tabs and visualizations
- **Filter status display** shows current selection
- **Clear filter** button for easy reset

## 🌟 Authenticity

This dashboard closely replicates Letterboxd's visual design:
- **Color scheme**: Dark backgrounds (#14181c, #1f2937) with signature green (#00d735)
- **Typography**: Graphik-inspired font stack with proper hierarchy  
- **Card layouts**: Subtle shadows and rounded corners
- **Responsive grids**: Auto-fit layouts that scale beautifully
- **Professional polish**: No emojis, clean animations, proper spacing

## 🚀 Deployment Options

### GitHub Pages (Recommended)
1. Push code to GitHub repository
2. Enable GitHub Pages in Settings → Pages
3. Set source to "Deploy from a branch" → main
4. Your dashboard will be live at `https://yourusername.github.io/letterboxd-tracker`

### Other Platforms
- **Netlify**: Drag and drop the folder for instant deployment
- **Vercel**: Connect your GitHub repo for automatic deployments  
- **Local**: Use any web server to serve the files

## 📈 Future Enhancements

Potential additions for extended functionality:
- **Poster images** via TMDb API integration
- **Advanced filtering** by genre, rating, decade
- **Export features** for data backup
- **Multiple user profiles** for shared accounts
- **Social features** for comparing with friends
- **Watchlist tracking** and recommendations

## 🐛 Troubleshooting

### Data Not Loading
- Check browser console for errors
- Verify `data/movies.csv` and `data/stats.json` exist
- Ensure files are properly formatted
- Try clearing browser cache

### Charts Not Displaying  
- Verify Chart.js CDN is loading
- Check canvas elements exist in HTML
- Look for JavaScript errors in console
- Ensure data contains valid entries

### GitHub Actions Failing
- Check repository secrets are set correctly
- Verify Letterboxd username is valid
- Review workflow logs for specific errors
- Ensure TMDb API key is valid (if used)

## 📄 License

This project is open source and available under the MIT License. Feel free to fork, modify, and customize for your own use.

## 🙏 Acknowledgments

- **Letterboxd** for the inspiring design and movie tracking concept
- **Chart.js** for beautiful, responsive charts  
- **TMDb** for comprehensive movie metadata
- **GitHub** for free hosting and automation

---

**Happy movie tracking!** 🎬