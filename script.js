// script.js
document.addEventListener('DOMContentLoaded', () => new Dashboard());

class Dashboard {
  constructor() {
    this.movies = [];
    this.stats = {};
    this.filtered = null;
    this.tmdbKey = null; // Set if available
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
    const [csvText, stats] = await Promise.all([
      fetch('data/movies.csv').then(r=>r.text()),
      fetch('data/stats.json').then(r=>r.json())
    ]);
    this.stats = stats;
    this.movies = this.parseCSV(csvText).map(m => {
      if (!m.runtime || m.runtime==0) m.runtime = 100;
      return m;
    });
    document.getElementById('last-updated').textContent = `Last updated: ${this.format(stats.last_updated)}`;
  }

  parseCSV(txt) {
    const [hdr, ...lines] = txt.trim().split('\n');
    const keys = hdr.split(',');
    return lines.map(line => {
      const vals = [], q=false, cur='', inQ=false;
      for (let ch of line) {
        if (ch==='\"') inQ=!inQ;
        else if (ch===',' && !inQ) { vals.push(cur); cur=''; }
        else cur+=ch;
      }
      vals.push(cur);
      const obj = {};
      keys.forEach((k,i)=>obj[k]=vals[i].replace(/^"|"$/g,''));
      obj.runtime = +obj.runtime;
      obj.cast = obj.cast?obj.cast.split(';'):[];
      return obj;
    });
  }

  setupTabs() {
    document.querySelectorAll('.tab').forEach(btn=>{
      btn.onclick = () => {
        document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
        document.getElementById(btn.dataset.tab).classList.add('active');
      };
    });
  }

  setupFilter() {
    const s = document.getElementById('startDate'), e = document.getElementById('endDate');
    document.getElementById('applyFilter').onclick = () => {
      if(!s.value||!e.value||new Date(s.value)>new Date(e.value)) return;
      this.filtered = this.movies.filter(m=>{
        const d=new Date(m.watch_date);
        return d>=new Date(s.value)&&d<=new Date(e.value);
      });
      this.renderDiary();
    };
    document.getElementById('clearFilter').onclick = () => {
      this.filtered = null; document.getElementById('startDate').value=''; document.getElementById('endDate').value='';
      this.renderDiary();
    };
  }

  getMovies() { return this.filtered || this.movies; }

  // ---- Diary Tab ----
  renderDiary() {
    const m = this.getMovies(), yr=new Date().getFullYear();
    document.getElementById('films-this-year').textContent = m.filter(x=>x.watch_date.startsWith(yr)).length;
    document.getElementById('films-all-time').textContent = m.length;
    const rates = m.map(x=>+x.rating).filter(r=>r);
    document.getElementById('avg-rating').textContent = rates.length?(rates.reduce((a,b)=>a+b)/rates.length).toFixed(1):'–';
    const total = m.reduce((a,x)=>a + x.runtime,0);
    document.getElementById('total-watch-time').textContent = total;

    this.renderChart(m,'genreChart', x=>x.genre.split(',').map(g=>g.trim()), 'doughnut');
    this.renderChart(m,'ratingChart', x=>[+x.rating.toFixed(1)], 'bar');
    this.renderMonthly(m,'monthlyCountChart',1);
    this.renderMonthly(m,'monthlyMinutesChart',2);

    this.renderTop(m,'directors-year', x=>x.director,yr);
    this.renderTop(m,'directors-all', x=>x.director);
    this.renderTop(m,'cast-year', x=>x.cast,yr);
    this.renderTop(m,'cast-all', x=>x.cast);

    const rec = m.sort((a,b)=>new Date(b.watch_date)-new Date(a.watch_date)).slice(0,8);
    document.getElementById('recent-activity').innerHTML = rec.map(x=>
      `<div>${x.title} (${x.year}) • ${x.rating}★ • ${x.runtime}min</div>`
    ).join('');
  }

  renderChart(m,el,fn,type) {
    const dist={};
    m.forEach(x=>fn(x).forEach(v=>v&&(dist[v]=(dist[v]||0)+1)));
    const ctx = document.getElementById(el).getContext('2d');
    if(this[el]) this[el].destroy();
    this[el] = new Chart(ctx,{type,data:{labels:Object.keys(dist),datasets:[{data:Object.values(dist),backgroundColor:'#00d735'}]}});
  }

  renderMonthly(m,el,mode) {
    const arr=Array(12).fill(0),yr=new Date().getFullYear();
    m.forEach(x=>{if(x.watch_date.startsWith(yr)){const mo=new Date(x.watch_date).getMonth();arr[mo]+=mode===1?1:x.runtime;}});
    const ctx=document.getElementById(el).getContext('2d');
    if(this[el]) this[el].destroy();
    this[el]=new Chart(ctx,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],datasets:[{data:arr,borderColor:'#00d735',backgroundColor:'rgba(0,215,53,0.2)',fill:true}]}});
  }

  renderTop(m,el,fn,yr) {
    const cnt={}, arr = m.filter(x=>!yr||x.watch_date.startsWith(yr)).flatMap(x=>fn(x));
    arr.forEach(v=>v&&(cnt[v]=(cnt[v]||0)+1));
    const top = Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,5);
    document.getElementById(el).innerHTML = top.map(d=>`<div>${d[0]} (${d[1]})</div>`).join('');
  }

  // ---- Stats Tab ----
  renderStats() {
    const m=this.getMovies();
    // decades
    const dc={},dr={};
    m.forEach(x=>{ if(x.year&&x.rating){const d=Math.floor(+x.year/10)*10;dc[d]=(dc[d]||0)+1;dr[d]=dr[d]||[];dr[d].push(+x.rating);} });
    document.getElementById('decades-list').innerHTML = Object.keys(dc).map(d=>
      `<div>${d}s: ${(dr[d].reduce((a,b)=>a+b,0)/dr[d].length).toFixed(1)}★ (${dc[d]})</div>`
    ).join('');

    // genre breakdown
    this.renderChart(m,'genre-breakdown', x=>x.genre.split(',').map(g=>g.trim()), 'bar');

    // country count
    this.renderChart(m,'country-count', x=>[x.country], 'bar');
  }

  // ---- List Tab ----
  renderList() {
    const m=this.getMovies(), yr=new Date().getFullYear();
    const top = (arr) => arr.sort((a,b)=>b.rating-a.rating).slice(0,5);
    const thisY = top(m.filter(x=>x.watch_date.startsWith(yr)));
    const all = top(m);
    document.getElementById('top-rated-year').innerHTML = thisY.map(x=>`<div>${x.title} (${x.rating}★)</div>`).join('');
    document.getElementById('top-rated-all').innerHTML = all.map(x=>`<div>${x.title} (${x.rating}★)</div>`).join('');
  }

  format(d) { return new Date(d).toLocaleDateString(); }
}
