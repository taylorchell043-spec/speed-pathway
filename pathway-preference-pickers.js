(()=>{
'use strict';
const states=[['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']];
const levels=[['D1','NCAA Division I'],['D2','NCAA Division II'],['D3','NCAA Division III'],['NAIA','NAIA'],['JUCO','Junior college / NJCAA']];
const sizes=[['Small','Small'],['Medium','Medium'],['Large','Large']];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function parse(raw,opts){const tokens=String(raw||'').split(/[,;|]/).map(s=>s.trim().toLowerCase()).filter(Boolean);return opts.filter(([code,name])=>tokens.some(t=>t===code.toLowerCase()||t===name.toLowerCase()||(code==='JUCO'&&['njcaa','junior college','two-year'].includes(t)))).map(([code])=>code)}
function make(id,items,legend,filterable=false){
 const input=document.getElementById(id);if(!input||input.dataset.multiReady)return;input.dataset.multiReady='1';
 const wrap=document.createElement('div');wrap.className='speedMulti';wrap.innerHTML='<fieldset style="border:1px solid #42614b;border-radius:12px;padding:13px;margin:7px 0 14px"><legend style="padding:0 6px;font-weight:700">'+legend+'</legend>'+(filterable?'<input type="search" class="speedMultiSearch" placeholder="Search all 50 states" aria-label="Search states" style="width:100%;padding:11px;margin-bottom:10px;border-radius:8px;border:1px solid #536b58;background:#102017;color:white">':'')+'<div class="speedMultiGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:7px;max-height:'+(filterable?'265px':'none')+';overflow:auto">'+items.map(([code,name])=>'<label data-search="'+esc((code+' '+name).toLowerCase())+'" style="display:flex;gap:9px;align-items:center;border:1px solid #405947;padding:9px;border-radius:8px;cursor:pointer;font-size:14px"><input type="checkbox" value="'+esc(code)+'" style="width:18px;height:18px;accent-color:#3aa85f;flex-shrink:0"><span>'+esc(name)+'</span></label>').join('')+'</div><div class="speedMultiCount" style="font-size:13px;color:#b5cbbb;margin-top:10px"></div></fieldset>';
 if(input.tagName==='SELECT'){const hidden=document.createElement('input');hidden.type='hidden';hidden.id=id;hidden.value=input.value;input.replaceWith(hidden);hidden.after(wrap)}else{input.type='hidden';input.after(wrap)}
 const field=document.getElementById(id);field.dataset.multiReady='1';const checks=[...wrap.querySelectorAll('input[type="checkbox"]')];
 const update=()=>{field.value=checks.filter(x=>x.checked).map(x=>x.value).join(', ');wrap.querySelector('.speedMultiCount').textContent=checks.filter(x=>x.checked).length+' selected';field.dispatchEvent(new Event('change',{bubbles:true}))};
 checks.forEach(x=>x.addEventListener('change',update));
 const search=wrap.querySelector('.speedMultiSearch');if(search)search.addEventListener('input',()=>{const q=search.value.toLowerCase().trim();wrap.querySelectorAll('[data-search]').forEach(x=>x.style.display=x.dataset.search.includes(q)?'flex':'none')});
 function sync(){const selected=parse(field.value,items);checks.forEach(x=>x.checked=selected.includes(x.value));wrap.querySelector('.speedMultiCount').textContent=selected.length+' selected'}
 sync();
 // Existing pathway script populates its inputs after authentication.
 const obs=new MutationObserver(()=>sync());obs.observe(field,{attributes:true,attributeFilter:['value']});
 field.addEventListener('speed-prefs-loaded',sync);
 wrap.dataset.sync='1';return sync;
}
function install(){const p=document.getElementById('pathway');if(!p)return;make('prefStates',states,'Preferred states (choose as many as you like)',true);make('prefLevels',levels,'College softball levels (select multiple)');make('prefSize',sizes,'School sizes (select multiple)');}
document.addEventListener('click',e=>{if(e.target.closest('[data-page="pathway"]'))setTimeout(install,100)});
setInterval(install,900);
})();