(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getDB=()=>{try{return typeof speedSb!=='undefined'?speedSb:window.speedSb}catch(e){return window.speedSb}};
const days=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const time=(x)=>x?new Date(x+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'';
const helpText={school:'Confirm the academic program, total cost, roster opportunity and location. Would you still attend without softball?',camp:'Research school fit, email the coach with video and schedule, verify positional need and class, define instruction vs evaluation goal, and follow up within 24 hours.',email:'Personalize every message. Use a working skills video, verified metrics and upcoming game schedule. Follow current recruiting communication rules.',video:'Keep recent footage concise, usually 3–5 minutes. Put skills first, show useful angles and identify the athlete.',rules:'Ask your counselor and check current NCAA/NAIA/NJCAA rules and academic requirements; dates and restrictions vary by division.'};
let client=null,user=null,role='',path=null,schoolList=[],activities=[],staffList=[];
function dueItems(grade){
 const items=[
 {id:'profile',title:'Update player profile, GPA and verified metrics',offset:0,kind:'profile'},
 {id:'schools',title:'Review your college list and academic fit',offset:7,kind:'school'},
 {id:'video',title:'Refresh skills video and upcoming tournament schedule',offset:14,kind:'video'},
 {id:'email',title:'Send a meaningful update to appropriate college coaches',offset:21,kind:'email'},
 {id:'camps',title:'Review upcoming camps at schools on your list',offset:28,kind:'camp'},
 {id:'rules',title:'Check eligibility and communication rules',offset:35,kind:'rules'}
 ];
 if(grade<=9)return items.filter(x=>!['email','camps'].includes(x.id));
 if(grade===12)return [...items,{id:'decisions',title:'Review application, financial aid and college decision deadlines',offset:7,kind:'school'}];
 return items;
}
async function context(){
 client=getDB();if(!client)return false;
 const {data:{session}}=await client.auth.getSession();if(!session)return false;user=session.user;
 const {data:p}=await client.from('profiles').select('role,approved,display_name').eq('id',user.id).maybeSingle();
 if(!p?.approved)return false;role=p.role;
 const [a,b,c]=await Promise.all([
 client.from('athlete_pathways').select('grad_year,completed_tasks').eq('user_id',user.id).maybeSingle(),
 client.from('pathway_school_lists').select('school_name,category,camp_date,camp_url,next_action,next_action_due').eq('user_id',user.id).limit(200),
 client.from('pathway_activity').select('id,activity_type,title,due_date,completed_at,metadata,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(250)
 ]);
 path=a.data||{};schoolList=b.data||[];activities=c.data||[];return true;
}
function grade(){const y=Number(path.grad_year);return y?Math.min(12,Math.max(8,12-(y-new Date().getFullYear()))):10}
function box(){const p=$('pathway');if(!p)return null;let el=$('recruitingAdvisor');if(!el){el=document.createElement('section');el.id='recruitingAdvisor';el.style.cssText='display:grid;gap:14px;margin:20px 0';p.appendChild(el)}return el}
function pending(){return activities.filter(a=>a.activity_type==='recruiting_reminder'&&!a.completed_at&&a.due_date).sort((a,b)=>a.due_date.localeCompare(b.due_date))}
function render(){
 const root=box();if(!root)return;const g=grade(),tasks=dueItems(g),alerts=pending(),overdue=alerts.filter(x=>x.due_date<days(0)),soon=alerts.filter(x=>x.due_date>=days(0)&&x.due_date<=days(14));
 const contacts=activities.filter(x=>x.activity_type==='coach_outreach');
 root.innerHTML='<style>#recruitingAdvisor .ra-card{background:#15211a;border:1px solid #344c3b;border-radius:16px;padding:18px}#recruitingAdvisor .ra-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}#recruitingAdvisor .ra-item{border:1px solid #35503e;border-radius:12px;padding:12px;margin:8px 0}#recruitingAdvisor input,#recruitingAdvisor select,#recruitingAdvisor textarea{box-sizing:border-box;max-width:100%;width:100%;padding:10px;margin:6px 0;background:#0c1710;color:#fff;border:1px solid #46604e;border-radius:7px}#recruitingAdvisor button{padding:9px 13px;border-radius:8px;cursor:pointer;margin:5px 5px 5px 0}#recruitingAdvisor .ra-muted{color:#a3b3a8;font-size:13px}#recruitingAdvisor .ra-action{background:#228448;color:white;border:0}#recruitingAdvisor .ra-warn{color:#ffd089}</style>'+
 '<div class="ra-card"><h2 style="margin:0 0 7px">Your Recruiting Assistant</h2><div class="ra-muted">Grade '+g+' · Personalized guidance based on your graduation year. Suggested dates are planning prompts, not official recruiting deadlines.</div><div class="ra-grid" style="margin-top:12px"><div><strong>'+overdue.length+'</strong><div class="ra-muted">Past-due reminders</div></div><div><strong>'+soon.length+'</strong><div class="ra-muted">Due in 14 days</div></div><div><strong>'+contacts.length+'</strong><div class="ra-muted">Coach contacts logged</div></div><div><strong>'+schoolList.length+'</strong><div class="ra-muted">Saved schools</div></div></div></div>'+
 '<div class="ra-card"><h3>Recommended Next Actions</h3><div class="ra-muted">Create a reminder from a suggested action, or choose your own date. The app does not automatically send emails or texts.</div>'+tasks.map(t=>'<div class="ra-item"><b>'+esc(t.title)+'</b><div class="ra-muted">'+esc(helpText[t.kind]||'Talk through this step with your Midwest Speed coach.')+'</div><button type="button" data-ra-plan="'+t.id+'">Schedule reminder</button></div>').join('')+'</div>'+
 '<div class="ra-card"><h3>My Reminder Center</h3>'+alerts.map(a=>'<div class="ra-item"><b>'+esc(a.title)+'</b><div class="ra-muted '+(a.due_date<days(0)?'ra-warn':'')+'">'+time(a.due_date)+(a.due_date<days(0)?' · Past due':'')+'</div><button type="button" data-ra-done="'+a.id+'">Mark done</button></div>').join('')+(alerts.length?'':'<div class="ra-muted">No pending reminders yet.</div>')+'</div>'+
 '<div class="ra-card"><h3>College Coach Communication Tracker</h3><div class="ra-muted">Log each contact, outcome and next follow-up. Athlete-led, personalized communication is the goal.</div><label>College</label><input id="raSchool" list="raSchoolOptions" placeholder="College name"><datalist id="raSchoolOptions">'+schoolList.map(s=>'<option value="'+esc(s.school_name)+'"></option>').join('')+'</datalist><label>Communication type</label><select id="raContactType"><option>Email sent</option><option>Coach replied</option><option>Phone conversation</option><option>Camp conversation</option><option>Visit conversation</option><option>Other</option></select><label>Notes / response</label><textarea id="raNotes" rows="3" placeholder="What did you learn? What happens next?"></textarea><label>Follow-up date (optional)</label><input id="raFollowup" type="date"><button type="button" class="ra-action" id="raSaveContact">Save coach contact</button><div class="ra-muted" id="raSaveMsg"></div><h4>Recent contacts</h4>'+contacts.slice(0,12).map(a=>'<div class="ra-item"><b>'+esc(a.metadata?.school||'College')+'</b> · '+esc(a.metadata?.contact_type||'Contact')+'<div class="ra-muted">'+time(a.created_at?.slice(0,10))+' · '+esc(a.metadata?.notes||'')+'</div></div>').join('')+(contacts.length?'':'<div class="ra-muted">No contacts recorded yet.</div>')+'</div>'+
 '<div class="ra-card"><h3>Camp Decision Helper</h3><div class="ra-muted">Use this before paying for a camp. No fixed camp count is right for every athlete.</div><label>School is on my researched list <input type="checkbox" id="raCampFit"></label><label>I have sent the coach my profile, video and schedule <input type="checkbox" id="raCampEmail"></label><label>I have researched roster needs for my position and class <input type="checkbox" id="raCampNeed"></label><label>I know whether my goal is instruction or evaluation <input type="checkbox" id="raCampGoal"></label><button type="button" id="raCampCheck">Evaluate this camp</button><div id="raCampResult" class="ra-muted"></div><p class="ra-muted">Seminar guidance: research first, prepare three coach questions, bring an updated video and schedule, and follow up within 24 hours after attending.</p></div>'+
 (['coach','admin','super_admin'].includes(role)?'<div class="ra-card"><h3>Midwest Speed Recruiting Oversight</h3><div class="ra-muted">Staff-only view of athlete accounts and follow-up needs.</div><button type="button" id="raStaffLoad">Load athlete recruiting overview</button><div id="raStaffResult"></div></div>':'');
 root.querySelectorAll('[data-ra-plan]').forEach(b=>b.onclick=()=>{const t=tasks.find(x=>x.id===b.dataset.raPlan);if(!t)return;const date=prompt('Target date (YYYY-MM-DD)',days(t.offset));if(!date)return;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){alert('Enter a date as YYYY-MM-DD.');return}saveReminder(t.title,date,{suggested:true,kind:t.kind})});
 root.querySelectorAll('[data-ra-done]').forEach(b=>b.onclick=async()=>{const {error}=await client.from('pathway_activity').update({completed_at:new Date().toISOString()}).eq('id',Number(b.dataset.raDone)).eq('user_id',user.id);if(!error)await reload()});
 $('raSaveContact').onclick=saveContact;
 $('raCampCheck').onclick=()=>{const yes=['raCampFit','raCampEmail','raCampNeed','raCampGoal'].filter(id=>$(id).checked).length;$('raCampResult').textContent=yes===4?'Good preparation indicators. Verify the event details and budget; no camp guarantees recruitment.':yes>=2?'Some groundwork is done. Research missing items before deciding whether this is worth the expense.':'Pause before registering. Establish school fit, communication, positional needs and a clear camp goal first.'};
 if($('raStaffLoad'))$('raStaffLoad').onclick=staffOverview;
}
async function saveReminder(title,date,metadata){const {error}=await client.from('pathway_activity').insert({user_id:user.id,activity_type:'recruiting_reminder',title,due_date:date,metadata});if(error){alert('Could not save reminder: '+error.message);return}await reload()}
async function saveContact(){
 const school=$('raSchool').value.trim(),kind=$('raContactType').value,notes=$('raNotes').value.trim(),date=$('raFollowup').value;
 if(!school){$('raSaveMsg').textContent='Enter a school name.';return}
 const {error}=await client.from('pathway_activity').insert({user_id:user.id,activity_type:'coach_outreach',title:kind+' · '+school,metadata:{school,contact_type:kind,notes}});
 if(error){$('raSaveMsg').textContent='Could not save: '+error.message;return}
 if(date){const {error:e}=await client.from('pathway_activity').insert({user_id:user.id,activity_type:'recruiting_reminder',title:'Follow up with '+school,due_date:date,metadata:{school,source:'coach_outreach'}});if(e){$('raSaveMsg').textContent='Contact saved, but reminder failed: '+e.message;return}}
 await reload();
}
async function staffOverview(){
 const target=$('raStaffResult');target.textContent='Loading athlete accounts…';
 const {data:ath,error}=await client.from('profiles').select('id,display_name,email').eq('role','athlete').eq('approved',true).limit(500);
 if(error){target.textContent='Unable to load athlete accounts: '+error.message;return}
 if(!ath?.length){target.textContent='No approved athlete accounts visible to your staff role.';return}
 const ids=ath.map(a=>a.id);
 const [ps,ss,aa]=await Promise.all([
 client.from('athlete_pathways').select('user_id,grad_year,completed_tasks,updated_at').in('user_id',ids),
 client.from('pathway_school_lists').select('user_id').in('user_id',ids),
 client.from('pathway_activity').select('user_id,activity_type,due_date,completed_at').in('user_id',ids).limit(5000)
 ]);
 if(ps.error||ss.error||aa.error){target.textContent='Staff overview needs additional database permissions: '+(ps.error||ss.error||aa.error).message;return}
 const rows=ath.map(a=>{const p=(ps.data||[]).find(x=>x.user_id===a.id),schools=(ss.data||[]).filter(x=>x.user_id===a.id).length,activity=(aa.data||[]).filter(x=>x.user_id===a.id),overdue=activity.filter(x=>x.activity_type==='recruiting_reminder'&&!x.completed_at&&x.due_date&&x.due_date<days(0)).length,outreach=activity.filter(x=>x.activity_type==='coach_outreach').length;return {...a,schools,overdue,outreach,grad:p?.grad_year,completed:p?.completed_tasks?.length||0,attention:overdue>0||schools===0||outreach===0}});
 rows.sort((a,b)=>Number(b.attention)-Number(a.attention)||b.overdue-a.overdue);
 target.innerHTML='<div class="ra-muted">'+rows.length+' athlete accounts · Attention means overdue reminders, no saved schools, or no logged outreach. Outreach may not yet be appropriate for younger athletes.</div>'+rows.slice(0,150).map(a=>'<div class="ra-item"><b>'+esc(a.display_name||a.email||'Athlete')+'</b> '+(a.attention?'⚑ Review':'✓')+'<div class="ra-muted">Grad '+esc(a.grad||'not set')+' · '+a.schools+' schools · '+a.outreach+' contacts · '+a.overdue+' overdue · '+a.completed+' completed steps</div></div>').join('');
}
async function autoPlan(){
 if(!path.grad_year)return;
 const g=grade(),year=new Date().getFullYear(),suggested=dueItems(g).slice(0,3);
 const existing=new Set(activities.filter(a=>a.activity_type==='recruiting_reminder'&&a.metadata?.auto_plan_year===year&&a.metadata?.auto_grade===g).map(a=>a.metadata?.auto_id));
 const missing=suggested.filter(t=>!existing.has(t.id));
 if(!missing.length)return;
 const payload=missing.map(t=>({user_id:user.id,activity_type:'recruiting_reminder',title:t.title,due_date:days(t.offset),metadata:{auto_plan_year:year,auto_grade:g,auto_id:t.id,planning_suggestion:true}}));
 const {error}=await client.from('pathway_activity').insert(payload);
 if(!error){const {data}=await client.from('pathway_activity').select('id,activity_type,title,due_date,completed_at,metadata,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(250);activities=data||[]}
}
async function reload(){if(await context()){await autoPlan();render()}}
let started=false;
function init(){if(started)return;started=true;setInterval(()=>{if($('pathway')&&!$('recruitingAdvisor'))reload().catch(()=>{})},2200);document.addEventListener('click',e=>{if(e.target.closest('[data-page="pathway"]'))setTimeout(()=>reload().catch(()=>{}),350)});getDB()?.auth.onAuthStateChange(()=>setTimeout(()=>reload().catch(()=>{}),700));setTimeout(()=>reload().catch(()=>{}),1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();