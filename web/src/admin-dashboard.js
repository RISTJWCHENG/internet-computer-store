import {adminRequest} from './icp-client.js';
import {RESOURCE_TYPES,resourceTypeForTags,withResourceType,newResourceId} from './resource-model.js';

export async function startAdminDashboard(root, access, options={}) {
  if (!root) return;
  if (!access?.identity || access?.transport!=='icp') {
    root.textContent = 'Administrator access is unavailable. Sign in with the authorized Internet Identity.';
    return;
  }

  root.innerHTML = `<div class="admin-shell">
    <aside class="admin-sidebar" aria-label="Administrator navigation">
      <div class="admin-brand"><span class="admin-brand-icon">✦</span><div><strong>Store Admin</strong><small>Management workspace</small></div></div>
      <p class="admin-nav-label">WORKSPACE</p>
      <nav class="admin-nav" aria-label="Dashboard sections">
        <button class="admin-nav-item is-active" data-tab="overview" type="button"><span>▦</span> Overview</button>
        <button class="admin-nav-item" data-tab="projects" type="button"><span>▤</span> Infrastructure resources</button>
        <button class="admin-nav-item" data-tab="editor" type="button"><span>＋</span> Add a resource</button>
      </nav>
      <div class="admin-side-note"><strong>Curated with care</strong><p>Review sources and evidence before publishing a project.</p><a href="#/explore?cat=Infrastructure">View public directory ↗</a></div>
    </aside>
    <div class="admin-main">
      <div class="admin-topline"><span>MANAGEMENT / <span id="admin-breadcrumb">OVERVIEW</span></span><a href="#/explore?cat=Infrastructure">View directory ↗</a></div>
      <div class="admin-alert" id="admin-alert" role="status" aria-live="polite"><span class="admin-alert-dot"></span><div><strong id="admin-status-title">Verifying your identity</strong><p id="admin-status-detail">Connecting securely with Internet Identity…</p></div><button type="button" class="admin-retry" id="admin-retry" hidden>Try again</button></div>
      <div id="admin-overview" data-panel="overview">
        <div class="admin-heading"><div><span class="admin-eyebrow">YOUR WORKSPACE</span><h1>Admin Dashboard</h1><p>Manage the resources published in your Infrastructure directory.</p></div><button class="admin-button primary" type="button" data-go="editor">＋ <span>Add resource</span></button></div>
        <div class="admin-stats"><article><span class="admin-stat-icon purple">▤</span><p>MANAGED RESOURCES</p><strong id="admin-total">—</strong><small>Manually curated entries</small></article><article><span class="admin-stat-icon green">✓</span><p>PUBLISHED</p><strong id="admin-published">—</strong><small>Visible in the directory</small></article><article><span class="admin-stat-icon amber">◷</span><p>DRAFTS</p><strong id="admin-drafts">—</strong><small>Not publicly visible</small></article></div>
        <div class="admin-overview-grid"><div class="admin-card"><div class="admin-card-head"><div><h2>Infrastructure resources</h2><p>Your manually managed listings</p></div><button type="button" class="admin-text-button" data-go="projects">View all →</button></div><div id="admin-recent" class="admin-project-list"><div class="admin-empty">Connect to load your resources.</div></div></div><div class="admin-card admin-guide"><span class="admin-guide-icon">✧</span><h2>Build a trusted directory</h2><p>Add official links and supporting evidence to help people understand each project’s relationship to the Internet Computer ecosystem.</p><div class="admin-guide-step"><span>1</span> Add resource details</div><div class="admin-guide-step"><span>2</span> Review its sources</div><div class="admin-guide-step"><span>3</span> Save a draft or publish</div><button class="admin-button secondary" type="button" data-go="editor">Create a listing →</button></div></div>
      </div>
      <div id="admin-projects-panel" data-panel="projects" hidden><div class="admin-heading"><div><span class="admin-eyebrow">DIRECTORY</span><h1>Infrastructure resources</h1><p>Search and manage your manually curated entries.</p></div><button class="admin-button primary" type="button" data-go="editor">＋ <span>Add resource</span></button></div><div class="admin-card"><div class="admin-toolbar"><label class="admin-search"><span>⌕</span><input id="admin-search" type="search" placeholder="Search resources by name or URL" aria-label="Search projects"></label><label class="admin-filter"><span class="admin-visually-hidden">Filter by status</span><select id="admin-filter"><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select></label><button type="button" class="admin-button secondary" id="admin-refresh">Refresh</button></div><div id="admin-projects" class="admin-project-list"><div class="admin-empty">Connect to load your resources.</div></div><div class="admin-list-footer" id="admin-list-count">Resource data is unavailable</div></div></div>
      <div id="admin-editor-panel" data-panel="editor" hidden><div class="admin-heading"><div><span class="admin-eyebrow">DIRECTORY / EDITOR</span><h1 id="admin-editor-title">Add a resource</h1><p>Provide clear, accurate information for the directory.</p></div><button class="admin-button secondary" type="button" data-go="projects">← Back to resources</button></div><form id="admin-form" class="admin-editor-layout"><fieldset id="admin-fields" disabled><div class="admin-card admin-form-card"><div class="admin-card-head"><div><h2>Resource details</h2><p>The basics people will see in the directory.</p></div></div><div class="admin-form-grid"><label class="admin-full">Resource name <span>*</span><input name="name" maxlength="100" required placeholder="e.g. OpenCloud"></label><input type="hidden" name="id"><label class="admin-full">Website URL <span>*</span><input name="websiteUrl" type="url" required placeholder="https://example.com"><small>Use the project's official HTTPS website.</small></label><label class="admin-full">Description<textarea name="description" maxlength="2000" rows="4" placeholder="What can visitors use this resource for?"></textarea><small>Keep it factual and easy to understand.</small></label><label class="admin-full">Logo URL <em>Optional</em><input name="logoUrl" type="url" placeholder="https://example.com/logo.png"></label></div></div><div class="admin-card admin-form-card"><div class="admin-card-head"><div><h2>Classification &amp; evidence</h2><p>Help visitors understand the project's connection to ICP.</p></div></div><div class="admin-form-grid"><label>Resource type<select name="resourceType" aria-label="Resource type">${RESOURCE_TYPES.map(type=>`<option value="${type.id}" ${type.id==='other'?'selected':''}>${type.label}</option>`).join('')}</select></label><label>Relationship<select name="relationship" aria-label="Relationship"><option value="unverified">Not verified</option><option value="protocol">Protocol service</option><option value="dfinity">DFINITY related</option><option value="ecosystem">ICP ecosystem project</option></select></label><label class="admin-full">Evidence URL <em>Optional for unverified</em><input name="evidenceUrl" type="url" placeholder="https://example.com/source"><small>Required for any stated protocol, DFINITY, or ecosystem relationship.</small></label></div></div><div class="admin-card admin-form-card"><div class="admin-card-head"><div><h2>Publishing</h2><p>Choose whether the project is visible to visitors.</p></div></div><label>Status<select name="status" aria-label="Status"><option value="draft">Draft — only visible in admin</option><option value="published">Published — visible in the directory</option></select></label><div class="admin-form-actions"><button type="submit" class="admin-button primary">Save resource</button><button type="reset" class="admin-button secondary">Clear form</button><span id="admin-form-status" role="status" aria-live="polite"></span></div></div></fieldset><aside class="admin-card admin-tips"><span class="admin-guide-icon">✧</span><h2>Before you publish</h2><ul><li>Check that links use HTTPS.</li><li>Confirm the name and description are accurate.</li><li>Add evidence for any stated relationship.</li><li>Save as a draft if more review is needed.</li></ul><p>Only manually managed infrastructure listings appear in this workspace.</p></aside></form></div>
    </div></div>`;

  const $ = selector => root.querySelector(selector);
  const statusTitle=$('#admin-status-title'), statusDetail=$('#admin-status-detail'), alert=$('#admin-alert'), retry=$('#admin-retry');
  const form=$('#admin-form'), fields=$('#admin-fields'), list=$('#admin-projects'), recent=$('#admin-recent');
  let token='', projects=[], loaded=false, preservedTags=[];
  const stateOf = project => project.status === 'published' ? 'published' : 'draft';
  function setStatus(title, detail, state='waiting') {
    statusTitle.textContent=title; statusDetail.textContent=detail; alert.dataset.state=state; retry.hidden=state!=='error';
  }
  function setPanel(name) {
    root.querySelectorAll('[data-panel]').forEach(panel=>{panel.hidden=panel.dataset.panel!==name;});
    root.querySelectorAll('[data-tab]').forEach(button=>{const active=button.dataset.tab===name;button.classList.toggle('is-active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    $('#admin-breadcrumb').textContent=({overview:'OVERVIEW',projects:'PROJECTS',editor:'RESOURCE EDITOR'})[name];
  }
  root.querySelectorAll('[data-tab], [data-go]').forEach(button=>button.addEventListener('click',()=>{if((button.dataset.go||button.dataset.tab)==='editor'){form.reset();form.elements.id.readOnly=false;$('#admin-editor-title').textContent='Add a resource';$('#admin-form-status').textContent='';}setPanel(button.dataset.tab||button.dataset.go);}));
  async function call(path,options={}) {return adminRequest(access.identity,path,options);}
  function edit(project) {
    form.reset();for(const key of ['id','name','description','websiteUrl','logoUrl','evidenceUrl','relationship'])form.elements[key].value=project[key]||'';
    preservedTags=Array.isArray(project.tags)?[...project.tags]:[];form.elements.resourceType.value=resourceTypeForTags(preservedTags);
    form.elements.status.value=stateOf(project);form.elements.id.readOnly=true;$('#admin-editor-title').textContent='Edit resource';$('#admin-form-status').textContent='';setPanel('editor');
    root.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderRows(target, rows, emptyMessage) {
    target.replaceChildren();
    if(!rows.length){const empty=document.createElement('div');empty.className='admin-empty';empty.textContent=emptyMessage;target.append(empty);return;}
    for(const project of rows){
      const row=document.createElement('div');row.className='admin-project-row';
      const icon=document.createElement('span');icon.className='admin-project-icon';icon.textContent=(project.name||'?').slice(0,1).toUpperCase();
      const info=document.createElement('div');info.className='admin-project-info';const name=document.createElement('strong');name.textContent=project.name||'Untitled';const url=document.createElement('small');url.textContent=project.websiteUrl||'No website';info.append(name,url);
      const badge=document.createElement('span');badge.className=`admin-badge ${stateOf(project)}`;badge.textContent=stateOf(project)==='published'?'Published':'Draft';
      const button=document.createElement('button');button.type='button';button.className='admin-text-button';button.textContent='Edit →';button.addEventListener('click',()=>edit(project));row.append(icon,info,badge,button);target.append(row);
    }
  }
  function render() {
    const query=$('#admin-search').value.trim().toLowerCase(),filter=$('#admin-filter').value;
    const filtered=projects.filter(p=>(filter==='all'||stateOf(p)===filter)&&`${p.name||''} ${p.websiteUrl||''} ${p.id||''}`.toLowerCase().includes(query));
    $('#admin-total').textContent=loaded?String(projects.length):'—';$('#admin-published').textContent=loaded?String(projects.filter(p=>stateOf(p)==='published').length):'—';$('#admin-drafts').textContent=loaded?String(projects.filter(p=>stateOf(p)==='draft').length):'—';
    renderRows(list,filtered,loaded?(projects.length?'No resources match your search.':'No resources yet. Add your first listing.'):'Connect to load your resources.');
    renderRows(recent,projects.slice(0,4),loaded?'No resources yet. Add your first listing.':'Connect to load your resources.');
    $('#admin-list-count').textContent=loaded?`${filtered.length} of ${projects.length} managed resources`:'Resource data is unavailable';
  }
  async function refresh(){const data=await call('/api/projects');if(!Array.isArray(data.projects))throw Error('Resource data is unavailable.');projects=data.projects;loaded=true;render();}
  async function connect(){
    token='';fields.disabled=true;loaded=false;projects=[];render();retry.disabled=true;setStatus('Verifying your identity','Connecting securely with Internet Identity…');
    try{const check=await call('/api/ii/session');if(!check.authenticated)throw Error('Administrator authorization required.');token='icp';if(!root.isConnected)return;const capabilities=await call('/api/ii/session');await refresh();fields.disabled=capabilities.writesEnabled!==true;setStatus('Identity verified',fields.disabled?'Connected in read-only mode. Editing is currently unavailable.':'Connected to your administrator workspace.','success');}
    catch(error){if(root.isConnected)setStatus('Connection unavailable',`${error.message||'Administrator authentication failed.'} Resource data and editing are unavailable until verification succeeds.`,'error');}
    finally{retry.disabled=false;}
  }
  $('#admin-search').addEventListener('input',render);$('#admin-filter').addEventListener('change',render);retry.addEventListener('click',connect);
  $('#admin-refresh').addEventListener('click',async()=>{if(!token){await connect();return;}try{await refresh();setStatus('Identity verified','Resource list updated.','success');}catch(error){setStatus('Unable to refresh',error.message,'error');}});
  form.addEventListener('reset',()=>{preservedTags=[];form.elements.id.readOnly=false;$('#admin-editor-title').textContent='Add a resource';$('#admin-form-status').textContent='';});
  form.addEventListener('submit',async event=>{event.preventDefault();const evidence=form.elements.evidenceUrl;if(form.elements.relationship.value!=='unverified'&&!evidence.value){evidence.setCustomValidity('Add an evidence URL for this relationship.');evidence.reportValidity();evidence.setCustomValidity('');return;}const button=form.querySelector('[type="submit"]');button.disabled=true;$('#admin-form-status').textContent='Saving…';try{const project=Object.fromEntries(new FormData(form));project.id=project.id||newResourceId();project.tags=withResourceType(preservedTags,project.resourceType);delete project.resourceType;project.category='Infrastructure';await call('/api/projects',{method:'POST',body:JSON.stringify(project)});await refresh();preservedTags=[...project.tags];form.elements.id.value=project.id;$('#admin-form-status').textContent='Resource saved.';setStatus('Resource saved',project.status==='published'?'The listing is published.':'The listing is saved as a draft.','success');window.dispatchEvent(new Event('catalog:projects-updated'));}catch(error){$('#admin-form-status').textContent=error.message||'Unable to save project.';}finally{button.disabled=false;}});
  setPanel(['overview','projects','editor'].includes(options.initialPanel)?options.initialPanel:'overview');await connect();
}
