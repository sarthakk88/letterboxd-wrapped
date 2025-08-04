/* ---------- GLOBALS ---------- */
let movieData   = [];
let filtered    = [];
let statsData   = {};
let charts      = {};

/* Letterboxd colour palette for charts */
const chartColors = [
    '#00d735', '#ff8000', '#40bcf4', '#ff6b6b', '#4ecdc4',
    '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'
];

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        showLoading(true);
        await loadCSV();
        await loadStats();
        filtered = [...movieData];          // default = all movies
        bindUI();
        updateDiaryTab();                   // initial view
        showLoading(false);
    } catch (e) {
        console.error(e);
        handleDataLoadError();
    }
}

/* ---------- LOADING STATE ---------- */
function showLoading(show) {
    document.getElementById('loading-screen').style.display = show ? 'flex' : 'none';
    document.getElementById('main-content' ).style.display = show ? 'none' : 'block';
}

/* ---------- DATA LOADERS ---------- */
function loadCSV() {
    return new Promise((res, rej) => {
        Papa.parse('data/movies.csv', {
            download       : true,
            header         : true,
            skipEmptyLines : true,
            complete({data}) {
                if (!data.length) return rej('CSV empty');
                movieData = data.map(r => ({
                    title      : r.title      || '',
                    year       : +r.year      || 0,
                    director   : r.director   || 'Unknown',
                    genre      : r.genre      || 'Unknown',
                    rating     : +r.rating    || 0,
                    watch_date : new Date(r.watch_date || r['Watch Date']),
                    runtime    : +r.runtime   || 90,
                    country    : r.country    || 'Unknown'
                })).filter(m => !isNaN(m.watch_date));
                res();
            },
            error: rej
        });
    });
}

async function loadStats() {
    try {
        const r = await fetch('data/stats.json');
        if (r.ok) statsData = await r.json();
    } catch { statsData = {}; }
}

/* ---------- UI BINDINGS ---------- */
function bindUI() {
    // tab switching
    document.querySelectorAll('.tab-btn').forEach(b =>
        b.addEventListener('click', () => switchTab(b.dataset.tab))
    );
    // date filter
    document.getElementById('filterStart').addEventListener('change', applyFilters);
    document.getElementById('filterEnd'  ).addEventListener('change', applyFilters);
    document.querySelector('.filter-button').addEventListener('click', applyFilters);
    document.querySelector('.clear-filters').addEventListener('click', clearFilters);
}

/* ---------- FILTERS ---------- */
function applyFilters() {
    const s = document.getElementById('filterStart').value;
    const e = document.getElementById('filterEnd'  ).value;
    if (!s && !e) return alert('Select at least one date');

    const start = s ? new Date(s) : null;
    const end   = e ? new Date(e) : null;

    filtered = movieData.filter(m => {
        const d = m.watch_date;
        return (!start || d >= start) && (!end || d <= end);
    });

    document.getElementById('filterStatus').textContent =
        `Filtered: ${start ? 'from '+start.toLocaleDateString() : ''} ${end ? 'to '+end.toLocaleDateString() : ''}`;
    document.getElementById('filterStatus').classList.add('active');

    refreshActiveTab();
}

function clearFilters() {
    document.getElementById('filterStart').value = '';
    document.getElementById('filterEnd'  ).value = '';
    document.getElementById('filterStatus').classList.remove('active');
    filtered = [...movieData];
    refreshActiveTab();
}

/* ---------- TAB HANDLING ---------- */
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab===tab));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id===`${tab}-tab`));
    refreshActiveTab();
}

function refreshActiveTab() {
    if (document.getElementById('diary-tab').classList.contains('active'))   updateDiaryTab();
    if (document.getElementById('stats-tab').classList.contains('active'))   updateStatsTab();
    if (document.getElementById('lists-tab').classList.contains('active'))   updateListsTab();
}

/* ---------- DIARY TAB ---------- */
function updateDiaryTab() {
    updateStatCards();
    updateDiaryCharts();
    updateDirectors();
    updateRecent();
}

function updateStatCards() {
    const total = filtered.length;
    const avg   = total ? (filtered.reduce((s,m)=>s+m.rating,0)/total).toFixed(1) : 0;
    const mins  = filtered.reduce((s,m)=>s+m.runtime,0);
    const hrs   = Math.round(mins/60);

    document.getElementById('films-this-period').textContent = total;
    document.getElementById('films-all-time' ).textContent    = movieData.length;
    document.getElementById('average-rating' ).textContent    = avg;
    document.getElementById('total-watch-time').textContent   = `${hrs}h`;
}

function chart(id,type,labels,data,colorArr){
    if(charts[id]) charts[id].destroy();
    charts[id]=new Chart(document.getElementById(id),{
        type, data:{labels,datasets:[{
            data, label:type==='line'?'':undefined,
            backgroundColor: colorArr,
            borderColor:    colorArr,
            fill:type==='line', tension:0.4
        }]},
        options:{responsive:true, maintainAspectRatio:false,
            plugins:{legend:{display:type==='pie',labels:{color:'#fff'}}},
            scales:type==='pie'?{}:{
                x:{ticks:{color:'#fff'},grid:{color:'rgba(255,255,255,0.1)'}},
                y:{ticks:{color:'#fff'},grid:{color:'rgba(255,255,255,0.1)'}}
            }}
    });
}

function updateDiaryCharts(){
    /* Genre */
    const gCount={}; filtered.forEach(m=>m.genre.split(',').forEach(g=>{
        g=g.trim(); if(g&&g!=='Unknown') gCount[g]=(gCount[g]||0)+1;
    }));
    const gL=Object.entries(gCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
    chart('genre-pie-chart','pie',gL.map(e=>e[0]),gL.map(e=>e[1]),chartColors);

    /* Rating */
    const rCount={1:0,2:0,3:0,4:0,5:0}; filtered.forEach(m=>{
        const r=Math.ceil(m.rating); if(r) rCount[r]++;
    });
    chart('rating-bar-chart','bar',Object.keys(rCount),Object.values(rCount),[chartColors[0]]);

    /* Monthly Count / Minutes */
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const cnt=new Array(12).fill(0), min=new Array(12).fill(0);
    filtered.forEach(m=>{
        const idx=m.watch_date.getMonth();
        cnt[idx]++; min[idx]+=m.runtime;
    });
    chart('monthly-count-chart','line',months,cnt,[chartColors[1]]);
    chart('monthly-minutes-chart','line',months,min,[chartColors[2]]);
}

function topDirectors(data){
    const map={}; data.forEach(m=>{
        m.director.split(',').forEach(d=>{
            d=d.trim(); if(d&&d!=='Unknown') map[d]=(map[d]||0)+1;
        });
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
}
function updateDirectors(){
    renderList('directors-this-period',topDirectors(filtered));
    renderList('directors-all-time',   topDirectors(movieData));
}
function updateRecent(){
    renderMovies('recent-activity',[...filtered].sort((a,b)=>b.watch_date-a.watch_date).slice(0,5));
}

/* ---------- STATS TAB ---------- */
function updateStatsTab(){
    /* Decades */
    const map={}; filtered.forEach(m=>{
        if(!m.year) return;
        const d=Math.floor(m.year/10)*10;
        if(!map[d]) map[d]={sum:0,cnt:0};
        map[d].sum+=m.rating; map[d].cnt++;
    });
    const dec=Object.entries(map).map(([d,v])=>[d, (v.sum/v.cnt).toFixed(1)])
              .sort((a,b)=>b[1]-a[1]).slice(0,5);
    renderList('top-decades',dec,true);

    /* Genre & Country */
    const g=topCounts(filtered,'genre'  ,8);
    const c=topCounts(filtered,'country',10);
    renderList('genre-breakdown',g);
    renderList('country-count',  c);
}
function topCounts(data,key,limit){
    const map={}; data.forEach(m=>{
        m[key].split(',').forEach(v=>{
            v=v.trim(); if(v&&v!=='Unknown') map[v]=(map[v]||0)+1;
        });
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,limit);
}

/* ---------- LISTS TAB ---------- */
function updateListsTab(){
    const year=new Date().getFullYear();
    const thisYear=filtered.filter(m=>m.watch_date.getFullYear()===year)
                           .sort((a,b)=>b.rating-a.rating).slice(0,10);
    const allTime =[...filtered].sort((a,b)=>b.rating-a.rating).slice(0,10);
    renderMovies('top-rated-this-period',thisYear);
    renderMovies('top-rated-all-time',   allTime);
}

/* ---------- RENDER HELPERS ---------- */
function renderList(id,arr,stars=false){
    document.getElementById(id).innerHTML = arr.map(([n,v])=>`
        <div class="list-row">
            <span>${n}</span>
            <span>${stars?'★ '+v:v} ${stars?'':'film'+(v>1?'s':'')}</span>
        </div>`).join('');
}
function renderMovies(id,arr){
    document.getElementById(id).innerHTML = arr.map(m=>`
        <div class="movie-item">
            <span>${m.title}</span>
            <span>★ ${m.rating}</span>
        </div>`).join('');
}

/* ---------- ERROR UI ---------- */
function handleDataLoadError() {
    document.getElementById('main-content').innerHTML = `
        <div style="text-align:center;padding:4rem;">
            <h2>Data Loading Error</h2>
            <p>Could not load movie data. Make sure <code>data/movies.csv</code> and
               <code>data/stats.json</code> are present and you're using a local server.</p>
            <button onclick="location.reload()" class="filter-button">Retry</button>
        </div>`;
}
