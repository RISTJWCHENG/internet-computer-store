import {writeFile,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const path=new URL('../web/admin-preview.html',import.meta.url);
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/admin-dashboard.css"></head><body><main class="wrap"><div id="admin-dashboard"></div></main><script type="module">import {startAdminDashboard} from '/src/admin-dashboard.js';window.fetch=async()=>new Response(JSON.stringify({error:'Authentication failed (delegation signature).'}),{status:401,headers:{'Content-Type':'application/json'}});startAdminDashboard(document.getElementById('admin-dashboard'),{identity:{},transport:'icp'});</script></body></html>`;
await writeFile(path,html);
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'inherit',env:{...process.env,PUBLIC_BASE_PATH:'/'}});
let browser;
try {
  for(let i=0;i<100;i++){try{const r=await fetch('http://127.0.0.1:5173/admin-preview.html');if(r.ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));if(i===99)throw Error('Vite did not start');}
  browser=await chromium.launch({headless:true});
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.goto('http://127.0.0.1:5173/admin-preview.html');
    await page.getByText('Connection unavailable').waitFor();
    assert.equal(await page.getByText('MANAGED PROJECTS').count(),1);
    assert.equal(await page.locator('#admin-total').textContent(),'—');
    await page.getByRole('button',{name:'Infrastructure projects'}).click();
    assert.equal(await page.getByPlaceholder('Search by project name or URL').isVisible(),true);
    await page.getByRole('button',{name:'Add a project'}).click();
    assert.equal(await page.getByPlaceholder('e.g. OpenCloud').isDisabled(),true);
    assert.equal(await page.getByRole('button',{name:'Save project'}).isDisabled(),true);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert.ok(overflow<=1,`Horizontal overflow at ${width}px: ${overflow}px`);
    await page.close();
  }
  console.log('Admin UI: desktop and mobile navigation, read-only controls, unavailable counts and overflow passed.');
} finally {if(browser)await browser.close();vite.kill();await rm(path,{force:true});}
