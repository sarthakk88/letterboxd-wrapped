#!/usr/bin/env python3
"""
Enhanced Letterboxd Scraper with TMDb Data Enrichment

Features:
- Scrapes your Letterboxd diary entries (dates, titles, ratings)
- Remembers “grouped” month/year headers when absent on rows
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
        self.session.headers.update({'User-Agent': 'Mozilla/5.0'})
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
        for _ in range(3):
            try:
                time.sleep(random.uniform(1, 2))
                resp = self.session.get(url, timeout=10)
                resp.raise_for_status()
                return resp.text
            except:
                continue
        return ""

    def scrape_profile_stats(self):
        html = self.get_page(self.base_url)
        soup = BeautifulSoup(html, 'html.parser')
        films_link = soup.find('a', href=f'/{self.username}/films/')
        if films_link:
            count = re.sub(r'[^\d]', '', films_link.text)
            if count:
                self.stats['total_films'] = int(count)
        self.stats['last_updated'] = datetime.utcnow().isoformat()

    def scrape_diary(self, pages=15):
        for page in range(1, pages + 1):
            url = f"{self.base_url}/films/diary/page/{page}/"
            html = self.get_page(url)
            if not html:
                break
            rows = BeautifulSoup(html, 'html.parser').find_all('tr', class_='diary-entry-row')
            if not rows:
                break
            for entry in rows:
                movie = self.parse_entry(entry)
                print(f"Processing entry: {movie['title']} ({movie['watch_date']})")
                if movie:
                    self.enrich_with_tmdb(movie)
                    self.movies.append(movie)

    def parse_entry(self, entry):
        # Check if month/year cell is populated
        month_cell = entry.find('td', class_='col-monthdate')
        if month_cell:
            month_link = month_cell.find('a', class_='month')
            year_link = month_cell.find('a', class_='year')
            if month_link:
                self.current_month = month_link.text.strip()
            if year_link:
                self.current_year = year_link.text.strip()

        # Ensure we have valid month/year from state
        if not self.current_month or not self.current_year:
            return None

        # Day
        day = ''
        day_cell = entry.find('td', class_='col-daydate')
        if day_cell:
            day_link = day_cell.find('a', class_='daydate')
            if day_link:
                day = day_link.text.strip()

        if not day:
            return None

        # Build watch_date
        try:
            watch_date = datetime.strptime(
                f"{day} {self.current_month} {self.current_year}", "%d %b %Y"
            ).date().isoformat()
        except Exception:
            return None

        # Title & year
        title = ''
        film_year = ''
        production_td = entry.find('td', class_='col-production')
        if production_td:
            h2 = production_td.find('h2', class_='name')
            if h2 and h2.find('a'):
                title = h2.find('a').text.strip()

            release_span = production_td.find('span', class_='releasedate')
            if release_span and release_span.find('a'):
                film_year = release_span.find('a').text.strip()

        # Rating
        rating = ''
        rating_td = entry.find('td', class_='col-rating')
        if rating_td:
            input_tag = rating_td.find('input', class_='rateit-field')
            if input_tag and input_tag.has_attr('value'):
                try:
                    val = int(input_tag['value'])
                    if val > 0:
                        rating = str(val / 2.0)
                except ValueError:
                    pass

        return {
            'title': title,
            'year': film_year,
            'watch_date': watch_date,
            'rating': rating,
            'director': '',
            'genre': '',
            'runtime': 0,
            'country': '',
            'cast': []
        }

    def enrich_with_tmdb(self, movie):
        if not self.tmdb_key:
            return
        # TMDb search
        try:
            search = requests.get(
                "https://api.themoviedb.org/3/search/movie",
                params={'api_key': self.tmdb_key, 'query': movie['title'], 'year': movie['year']},
                timeout=5
            ).json()
            results = search.get('results') or []
            if not results:
                return
            tmdb_id = results[0]['id']
            # Details + credits + production_countries
            details = requests.get(
                f"https://api.themoviedb.org/3/movie/{tmdb_id}",
                params={'api_key': self.tmdb_key, 'append_to_response': 'credits,release_dates'},
                timeout=5
            ).json()
            # Runtime
            movie['runtime'] = details.get('runtime', 0) or 0
            # Genres
            genres = details.get('genres', [])
            movie['genre'] = ', '.join(g['name'] for g in genres)
            # Country
            countries = details.get('production_countries', [])
            movie['country'] = countries[0]['name'] if countries else ''
            # Director
            crew = details.get('credits', {}).get('crew', [])
            for member in crew:
                if member.get('job') == 'Director':
                    movie['director'] = member['name']
                    break
            # Top 3 cast
            cast = details.get('credits', {}).get('cast', [])
            # Sort cast members by popularity (descending) and pick top 3
            top_cast = sorted(cast, key=lambda c: c.get('popularity', 0), reverse=True)[:3]

            # Save top 3 names as a list of strings
            movie['cast'] = [c.get('name', '') for c in top_cast]
            time.sleep(0.1)
        except Exception:
            pass

    def calc_stats(self):
        year_now = datetime.utcnow().year
        # films this year
        year_films = [m for m in self.movies if m['watch_date'].startswith(str(year_now))]
        self.stats['films_this_year'] = len(year_films)
        # average rating
        ratings = [float(m['rating']) for m in self.movies if m['rating']]
        self.stats['average_rating'] = round(sum(ratings) / len(ratings), 1) if ratings else 0.0
        # total runtime
        total_min = sum(m['runtime'] for m in self.movies)
        self.stats['total_runtime'] = total_min
        # total films
        self.stats['total_films'] = len(self.movies)

    def save(self):
        os.makedirs('data', exist_ok=True)
        # movies.csv
        with open('data/movies.csv', 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'title', 'year', 'director', 'genre',
                'rating', 'watch_date', 'runtime', 'country', 'cast'
            ])
            for m in self.movies:
                writer.writerow([
                    m['title'], m['year'], m['director'], m['genre'],
                    m['rating'], m['watch_date'], m['runtime'],
                    m['country'], m['cast']
                ])
        # stats.json
        with open('data/stats.json', 'w', encoding='utf-8') as f:
            json.dump(self.stats, f, indent=2)

    def run(self):
        self.scrape_profile_stats()
        self.scrape_diary()
        self.calc_stats()
        self.save()

if __name__ == "__main__":
    username = os.getenv('LETTERBOXD_USERNAME') or (sys.argv[1] if len(sys.argv) > 1 else '')
    if not username:
        print("Error: Provide Letterboxd username via env LETTERBOXD_USERNAME or as argument.")
        sys.exit(1)
    tmdb_key = os.getenv('TMDB_API_KEY')
    scraper = EnhancedScraper(username, tmdb_key)
    scraper.run()
