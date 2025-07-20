// script.js

class LetterboxdDashboard {
    constructor() {
        this.data = { movies: [], stats: {} };
        this.charts = {};
        this.filteredMovies = null;
        this.tmdbApiKey = null; // Set your TMDb API key here or via env
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.setupNavigation();
            this.setupDateFilter();
            this.updateStats();
            this.updateDirectors();
            this.createCharts();
            this.updateGoals();
            this.updateRecentActivity();
            this.updateLastUpdated();
            this.setupStatsPage();
            this.setupListsPage();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError();
        }
    }

    // ---------------- Navigation ----------------
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const pages = document.querySelectorAll('.page-content');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const target = item.dataset.page;
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                pages.forEach(p => p.classList.remove('active'));
                document.getElementById(`${target}-page`).classList.add('active');
                if (target === 'stats') this.updateStatsPage();
                if (target === 'lists') this.updateListsPage();
            });
        });
    }

    // ---------------- Date Filter ----------------
    setupDateFilter() {
        const start = document.getElementById('startDate');
        const end = document.getElementById('endDate');
        document.getElementById('applyFilter').onclick = () => {
            if (!start.value || !end.value) return;
            if (new Date(start.value) > new Date(end.value)) return;
            this.filteredMovies = this.data.movies.filter(m => {
                const d = new Date(m.watch_date);
                return d >= new Date(start.value) && d <= new Date(end.value);
            });
            this.updateAllViews();
            document.getElementById('filterStatus').textContent =
                `Showing ${this.filteredMovies.length} films`;
        };
        document.getElementById('clearFilter').onclick = () => {
            this.filteredMovies = null;
            document.getElementById('filterStatus').textContent = '';
            start.value = end.value = '';
            this.updateAllViews();
        };
    }

    // ---------------- Data Loading & TMDb ----------------
    async loadData() {
        try {
            const [csvText, stats] = await Promise.all([
                fetch('data/movies.csv').then(r => r.text()),
                fetch('data/stats.json').then(r => r.json())
            ]);
            this.data.stats = stats;
            this.data.movies = this.parseCSV(csvText);
            if (this.tmdbApiKey) await this.enhanceMoviesWithTMDB();
            document.getElementById('last-updated').textContent =
                `Last updated: ${this.formatDate(stats.last_updated)}`;
        } catch {
            this.data = this.getSampleData();
        }
    }

    parseCSV(txt) {
        const lines = txt.trim().split('\n');
        const headers = lines.shift().split(',');
        return lines.map(line => {
            const vals = [];
            let cur = '', inQ = false;
            for (let ch of line) {
                if (ch === '"') inQ = !inQ;
                else if (ch === ',' && !inQ) { vals.push(cur); cur = ''; }
                else cur += ch;
            }
            vals.push(cur);
            const m = {};
            headers.forEach((h,i) => m[h] = vals[i].replace(/^"|"$/g,''));
            m.runtime = +m.runtime || 0;
            m.cast = m.cast ? m.cast.split(';') : [];
            return m;
        });
    }

    async enhanceMoviesWithTMDB() {
        const toEnhance = this.data.movies.filter(m => !m.director || !m.genre);
        for (let movie of toEnhance.slice(0,50)) {
            await this.enrichMovie(movie);
            await new Promise(r => setTimeout(r,100));
        }
    }

    async enrichMovie(m) {
        try {
            const search = await fetch(
                `https://api.themoviedb.org/3/search/movie?api_key=${this.tmdbApiKey}` +
                `&query=${encodeURIComponent(m.title)}&year=${m.year}`
            ).then(r => r.json());
            if (!search.results?.length) return;
            const id = search.results[0].id;
            const details = await fetch(
                `https://api.themoviedb.org/3/movie/${id}` +
                `?api_key=${this.tmdbApiKey}&append_to_response=credits,release_dates`
            ).then(r => r.json());
            m.runtime = details.runtime || m.runtime;
            m.genre = details.genres?.map(g => g.name).join(', ') || m.genre;
            m.country = details.production_countries?.[0]?.name || '';
            m.director = details.credits.crew.find(c => c.job === 'Director')?.name || m.director;
            m.cast = details.credits.cast.slice(0,3).map(c => c.name);
        } catch (e) { console.warn(e) }
    }

    getMovies() { return this.filteredMovies || this.data.movies; }

    // ---------------- Update Views ----------------
    updateAllViews() {
        this.updateStats();
        this.updateDirectors();
        this.updateCharts();
        this.updateGoals();
        this.updateRecentActivity();
    }

    updateStats() {
        const m = this.getMovies();
        const year = new Date().getFullYear();
        const yearCount = m.filter(x => x.watch_date.startsWith(year)).length;
        document.getElementById('movies-this-year').textContent = yearCount;
        document.getElementById('total-movies').textContent = m.length;
        const rates = m.map(x => +x.rating).filter(r=>r);
        document.getElementById('average-rating').textContent =
            rates.length ? (rates.reduce((a,b)=>a+b)/rates.length).toFixed(1) : '–';
        const totalMin = m.reduce((a,x)=>a+x.runtime,0);
        document.getElementById('total-runtime').textContent = totalMin;
    }

    updateDirectors() {
        const m = this.getMovies();
        const year = new Date().getFullYear();
        const cntAll={}, cntYear={};
        m.forEach(x => {
            if (x.director) {
                cntAll[x.director]=(cntAll[x.director]||0)+1;
                if (x.watch_date.startsWith(year)) cntYear[x.director]=(cntYear[x.director]||0)+1;
            }
        });
        const top5 = o => Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,5);
        document.getElementById('top-directors-year').innerHTML =
            top5(cntYear).map(d=>`<div class="director-item"><span>${d[0]}</span><span>${d[1]}</span></div>`).join('');
        document.getElementById('top-directors-all').innerHTML =
            top5(cntAll).map(d=>`<div class="director-item"><span>${d[0]}</span><span>${d[1]}</span></div>`).join('');
    }

    createCharts() {
        this.createGenreChart();
        this.createRatingChart();
        this.createMonthlyChart();
    }

    updateCharts() {
        Object.values(this.charts).forEach(c=>c?.destroy());
        this.charts={};
        this.createCharts();
    }

    createGenreChart() {
        const m = this.getMovies();
        const dist={};
        m.forEach(x => x.genre.split(',').forEach(g=>{
            const t=g.trim(); if (t) dist[t]=(dist[t]||0)+1;
        }));
        const ctx=document.getElementById('genreChart').getContext('2d');
        if (this.charts.genre) this.charts.genre.destroy();
        this.charts.genre = new Chart(ctx,{
            type:'doughnut',
            data:{labels:Object.keys(dist), datasets:[{data:Object.values(dist),
                backgroundColor:['#00d735','#4ade80','#22c55e','#16a34a','#15803d','#166534']}]}
        });
    }

    createRatingChart() {
        const m=this.getMovies();
        const buckets={'0.5':0,'1.0':0,'1.5':0,'2.0':0,'2.5':0,'3.0':0,'3.5':0,'4.0':0,'4.5':0,'5.0':0};
        m.forEach(x=>{const r=parseFloat(x.rating).toFixed(1); if (buckets[r]!=null) buckets[r]++});
        const ctx=document.getElementById('ratingChart').getContext('2d');
        if (this.charts.rating) this.charts.rating.destroy();
        this.charts.rating=new Chart(ctx,{
            type:'bar',
            data:{labels:Object.keys(buckets), datasets:[{data:Object.values(buckets), backgroundColor:'#00d735'}]}
        });
    }

    createMonthlyChart() {
        const m=this.getMovies(), arr=Array(12).fill(0), y=new Date().getFullYear();
        m.forEach(x=> x.watch_date.startsWith(y) && arr[new Date(x.watch_date).getMonth()]++);
        const ctx=document.getElementById('monthlyChart').getContext('2d');
        if (this.charts.monthly) this.charts.monthly.destroy();
        this.charts.monthly=new Chart(ctx,{
            type:'line',
            data:{labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                  datasets:[{data:arr,borderColor:'#00d735',backgroundColor:'rgba(0,215,53,0.2)',fill:true}]}
        });
    }

    updateGoals() {
        const m=this.getMovies(), d=new Date(), cm=d.getMonth(), cy=d.getFullYear();
        const cmCount=m.filter(x=>{const dt=new Date(x.watch_date);return dt.getMonth()===cm&&dt.getFullYear()===cy}).length;
        const yCount=m.filter(x=>x.watch_date.startsWith(cy)).length;
        const mGoal=10, yGoal=100;
        const mp=Math.min(cmCount/mGoal*100,100), yp=Math.min(yCount/yGoal*100,100);
        document.getElementById('monthly-progress').style.width=mp+'%';
        document.getElementById('monthly-progress-text').textContent=`${cmCount}/${mGoal}`;
        document.getElementById('yearly-progress').style.width=yp+'%';
        document.getElementById('yearly-progress-text').textContent=`${yCount}/${yGoal}`;
    }

    updateRecentActivity() {
        const m=this.getMovies()
            .sort((a,b)=>new Date(b.watch_date)-new Date(a.watch_date)).slice(0,8);
        const c=document.getElementById('recent-movies');
        c.innerHTML=m.map(x=>`
            <div class="recent-film">
              <div class="film-info">
                <div class="title">${x.title} (${x.year})</div>
                <div class="meta">
                  ${x.cast.join(', ')} • ${x.country} • ${x.runtime} min • ${this.formatDate(x.watch_date)}
                </div>
              </div>
            </div>`).join('');
    }

    // -------- Stats Page --------
    setupStatsPage() { this.updateStatsPage(); }
    updateStatsPage() {
        const m=this.getMovies();
        this.updateDecades(m);
        this.updateGenresBreakdown(m);
        this.updateCountriesList(m);
        this.updateRuntimeAnalysis(m);
    }
    updateDecades(m) {
        const dc={}, dr={};
        m.forEach(x=>{ if(x.year&&x.rating){
            const d=Math.floor(+x.year/10)*10;
            dc[d]=(dc[d]||0)+1; dr[d]=dr[d]||[]; dr[d].push(+x.rating);
        }});
        const stats=Object.keys(dc).map(d=>({decade:`${d}s`,count:dc[d],avg:dr[d].reduce((a,b)=>a+b,0)/dr[d].length}))
            .sort((a,b)=>b.avg-a.avg);
        document.getElementById('decades-list').innerHTML=stats.map(s=>`
            <div class="stat-item"><span>${s.decade}</span><span>${s.avg.toFixed(1)}★ (${s.count})</span></div>
        `).join('');
    }
    updateGenresBreakdown(m) {
        const dist={};
        m.forEach(x=>x.genre.split(',').forEach(g=>{const t=g.trim(); if(t)dist[t]=(dist[t]||0)+1}));
        const top=Object.entries(dist).sort((a,b)=>b[1]-a[1]).slice(0,10);
        document.getElementById('genres-breakdown').innerHTML=top.map(([g,c])=>`
            <div class="stat-item"><span>${g}</span><span>${c}</span></div>
        `).join('');
    }
    updateCountriesList(m) {
        const dist={};
        m.forEach(x=>{if(x.country)dist[x.country]=(dist[x.country]||0)+1});
        const top=Object.entries(dist).sort((a,b)=>b[1]-a[1]).slice(0,10);
        document.getElementById('countries-list').innerHTML=top.map(([c,n])=>`
            <div class="stat-item"><span>${c}</span><span>${n}</span></div>
        `).join('');
    }
    updateRuntimeAnalysis(m) {
        const rt=m.reduce((a,x)=>a+x.runtime,0), avg= m.length? (rt/m.length).toFixed(1):0; 
        document.getElementById('runtime-analysis').innerHTML=`
            <div class="stat-item"><span>Total Runtime</span><span>${Math.floor(rt/60)}h</span></div>
            <div class="stat-item"><span>Avg Runtime</span><span>${avg}min</span></div>
        `;
    }

    // -------- Lists Page --------
    setupListsPage() { this.updateListsPage(); }
    updateListsPage() {
        const m=this.getMovies();
        this.updateTopRated(m);
        this.updateRecentFavs(m);
        this.updateGenreLists(m);
    }
    updateTopRated(m) {
        const top=m.filter(x=>+x.rating>=4).sort((a,b)=>b.rating-a.rating).slice(0,10);
        document.getElementById('top-rated-list').innerHTML=top.map(x=>`
            <div class="list-item"><span>${x.title}</span><span>${x.rating}★</span></div>
        `).join('');
    }
    updateRecentFavs(m) {
        const recent=m.filter(x=>+x.rating>=4).sort((a,b)=>new Date(b.watch_date)-new Date(a.watch_date)).slice(0,10);
        document.getElementById('recent-favorites-list').innerHTML=recent.map(x=>`
            <div class="list-item"><span>${x.title}</span><span>${this.formatDate(x.watch_date)}</span></div>
        `).join('');
    }
    updateGenreLists(m) {
        const dist={};
        m.forEach(x=>x.genre.split(',').forEach(g=>{const t=g.trim(); if(t)dist[t]=(dist[t]||0)+1}));
        const top=Object.entries(dist).sort((a,b)=>b[1]-a[1]).slice(0,5);
        document.getElementById('genre-lists').innerHTML=top.map(([g,c])=>`
            <div class="genre-list-item"><h4>${g}</h4><p>${c} films</p></div>
        `).join('');
    }

    // ---------------- Helpers ----------------
    formatDate(d) { const dt=new Date(d); return dt.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }
    showError() {
        document.querySelector('.dashboard-grid').innerHTML = `
            <div class="error-card">
                <h2>Unable to Load Data</h2>
                <p>Check your data files and refresh.</p>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => new LetterboxdDashboard());
