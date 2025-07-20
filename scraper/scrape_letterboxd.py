#!/usr/bin/env python3
"""
Letterboxd Data Scraper for GitHub Pages Dashboard
Scrapes user data from Letterboxd and outputs CSV and JSON files
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

class LetterboxdScraper:
    def __init__(self, username):
        self.username = username
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

    def get_page(self, url, max_retries=3):
        """Fetch a page with retry logic and rate limiting"""
        for attempt in range(max_retries):
            try:
                # Add random delay to avoid rate limiting
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
            
            # Extract stats from the profile
            stats = {}
            
            # Films watched
            films_stat = soup.find('a', href=f'/{self.username}/films/')
            if films_stat:
                films_text = films_stat.get_text(strip=True)
                films_count = re.findall(r'\d+', films_text.replace(',', ''))
                if films_count:
                    stats['total_films'] = int(films_count[0])
            
            # This year count
            current_year = datetime.now().year
            stats['films_this_year'] = 0  # Will be calculated from diary data
            
            # Default values
            stats.update({
                'total_films': stats.get('total_films', 0),
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

    def scrape_diary(self, pages=5):
        """Scrape diary entries from multiple pages"""
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
                        self.movies_data.append(movie_data)
                
                print(f"Scraped {len(diary_entries)} entries from page {page}")
                
            except Exception as e:
                print(f"Error scraping diary page {page}: {e}")
                continue

    def extract_movie_from_diary_entry(self, entry):
        """Extract movie data from a diary entry row"""
        try:
            movie_data = {}
            
            # Get movie title and year
            title_cell = entry.find('td', class_='td-film-details')
            if title_cell:
                title_link = title_cell.find('a')
                if title_link:
                    movie_data['title'] = title_link.get('title', '').strip()
                    
                    # Extract year from title or href
                    href = title_link.get('href', '')
                    year_match = re.search(r'-(\d{4})/?$', href)
                    if year_match:
                        movie_data['year'] = year_match.group(1)
                    else:
                        # Try to get year from title text
                        year_match = re.search(r'\((\d{4})\)', movie_data['title'])
                        if year_match:
                            movie_data['year'] = year_match.group(1)
                            movie_data['title'] = re.sub(r'\s*\(\d{4}\)', '', movie_data['title'])
            
            # Get watch date
            date_cell = entry.find('td', class_='td-calendar')
            if date_cell:
                date_link = date_cell.find('a')
                if date_link and date_link.get('href'):
                    # Extract date from href like "/username/films/diary/for/2023/03/15/"
                    date_match = re.search(r'/(\d{4})/(\d{2})/(\d{2})/', date_link.get('href'))
                    if date_match:
                        year, month, day = date_match.groups()
                        movie_data['watch_date'] = f"{year}-{month}-{day}"
            
            # Get rating
            rating_cell = entry.find('td', class_='td-rating')
            if rating_cell:
                rating_span = rating_cell.find('span', class_='rating')
                if rating_span:
                    # Rating is usually in class name like 'rating-green-4' for 4 stars
                    class_list = rating_span.get('class', [])
                    for class_name in class_list:
                        if 'rating-' in class_name:
                            rating_match = re.search(r'rating-\w+-(\d+)', class_name)
                            if rating_match:
                                # Convert to 5-star scale (Letterboxd uses 10-star internally)
                                rating_value = int(rating_match.group(1))
                                movie_data['rating'] = str(rating_value / 2.0)
            
            # Only return if we have essential data
            if movie_data.get('title') and movie_data.get('watch_date'):
                # Set defaults for missing data
                movie_data.setdefault('year', '')
                movie_data.setdefault('rating', '')
                movie_data.setdefault('director', '')
                movie_data.setdefault('genre', '')
                
                return movie_data
            
        except Exception as e:
            print(f"Error extracting movie data from diary entry: {e}")
        
        return None

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
        
        # Genre distribution (placeholder - would need additional scraping)
        genre_dist = {
            'Drama': len([m for m in self.movies_data if 'drama' in m.get('genre', '').lower()]),
            'Comedy': len([m for m in self.movies_data if 'comedy' in m.get('genre', '').lower()]),
            'Action': len([m for m in self.movies_data if 'action' in m.get('genre', '').lower()]),
            'Thriller': len([m for m in self.movies_data if 'thriller' in m.get('genre', '').lower()]),
            'Sci-Fi': len([m for m in self.movies_data if 'sci-fi' in m.get('genre', '').lower()]),
            'Horror': len([m for m in self.movies_data if 'horror' in m.get('genre', '').lower()])
        }
        
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
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Save movies to CSV
        csv_path = os.path.join(output_dir, 'movies.csv')
        if self.movies_data:
            with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['title', 'year', 'director', 'genre', 'rating', 'watch_date']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for movie in self.movies_data:
                    # Ensure all required fields exist
                    row = {field: movie.get(field, '') for field in fieldnames}
                    writer.writerow(row)
            
            print(f"Saved {len(self.movies_data)} movies to {csv_path}")
        
        # Save stats to JSON
        json_path = os.path.join(output_dir, 'stats.json')
        with open(json_path, 'w', encoding='utf-8') as jsonfile:
            json.dump(self.stats_data, jsonfile, indent=2, ensure_ascii=False)
        
        print(f"Saved statistics to {json_path}")

    def run_scraper(self, pages=5):
        """Run the complete scraping process"""
        print(f"Starting Letterboxd scraper for user: {self.username}")
        
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
    """Main function to run the scraper"""
    # Get username from environment variable or command line argument
    username = os.getenv('LETTERBOXD_USERNAME')
    
    if not username and len(sys.argv) > 1:
        username = sys.argv[1]
    
    if not username:
        print("Error: Please provide a Letterboxd username")
        print("Usage: python scrape_letterboxd.py <username>")
        print("Or set LETTERBOXD_USERNAME environment variable")
        sys.exit(1)
    
    # Create and run scraper
    scraper = LetterboxdScraper(username)
    scraper.run_scraper(pages=10)  # Scrape up to 10 pages of diary entries


if __name__ == "__main__":
    main()
