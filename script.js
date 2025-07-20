// script.js

document.addEventListener('DOMContentLoaded', () => new Dashboard());

class Dashboard {
  constructor() {
    this.movies = [];
    this.stats = {};
    this.filtered = null;
    this.tmdbKey = null; // Set your TMDb API key here or leave null
    this.charts = {};
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupTabs();
    this.setupFilter();
    this.renderDiary();
    this.renderStats();
    this.renderList();
  }

  async loadData() {
    try {
      const [csvText, stats] = await Promise.all([
        fetch('data/movies.csv').then(r => r.text()),
        fetch('data/stats.json').then(r => r.json())
      ]);
      this.stats = stats;
      this.movies = this.parseCSV(csvText).map(m => {
        if (!m.runtime || m.runtime == 0) m.runtime = 100; // Default runtime
        return m;
      });
      document.getElementById('last-updated').textContent = `Last updated: ${this.format(stats.last_updated)}`;
    } catch {
      // Show empty data or sample, if desired
      this.stats = {};
      this.movies = [];
      document.getElementById('last-updated').textContent = 'Unable to load data';
    }
  }

  parseCSV(txt) {
    const [header, ...lines] = txt.trim().split('\n');
    const keys = header.split(',');
    return lines.map(line => {
      const values = [];
      let cur = '', inQuotes = false;
      for (let ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === ',' && !inQuotes) {
          values.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      values.push(cur);
      const obj = {};
      keys.forEach((k, i) => (obj[k] = values[i] ? values[i].replace(/^"|"$/g, '') : ''));
      obj.runtime = Number(obj.runtime);
      obj.cast = obj.cast ? obj.cast.split(';') : [];
      return obj;
    });
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        contents.forEach(c => c.classList.remove('active'));
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });
  }

  setupFilter() {
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    const applyBtn = document.getElementById('applyFilter');
    const clearBtn = document.getElementById('clearFilter');
    const filterStatus = document.getElementById('filterStatus');

    applyBtn.onclick = () => {
      if (!startInput.value || !endInput.value) return;
      if (new Date(startInput.value) > new Date(endInput.value)) return;
      this.filtered = this.movies.filter(movie => {
        if (!movie.watch_date) return false;
        const d = new Date(movie.watch_date);
        return d >= new Date(startInput.value) && d <= new Date(endInput.value);
      });
      filterStatus.textContent = `Showing ${this.filtered.length} films`;
      this.renderDiary();
      this.renderStats();
      this.renderList();
    };

    clearBtn.onclick = () => {
      this.filtered = null;
      startInput.value = '';
      endInput.value = '';
      filterStatus.textContent = '';
      this.renderDiary();
      this.renderStats();
      this.renderList();
    };
  }

  getFilteredMovies() {
    return this.filtered || this.movies;
  }

  // ==== Diary Tab ====
  renderDiary() {
    const movies = this.getFilteredMovies();
    const currentYear = new Date().getFullYear();

    // Films this year & all time
    const filmsThisYear = movies.filter(m => m.watch_date.startsWith(currentYear.toString())).length;
    document.getElementById('films-this-year').textContent = filmsThisYear;
    document.getElementById('films-all-time').textContent = movies.length;

    // Average rating
    const ratings = movies.map(m => +m.rating).filter(r => !isNaN(r) && r > 0);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b) / ratings.length).toFixed(1) : '–';
    document.getElementById('avg-rating').textContent = avgRating;

    // Total watch time
    const totalWatchTime = movies.reduce((a, m) => a + (m.runtime || 100), 0); // fallback 100
    document.getElementById('total-watch-time').textContent = totalWatchTime;

    // Charts
    this.renderDoughnutChart('genreChart', this.countByGenre(movies));
    this.renderBarChart('ratingChart', this.countByRating(movies));
    this.renderLineChart('monthlyCountChart', this.countByMonth(movies, false));
    this.renderLineChart('monthlyMinutesChart', this.countByMonth(movies, true));

    // Leaders
    this.renderTopList('directors-year', this.countLeaders(movies, 'director', true));
    this.renderTopList('directors-all', this.countLeaders(movies, 'director', false));
    this.renderTopList('cast-year', this.countLeaders(movies, 'cast', true));
    this.renderTopList('cast-all', this.countLeaders(movies, 'cast', false));

    // Recent activity
    const recent = [...movies].sort((a,b) => new Date(b.watch_date) - new Date(a.watch_date)).slice(0, 10);
    document.getElementById('recent-activity').innerHTML = recent.map(movie => 
      `<div><strong>${movie.title} (${movie.year})</strong> — ${movie.rating}★ — ${movie.runtime || 100} min</div>`).join('');
  }

  countByGenre(movies) {
    const counts = {};
    movies.forEach(m => {
      if (!m.genre) return;
      m.genre.split(',').forEach(g => {
        const gtrim = g.trim();
        if (gtrim) counts[gtrim] = (counts[gtrim] || 0) + 1;
      });
    });
    return counts;
  }

  countByRating(movies) {
    const counts = { '0.5':0,'1.0':0,'1.5':0,'2.0':0,'2.5':0,'3.0':0,'3.5':0,'4.0':0,'4.5':0,'5.0':0 };
    movies.forEach(m => {
      const r = parseFloat(m.rating).toFixed(1);
      if (r in counts) counts[r] += 1;
    });
    return counts;
  }

  countByMonth(movies, minutes = false) {
    const counts = new Array(12).fill(0);
    const currentYear = new Date().getFullYear();
    movies.forEach(m => {
      if (m.watch_date && m.watch_date.startsWith(currentYear.toString())) {
        const month = new Date(m.watch_date).getMonth();
        counts[month] += minutes ? (m.runtime || 100) : 1;
      }
    });
    return counts;
  }

  countLeaders(movies, field, thisYearOnly) {
    const currentYear = new Date().getFullYear();
    const counts = {};
    movies.forEach(m => {
      if (thisYearOnly && !m.watch_date.startsWith(currentYear.toString())) return;
      if (!m[field]) return;
      if (Array.isArray(m[field])) {
        m[field].forEach(val => {
          if (val) counts[val] = (counts[val] || 0) + 1;
        });
      } else if (m[field]) {
        counts[m[field]] = (counts[m[field]] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
  }

  renderTopList(containerID, topEntries) {
    document.getElementById(containerID).innerHTML = topEntries.length ? 
      topEntries.map(([name, count]) => `<div>${name} (${count})</div>`).join('') : 
      '<div>No data</div>';
  }

  // Chart helpers
  renderDoughnutChart(id, data) {
    const ctx = document.getElementById(id).getContext('2d');
    if (this.charts[id]) this.charts[id].destroy();
    this.charts[id] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(data),
        datasets: [{ data: Object.values(data), backgroundColor: this.getColors(Object.keys(data).length) }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  renderBarChart(id, data) {
    const ctx = document.getElementById(id).getContext('2d');
    if (this.charts[id]) this.charts[id].destroy();
    this.charts[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(data),
        datasets: [{ label: 'Count', data: Object.values(data), backgroundColor: '#00d735' }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  renderLineChart(id, data) {
    const ctx = document.getElementById(id).getContext('2d');
    if (this.charts[id]) this.charts[id].destroy();
    this.charts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        datasets: [{ label: 'Count', data: data, borderColor: '#00d735', backgroundColor: 'rgba(0,215,53,0.2)', fill: true, tension: 0.3 }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  getColors(count) {
    const palette = ['#00d735','#4ade80','#22c55e','#16a34a','#15803d','#166534','#0f4932','#084d2a','#0a623d','#115124'];
    return palette.slice(0, count);
  }

  // ==== Stats Tab ====
  renderStats() {
    const m = this.getFilteredMovies();

    // Top rated decades
    const decades = {};
    m.forEach(film => {
      const y = parseInt(film.year);
      if (!isNaN(y) && film.rating) {
        const decade = Math.floor(y / 10) * 10;
        if (!decades[decade]) decades[decade] = { total: 0, count: 0 };
        decades[decade].total += parseFloat(film.rating);
        decades[decade].count++;
      }
    });
    const decadesArr = Object.entries(decades).map(([decade, val]) => ({ decade: decade + 's', avgRating: val.total / val.count, count: val.count }));
    decadesArr.sort((a,b) => b.avgRating - a.avgRating);
    document.getElementById('decades-list').innerHTML = decadesArr.map(d => `<div>${d.decade}: ${d.avgRating.toFixed(2)}★ (${d.count})</div>`).join('') || 'No data';

    // Genre breakdown (reuse renderBarChart)
    const genres = {};
    m.forEach(film => {
      if (film.genre) film.genre.split(',').forEach(g => {
          const gg = g.trim();
          if (gg) genres[gg] = (genres[gg] || 0) + 1;
      });
    });
    this.renderBarChart('genre-breakdown', genres);

    // Country count (reuse renderBarChart)
    const countries = {};
    m.forEach(film => {
      if (film.country) countries[film.country] = (countries[film.country] || 0) + 1;
    });
    this.renderBarChart('country-count', countries);
  }

  // ==== List Tab ====
  renderList() {
    const m = this.getFilteredMovies();
    const year = new Date().getFullYear();

    function topRated(arr) {
      return arr.filter(f => f.rating && +f.rating>0).sort((a,b)=>b.rating - a.rating).slice(0, 10);
    }

    const topYear = topRated(m.filter(f => f.watch_date && f.watch_date.startsWith(year.toString())));
    const topAll = topRated(m);

    document.getElementById('top-rated-year').innerHTML = topYear.map(f => `<div>${f.title} (${f.rating}★)</div>`).join('') || 'No data';
    document.getElementById('top-rated-all').innerHTML = topAll.map(f => `<div>${f.title} (${f.rating}★)</div>`).join('') || 'No data';
  }

  format(dateString) {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }

  getFilteredMovies() {
    return this.filtered || this.movies;
  }
}
