(() => {
  'use strict';
  const root=document.getElementById('operations');
  if(!root)return;
  const screen=document.body.dataset.screen, base=JB.base+'start-here/operations/';
  const e=JB.escape, money=JB.money;
  const get=(key,fallback)=>{try{return JSON.parse(localStorage.getItem('justbrunch:ops:'+key))??fallback;}catch{return fallback;}};
  const save=(key,value)=>{try{localStorage.setItem('justbrunch:ops:'+key,JSON.stringify(value));}catch{}};
  let ticket=get('ticket',{}),member=get('member',false),category=JB_DATA.foodCategories[0], punches=get('punches',[]),status=get('clock','out');
  let itemNotes=get('item-notes',{}),kitchenNotes=get('kitchen-notes',''),itemPanel=null;
  let layout=get('floor-layout',{}),orders=get('table-orders',{}),layoutEdit=false,activeTable=null,orderCategory=JB_DATA.foodCategories[0],activeCheck=0,scrollToOrder=false;
  const noteKey=id=>screen==='POS-Floor'&&activeTable?`${activeTable}:${activeCheck}:${id}`:id;
  const links=[['POS-Register','Register'],['POS-Floor','Floor & orders'],['Staff-TimeClock','Time clock'],['Staff-Schedule','Schedule'],['Staff-Team','Team & tips'],['Admin-Dashboard','Back office']];
  const nav=()=>`<nav class="ops-nav" aria-label="Operations">${links.map(([file,label])=>`<a ${file===screen?'aria-current="page"':''} href="${base+file}.dc.html">${label}</a>`).join('')}<a href="${base}Staff-Login.dc.html">Staff login</a></nav>`;
  const totals=()=>{
    let sub=0,highest=0;for(const [id,q]of Object.entries(ticket)){const m=JB.item(id);if(m&&m.price!=null){sub+=Math.round(m.price*100)*q;if(m.entree&&q>0)highest=Math.max(highest,Math.round(m.price*100));}}
    const free=member&&ticket.d7>0?Math.round(JB.item('d7').price*100):0;
    const entree=member?Math.round(highest*.05):0,discount=free+entree,tax=Math.round((sub-discount)*JB_DATA.taxRate);
    return{sub,free,entree,discount,tax,total:sub-discount+tax};
  };
  function itemKind(m){if(!m)return null;if(m.cat==='Sides')return null;return m.food?'food':'drink';}
  function renderItemPanel(addAttr){
    if(!itemPanel)return'';
    const m=JB.item(itemPanel.id);if(!m)return'';
    const note=itemNotes[noteKey(itemPanel.id)]||'';
    const body=itemPanel.kind==='food'
      ?`<p class="ops-muted">Tap a side to add it to the ticket.</p><div class="ops-menu">${JB_DATA.menu.filter(s=>s.cat==='Sides').map(s=>`<button type="button" class="ops-item" ${addAttr}="${s.id}"><span class="ops-photo" style="background:${s.color}"><img src="${JB.base}start-here/images/${s.image}" alt="${e(s.name)}" loading="lazy"></span><strong>${e(s.name)}</strong><span>${money(s.price)}</span></button>`).join('')}</div><label>Substitutions / special requests<textarea data-item-note="${itemPanel.id}" rows="3" placeholder="e.g. sub turkey bacon, no onions, extra crispy">${e(note)}</textarea></label>`
      :`<p class="ops-muted">${e(m.name)} — let the bar know how to make it.</p><label>Notes for the bartender<textarea data-item-note="${itemPanel.id}" rows="4" placeholder="e.g. light ice, extra garnish, make it virgin">${e(note)}</textarea></label>`;
    return `<div class="ops-slide-backdrop" data-close-item></div><aside class="ops-slide" role="dialog" aria-label="${itemPanel.kind==='food'?'Add sides and notes':'Bartender notes'}"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;font-size:20px">${itemPanel.kind==='food'?'Sides for '+e(m.name):'Bartender notes'}</h2><button type="button" data-close-item aria-label="Close">✕</button></div>${body}<button type="button" class="ops-primary" data-close-item>Done</button></aside>`;
  }
  function renderRegister(){
    const t=totals();
    return `<div class="ops-columns"><section><h2>Menu</h2><nav class="ops-tabs" aria-label="POS categories">${[...JB_DATA.foodCategories,...JB_DATA.drinkCategories].map(c=>`<button data-category="${e(c)}" aria-pressed="${category===c}">${e(c)}</button>`).join('')}</nav><div class="ops-menu">${JB_DATA.menu.filter(m=>m.cat===category).map(m=>`<button class="ops-item" data-add="${m.id}" ${m.price==null?'disabled':''}><span class="ops-photo" style="background:${m.color}"><img src="${JB.base}start-here/images/${m.image}" alt="${e(m.name)}" loading="lazy"></span><strong>${e(m.name)}</strong><span>${m.price==null?'Ask your server':money(m.price)}</span>${m.dineIn?'<small>Dine-in only</small>':''}</button>`).join('')}</div></section><aside class="ops-card"><h2>Current ticket</h2><label class="ops-check"><input type="checkbox" data-member ${member?'checked':''}> Brunch Club member</label><p class="ops-muted">One bottomless mimosa free · 5% off the highest-priced entrée</p><div data-ticket>${Object.entries(ticket).filter(([,q])=>q>0).map(([id,q])=>{const m=JB.item(id);if(!m)return'';const kind=itemKind(m),note=itemNotes[noteKey(id)];return `<div class="ops-line"><span>${e(m.name)}<br>${money(m.price*q)}${note?`<br><em style="color:#a9a3b5;font-size:12px">${kind==='drink'?'Bartender':'Note'}: ${e(note)}</em>`:''}</span>${kind?`<button type="button" data-edit-item="${id}" aria-label="${kind==='drink'?'Bartender notes':'Sides &amp; substitutions'} for ${e(m.name)}">${kind==='drink'?'🍸':'📝'}</button>`:''}<button data-qty="${id}" data-delta="-1" aria-label="Remove one ${e(m.name)}">−</button><b>${q}</b><button data-qty="${id}" data-delta="1" aria-label="Add one ${e(m.name)}">+</button></div>`;}).join('')||'<p>Your ticket is empty. Add an item to begin.</p>'}</div><label style="display:flex;flex-direction:column;gap:8px;margin:16px 0">Kitchen notes<textarea data-kitchen-notes rows="3" placeholder="e.g. rush table 4, allergy on table 2">${e(kitchenNotes)}</textarea></label><dl class="ops-totals"><div><dt>Subtotal</dt><dd data-subtotal>${money(t.sub/100)}</dd></div><div><dt>Member discount</dt><dd data-discount>−${money(t.discount/100)}</dd></div>${member?`<div class="ops-muted"><dt>Bottomless ${money(t.free/100)} · Entrée ${money(t.entree/100)}</dt><dd></dd></div>`:''}<div><dt>${e(JB_DATA.taxLabel)}</dt><dd data-tax>${money(t.tax/100)}</dd></div><div><dt>Total</dt><dd data-total>${money(t.total/100)}</dd></div></dl><button class="ops-primary" data-pay ${!t.sub?'disabled':''}>Complete ticket · ${money(t.total/100)}</button><button data-clear ${!t.sub?'disabled':''}>Clear ticket</button></aside></div>${renderItemPanel('data-add')}`;
  }
  function onlineOrders(){
    const all=[];for(const c of ['after-hours','golden-hour','mimosa-pop']){try{const order=JSON.parse(localStorage.getItem('justbrunch:'+c+':last-order'));if(order)all.push({...order,concept:c});}catch{}}
    return all;
  }
  const TABLE_DEFAULTS=[
    {n:1,shape:'round',seats:2,left:'14%',top:'22%'},
    {n:2,shape:'round',seats:2,left:'33%',top:'18%'},
    {n:3,shape:'round',seats:2,left:'52%',top:'22%'},
    {n:4,shape:'square',seats:4,left:'18%',top:'52%'},
    {n:5,shape:'square',seats:4,left:'40%',top:'54%'},
    {n:6,shape:'long',seats:6,left:'56%',top:'56%'},
    {n:7,shape:'round',seats:2,left:'16%',top:'80%'},
    {n:8,shape:'round',seats:2,left:'36%',top:'80%'},
  ];
  const ZONE_DEFAULTS={
    kitchen:{left:'2%',top:'4%',width:'18%',height:'16%',label:'Kitchen'},
    bar:{left:'72%',top:'4%',width:'26%',height:'38%',label:'Bar'},
    entrance:{left:'2%',top:'84%',width:'20%',height:'14%',label:'Entrance'},
  };
  const MAX_TABLES=10;
  let tablesList=get('floor-tables',null);
  if(!Array.isArray(tablesList)||!tablesList.length)tablesList=TABLE_DEFAULTS.map(t=>({...t}));
  const statusSlug=s=>(s||'Available').toLowerCase().replace(/[^a-z]+/g,'-');
  const tablePos=t=>{const o=layout['table-'+t.n];return o?{left:o.left,top:o.top}:{left:t.left,top:t.top};};
  const zoneBox=id=>{const d=ZONE_DEFAULTS[id],o=layout['zone-'+id];return{left:o?.left??d.left,top:o?.top??d.top,width:o?.width??d.width,height:o?.height??d.height};};
  const floorKeys=()=>[...tablesList.map(t=>({key:String(t.n),label:'Table '+t.n})),...JB_DATA.suites.map(s=>({key:s.id,label:s.name}))];
  const orderFor=key=>{if(!orders[key])orders[key]={mode:'whole',checks:[{items:{}}],group:[]};return orders[key];};
  const orderCount=key=>{const o=orders[key];return o?o.checks.reduce((s,c)=>s+Object.values(c.items||{}).reduce((a,b)=>a+b,0),0):0;};
  function addTable(shape){
    if(tablesList.length>=MAX_TABLES)return;
    const n=Math.max(0,...tablesList.map(t=>t.n))+1;
    const extra=tablesList.length-TABLE_DEFAULTS.length;
    tablesList.push({n,shape,seats:shape==='round'?2:6,left:Math.min(70,46+extra*8)+'%',top:Math.min(70,32+extra*6)+'%'});
    save('floor-tables',tablesList);
  }
  function zoneEl(id){
    const d=ZONE_DEFAULTS[id],box=zoneBox(id);
    return `<div class="ops-zone" data-zone="${id}" aria-hidden="true" style="left:${box.left};top:${box.top};width:${box.width};height:${box.height}">${d.label}${layoutEdit?`<span class="ops-resize-handle" data-resize-zone="${id}"></span>`:''}</div>`;
  }
  function renderOrderPanel(key){
    const meta=tablesList.find(t=>String(t.n)===key);
    const suite=!meta&&JB_DATA.suites.find(s=>s.id===key);
    const label=meta?('Table '+meta.n):(suite?suite.name:key);
    const ord=orderFor(key);
    const idx=Math.min(activeCheck,ord.checks.length-1);
    const items=ord.checks[idx]?.items||{};
    const cats=[...JB_DATA.foodCategories,...JB_DATA.drinkCategories];
    const subtotal=Object.entries(items).reduce((s,[id,q])=>{const m=JB.item(id);return s+(m&&m.price!=null?Math.round(m.price*100)*q:0);},0);
    const others=floorKeys().filter(f=>f.key!==key);
    const tableStatus=get('tables',{})[key]||'Available';
    return `<section class="ops-card ops-order-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px"><h2 style="margin:0">${e(label)} order</h2><button type="button" data-close-order>Close</button></div>
      <div class="ops-tabs" role="group" aria-label="Table status">${['Available','Seated','Needs cleaning'].map(s=>`<button type="button" data-table-status="${s}" aria-pressed="${tableStatus===s}">${s}</button>`).join('')}</div>
      <div class="ops-tabs" role="group" aria-label="Order mode"><button type="button" data-order-mode="whole" aria-pressed="${ord.mode==='whole'}">Whole table</button><button type="button" data-order-mode="separate" aria-pressed="${ord.mode==='separate'}">Split separately</button></div>
      ${ord.mode==='separate'?`<div class="ops-tabs" role="group" aria-label="Checks">${ord.checks.map((c,i)=>`<button type="button" data-check="${i}" aria-pressed="${i===idx}">Check ${i+1}</button>`).join('')}<button type="button" data-add-check>+ Add check</button>${ord.checks.length>1?`<button type="button" data-remove-check="${idx}">Remove check</button>`:''}</div>`:''}
      ${others.length?`<div><b>Group with</b><div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px">${others.map(o=>`<label class="ops-check"><input type="checkbox" data-group="${e(o.key)}" ${ord.group.includes(o.key)?'checked':''}>${e(o.label)}</label>`).join('')}</div></div>`:''}
      ${ord.group.length?`<p class="ops-muted">Grouped with ${ord.group.map(k=>e(floorKeys().find(f=>f.key===k)?.label||k)).join(', ')} — shown together for service.</p>`:''}
      <nav class="ops-tabs" aria-label="Order categories">${cats.map(c=>`<button type="button" data-order-category="${e(c)}" aria-pressed="${orderCategory===c}">${e(c)}</button>`).join('')}</nav>
      <div class="ops-menu">${JB_DATA.menu.filter(m=>m.cat===orderCategory).map(m=>`<button type="button" class="ops-item" data-order-add="${m.id}" ${m.price==null?'disabled':''}><span class="ops-photo" style="background:${m.color}"><img src="${JB.base}start-here/images/${m.image}" alt="${e(m.name)}" loading="lazy"></span><strong>${e(m.name)}</strong><span>${m.price==null?'Ask your server':money(m.price)}</span></button>`).join('')}</div>
      <div data-order-items>${Object.entries(items).filter(([,q])=>q>0).map(([id,q])=>{const m=JB.item(id);if(!m)return'';const kind=itemKind(m),note=itemNotes[noteKey(id)];return `<div class="ops-line"><span>${e(m.name)}<br>${money(m.price*q)}${note?`<br><em style="color:#a9a3b5;font-size:12px">${kind==='drink'?'Bartender':'Note'}: ${e(note)}</em>`:''}</span>${kind?`<button type="button" data-edit-item="${id}" aria-label="${kind==='drink'?'Bartender notes':'Sides &amp; substitutions'} for ${e(m.name)}">${kind==='drink'?'🍸':'📝'}</button>`:''}<button type="button" data-order-qty="${id}" data-delta="-1" aria-label="Remove one ${e(m.name)}">−</button><b>${q}</b><button type="button" data-order-qty="${id}" data-delta="1" aria-label="Add one ${e(m.name)}">+</button></div>`;}).join('')||'<p>No items on this check yet.</p>'}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:18px;padding-top:12px;border-top:1px solid #3a3645"><span>Check${ord.mode==='separate'?' '+(idx+1):''} total</span><span>${money(subtotal/100)}</span></div>
      <button type="button" data-clear-order="${key}">Clear table</button>
    </section>
    ${renderItemPanel('data-order-add')}`;
  }
  function renderFloor(){
    const tableStatus=get('tables',{}),onlineOrdersList=onlineOrders(),orderStates=get('order-states',{});
    const plan=tablesList.map(t=>{
      const key=String(t.n),stat=tableStatus[key]||'Available',pos=tablePos(t),count=orderCount(key);
      return `<button class="ops-table ops-table-${t.shape} is-${statusSlug(stat)}" data-table="${key}" style="left:${pos.left};top:${pos.top}" aria-label="Table ${t.n}, ${t.seats} top, ${e(stat)}${count?', '+count+' items':''}"><strong>${t.n}</strong><span>${count?count+' item'+(count!==1?'s':''):e(stat)}</span></button>`;
    }).join('');
    const suites=JB_DATA.suites.map(s=>{
      const stat=tableStatus[s.id]||'Available',count=orderCount(s.id);
      return `<button class="ops-suite is-${statusSlug(stat)}" data-table="${s.id}"><strong>${e(s.name)}</strong><span>8–${s.cap} guests</span><em>${count?count+' item'+(count!==1?'s':''):e(stat)}</em></button>`;
    }).join('');
    const full=tablesList.length>=MAX_TABLES;
    return `<section class="ops-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px"><h2 style="margin:0">Dining room</h2><button type="button" data-toggle-edit aria-pressed="${layoutEdit}">${layoutEdit?'Done editing':'Edit layout'}</button></div>
      <p>${layoutEdit?'Drag tables, the bar, the kitchen or the entrance to rearrange the room. Drag a zone’s yellow handle to resize it.':'Select a table to start an order.'}</p>
      ${layoutEdit?`<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:16px"><button type="button" data-add-table="round" ${full?'disabled':''}>+ Circular table</button><button type="button" data-add-table="long" ${full?'disabled':''}>+ Rectangle table</button><button type="button" data-reset-layout>Reset layout</button><span class="ops-muted">${tablesList.length}/${MAX_TABLES} tables${full?' · floor is full':''}</span></div>`:''}
      <div class="ops-room ${layoutEdit?'is-editing':''}" role="group" aria-label="Dining room floor plan">${zoneEl('kitchen')}${zoneEl('bar')}${zoneEl('entrance')}${plan}</div>
      <ul class="ops-legend"><li><span class="ops-dot is-available"></span>Available</li><li><span class="ops-dot is-seated"></span>Seated</li><li><span class="ops-dot is-needs-cleaning"></span>Needs cleaning</li></ul>
    </section>
    ${activeTable&&!layoutEdit?renderOrderPanel(activeTable):''}
    <section class="ops-card"><h2>Private suites</h2><div class="ops-suites">${suites}</div></section>
    <section class="ops-card"><h2>Online orders</h2>${onlineOrdersList.length?onlineOrdersList.map(o=>`<article class="ops-line"><div><strong>${e(o.number)} · ${e(o.mode)}</strong><p>${o.items.map(l=>`${l.qty} × ${e(l.name)}`).join(', ')}</p><p>${e(o.notes||'No kitchen notes')} · ${money(o.total/100)}</p></div><button data-order="${e(o.number)}">${e(orderStates[o.number]||'Received')}</button></article>`).join(''):'<p>No online orders yet. Complete checkout in any website concept to see the order here.</p>'}</section>`;
  }
  function renderClock(){return `<section class="ops-card"><h2 data-clock-status>${{out:'Clocked out',in:'On the clock',break:'On break'}[status]}</h2><p>Welcome, ${e(get('staff','Jamie'))}. Punches are saved on this device.</p><div class="ops-tabs"><button class="ops-primary" data-punch="in" ${status!=='out'?'disabled':''}>Clock in</button><button data-punch="break" ${status!=='in'?'disabled':''}>Start break</button><button data-punch="in" data-end-break ${status!=='break'?'disabled':''}>End break</button><button data-punch="out" ${status!=='in'?'disabled':''}>Clock out</button></div></section><section class="ops-card"><h2>Punch history</h2><div class="jb-table-scroll"><table><thead><tr><th>Action</th><th>Date</th><th>Time</th></tr></thead><tbody>${punches.slice().reverse().map(p=>`<tr><td>${e(p.action)}</td><td>${new Date(p.at).toLocaleDateString()}</td><td>${new Date(p.at).toLocaleTimeString()}</td></tr>`).join('')||'<tr><td colspan="3">No punches yet. Clock in to start your shift.</td></tr>'}</tbody></table></div></section>`;}
  function renderSchedule(){return `<section class="ops-card"><h2>Your week</h2><div class="jb-table-scroll"><table><thead><tr><th>Day</th><th>Shift</th><th>Role</th><th>Action</th></tr></thead><tbody>${[['Wednesday','8am–3pm','Floor'],['Friday','9am–5pm','Bar'],['Saturday','8am–4pm','Private suites'],['Sunday','8am–4pm','Floor']].map(([day,shift,role])=>`<tr><td>${day}</td><td>${shift}</td><td>${role}</td><td><button data-swap="${day}">Request swap</button></td></tr>`).join('')}</tbody></table></div></section><form class="ops-card" data-timeoff><h2>Request time off</h2><label>Date<input type="date" required name="date"></label><label>Note<textarea name="note" rows="3" required></textarea></label><button class="ops-primary">Send request</button></form>`;}
  function renderTeam(){return `<div class="ops-grid"><section class="ops-card"><h2>Team on shift</h2><p>Jamie · Floor</p><p>Morgan · Bar</p><p>Alex · Kitchen</p><p>Taylor · Suites</p></section><section class="ops-card"><h2>Your tips</h2><p class="ops-big">$128.50</p><p>Today · sample shift</p><p>Week to date: $542.75</p><button data-tip-details>View breakdown</button></section></div><section class="ops-card"><h2>Team notes</h2><p>Check suite bookings before service. Keep the brunch energy going!</p><form data-team-note><label>Leave a note<textarea required rows="2" name="note"></textarea></label><button>Save team note</button></form><ul>${get('team-notes',[]).map(n=>`<li>${e(n)}</li>`).join('')}</ul></section>`;}
  function renderAdmin(){
    const off=get('86',{}),bookings=[];for(const c of ['after-hours','golden-hour','mimosa-pop']){for(const type of ['reservation','suite-confirmation']){try{const b=JSON.parse(localStorage.getItem('justbrunch:'+c+':'+type));if(b)bookings.push(b);}catch{}}}
    return `<nav class="ops-tabs" aria-label="Back office sections"><a href="#overview">Overview</a><a href="#menu">Menu & 86 list</a><a href="#bookings">Bookings</a><a href="#payroll">Payroll</a><a href="${base}POS-Floor.dc.html">Orders</a><a href="${base}Staff-Schedule.dc.html">Staff schedule</a></nav><section id="overview" class="ops-card"><h2>Today at Just Brunch</h2><div class="ops-grid"><p><strong>${get('closed-tickets',[]).length}</strong> completed tickets</p><p><strong>${onlineOrders().length}</strong> online orders</p><p><strong>${bookings.length}</strong> bookings</p></div></section><section id="menu" class="ops-card"><h2>Menu & 86 list</h2><p>Toggle an item to mark it unavailable in the register.</p><div class="ops-menu">${JB_DATA.menu.filter(m=>m.food).map(m=>`<label class="ops-check"><input type="checkbox" data-86="${m.id}" ${off[m.id]?'checked':''}>${e(m.name)} <span>${off[m.id]?'86’d':'Available'}</span></label>`).join('')}</div></section><section id="bookings" class="ops-card"><h2>Bookings</h2>${bookings.length?bookings.map(b=>`<p>${e(b.summary||b.suite+' · '+b.guests+' guests')}</p>`).join(''):'<p>No reservations yet. Confirm a table or suite in a concept to see it here.</p>'}</section><section id="payroll" class="ops-card"><h2>Payroll</h2><p>${punches.length} recorded punches · demo pay period</p><a href="${base}Staff-TimeClock.dc.html">Review time punches →</a><button data-payroll>Prepare payroll preview</button></section>`;
  }
  function render(){
    const title=screen==='Staff-Login'?'Staff sign in':links.find(([f])=>f===screen)?.[1]||'Operations';
    root.innerHTML=`<header class="ops-header"><a href="${JB.base}index.html" class="ops-logo" aria-label="Just Brunch — all concepts"><span>${'JUST BRUNCH'.split('').map((ch,i)=>`<span style="color:${['#FFFFFF','#F28AC7','#5FD38D','#49C6E5','transparent','#F7D046','#F28AC7','#B38CF0','#FFFFFF','#5FD38D','#49C6E5'][i]}">${ch===' '?'&nbsp;':ch}</span>`).join('')}</span><small>NOT JUST BRUNCH–IT’S A VIBE ✦</small></a><span>307 High St · Portsmouth</span></header>${nav()}<main class="ops-main"><h1>${title}</h1>${screen==='POS-Register'?renderRegister():screen==='POS-Floor'?renderFloor():screen==='Staff-Login'?'<form class="ops-card ops-login" data-login><h2>Welcome back</h2><label>Name<input name="name" autocomplete="given-name" placeholder="Jamie" required></label><label>Staff PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="off" required aria-describedby="pin-help"></label><p id="pin-help">Use any four digits for this demo.</p><button class="ops-primary">Sign in</button></form>':screen==='Staff-TimeClock'?renderClock():screen==='Staff-Schedule'?renderSchedule():screen==='Staff-Team'?renderTeam():renderAdmin()}</main>${screen.startsWith('Staff-')&&screen!=='Staff-Login'?`<nav class="ops-bottom" aria-label="Staff tabs">${links.filter(([f])=>f.startsWith('Staff')).map(([f,l])=>`<a ${screen===f?'aria-current="page"':''} href="${base+f}.dc.html">${l}</a>`).join('')}</nav>`:''}`;
    const off=get('86',{});root.querySelectorAll('[data-add]').forEach(b=>{if(off[b.dataset.add]){b.disabled=true;b.insertAdjacentHTML('beforeend','<small>86’d · unavailable</small>');}});
    root.querySelectorAll('img').forEach(img=>img.onerror=()=>img.remove());
    const slide=root.querySelector('.ops-slide');
    if(slide)requestAnimationFrame(()=>requestAnimationFrame(()=>slide.classList.add('is-open')));
    if(scrollToOrder){
      scrollToOrder=false;
      const panel=root.querySelector('.ops-order-panel');
      if(panel)requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));
    }
  }
  root.addEventListener('click',event=>{
    if(event.target.classList.contains('ops-slide-backdrop')){itemPanel=null;render();return;}
    const button=event.target.closest('button');if(!button||button.disabled)return; const d=button.dataset;
    if(d.category){category=d.category;render();}
    if(d.add||d.qty){const id=d.add||d.qty;ticket[id]=Math.max(0,Math.min(99,(ticket[id]||0)+(d.add?1:Number(d.delta))));if(!ticket[id])delete ticket[id];save('ticket',ticket);if(d.add){const kind=itemKind(JB.item(id));if(kind)itemPanel={id,kind};}render();}
    if('clear'in d){ticket={};itemNotes={};kitchenNotes='';itemPanel=null;save('ticket',ticket);save('item-notes',itemNotes);save('kitchen-notes',kitchenNotes);render();}
    if('pay'in d){const t=totals();save('closed-tickets',[...get('closed-tickets',[]),{at:new Date().toISOString(),ticket,member,itemNotes,kitchenNotes,...t}]);ticket={};itemNotes={};kitchenNotes='';itemPanel=null;save('ticket',ticket);save('item-notes',itemNotes);save('kitchen-notes',kitchenNotes);render();JB.modal('Ticket complete',`<p>Total ${money(t.total/100)}. Payment recorded for this preview.</p>`);}
    if(d.editItem){const kind=itemKind(JB.item(d.editItem));if(kind)itemPanel={id:d.editItem,kind};render();}
    if('closeItem'in d){itemPanel=null;render();}
    if('toggleEdit'in d){layoutEdit=!layoutEdit;if(layoutEdit)activeTable=null;render();}
    if('resetLayout'in d){layout={};tablesList=TABLE_DEFAULTS.map(t=>({...t}));save('floor-layout',layout);save('floor-tables',tablesList);render();}
    if(d.addTable){addTable(d.addTable);render();}
    if(d.table){if(layoutEdit)return;activeTable=d.table;orderCategory=JB_DATA.foodCategories[0];activeCheck=0;itemPanel=null;scrollToOrder=true;render();}
    if('closeOrder'in d){activeTable=null;itemPanel=null;render();}
    if(d.tableStatus&&activeTable){const t=get('tables',{});t[activeTable]=d.tableStatus;save('tables',t);render();}
    if(d.orderMode&&activeTable){const ord=orderFor(activeTable);ord.mode=d.orderMode;activeCheck=0;itemPanel=null;save('table-orders',orders);render();}
    if(d.check!==undefined&&activeTable){activeCheck=Number(d.check);itemPanel=null;render();}
    if('addCheck'in d&&activeTable){const ord=orderFor(activeTable);ord.checks.push({items:{}});activeCheck=ord.checks.length-1;save('table-orders',orders);render();}
    if(d.removeCheck!==undefined&&activeTable){const ord=orderFor(activeTable);if(ord.checks.length>1){ord.checks.splice(Number(d.removeCheck),1);activeCheck=Math.max(0,activeCheck-1);}save('table-orders',orders);render();}
    if(d.orderCategory){orderCategory=d.orderCategory;render();}
    if(d.orderAdd&&activeTable){const ord=orderFor(activeTable),idx=Math.min(activeCheck,ord.checks.length-1),items=ord.checks[idx].items;items[d.orderAdd]=Math.min(99,(items[d.orderAdd]||0)+1);const t=get('tables',{});if(!t[activeTable]||t[activeTable]==='Available'){t[activeTable]='Seated';save('tables',t);}save('table-orders',orders);const kind=itemKind(JB.item(d.orderAdd));if(kind)itemPanel={id:d.orderAdd,kind};render();}
    if(d.orderQty&&activeTable){const ord=orderFor(activeTable),idx=Math.min(activeCheck,ord.checks.length-1),items=ord.checks[idx].items;items[d.orderQty]=Math.max(0,Math.min(99,(items[d.orderQty]||0)+Number(d.delta)));if(!items[d.orderQty])delete items[d.orderQty];save('table-orders',orders);render();}
    if(d.clearOrder){delete orders[d.clearOrder];const t=get('tables',{});delete t[d.clearOrder];save('tables',t);save('table-orders',orders);activeTable=null;itemPanel=null;render();}
    if(d.order){const t=get('order-states',{}),states=['Received','Preparing','Ready','Completed'];t[d.order]=states[(states.indexOf(t[d.order]||'Received')+1)%4];save('order-states',t);render();}
    if(d.punch){const action=d.punch==='break'?'Start break':d.punch==='out'?'Clock out':'endBreak'in d?'End break':'Clock in';status=d.punch;punches.push({action,at:new Date().toISOString()});save('clock',status);save('punches',punches);render();}
    if(d.swap){const requests=get('swap-requests',[]);requests.push({day:d.swap,at:new Date().toISOString()});save('swap-requests',requests);JB.modal('Swap request saved',`<p>Your ${e(d.swap)} shift swap request is ready for manager review in this preview.</p>`);}
    if('tipDetails'in d)JB.modal('Tip breakdown','<p>Card tips: $108.50<br>Cash tips: $20.00<br>Total: $128.50</p>');
    if('payroll'in d)JB.modal('Payroll preview prepared',`<p>${punches.length} punches included. Nothing has been paid or sent.</p>`);
  });
  root.addEventListener('change',event=>{
    const d=event.target.dataset;
    if('member'in d){member=event.target.checked;save('member',member);render();}
    if(d['86']){const off=get('86',{});off[d['86']]=event.target.checked;save('86',off);const scroll=scrollY;render();scrollTo(0,scroll);}
    if(d.group&&activeTable){const ord=orderFor(activeTable),i=ord.group.indexOf(d.group);if(event.target.checked){if(i<0)ord.group.push(d.group);}else if(i>=0)ord.group.splice(i,1);save('table-orders',orders);render();}
  });
  root.addEventListener('input',event=>{
    const d=event.target.dataset;
    if(d.itemNote!==undefined){itemNotes[noteKey(d.itemNote)]=event.target.value;save('item-notes',itemNotes);}
    if('kitchenNotes'in d){kitchenNotes=event.target.value;save('kitchen-notes',kitchenNotes);}
  });
  let dragState=null;
  root.addEventListener('pointerdown',event=>{
    if(!layoutEdit)return;
    const handle=event.target.closest('.ops-resize-handle');
    const roomEl=root.querySelector('.ops-room');
    if(!roomEl)return;
    const rect=roomEl.getBoundingClientRect();
    if(handle){
      const id=handle.dataset.resizeZone,zone=handle.closest('.ops-zone'),box=zoneBox(id);
      dragState={type:'resize',id,el:zone,rect,startX:event.clientX,startY:event.clientY,startW:parseFloat(box.width),startH:parseFloat(box.height)};
      handle.setPointerCapture(event.pointerId);event.preventDefault();return;
    }
    const tableEl=event.target.closest('.ops-table');
    const zoneTarget=!tableEl&&event.target.closest('.ops-zone');
    if(tableEl){dragState={type:'table',key:tableEl.dataset.table,el:tableEl,rect};tableEl.setPointerCapture(event.pointerId);event.preventDefault();}
    else if(zoneTarget){dragState={type:'zone',id:zoneTarget.dataset.zone,el:zoneTarget,rect};zoneTarget.setPointerCapture(event.pointerId);event.preventDefault();}
  });
  root.addEventListener('pointermove',event=>{
    if(!dragState)return;
    if(dragState.type==='resize'){
      const dx=(event.clientX-dragState.startX)/dragState.rect.width*100,dy=(event.clientY-dragState.startY)/dragState.rect.height*100;
      const w=Math.max(10,Math.min(60,dragState.startW+dx)),h=Math.max(8,Math.min(60,dragState.startH+dy));
      dragState.el.style.width=w.toFixed(1)+'%';dragState.el.style.height=h.toFixed(1)+'%';
      dragState.result={width:w.toFixed(1)+'%',height:h.toFixed(1)+'%'};
      return;
    }
    let left=(event.clientX-dragState.rect.left)/dragState.rect.width*100,top=(event.clientY-dragState.rect.top)/dragState.rect.height*100;
    left=Math.max(2,Math.min(98,left));top=Math.max(2,Math.min(98,top));
    dragState.el.style.left=left.toFixed(1)+'%';dragState.el.style.top=top.toFixed(1)+'%';
    dragState.result={left:left.toFixed(1)+'%',top:top.toFixed(1)+'%'};
  });
  root.addEventListener('pointerup',()=>{
    if(!dragState)return;
    if(dragState.result){
      if(dragState.type==='table')layout['table-'+dragState.key]={...layout['table-'+dragState.key],...dragState.result};
      else layout['zone-'+dragState.id]={...zoneBox(dragState.id),...dragState.result};
      save('floor-layout',layout);
    }
    dragState=null;render();
  });
  root.addEventListener('submit',event=>{
    event.preventDefault();event.stopPropagation();const form=event.target, data=new FormData(form);if(!form.reportValidity())return;
    if(form.hasAttribute('data-login')){save('staff',String(data.get('name')).trim());location.href=base+'Staff-TimeClock.dc.html';}
    if(form.hasAttribute('data-timeoff')){save('time-off',[...get('time-off',[]),Object.fromEntries(data)]);JB.modal('Request saved','<p>Your time-off request has been saved for this preview.</p>');form.reset();}
    if(form.hasAttribute('data-team-note')){save('team-notes',[...get('team-notes',[]),data.get('note')]);render();JB.modal('Note saved','<p>Your team note is saved on this device.</p>');}
  });
  render();
})();
