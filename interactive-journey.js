(()=>{
'use strict';
const getDb=()=>{try{return typeof speedSb!=='undefined'?speedSb:window.speedSb}catch(e){return window.speedSb}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lastId='',busy=false;
async function refresh(){
 const db=getDb(),path=document.getElementById('pathway');if(!db||!path||busy)return;
 const {data:{session}}=await db.auth.getSession();if(!session)return;
 const user=session.user;
 const [profile,pathway,schools,activity]=await Promise.all([
 db.from('profiles').select('role,approved,display_name').eq('id',user.id).maybeSingle(),
 db.from('athlete_pathways').select('grad_year,completed_tasks').eq('user_id',user.id).maybeSingle(),
 db.from('pathway_school_lists').select('id,school_name,category,next_action,next_action_due').eq('user_id',user.id).limit(200),
 db.from('pathway_activity').select('id,title,due_date,completed_at,activity_type').eq('user_id',user.id).limit(300)
 ]);
 if(!profile.data?.approved)return;
 const y=pathway.data?.grad_year||null,grade=y?Math.max(8,Math.min(12,12-(y-new Date().getFullYear()))):null;
 const done=Array.isArray(pathway.data?.completed_tasks)?pathway.data.completed_tasks:[];
 const schoolRows=schools.data||[],reminders=(activity.data||[]).filter(x=>x.activity_type==='recruiting_reminder'&&!x.completed_at);
 const due=reminders.filter(x=>x.due_date&&x.due_date<=new Date().toISOString().slice(0,10));
 let hub=document.getElementById('speedInteractiveHub');if(!hub){hub=document.createElement('div');hub.id='speedInteractiveHub';path.prepend(hub)}
 const stage=grade?grade===12?'Decision year':grade>=10?'Active recruiting':'Build your foundation':'Set your graduation year';
 const first=grade?done.filter(x=>String(x).startsWith(grade+':')).length:0;
 hub.innerHTML='<style>#speedInteractiveHub{border:1px solid #3e8659;border-radius:18px;padding:19px;margin:0 0 20px;background:linear-gradient(145deg,#152d20,#0c1710)}#speedInteractiveHub .sh-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:10px;margin:15px 0}#speedInteractiveHub .sh-tile{border:1px solid #365443;border-radius:12px;padding:12px;background:#18291e}#speedInteractiveHub .sh-tile strong{font-size:24px;display:block}#speedInteractiveHub button{background:#25844b;color:white;border:0;border-radius:9px;padding:12px 15px;cursor:pointer;margin:4px}#speedInteractiveHub button.secondary{background:#2b3e31}#speedInteractiveHub .sh-notice{font-size:13px;color:#c4d5c9}</style>'+
 '<div class="muted">YOUR INTERACTIVE RECRUITING JOURNEY</div><h2 style="margin:5px 0">'+esc(profile.data.display_name||'My Road to College')+'</h2><p class="muted">'+esc(stage)+(grade?' · Grade '+grade:' · Enter your graduation year to personalize your journey')+'</p>'+
 '<div class="sh-grid"><div class="sh-tile"><strong>'+first+'</strong><span class="muted">Missions completed this grade</span></div><div class="sh-tile"><strong>'+schoolRows.length+'</strong><span class="muted">Schools saved</span></div><div class="sh-tile"><strong>'+reminders.length+'</strong><span class="muted">Active reminders</span></div><div class="sh-tile"><strong>'+due.length+'</strong><span class="muted">Due now or overdue</span></div></div>'+
 '<button id="shContinue">▶ Continue my missions</button><button id="shSchools" class="secondary">+ Build college list</button><button id="shCoach" class="secondary">✉ Track coach contact</button><button id="shProfile" class="secondary">✎ Update my profile</button>'+
 '<p class="sh-notice">Your progress comes from saved account data, not a sample score. Reminders appear in the app; external notifications are not active.</p>';
 const jump=(selector)=>{const el=document.querySelector(selector);if(el){el.scrollIntoView({behavior:'smooth',block:'start'});return true}return false};
 document.getElementById('shContinue').onclick=()=>{if(!jump('#recruitingGame'))jump('#roadmapGrade')};
 document.getElementById('shSchools').onclick=()=>{if(!jump('#schoolName'))jump('#savedSchools')};
 document.getElementById('shCoach').onclick=()=>{if(!jump('#raSchool'))jump('#recruitingAdvisor')};
 document.getElementById('shProfile').onclick=()=>{if(!jump('#prefMajor'))jump('#pathUpdate')};
 const home=document.getElementById('productionHome');
 if(home&&!document.getElementById('shHomeLaunch')){
 const launch=document.createElement('div');launch.id='shHomeLaunch';launch.style.cssText='border:1px solid #3e8659;border-radius:15px;padding:16px;margin:15px 0;background:#173022';
 launch.innerHTML='<h3 style="margin:0 0 6px">Your Road to College</h3><p class="muted">Complete recruiting missions, save colleges, plan camps and track coach outreach.</p><button id="shLaunch" style="background:#25844b;color:#fff;border:0;border-radius:9px;padding:13px 20px;cursor:pointer">▶ Continue My Journey</button>';
 home.prepend(launch);
 launch.querySelector('button').onclick=()=>{const nav=[...document.querySelectorAll('.nav button')].find(x=>x.dataset.page==='pathway');if(nav)nav.click();else{document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));path.classList.remove('hidden')}};
 }
}
function init(){setInterval(()=>{const path=document.getElementById('pathway');if(path&&!document.getElementById('speedInteractiveHub'))refresh().catch(console.warn)},1500);document.addEventListener('click',e=>{if(e.target.closest('[data-page="pathway"]')||e.target.closest('[data-prodhome]'))setTimeout(()=>refresh().catch(console.warn),400)});getDb()?.auth.onAuthStateChange(()=>setTimeout(()=>refresh().catch(console.warn),900));setTimeout(()=>refresh().catch(console.warn),1800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();