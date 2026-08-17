import { chromium } from 'playwright';
import crypto from 'crypto';

const SITE='https://taylorchell043-spec.github.io/speed-pathway/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=m=>console.log(`[E2E] ${m}`);

async function mailbox(label){
  const domains=await (await fetch('https://api.mail.tm/domains?page=1')).json();
  if(!domains['hydra:member']?.length) throw new Error('mail.tm returned no domains');
  const domain=domains['hydra:member'][0].domain;
  const address=`speedpathway-${label}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}@${domain}`;
  const password='E2e!'+crypto.randomBytes(12).toString('base64url');
  let r=await fetch('https://api.mail.tm/accounts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address,password})});
  if(!r.ok) throw new Error(`mailbox create failed ${r.status} ${await r.text()}`);
  r=await fetch('https://api.mail.tm/token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address,password})});
  if(!r.ok) throw new Error(`mailbox token failed ${r.status}`);
  const token=(await r.json()).token;
  return {address,password,token};
}

async function waitForConfirmLink(box,timeout=120000){
  const end=Date.now()+timeout;
  while(Date.now()<end){
    const r=await fetch('https://api.mail.tm/messages?page=1',{headers:{authorization:`Bearer ${box.token}`}});
    if(r.ok){
      const list=(await r.json())['hydra:member']||[];
      for(const m of list){
        const rr=await fetch(`https://api.mail.tm/messages/${m.id}`,{headers:{authorization:`Bearer ${box.token}`}});
        if(!rr.ok) continue;
        const msg=await rr.json();
        const body=[msg.text||'',...(msg.html||[])].join('\n').replaceAll('&amp;','&');
        const urls=body.match(/https?:\/\/[^\s"'<>]+/g)||[];
        const link=urls.find(u=>u.includes('supabase.co')&&(u.includes('/auth/v1/verify')||u.includes('token=')));
        if(link) return link.replace(/&quot;.*$/,'').replace(/[)>.,]+$/,'');
      }
    }
    await sleep(3000);
  }
  throw new Error('Confirmation email/link not received');
}

async function createViaPublicSite(page,box,name){
  await page.goto(SITE,{waitUntil:'networkidle'});
  await page.click('#authShowSignup');
  await page.fill('#authName',name);
  await page.fill('#authNewEmail',box.address);
  await page.fill('#authNewPassword',box.password);
  await page.click('#authCreate');
  await page.waitForFunction(()=>document.querySelector('#authSignupMsg')?.textContent?.toLowerCase().includes('account created'),null,{timeout:30000});
  log(`ACCOUNT_CREATED ${name} ${box.address}`);
  const link=await waitForConfirmLink(box);
  log(`CONFIRMATION_EMAIL_RECEIVED ${name}`);
  await page.goto(link,{waitUntil:'networkidle'});
  await sleep(1500);
  const finalUrl=page.url();
  if(!finalUrl.startsWith(SITE)) throw new Error(`Confirmation redirect wrong: ${finalUrl}`);
  const body=(await page.locator('body').innerText()).toLowerCase();
  if(body.includes('localhost')||body.includes('error exchanging code')) throw new Error(`Confirmation landed on error page: ${finalUrl}`);
  log(`CONFIRMATION_REDIRECT_OK ${name} ${finalUrl}`);
}

async function signOut(page){
  if(await page.locator('#accountOut').isVisible().catch(()=>false)){await page.click('#accountOut'); await sleep(700); return;}
  if(await page.locator('#pendingOut').isVisible().catch(()=>false)){await page.click('#pendingOut'); await sleep(700); return;}
  await page.goto(SITE,{waitUntil:'networkidle'});
}

async function signIn(page,box){
  await page.goto(SITE,{waitUntil:'networkidle'});
  if(!(await page.locator('#loginPanel').isVisible().catch(()=>false))) await signOut(page);
  await page.fill('#authEmail',box.address);
  await page.fill('#authPassword',box.password);
  await page.click('#authLogin');
  await sleep(1800);
  const err=await page.locator('#authMsg').textContent().catch(()=>null);
  if(err && /invalid|error|failed/i.test(err)) throw new Error(`Sign in failed: ${err}`);
}

const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
const page=await context.newPage();
page.on('console',m=>console.log(`[browser:${m.type()}] ${m.text()}`));

try{
  const admin=await mailbox('admin');
  await createViaPublicSite(page,admin,'SpeedPathway E2E Admin 8A6C42');
  await signIn(page,admin);
  await page.waitForSelector('button[data-page="programAdmin"]',{timeout:15000});
  if(!(await page.locator('#appRoot').isVisible().catch(()=>false))) throw new Error('Approved test admin could not enter app');
  log(`TEST_ADMIN_READY ${admin.address}`);

  await signOut(page);
  const user=await mailbox('user');
  await createViaPublicSite(page,user,'SpeedPathway E2E Pending User');
  await signIn(page,user);
  if(!(await page.locator('#pendingPanel').isVisible().catch(()=>false))) throw new Error('New confirmed user did not remain pending before approval');
  log(`PENDING_GATE_OK ${user.address}`);

  await signOut(page);
  await signIn(page,admin);
  await page.waitForSelector('button[data-page="programAdmin"]',{timeout:15000});
  await page.click('button[data-page="programAdmin"]');
  await page.waitForSelector('#acctPending',{timeout:15000});
  const row=page.locator('#acctPending .userRow',{hasText:user.address});
  if(await row.count()!==1) throw new Error('Pending registration not visible in Program Admin');
  log('PENDING_VISIBLE_IN_PROGRAM_ADMIN');
  await row.locator('select[data-role]').selectOption('coach');
  await row.locator('button[data-approve]').click();
  await page.waitForFunction(email=>[...document.querySelectorAll('#acctUsers .userRow')].some(r=>r.textContent.includes(email)),user.address,{timeout:20000});
  const active=page.locator('#acctUsers .userRow',{hasText:user.address});
  if(await active.locator('select[data-role]').inputValue()!=='coach') throw new Error('Role assignment did not persist as coach');
  log('ADMIN_APPROVAL_AND_ROLE_ASSIGNMENT_OK');

  await signOut(page);
  await signIn(page,user);
  if(!(await page.locator('#appRoot').isVisible().catch(()=>false))) throw new Error('Approved user could not enter app');
  if(await page.locator('#pendingPanel').isVisible().catch(()=>false)) throw new Error('Approved user still shown pending');
  const who=await page.locator('#accountWho').textContent();
  if(!who?.toUpperCase().includes('COACH')) throw new Error(`Approved role not reflected in signed-in app: ${who}`);
  log('APPROVED_USER_SIGNIN_OK');
  log(`E2E_SUCCESS admin=${admin.address} user=${user.address}`);
} finally {
  await browser.close();
}
