#!/usr/bin/env python3
"""
Enhanced Letterboxd Data Scraper with TMDB Integration
Scrapes user data from Letterboxd and enhances with director/genre from TMDB
"""

import requests
from bs4 import BeautifulSoup
import csv
import json
import time
import random
from datetime import datetime, timedelta
import os
import sys
from urllib.parse import urljoin, urlparse
import re

class EnhancedLetterboxdScraper:
    def __init__(self, username, tmdb_api_key=None):
        self.username = username
        self.tmdb_api_key = tmdb_api_key
        self.base_url = f"https://letterboxd.com/{username}"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        self.movies_data = []
        self.stats_data = {}
        self.current_month = None
        self.current_year = None

    def get_page(self, url, max_retries=3):
        """Fetch a page with retry logic and rate limiting"""
        for attempt in range(max_retries):
            try:
                time.sleep(random.uniform(1, 3))
                response = self.session.get(url, timeout=10)
                response.raise_for_status()
                return response
            except requests.exceptions.RequestException as e:
                print(f"Attempt {attempt + 1} failed for {url}: {e}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(random.uniform(2, 5))

    def scrape_user_stats(self):
        """Scrape basic user statistics from profile page"""
        try:
            response = self.get_page(self.base_url)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            stats = {}
            
            # Extract stats from the profile
            films_stat = soup.find('a', href=f'/{self.username}/films/')
            if films_stat:
                films_text = films_stat.get_text(strip=True)
                films_count = re.findall(r'\d+', films_text.replace(',', ''))
                if films_count:
                    stats['total_films'] = int(films_count[0])
            
            stats.update({
                'total_films': stats.get('total_films', 0),
                'films_this_year': 0,
                'average_rating': 0.0,
                'total_runtime': 0,
                'last_updated': datetime.now().isoformat()
            })
            
            self.stats_data = stats
            print(f"Scraped basic stats: {stats}")
            
        except Exception as e:
            print(f"Error scraping user stats: {e}")
            self.stats_data = {
                'total_films': 0,
                'films_this_year': 0,
                'average_rating': 0.0,
                'total_runtime': 0,
                'last_updated': datetime.now().isoformat()
            }

    def scrape_diary(self, pages=10):
        """Scrape diary entries from multiple pages with enhanced date handling"""
        print(f"Scraping diary entries for {self.username}...")
        
        for page in range(1, pages + 1):
            try:
                diary_url = f"{self.base_url}/films/diary/page/{page}/"
                response = self.get_page(diary_url)
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find diary entries
                diary_entries = soup.find_all('tr', class_='diary-entry-row')
                
                if not diary_entries:
                    print(f"No more diary entries found on page {page}")
                    break
                
                for entry in diary_entries:
                    movie_data = self.extract_movie_from_diary_entry(entry)
                    if movie_data:
                        # Enhance with TMDB data if API key is provided
                        if self.tmdb_api_key:
                            self.enhance_movie_with_tmdb(movie_data)
                        
                        self.movies_data.append(movie_data)
                
                print(f"Scraped {len(diary_entries)} entries from page {page}")
                
            except Exception as e:
                print(f"Error scraping diary page {page}: {e}")
                continue

    def extract_movie_from_diary_entry(self, entry):
        """Enhanced extraction with better date handling"""
        try:
            # Date handling with state tracking
            cal_cell = entry.find('td', class_='td-calendar')
            if cal_cell:
                strong = cal_cell.find('strong')
                if strong:
                    self.current_month = strong.text.strip()
                small = cal_cell.find('small')
                if small:
                    self.current_year = small.text.strip()

            # Day cell
            day_cell = entry.find('td', class_='td-day')
            day = day_cell.find('a').text.strip() if day_cell and day_cell.find('a') else None

            if not (day and self.current_month and self.current_year):
                return None

            # Build ISO date
            try:
                watch_date = datetime.strptime(f"{day} {self.current_month} {self.current_year}", "%d %b %Y").date().isoformat()
            except Exception:
                watch_date = ''

            # Title & Year
            details = entry.find('td', class_='td-film-details')
            title_tag = details.find('h2', class_='name') if details else None
            title = title_tag.get_text(strip=True) if title_tag else ''
            year_tag = details.find('span', class_='releasedate') if details else None
            year = year_tag.find('a').get_text(strip=True) if year_tag and year_tag.find('a') else ''

            # Rating
            rating = ''
            rating_td = entry.find('td', class_='td-rating')
            if rating_td:
                rating_span = rating_td.find('span', class_='rating')
                if rating_span:
                    for cls in rating_span.get('class', []):
                        if cls.startswith("rated-"):
                            value = int(cls.split("-")[1])
                            rating = str(value / 2.0)

            if title and watch_date:
                return {
                    "title": title,
                    "year": year,
                    "watch_date": watch_date,
                    "rating": rating,
                    "director": "",
                    "genre": ""
                }
        except Exception as e:
            print(f"Error extracting diary row: {e}")

        return None

    def enhance_movie_with_tmdb(self, movie_data):
        """Enhance movie data with TMDB information"""
        if not self.tmdb_api_key:
            return

        try:
            # Search for movie
            search_url = f"https://api.themoviedb.org/3/search/movie"
            params = {
                'api_key': self.tmdb_api_key,
                'query': movie_data['title'],
                'year': movie_data['year']
            }
            
            response = requests.get(search_url, params=params, timeout=5)
            data = response.json()
            
            if data['results']:
                movie_id = data['results'][0]['id']
                
                # Get detailed movie information
                details_url = f"https://api.themoviedb.org/3/movie/{movie_id}"
                params = {
                    'api_key': self.tmdb_api_key,
                    'append_to_response': 'credits'
                }
                
                response = requests.get(details_url, params=params, timeout=5)
                details = response.json()
                
                # Extract director
                if 'credits' in details and 'crew' in details['credits']:
                    director = next((person['name'] for person in details['credits']['crew'] 
                                   if person['job'] == 'Director'), '')
                    if director:
                        movie_data['director'] = director
                
                # Extract genres
                if 'genres' in details and details['genres']:
                    genres = [genre['name'] for genre in details['genres']]
                    movie_data['genre'] = ', '.join(genres)
                
                print(f"Enhanced {movie_data['title']} with TMDB data")
                
                # Rate limiting for TMDB API
                time.sleep(0.1)
                
        except Exception as e:
            print(f"Error enhancing {movie_data['title']} with TMDB: {e}")

    def calculate_statistics(self):
        """Calculate comprehensive statistics from scraped data"""
        if not self.movies_data:
            return
        
        # Current year movies
        current_year = datetime.now().year
        current_year_movies = [
            movie for movie in self.movies_data 
            if movie.get('watch_date', '').startswith(str(current_year))
        ]
        
        # Calculate average rating
        rated_movies = [
            float(movie['rating']) for movie in self.movies_data 
            if movie.get('rating') and movie['rating'] != ''
        ]
        avg_rating = sum(rated_movies) / len(rated_movies) if rated_movies else 0.0
        
        # Monthly data for current year
        monthly_counts = [0] * 12
        for movie in current_year_movies:
            if movie.get('watch_date'):
                try:
                    month = int(movie['watch_date'].split('-')[1]) - 1
                    if 0 <= month < 12:
                        monthly_counts[month] += 1
                except (ValueError, IndexError):
                    continue
        
        # Genre distribution from scraped data
        genre_dist = {}
        for movie in self.movies_data:
            if movie.get('genre'):
                genres = [g.strip() for g in movie['genre'].split(',')]
                for genre in genres:
                    if genre:
                        genre_dist[genre] = genre_dist.get(genre, 0) + 1
        
        # Rating distribution
        rating_dist = {'0.5': 0, '1.0': 0, '1.5': 0, '2.0': 0, '2.5': 0, 
                      '3.0': 0, '3.5': 0, '4.0': 0, '4.5': 0, '5.0': 0}
        
        for movie in self.movies_data:
            if movie.get('rating') and movie['rating'] != '':
                try:
                    rating = str(float(movie['rating']))
                    if rating in rating_dist:
                        rating_dist[rating] += 1
                except ValueError:
                    continue
        
        # Update stats
        self.stats_data.update({
            'total_films': len(self.movies_data),
            'films_this_year': len(current_year_movies),
            'average_rating': round(avg_rating, 1),
            'total_runtime': len(self.movies_data) * 110,  # Estimate 110 min per movie
            'monthly_data': monthly_counts,
            'genre_distribution': genre_dist,
            'rating_distribution': rating_dist,
            'last_updated': datetime.now().isoformat()
        })

    def save_data(self, output_dir='data'):
        """Save scraped data to CSV and JSON files"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save movies to CSV
        csv_path = os.path.join(output_dir, 'movies.csv')
        if self.movies_data:
            with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['title', 'year', 'director', 'genre', 'rating', 'watch_date']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for movie in self.movies_data:
                    row = {field: movie.get(field, '') for field in fieldnames}
                    writer.writerow(row)
            
            print(f"Saved {len(self.movies_data)} movies to {csv_path}")
        
        # Save stats to JSON
        json_path = os.path.join(output_dir, 'stats.json')
        with open(json_path, 'w', encoding='utf-8') as jsonfile:
            json.dump(self.stats_data, jsonfile, indent=2, ensure_ascii=False)
        
        print(f"Saved statistics to {json_path}")

    def run_scraper(self, pages=10):
        """Run the complete scraping process"""
        print(f"Starting enhanced Letterboxd scraper for user: {self.username}")
        
        try:
            # Scrape basic user stats
            self.scrape_user_stats()
            
            # Scrape diary entries
            self.scrape_diary(pages)
            
            # Calculate statistics
            self.calculate_statistics()
            
            # Save data
            self.save_data()
            
            print(f"Scraping completed successfully!")
            print(f"Total movies scraped: {len(self.movies_data)}")
            
        except Exception as e:
            print(f"Error during scraping: {e}")
            # Save whatever data we have
            if self.movies_data or self.stats_data:
                self.save_data()
            raise


def main():
    """Main function to run the enhanced scraper"""
    username = os.getenv('LETTERBOXD_USERNAME')
    tmdb_api_key = os.getenv('TMDB_API_KEY')  # Add this to your GitHub Secrets
    
    if not username and len(sys.argv) > 1:
        username = sys.argv[1]
    
    if not username:
        print("Error: Please provide a Letterboxd username")
        print("Usage: python enhanced_scraper.py <username>")
        print("Or set LETTERBOXD_USERNAME environment variable")
        sys.exit(1)
    
    if tmdb_api_key:
        print("TMDB API key found - will enhance movies with director/genre data")
    else:
        print("No TMDB API key found - director/genre data will be limited to what's available")
    
    # Create and run enhanced scraper
    scraper = EnhancedLetterboxdScraper(username, tmdb_api_key)
    scraper.run_scraper(pages=15)  # Scrape more pages for better data


if __name__ == "__main__":
    main()
