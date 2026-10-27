import {createAdminLoginProof} from './admin-auth-client.js';

export async function startAdminDashboard(root, access) {
  if (!root) return;
  if (!access?.identity || !access?.url) { root.textContent='Administrator access is unavailable. Sign in with the authorized Internet Identity.'; return; }
  root.innerHTML=`<h1>Admin Dashboard</h1><p class="mute">Manage manually reviewed infrastructure projects.</p><p id="admin-status" role="status">Verifying administrator identity…</p><div id="admin-editor" hidden><form class="f" id="admin-form"><label>Project ID<input name="id" required pattern="manual-[a-z0-9]+(-[a-z0-9]+)*" maxlength="80" placeholder="manual-opencloud"></label><label>Name<input name="name" maxlength="100" required></label><label>Official website<input name="websiteUrl" type="url" required></label><label>Logo URL (optional)<input name="logoUrl" type="url"></label><label>Description<textarea name="description" maxlength="2000" rows="4"></textarea></label><label>Relationship<select name="relationship"><option value="unverified">Not verified</option><option value="protocol">Protocol service</option><option value="dfinity">DFINITY related</option><option value="ecosystem">ICP ecosystem project</option></select></label><label>Evidence URL<input name="evidenceUrl" type="url"></label><label>Status<select name="status"><option value="draft">Draft</option><option value="published">Published</option></select></label><div><button class="btn p" type="submit">Save project</button> <button class="btn" type="reset">Clear</button></div></form><h2>Managed projects</h2><ul id="admin-projects"></ul></div>`;
  const status=root.querySelector('#admin-status'),editor=root.querySelector('#admin-editor'),form=root.querySelector('#admin-form'),list=root.querySelector('#admin-projects');
  const endpoint=path=>new URL(path,access.url).href;
  let token='';
  async function call(path,options={}) {
    const r=await fetch(endpoint(path),{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},cache:'no-store',signal:AbortSignal.timeout(20000)});
    let data;try{data=await r.json()}catch{throw Error('The administrator service returned an invalid response.');}
    if(!r.ok)throw Error(data.error||'Administrator request failed.');return data;
  }
  async function refresh() {
    const data=await call('/api/projects');list.replaceChildren();
    for(const project of data.projects||[]){
      const item=document.createElement('li'),edit=document.createElement('button');edit.type='button';edit.className='btn';edit.textContent='Edit';
      edit.addEventListener('click',()=>{for(const key of ['id','name','description','websiteUrl','logoUrl','evidenceUrl','relationship'])form.elements[key].value=project[key]||'';form.elements.status.value=project.status==='published'?'published':'draft';window.scrollTo({top:0,behavior:'smooth'});});
      item.append(document.createTextNode(`${project.name} — ${project.status} `),edit);list.append(item);
    }
  }
  try{
    const challenge=await call('/api/ii/challenge',{method:'POST',body:'{}'});
    const proof=await createAdminLoginProof(access.identity,challenge);
    const session=await call('/api/ii/session',{method:'POST',body:JSON.stringify(proof)});
    if(typeof session.token!=='string'||!session.token)throw Error('Administrator authentication failed.');token=session.token;
    if(!root.isConnected)return;await refresh();editor.hidden=false;status.textContent='Administrator verified.';
  }catch(error){if(root.isConnected)status.textContent=error.message||'Administrator authentication failed.';return;}
  form.addEventListener('submit',async event=>{
    event.preventDefault();status.textContent='Saving…';const button=form.querySelector('[type="submit"]');button.disabled=true;
    try{const project=Object.fromEntries(new FormData(form));project.category='Infrastructure';await call('/api/projects',{method:'POST',body:JSON.stringify(project)});status.textContent='Project saved.';await refresh();}
    catch(error){status.textContent=error.message||'Unable to save project.';}finally{button.disabled=false;}
  });
}
