/* Shared browser-only behavior. No orders, reservations or messages leave this preview. */
(() => {
  'use strict';
  const concept = document.querySelector('meta[name="jb-concept"]')?.content || 'shared';
  const page = document.querySelector('meta[name="jb-page"]')?.content || '';
  const base = '/mockups/justbrunchva/';
  // BEGIN GENERATED PHOTO SOURCES
  const photoSources = {
    "dish-avocado-toast.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-bacon-egg-cheddar-cheese-sandwich-on-croissant-toast.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-bacon-pork-or-turkey.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-banana-glazed-pancakes.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-breakfast-burger.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-brunch-platter.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "dish-cardel-platter.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-charbroiled-oysters.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-cheesecake.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-chicken-golden-waffle.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "dish-cinnamon-toast-crunch-french-toast.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-combo-alfredo.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-corned-beef-hash.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-crab-dip.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-eggs-any-style.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-fish-grits.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "dish-french-toast.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-fried-fish-fries-whiting.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-fried-salmon-bites.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-fruity-pebble-french-toast.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-garlic-butter-jumbo-shrimp.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-garlic-fries.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-garlic-steak-bites.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-grandma-breakfast.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-grits.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-jumbo-shrimp-alfredo.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "dish-just-brunch-sampler.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "dish-lamb-chops-alfredo.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "dish-lamb-chops-potatoes.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-new-orleans-style-bread-pudding.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-oxtail-alfredo.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "dish-oxtail-grits.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "dish-pork-chop-fries.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-potatoes-onions.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-red-velvet-cake.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-red-velvet-waffle.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-salmon-bites-grits.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-seafood-basket.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-shrimp-grits.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "dish-side-of-fruit.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-snapper-eggs-potatoes.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-strawberry-banana-cream-french-toast.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-strawberry-cream-waffle.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-strawberry-cream.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "dish-sunrise-breakfast.png": {"width":1086,"height":1448,"widths":[480,800,1086]},
    "dish-wings-fries.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "drink-blue-hawaiian-breeze.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-bottled-water.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-bottomless-mimosas.png": {"width":2170,"height":725,"widths":[480,800,1200,1600]},
    "drink-brunch-way-mimosa.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "drink-classic-mimosa.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "drink-coconut-rum-punch.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-coffee.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-dragon-fruit-mimosa-tower.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "drink-dragon-fruit-mimosa.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-fresh-orange-juice.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-hennessy-lemonade.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-hibiscus-mojito.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-hot-tea.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-iced-coffee.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-lavender-french-75.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-lavender-mimosa-tower.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "drink-lemonade.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-lychee-martini.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-mango-mimosa-tower.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "drink-mango-mimosa.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "drink-margarita-mimosa.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-peach-bellini.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-peach-mimosa.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "drink-pineapple-mimosa-tower.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-pineapple-mimosa.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "drink-sodas.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-spicy-bloody-mary.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-strawberry-lemonade-mimosa.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-strawberry-lemonade.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-strawberry-mimosa-tower.png": {"width":1122,"height":1402,"widths":[480,800,1122]},
    "drink-strawberry-mimosa.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "drink-strawberry-reposado-fizz.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-tequila-sunrise.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-tiffany-mimosa.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-tropical-breeze.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-tropical-punch.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-virgin-sunrise.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-watermelon-cooler.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-watermelon-mimosa-tower.png": {"width":1374,"height":1145,"widths":[480,800,1200,1374]},
    "drink-watermelon-mimosa.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "horizontal.png": {"width":1254,"height":1254,"widths":[480,800,1200,1254]},
    "restaurant-celebration.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "restaurant-crew.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "restaurant-dining-room.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "suite-behold-green.png": {"width":1448,"height":1086,"widths":[480,800,1200,1448]},
    "suite-cheers-red-roses.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "suite-ig-pink.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]},
    "suite-va-leagues.png": {"width":1536,"height":1024,"widths":[480,800,1200,1536]}
  };
  // END GENERATED PHOTO SOURCES
  const brandColors = ['#F7D046','#F28AC7','#49C6E5','#5FD38D','#B38CF0'];
  const key = name => 'justbrunch:' + concept + ':' + name;
  const read = (name, fallback) => { try { return JSON.parse(localStorage.getItem(key(name))) ?? fallback; } catch { return fallback; } };
  const write = (name, value) => { try { localStorage.setItem(key(name), JSON.stringify(value)); } catch { /* private browsing still works in memory */ } };
  const money = (n, decimals = true) => '$' + Number(n).toFixed(decimals ? 2 : 0);
  const item = id => JB_DATA.menu.find(m => m.id === id);
  const cleanCart = value => Object.fromEntries(Object.entries(value && typeof value === 'object' ? value : {}).filter(([id,q]) => item(id)?.price != null && !item(id).dineIn && Number.isInteger(q) && q > 0).map(([id,q])=>[id,Math.min(99,q)]));
  let cart = cleanCart(read('cart', {}));
  let theme = read('theme', concept === 'after-hours' ? 'dark' : 'light');
  if (!['dark','light'].includes(theme)) theme = concept === 'after-hours' ? 'dark' : 'light';
  const requestedMode = new URLSearchParams(location.search).get('mode');
  if (['dark','light'].includes(requestedMode)) { theme = requestedMode; write('theme', theme); }
  let component;
  const count = () => Object.values(cart).reduce((sum,q)=>sum+q,0);
  const subtotal = () => JB_DATA.menu.reduce((sum,m)=>sum+(cart[m.id]||0)*(m.price||0),0);
  const escape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const suite = id => JB_DATA.suites.find(s=>s.id===id) || JB_DATA.suites[0];
  const setQty = (id, delta) => {
    if (!item(id) || item(id).price == null || item(id).dineIn) return;
    cart = cleanCart({...cart,[id]:Math.max(0,Math.min(99,(cart[id]||0)+delta))});
    write('cart',cart); component?.setState({cart:{...cart}}); updateBag();
  };
  function updateBag() {
    document.querySelectorAll('[data-bag]').forEach(el=>{ const value=`Bag · ${count()} · ${money(subtotal())}`; if(el.textContent!==value) el.textContent=value; });
    document.querySelectorAll('[data-alcohol-note]').forEach(el=>{el.hidden=!Object.keys(cart).some(id=>item(id)?.alcohol); if(el.textContent!==JB_DATA.alcoholNote)el.textContent=JB_DATA.alcoholNote;});
  }
  function connect(instance) {
    component = instance;
    instance.state.theme = theme;
    if(page==='Reserve' && concept==='after-hours') instance.state.mode = theme;
    if('cart' in instance.state) instance.state.cart = {...cart};
    const savedMode = read('fulfillment','pickup');
    if(page==='Order') instance.state.mode = ['pickup','delivery'].includes(savedMode) ? savedMode : 'pickup';
    if(page==='Reserve'){
      const params=new URLSearchParams(location.search),party=Number(params.get('party')),time=params.get('time'),date=params.get('date');
      if(party>=1&&party<=8)instance.state.party=party;
      if(time&&/^\d{1,2}:\d{2} [AP]M$/.test(time))instance.state.time=time;
      if(date&&/^2026-10-(1[4-9]|20)$/.test(date)){const day=Number(date.slice(-2));instance.state.day=concept==='golden-hour'?day:day-14;}
    }
    const original = instance.setState.bind(instance);
    instance.setState = (update, callback) => {
      const patch = typeof update === 'function' ? update(instance.state,instance.props) : update;
      if(patch?.theme || (page==='Reserve'&&concept==='after-hours'&&patch?.mode)) {
        theme = patch.theme || patch.mode; write('theme',theme);
      }
      if(patch?.cart) {cart=cleanCart(patch.cart);patch.cart={...cart};write('cart',cart);}
      if(page==='Order'&&patch?.mode)write('fulfillment',patch.mode);
      original(patch,callback);
      queueEnhance();
    };
  }
  function drinkGroups(instance, dark) {
    const pal = concept==='mimosa-pop' ? ['#FFE14D','#FF4FA0','#FFFFFF','#2BB6E8','#19C37D','#FFE14D','#FF4FA0'] : ['#F7D046','#F28AC7','#B38CF0','#49C6E5','#5FD38D','#F7D046','#F28AC7'];
    const subtitles=['By the glass, or bottomless','Make a statement — choose your flavor & let the good times pour','','','','','Coffee, juice & more'];
    return JB_DATA.drinkCategories.map((title,i)=>({title:JB_DATA.drinkPresentation[concept]?.[i].title||title,sub:JB_DATA.drinkPresentation[concept]?.[i].sub||subtitles[i],color:concept==='mimosa-pop'||dark?pal[i]:'var(--text)',items:JB_DATA.menu.filter(m=>m.cat===title).map((m,j)=>{
      const q=cart[m.id]||0, canAdd=m.price!=null&&!m.dineIn;
      return {...m,...JB_DATA.drinkPresentation[concept]?.[i].items[j],price:m.price==null?'Ask your server':(concept==='golden-hour'?String(m.price):money(m.price,false)),canAdd,noAdd:!canAdd,tag:m.dineIn?'Dine-in only':'Ask your server',btnLabel:q?'Added · '+q:concept==='golden-hour'?'Add':'Add +',btnBg:q?(concept==='mimosa-pop'?'#16121F':'var(--cta)'):(concept==='mimosa-pop'?'#FFFFFF':'transparent'),btnFg:concept==='mimosa-pop'?(q?'#FFE14D':'#16121F'):(q?'var(--cta-ink)':'var(--text)'),btnBorder:q?'var(--cta)':'var(--line2)',add:()=>setQty(m.id,1)};
    })}));
  }
  function modal(title, content) {
    document.querySelector('.jb-dialog')?.remove();
    const dialog=document.createElement('dialog'); dialog.className='jb-dialog';
    const colors=getComputedStyle(document.querySelector('.ah,.gh,.mp')||document.body);
    for(const name of ['--bg','--text','--surface','--line','--cta','--cta-ink']) if(colors.getPropertyValue(name))dialog.style.setProperty(name,colors.getPropertyValue(name));
    dialog.innerHTML=`<h2 id="jb-dialog-title">${escape(title)}</h2><div>${content}</div><form method="dialog"><button type="submit" class="jb-action">Done</button></form>`;
    dialog.setAttribute('aria-labelledby','jb-dialog-title');document.body.append(dialog);dialog.showModal();
  }
  function formScope(trigger) { return trigger?.closest('form') || trigger?.closest('aside') || trigger?.closest('main') || trigger?.parentElement || document; }
  function validate(scope) {
    for(const field of scope.querySelectorAll('input:not([type="checkbox"]),select,textarea')) {
      if(/Full name|555/.test(field.placeholder||''))field.required=true;
      if(!field.checkValidity()){field.reportValidity();return false;}
    }
    return true;
  }
  function confirm(instance) {
    const button=document.querySelector('[data-confirm]'); const scope=formScope(button); if(!validate(scope))return;
    const s=instance.state, vals=instance.renderVals();
    const fields=[...scope.querySelectorAll('input:not([type="checkbox"]),select')].map(el=>el.value).filter(Boolean);
    if(page==='Suites') {
      const room=suite(s.suite); if(s.guests<8||s.guests>room.cap)return;
      const record={number:'JB-S'+Date.now().toString().slice(-6),suite:room.name,guests:s.guests,details:fields};write('suite-confirmation',record);
      modal('Your suite is reserved',`<p><strong>${escape(record.number)}</strong> · ${escape(room.name)} · ${s.guests} guests</p><p>${fields.map(escape).join(' · ')}</p><p>One check per room. A 20% gratuity may be added to your party.</p><p>Thanks for celebrating with us! This is a preview booking.</p>`);
    } else {
      const summary=vals.summary||[vals.summaryDay,vals.summaryTime,vals.summaryParty].filter(Boolean).join(' · ');
      const seating=s.area||document.querySelector('[data-seating]')?.value||'Dining room';
      write('reservation',{summary,seating,details:fields});
      modal('Reservation confirmed',`<p>${escape(summary)} · ${escape(seating)}</p><p>${fields.map(escape).join(' · ')}</p><p>We’ll save you a seat at 307 High St. See you soon!</p><p>This is a preview reservation.</p>`);
    }
  }
  function checkout(instance) {
    if(!count()){modal('Your bag is empty','<p>Add something delicious from the menu first.</p>');return;}
    const lines=JB_DATA.menu.filter(m=>cart[m.id]).map(m=>({id:m.id,name:m.name,qty:cart[m.id],price:m.price}));
    if(lines.some(l=>item(l.id).alcohol)&&!lines.some(l=>item(l.id).food)) {modal('Add a food item',`<p>${escape(JB_DATA.alcoholNote)}</p><p>Add a food item to continue checkout.</p>`);return;}
    const mode=instance.state.mode, sub=Math.round(subtotal()*100), fee=mode==='delivery'?Math.round(JB_DATA.deliveryFee*100):0, tax=Math.round(sub*JB_DATA.taxRate), tip=concept==='golden-hour'?Math.round(sub*(instance.state.tipRate??.15)):0;
    const order={number:'JB-'+Date.now().toString().slice(-6),items:lines,mode,notes:document.querySelector('[data-order-notes]')?.value||'',subtotal:sub,fee,tax,tip,total:sub+fee+tax+tip,readyAt:new Date(Date.now()+(mode==='delivery'?40:20)*60000).toISOString()};
    write('last-order',order);
    cart={};write('cart',cart);write('notes','');instance.setState({cart:{}});
    const time=new Date(order.readyAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    modal('Order confirmed',`<p><strong>Order ${escape(order.number)}</strong></p><p>${mode==='delivery'?'Estimated delivery':'Estimated ready time'}: <strong>${time}</strong> · about ${mode==='delivery'?40:20} minutes</p><ul>${lines.map(l=>`<li>${l.qty} × ${escape(l.name)} — ${money(l.price*l.qty)}</li>`).join('')}</ul><p>Subtotal ${money(sub/100)} · ${escape(JB_DATA.taxLabel)} ${money(tax/100)}${fee?' · Delivery '+money(fee/100):''}${tip?' · Kitchen tip '+money(tip/100):''}</p><p><strong>Total ${money(order.total/100)}</strong></p>${order.notes?'<p>Kitchen notes: '+escape(order.notes)+'</p>':''}${lines.some(l=>item(l.id).alcohol)?'<p>'+escape(JB_DATA.alcoholNote)+'</p>':''}<p>Thank you! This preview has not placed a real order or charged a payment.</p>`);
  }
  function changeMonth(instance,delta) {
    const s=instance.state,date=new Date(s.year,s.month+delta,1); if(date<new Date(2026,9,1))return;
    instance.setState({year:date.getFullYear(),month:date.getMonth(),day:date.getMonth()===9&&date.getFullYear()===2026?14:1});
  }
  window.JB={concept,page,base,read,write,money,escape,item,suite,modal,connect,checkout,confirm,changeMonth,drinkGroups,setQty,cart:()=>({...cart}),cartCount:count,cartSubtotal:subtotal,
    catalog:()=>JB_DATA.menu.map((m,i)=>({...m,tint:['#FBE6A6','#F9D7E8','#CFEFDD','#CDEBF5','#E3D8FA'][i%5],color:concept==='mimosa-pop'?brandColors[i%5]:m.color})),
    highlights:(items,noDollar)=>items.map((p,i)=>({...p,color:concept==='mimosa-pop'?brandColors[i%5]:p.color,price:(noDollar?'':'$')+item(p.id).price,image:item(p.id).image})),
    homeDrinks:dark=>JB_DATA.drinkCategories.map((title,i)=>({title,color:dark?['#F7D046','#F28AC7','#B38CF0','#49C6E5','#5FD38D'][i%5]:'var(--text)',items:JB_DATA.menu.filter(m=>m.cat===title).map(m=>({...m,price:m.price==null?'Ask your server':(concept==='golden-hour'?'':'$')+m.price}))}))};
  let scheduled=false;
  const observedMarquees=new WeakSet();
  function fillMarquee(el) {
    const track=el.querySelector('.jb-marquee-track'), group=track?.firstElementChild;
    if(!group)return;
    const width=group.getBoundingClientRect().width;
    if(!width)return;
    // Keep a full viewport of repeats beyond the one group that scrolls away.
    const copies=Math.max(2,Math.ceil(el.clientWidth/width)+1);
    while(track.children.length<copies){const copy=group.cloneNode(true);copy.setAttribute('aria-hidden','true');track.append(copy);}
    while(track.children.length>copies)track.lastElementChild.remove();
    track.style.setProperty('--marquee-distance',`${-width}px`);
    track.style.setProperty('--marquee-duration',`${width/48}s`);
    el.classList.add('is-scrolling');
  }
  const resize = new ResizeObserver(entries=>{for(const {target} of entries){const el=target.closest('.jb-marquee');if(el)fillMarquee(el);}});
  const observedPhotos = new Set();
  const imageURL = filename => base+'start-here/images/'+filename.split('/').map(encodeURIComponent).join('/');
  function sizePhoto(panel) {
    const img=panel.querySelector(':scope > img'), source=photoSources[panel.dataset.photo];
    if(!img?.srcset || !source)return;
    const box=panel.getBoundingClientRect();
    // A tall crop needs enough source pixels for object-fit: cover, too.
    const width=Math.ceil(Math.max(box.width,box.height*source.width/source.height));
    if(width>0 && img.sizes!==width+'px')img.sizes=width+'px';
  }
  const photoResize = new ResizeObserver(entries=>entries.forEach(({target})=>sizePhoto(target)));
  function setPhotoSource(img,filename,sizes) {
    const source=photoSources[filename];
    if(source){
      const stem=filename.replace(/\.[^.]+$/,'');
      img.width=source.width;img.height=source.height;img.sizes=sizes;
      img.srcset=source.widths.map(width=>`${imageURL(`optimized/${stem}-${width}.webp`)} ${width}w`).join(', ');
      img.src=imageURL(`optimized/${stem}-${source.widths.find(width=>width>=800)||source.widths.at(-1)}.webp`);
    }else img.src=imageURL(filename);
  }
  function enhance() {
    scheduled=false;updateBag();
    for(const panel of observedPhotos)if(!panel.isConnected){photoResize.unobserve(panel);observedPhotos.delete(panel);}
    const firstHero=document.querySelector('.jb-hero-photo');
    document.querySelectorAll('[data-tip]').forEach(el=>{const selected=Number(el.dataset.tip)===(component?.state.tipRate??.15);el.setAttribute('aria-pressed',String(selected));el.style.background=selected?'var(--cta)':'transparent';el.style.color=selected?'var(--cta-ink)':'var(--text)';});
    document.querySelectorAll('[data-photo]').forEach(panel=>{
      const filename=panel.dataset.photo;if(!filename||filename.includes('{'))return;
      if(panel.dataset.photoReady===filename)return;
      panel.dataset.photoReady=filename;panel.classList.remove('is-photo-loaded');panel.querySelector(':scope > img')?.remove();
      const img=document.createElement('img'),box=panel.getBoundingClientRect(),source=photoSources[filename];
      const visible=box.width>0&&box.height>0&&box.top<innerHeight&&box.bottom>0&&box.left<innerWidth&&box.right>0;
      img.alt=panel.dataset.alt||'';img.loading=visible||panel===firstHero?'eager':'lazy';img.decoding='async';
      img.fetchPriority=(visible||panel===firstHero)&&panel.classList.contains('jb-hero-photo')?'high':'auto';
      img.addEventListener('load',()=>panel.classList.toggle('is-photo-loaded',img.naturalWidth>1));
      img.addEventListener('error',()=>{
        if(img.srcset){img.removeAttribute('srcset');img.removeAttribute('sizes');img.src=imageURL(filename);return;}
        panel.classList.remove('is-photo-loaded');img.remove();
      });
      const sourceWidth=source?Math.max(box.width,box.height*source.width/source.height):box.width;
      setPhotoSource(img,filename,Math.ceil(sourceWidth||innerWidth)+'px');panel.prepend(img);
      if(source){photoResize.observe(panel);observedPhotos.add(panel);}
    });
    document.querySelectorAll('.jb-marquee').forEach(el=>{if(!observedMarquees.has(el)){observedMarquees.add(el);resize.observe(el);const group=el.querySelector('.jb-marquee-group');if(group)resize.observe(group);fillMarquee(el);}});
    document.querySelectorAll('.jb-page header nav[aria-label="Main"]:not([data-nav-ready])').forEach(nav=>{
      nav.dataset.navReady='true';
      const toggle=document.createElement('button');
      toggle.type='button'; toggle.className='jb-nav-toggle';
      toggle.setAttribute('aria-label','Menu'); toggle.setAttribute('aria-expanded','false');
      toggle.innerHTML='<svg class="jb-nav-icon-bars" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg><svg class="jb-nav-icon-x" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';
      nav.insertAdjacentElement('afterend',toggle);
      const banner=document.createElement('img');
      banner.className='jb-nav-banner'; banner.alt='Just Brunch'; banner.loading='lazy';
      banner.src=base+'start-here/images/horizontal.png';
      nav.prepend(banner);
      if(page!=='Home'){
        const header=nav.closest('header'),row=header.querySelector(':scope > div'),logo=header.querySelector('a[aria-label="Just Brunch home"]');
        let actions=header.querySelector('.tbtn')?.parentElement;
        const links=[...nav.querySelectorAll('a')],order=links.find(a=>a.textContent.trim()==='Menu'),reserve=links.find(a=>a.textContent.trim()==='Reserve');
        const orderNav=links.find(a=>a.textContent.trim()==='Order');
        if(actions&&order&&reserve&&row&&logo){
          logo.classList.add('jb-header-logo');
          if(actions===row){
            const group=document.createElement('div');group.className='jb-header-actions';
            [...row.children].filter(child=>![logo,nav,toggle].includes(child)).forEach(child=>group.append(child));
            row.append(group);actions=group;
          }
          header.classList.add('jb-mobile-home-header');
          header.querySelectorAll('a').forEach(a=>{if(!a.closest('nav')&&a.getAttribute('aria-label')!=='Just Brunch home')a.classList.add('jb-desktop-header-action');});
          orderNav?.remove();
          const mobile=document.createElement('div');mobile.className='jb-mobile-header-actions';
          mobile.innerHTML=`<a class="jb-bag" data-bag href="${escape(order.href)}#bag">Bag · <span>${count()}</span> · <span>${money(subtotal())}</span></a><a class="btn jb-mobile-reserve" href="${escape(reserve.href)}">Reserve</a><a class="btn jb-mobile-order" href="${escape(order.href)}">Order</a>`;
          actions.append(mobile);
          if(row&&logo){
            if(concept==='golden-hour')row.append(nav,logo,toggle,actions);
            else row.append(logo,nav,toggle,actions);
          }
        }
      }
    });
    document.querySelectorAll('[data-order-notes]:not([data-ready])').forEach(el=>{el.dataset.ready='true';el.value=read('notes','');el.addEventListener('input',()=>write('notes',el.value));});
    document.querySelectorAll('[data-default-date]:not([data-ready-date])').forEach(el=>{
      el.dataset.readyDate='true';el.value=el.dataset.defaultDate;
    });
    document.querySelectorAll('input,textarea,select').forEach(el=>{
      if(!el.labels?.length&&!el.hasAttribute('aria-label'))el.setAttribute('aria-label',el.placeholder||el.type||'Select an option');
    });
  }
  function queueEnhance(){if(!scheduled){scheduled=true;requestAnimationFrame(enhance);}}
  addEventListener('DOMContentLoaded',()=>{
    new MutationObserver(queueEnhance).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-photo']});enhance();
    document.addEventListener('change',event=>{if(event.target.matches('[data-seating]')){const summary=document.querySelector('[data-seating-summary]');if(summary)summary.textContent=event.target.value;}});
    document.addEventListener('click',event=>{const tip=event.target.closest('[data-tip]');if(tip)component?.setState({tipRate:Number(tip.dataset.tip)});const link=event.target.closest('[data-quick-reserve] a');if(link){const form=link.closest('form'),params=new URLSearchParams({date:form.querySelector('input').value,time:form.querySelectorAll('select')[0].value,party:form.querySelectorAll('select')[1].value});link.href=link.href.split('?')[0]+'?'+params;}
      const navToggle=event.target.closest('.jb-nav-toggle');
      if(navToggle){const header=navToggle.closest('header');const open=header.classList.toggle('is-nav-open');navToggle.setAttribute('aria-expanded',String(open));}
      else document.querySelectorAll('.jb-page header.is-nav-open').forEach(header=>{if(!header.contains(event.target)){header.classList.remove('is-nav-open');header.querySelector('.jb-nav-toggle')?.setAttribute('aria-expanded','false');}});
    });
    document.addEventListener('submit',event=>{
      if(event.target.closest('dialog'))return;
      event.preventDefault();
      if(page==='Suites'||page==='Reserve'){confirm(component);return;}
      if(!validate(event.target))return;
      modal('Thanks — you’re all set!', '<p>We’ve saved your details for this preview. No message has been sent.</p>');
    });
  });
  addEventListener('storage',event=>{
    if(event.key===key('cart')){cart=cleanCart(read('cart',{}));component?.setState({cart:{...cart}});updateBag();}
    if(event.key===key('theme')){theme=read('theme',theme);component?.setState(page==='Reserve'&&concept==='after-hours'?{mode:theme}:{theme});}
  });
})();
