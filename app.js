const PC={anthropic:'#f97316',google:'#3b82f6',google2:'#4285f4',perplexity:'#8b5cf6',groq:'#eab308',ollama:'#22c55e',openclaw:'#6b7280',openrouter:'#e879f9'};

function todayEST(){
  try{
    const p={};
    new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'})
      .formatToParts(new Date()).forEach(x=>{p[x.type]=x.value});
    return p.year+'-'+p.month+'-'+p.day;
  }catch(e){
    const n=new Date(); const est=new Date(n.getTime()-5*3600000);
    return est.toISOString().slice(0,10);
  }
}
function addD(s,n){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function dRange(a,b){const r=[];let c=a;while(c<=b){r.push(c);c=addD(c,1)}return r}
function fmt$(n){if(n==null||n===0)return'$0.00';if(n<.005)return'$'+n.toFixed(4);return'$'+n.toFixed(2)}
function fmtT(n){if(!n)return'0';return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':n.toLocaleString()}

const TODAY=todayEST();

// Provider → models map
const provModelMap={};
USAGE_DATA.forEach(r=>{
  if(!provModelMap[r.provider])provModelMap[r.provider]=new Set();
  provModelMap[r.provider].add(r.model);
});
if(typeof HOURLY_DATA!=='undefined'){
  HOURLY_DATA.forEach(r=>{
    if(!provModelMap[r.provider])provModelMap[r.provider]=new Set();
    provModelMap[r.provider].add(r.model);
  });
}
const allProv=Object.keys(provModelMap).sort();
const allMod=[...new Set(USAGE_DATA.map(r=>r.model))].sort();

// Daily totals: date -> {provider -> cost}
const DM={};
USAGE_DATA.forEach(r=>{if(!DM[r.date])DM[r.date]={};DM[r.date][r.provider]=(DM[r.date][r.provider]||0)+r.cost_usd});

let chartDays=7, view='daily', sCol=null, sDir=1, cPage=0, pSize=25;

// ─── CARDS ────────────────────────────────────────────────────
function buildCards(){
  const td=USAGE_DATA.filter(r=>r.date===TODAY);
  const tCost=td.reduce((s,r)=>s+r.cost_usd,0);
  const tTok=td.reduce((s,r)=>s+(r.total_tokens||0),0);
  const p7=dRange(addD(TODAY,-7),addD(TODAY,-1));
  const a7=p7.reduce((s,d)=>s+Object.values(DM[d]||{}).reduce((a,v)=>a+v,0),0)/7;
  const p30=dRange(addD(TODAY,-30),addD(TODAY,-1));
  const a30=p30.reduce((s,d)=>s+Object.values(DM[d]||{}).reduce((a,v)=>a+v,0),0)/30;
  const byM={};td.forEach(r=>{byM[r.model]=(byM[r.model]||0)+r.cost_usd});
  const top=Object.entries(byM).sort((a,b)=>b[1]-a[1])[0];

  document.getElementById('ts').textContent=new Date(GENERATED_AT).toLocaleString();
  document.getElementById('cards').innerHTML=
    '<div class="card"><div class="lbl">Today ('+TODAY+')</div><div class="val'+(tCost>80?' warn':'')+'">'+fmt$(tCost)+'</div><div class="det">'+fmtT(tTok)+' tokens</div></div>'+
    '<div class="card"><div class="lbl">7-Day Avg <span style="color:#484f58;font-size:.9em">(excl today)</span></div><div class="val">'+fmt$(a7)+'</div><div class="det">per day</div></div>'+
    '<div class="card"><div class="lbl">30-Day Avg <span style="color:#484f58;font-size:.9em">(excl today)</span></div><div class="val">'+fmt$(a30)+'</div><div class="det">per day · incl zero days</div></div>'+
    '<div class="card"><div class="lbl">Top Model Today</div><div class="val" style="font-size:1em;word-break:break-all">'+(top?top[0]:'—')+'</div><div class="det">'+(top?fmt$(top[1])+' spent':'no data yet')+'</div></div>';
}

// ─── CHART ───────────────────────────────────────────────────
function setRange(d){
  chartDays=d;
  document.querySelectorAll('#chart-tog button').forEach(function(b,i){b.classList.toggle('on',d===7?i===0:i===1)});
  buildChart();
}

function buildChart(){
  var dates=dRange(addD(TODAY,-(chartDays-1)),TODAY).reverse();
  var tots=dates.map(function(d){return Object.values(DM[d]||{}).reduce(function(s,v){return s+v},0)});
  var mx=Math.max.apply(null,tots.filter(function(v){return v>0}).concat([1]));

  document.getElementById('legend').innerHTML=allProv.map(function(p){
    return '<div class="legend-item"><div class="legend-dot" style="background:'+(PC[p]||'#666')+'"></div>'+p+'</div>';
  }).join('');

  var h='';
  dates.forEach(function(dt,i){
    var tot=tots[i], isT=(dt===TODAY), z=(tot===0);
    var bars='';
    if(z){
      bars='<div style="height:100%;width:2px;background:#30363d"></div>';
    }else{
      var off=0;
      allProv.forEach(function(p){
        var v=(DM[dt]||{})[p]||0;
        if(v>0){
          bars+='<div class="bar-fill" style="left:'+(off/mx*100).toFixed(2)+'%;width:'+(v/mx*100).toFixed(2)+'%;background:'+(PC[p]||'#666')+'" title="'+p+': '+fmt$(v)+'"></div>';
          off+=v;
        }
      });
    }
    h+='<div class="bar-row"><div class="bar-dt'+(isT?' today':'')+'">'+dt+(isT?' ★':'')+'</div><div class="bar-track">'+bars+'</div><div class="bar-val'+(z?' zero':'')+'">'+( z?'—':fmt$(tot))+'</div></div>';
  });
  document.getElementById('chart').innerHTML=h;
}

// ─── PROVIDER→MODEL CASCADE ──────────────────────────────────
function rebuildModelDropdown(selProv){
  var fm=document.getElementById('fm');
  var prev=fm.value;
  fm.innerHTML='<option value="">All Models</option>';
  var models=selProv?[...(provModelMap[selProv]||[])].sort():allMod;
  models.forEach(function(m){
    var o=new Option(m,m);
    if(m===prev)o.selected=true;
    fm.add(o);
  });
}
function onProviderChange(){
  rebuildModelDropdown(document.getElementById('fp').value);
  onFilterChange();
}
function onFilterChange(){cPage=0;render()}

// ─── TABLE VIEW ──────────────────────────────────────────────
function setView(v){
  view=v; cPage=0; sCol=null; sDir=1;
  document.querySelectorAll('#view-tog button').forEach(function(b,i){b.classList.toggle('on',v==='daily'?i===0:i===1)});

  var hDaily='<tr><th onclick="srt(\'date\',this)">Date</th><th onclick="srt(\'provider\',this)">Provider</th><th onclick="srt(\'model\',this)">Model</th><th onclick="srt(\'call_count\',this)" style="text-align:right">Calls</th><th onclick="srt(\'total_tokens\',this)" style="text-align:right">Tokens</th><th onclick="srt(\'cost_usd\',this)" style="text-align:right">Cost</th></tr>';
  var hHourly='<tr><th onclick="srt(\'date\',this)">Date</th><th onclick="srt(\'hour\',this)" style="text-align:right">Hour</th><th onclick="srt(\'provider\',this)">Provider</th><th onclick="srt(\'model\',this)">Model</th><th onclick="srt(\'call_count\',this)" style="text-align:right">Calls</th><th onclick="srt(\'total_tokens\',this)" style="text-align:right">Tokens</th><th onclick="srt(\'cost_usd\',this)" style="text-align:right">Cost</th></tr>';

  document.getElementById('thead').innerHTML=(v==='daily'?hDaily:hHourly);
  render();
}

function getData(){
  var src=(view==='daily')?USAGE_DATA:(typeof HOURLY_DATA!=='undefined'?HOURLY_DATA:[]);
  var d=src.slice(); // copy
  var fp=document.getElementById('fp').value;
  var fm=document.getElementById('fm').value;
  var d1=document.getElementById('fd1').value;
  var d2=document.getElementById('fd2').value;
  if(fp) d=d.filter(function(r){return r.provider===fp});
  if(fm) d=d.filter(function(r){return r.model===fm});
  if(d1) d=d.filter(function(r){return r.date>=d1});
  if(d2) d=d.filter(function(r){return r.date<=d2});
  if(sCol){
    d.sort(function(a,b){
      var av=a[sCol]!=null?a[sCol]:'';
      var bv=b[sCol]!=null?b[sCol]:'';
      if(typeof av==='string') return av.localeCompare(bv)*sDir;
      return (av-bv)*sDir;
    });
  }
  return d;
}

function renderRow(r){
  if(view==='daily'){
    return '<tr>'+
      '<td>'+(r.date||'—')+'</td>'+
      '<td><span class="pb pb-'+(r.provider||'')+'">'+(r.provider||'—')+'</span></td>'+
      '<td>'+(r.model||'—')+'</td>'+
      '<td class="n">'+(r.call_count||0).toLocaleString()+'</td>'+
      '<td class="n">'+fmtT(r.total_tokens||0)+'</td>'+
      '<td class="n">'+fmt$(r.cost_usd||0)+'</td>'+
      '</tr>';
  } else {
    return '<tr>'+
      '<td>'+(r.date||'—')+'</td>'+
      '<td class="n">'+(r.hour!=null?String(r.hour).padStart(2,'0')+':00':'—')+'</td>'+
      '<td><span class="pb pb-'+(r.provider||'')+'">'+(r.provider||'—')+'</span></td>'+
      '<td>'+(r.model||'—')+'</td>'+
      '<td class="n">'+(r.call_count||0).toLocaleString()+'</td>'+
      '<td class="n">'+fmtT(r.total_tokens||0)+'</td>'+
      '<td class="n">'+fmt$(r.cost_usd||0)+'</td>'+
      '</tr>';
  }
}

function render(){
  var d=getData(), total=d.length, st=cPage*pSize;
  var page=d.slice(st, st+pSize);

  document.getElementById('pi').textContent=
    total===0?'No records':(st+1)+'–'+Math.min(st+pSize,total)+' of '+total;
  document.getElementById('bp').disabled=(cPage===0);
  document.getElementById('bn').disabled=(st+pSize>=total);

  if(total===0){
    var cols=view==='daily'?6:7;
    document.getElementById('tbody').innerHTML=
      '<tr><td colspan="'+cols+'" class="empty-state">No data matches the current filters</td></tr>';
    return;
  }

  document.getElementById('tbody').innerHTML=page.map(renderRow).join('');
}

function pg(d){cPage+=d;render()}

function srt(col,el){
  if(sCol===col) sDir*=-1;
  else{sCol=col;sDir=-1}
  cPage=0;
  document.querySelectorAll('th').forEach(function(t){t.classList.remove('sa','sd')});
  if(el) el.classList.add(sDir===1?'sa':'sd');
  render();
}

function clrF(){
  document.getElementById('fp').value='';
  document.getElementById('fm').value='';
  document.getElementById('fd1').value='';
  document.getElementById('fd2').value='';
  rebuildModelDropdown('');
  cPage=0;
  render();
}

// ─── MODAL ───────────────────────────────────────────────────
function openM(){document.getElementById('ov').classList.add('open')}
function closeM(){document.getElementById('ov').classList.remove('open')}
document.getElementById('ov').addEventListener('click',function(e){if(e.target.id==='ov')closeM()});

// ─── INIT ───────────────────────────────────────────────────
(function(){
  var fpS=document.getElementById('fp');
  allProv.forEach(function(p){fpS.add(new Option(p,p))});
  rebuildModelDropdown('');
  buildCards();
  buildChart();
  setView('daily');
})();
