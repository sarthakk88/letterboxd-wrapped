#!/usr/bin/env python3
"""
Enhanced Letterboxd Scraper with TMDb Data Enrichment

Features:
- Scrapes your Letterboxd diary entries (dates, titles, ratings)
- Remembers "grouped" month/year headers when absent on rows
- Enriches each movie with:
    • Director
    • Genres  
    • Runtime (minutes)
    • Production country
    • Top 3 cast members
- Calculates summary stats:
    • total films
    • films this calendar year
    • average rating
    • total runtime (minutes)
- Outputs:
    • data/movies.csv
    • data/stats.json
"""

import os
import sys
import time
import random
import requests
import csv
import json
import re
from datetime import datetime
from bs4 import BeautifulSoup

class EnhancedScraper:
    def __init__(self, username, tmdb_key=None):
        self.username = username
        self.tmdb_key = tmdb_key
        self.base_url = f"https://letterboxd.com/{username}"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.movies = []
        self.stats = {
            'total_films': 0,
            'films_this_year': 0,
            'average_rating': 0.0,
            'total_runtime': 0,
            'last_updated': ''
        }
        self.current_month = None
        self.current_year = None

    def get_page(self, url):
        """Fetch a page with retry logic"""
        for attempt in range(3):
            try:
                time.sleep(random.uniform(1, 2))
                resp = self.session.get(url, timeout=10)
                resp.raise_for_status()
                return resp.text
            except Exception as e:
                print(f"Attempt {attempt + 1} failed for {url}: {e}")
                if attempt == 2:
                    return ""
                time.sleep(5)
        return ""

    def scrape_profile_stats(self):
        """Get basic profile statistics"""
        html = self.get_page(self.base_url)
        soup = BeautifulSoup(html, 'html.parser')

        # Try to extract total films count
        films_link = soup.find('a', href=f'/{self.username}/films/')
        if films_link:
            count_text = films_link.text.strip()
            count = re.sub(r'[^\d]', '', count_text)
            if count:
                self.stats['total_films'] = int(count)

        self.stats['last_updated'] = datetime.now().isoformat()

    def scrape_diary_page(self, page=1):
        """Scrape a single diary page"""
        url = f"{self.base_url}/films/diary/page/{page}/"
        html = self.get_page(url)
        if not html:
            return False

        soup = BeautifulSoup(html, 'html.parser')
        table = soup.find('table', class_='diary-table')
        if not table:
            return False

        rows = table.find('tbody').find_all('tr')
        if not rows:
            return False

        for row in rows:
            self.parse_diary_row(row)

        return len(rows) > 0

    def parse_diary_row(self, row):
        """Parse a single diary table row"""
        # Check for month/year header
        if 'diary-entry-row' not in row.get('class', []):
            date_header = row.find('td', class_='diary-day')
            if date_header:
                header_text = date_header.get_text(strip=True)
                if header_text:
                    self.current_month = header_text
            return

        # Parse actual movie entry
        movie_data = {}

        # Date
        date_cell = row.find('td', class_='diary-day')
        if date_cell:
            date_link = date_cell.find('a')
            if date_link and date_link.get('href'):
                date_parts = date_link['href'].split('/')
                if len(date_parts) >= 4:
                    year, month, day = date_parts[-4], date_parts[-3], date_parts[-2]
                    movie_data['watch_date'] = f"{year}-{month.zfill(2)}-{day.zfill(2)}"

        # Title and Year
        title_cell = row.find('td', class_='diary-film-title')
        if title_cell:
            title_link = title_cell.find('a')
            if title_link:
                movie_data['title'] = title_link.get_text(strip=True)

                # Extract year from film page link
                href = title_link.get('href', '')
                year_match = re.search(r'/film/.*?-(\d{4})/', href)
                if year_match:
                    movie_data['year'] = year_match.group(1)

        # Rating
        rating_cell = row.find('td', class_='diary-rating')
        if rating_cell:
            rating_span = rating_cell.find('span', class_='rating')
            if rating_span:
                # Count filled stars
                stars = rating_span.find_all('span', class_='icon-star')
                filled_stars = len([s for s in stars if 'icon-star-full' in s.get('class', [])])
                half_stars = len([s for s in stars if 'icon-star-half' in s.get('class', [])])
                movie_data['rating'] = filled_stars + (half_stars * 0.5)

        # Add to movies list if we have minimum required data
        if movie_data.get('title') and movie_data.get('watch_date'):
            self.movies.append(movie_data)
            print(f"Scraped: {movie_data['title']} ({movie_data.get('year', 'Unknown')}) - {movie_data.get('rating', 'Unrated')}")

    def enrich_with_tmdb(self, movie):
        """Enrich movie data using TMDb API"""
        if not self.tmdb_key:
            return movie

        try:
            # Search for movie
            search_url = "https://api.themoviedb.org/3/search/movie"
            params = {
                'api_key': self.tmdb_key,
                'query': movie['title'],
                'year': movie.get('year')
            }

            time.sleep(0.25)  # Rate limiting
            response = self.session.get(search_url, params=params)

            if response.status_code == 200:
                data = response.json()
                if data['results']:
                    movie_details = data['results'][0]
                    movie_id = movie_details['id']

                    # Get detailed movie information
                    details_url = f"https://api.themoviedb.org/3/movie/{movie_id}"
                    credits_url = f"https://api.themoviedb.org/3/movie/{movie_id}/credits"

                    details_response = self.session.get(details_url, params={'api_key': self.tmdb_key})
                    credits_response = self.session.get(credits_url, params={'api_key': self.tmdb_key})

                    if details_response.status_code == 200:
                        details = details_response.json()

                        # Add genres
                        if details.get('genres'):
                            movie['genre'] = ', '.join([g['name'] for g in details['genres']])

                        # Add runtime
                        if details.get('runtime'):
                            movie['runtime'] = details['runtime']

                        # Add country
                        if details.get('production_countries'):
                            movie['country'] = details['production_countries'][0]['name']

                    if credits_response.status_code == 200:
                        credits = credits_response.json()

                        # Add director
                        crew = credits.get('crew', [])
                        director = next((c['name'] for c in crew if c['job'] == 'Director'), '')
                        if director:
                            movie['director'] = director

                        # Add cast (top 3)
                        cast = credits.get('cast', [])[:3]
                        if cast:
                            movie['cast'] = ';'.join([actor['name'] for actor in cast])

        except Exception as e:
            print(f"TMDb enrichment failed for {movie['title']}: {e}")

        return movie

    def calculate_stats(self):
        """Calculate aggregate statistics"""
        if not self.movies:
            return

        current_year = datetime.now().year
        total_rating = 0
        rated_count = 0
        total_runtime = 0
        films_this_year = 0

        for movie in self.movies:
            # Runtime
            runtime = movie.get('runtime', 100)  # Default 100 minutes
            total_runtime += runtime

            # This year count
            if movie.get('watch_date'):
                watch_year = int(movie['watch_date'][:4])
                if watch_year == current_year:
                    films_this_year += 1

            # Rating average
            if movie.get('rating'):
                total_rating += movie['rating']
                rated_count += 1

        self.stats.update({
            'total_films': len(self.movies),
            'films_this_year': films_this_year,
            'average_rating': round(total_rating / rated_count, 1) if rated_count > 0 else 0.0,
            'total_runtime': total_runtime,
            'last_updated': datetime.now().isoformat()
        })

    def save_data(self):
        """Save data to CSV and JSON files"""
        os.makedirs('data', exist_ok=True)

        # Save movies CSV
        if self.movies:
            fieldnames = ['title', 'year', 'director', 'genre', 'rating', 'watch_date', 'runtime', 'country', 'cast']

            with open('data/movies.csv', 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                for movie in self.movies:
                    # Ensure all fields exist
                    for field in fieldnames:
                        if field not in movie:
                            movie[field] = ''
                    writer.writerow(movie)

        # Save stats JSON
        with open('data/stats.json', 'w', encoding='utf-8') as f:
            json.dump(self.stats, f, indent=2)

    def run(self):
        """Main scraping workflow"""
        print(f"Starting scrape for user: {self.username}")

        # Get profile stats
        self.scrape_profile_stats()

        # Scrape diary pages
        page = 1
        while True:
            print(f"Scraping diary page {page}...")
            has_entries = self.scrape_diary_page(page)
            if not has_entries:
                break
            page += 1

            # Limit for testing - remove in production
            if page > 10:  # Adjust as needed
                break

        print(f"Scraped {len(self.movies)} movies")

        # Enrich with TMDb data
        if self.tmdb_key:
            print("Enriching with TMDb data...")
            for i, movie in enumerate(self.movies):
                print(f"Processing {i+1}/{len(self.movies)}: {movie['title']}")
                self.movies[i] = self.enrich_with_tmdb(movie)

        # Calculate stats
        self.calculate_stats()

        # Save data
        self.save_data()

        print("✅ Scraping completed!")
        print(f"📊 Total films: {self.stats['total_films']}")
        print(f"📊 Films this year: {self.stats['films_this_year']}")
        print(f"📊 Average rating: {self.stats['average_rating']}★")
        print(f"📊 Total runtime: {self.stats['total_runtime']} minutes")

def main():
    # Configuration
    USERNAME = os.getenv('LETTERBOXD_USERNAME', 'sarthkk88')  # Default from your example
    TMDB_KEY = os.getenv('TMDB_API_KEY')  # Optional

    if not USERNAME:
        print("❌ Please set LETTERBOXD_USERNAME environment variable")
        sys.exit(1)

    scraper = EnhancedScraper(USERNAME, TMDB_KEY)
    scraper.run()

if __name__ == '__main__':
    main()