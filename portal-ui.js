/* Portal UI layer: icons, modern dashboards, section pages, mobile navigation.
   Loaded after portal.js. Uses its globals: $, esc, api, slug, parse, TREES, LEAF, bars. */
(function(){
const I={
 home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.2c2.6.2 4.5 2 4.5 5.8"/>',
 student:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M5.5 16c.5-1.7 1.8-2.5 3.5-2.5s3 .8 3.5 2.5M14 10h4M14 14h3"/>',
 cap:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v6"/>',
 book:'<path d="M3 5.5C5 4 8.5 4 12 6c3.5-2 7-2 9-.5V19c-2-1.5-5.5-1.5-9 .5-3.5-2-7-2-9-.5z"/><path d="M12 6v13.5"/>',
 clipcheck:'<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4h6v3H9z"/><path d="M9 14l2 2 4-4"/>',
 chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 trend:'<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 wallet:'<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6.5 15h4"/>',
 monitor:'<rect x="3" y="4" width="18" height="12" rx="2.5"/><path d="M8 20h8M12 16v4"/><path d="M8.5 10l2 2 4-4"/>',
 bus:'<rect x="4" y="3.5" width="16" height="14" rx="3"/><path d="M4 11h16M7 7h2M15 7h2"/><circle cx="8" cy="20" r="1.2"/><circle cx="16" cy="20" r="1.2"/>',
 heart:'<path d="M12 20s-8-4.8-8-10.5A4.5 4.5 0 0112 7a4.5 4.5 0 018 2.5C20 15.2 12 20 12 20z"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 7l9 6 9-6"/>',
 chat:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
 bell:'<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>',
 sliders:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
 video:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/>',
 pencil:'<path d="M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
 file:'<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
 lock:'<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 018 0v3"/>',
 smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14c1 1.5 2.4 2.2 4 2.2s3-.7 4-2.2M9 9.5h.01M15 9.5h.01"/>',
 notebook:'<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 3v18M12 8h4M12 12h4"/>',
 award:'<circle cx="12" cy="9" r="5.5"/><path d="M8.5 14L7 21l5-3 5 3-1.5-7"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.7"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
 upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
 download:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
 key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
 building:'<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M9 11h.01M15 11h.01"/>',
 alert:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
 grid:'<rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 logout:'<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
 chevron:'<path d="M9 6l6 6-6 6"/>',
 back:'<path d="M15 6l-6 6 6 6"/>',
 sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'
};
const HK=['blue','green','orange','purple','pink','teal','red','amber','indigo'];
const RULES=[
 [/password|reset/i,'key','red'],
 [/comment/i,'chat','teal'],
 [/fee|payment|balance|bank/i,'wallet','green'],
 [/cbt|computer/i,'monitor','purple'],
 [/dashboard|^home$/i,'home','blue'],
 [/absence|alert/i,'bell','red'],
 [/attendance/i,'clipcheck','green'],
 [/skill|behav|activit/i,'smile','pink'],
 [/import/i,'upload','teal'],
 [/communication book/i,'notebook','teal'],
 [/daily|early|creche|nursery/i,'smile','pink'],
 [/report|result|score|spreadsheet|position|grad(e|ing)|cutoff|publish/i,'award','orange'],
 [/homework|assignment/i,'pencil','blue'],
 [/video|virtual/i,'video','red'],
 [/lesson|template/i,'book','purple'],
 [/note/i,'file','blue'],
 [/timetable/i,'clock','teal'],
 [/calendar|term|session|archive/i,'calendar','teal'],
 [/transport|bus/i,'bus','amber'],
 [/health|medical/i,'heart','pink'],
 [/pickup|secure/i,'lock','indigo'],
 [/send|sent|inbox|message/i,'mail','blue'],
 [/communicat/i,'chat','teal'],
 [/photo|logo|signature/i,'image','purple'],
 [/backup|export|download/i,'download','indigo'],
 [/promot|return|status/i,'trend','green'],
 [/link|parent/i,'users','pink'],
 [/pupil|student|admission|search|register/i,'student','green'],
 [/user|staff|administration/i,'users','blue'],
 [/class|subject/i,'building','orange'],
 [/statistic/i,'chart','purple'],
 [/tool|config|set |generate|enable|upload|load/i,'sliders','indigo'],
 [/academic/i,'cap','blue']
];
const ico=(n,sz)=>`<svg viewBox="0 0 24 24" aria-hidden="true"${sz?` width="${sz}" height="${sz}"`:''}>${I[n]||I.grid}</svg>`;
const look=l=>{for(const [re,i,h] of RULES)if(re.test(l))return {i,h};let n=0;for(const c of String(l))n=(n*31+c.charCodeAt(0))>>>0;return {i:'grid',h:HK[n%HK.length]}};
const ib=(label,cls,icon,hue)=>{const k=look(label);return `<span class="ib ${cls||''} h-${hue||k.h}">${ico(icon||k.i)}</span>`};
const greet=()=>{const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening'};
const ini=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const ROLE={admin:'Administrator',teacher:'Teacher',parent:'Parent',student:'Pupil'};
const N=n=>'₦'+Number(n||0).toLocaleString('en-NG',{maximumFractionDigits:0});
const SUB={Homework:'Assignments to do','Notes':'Lesson notes','Check Results':'Term results and reports',Attendance:'Days present and absent',Timetable:'Weekly lessons',Communications:'Messages from school','Communication Book':'Notes to and from teacher','Daily Reports':'How the day went',Health:'Health records','Secure Pickup':'Who may collect your child',Transport:'Bus and route',Calendar:'Term dates and events',CBT:'Take online tests',Fees:'Pay and view receipts'};
const SHORT={'Check Results':'Results',Administration:'Admin','Communication Book':'Book',Communications:'Messages','Secure Pickup':'Pickup'};

const qa=(label,id,sub,badge,icon,hue)=>`<a class="qa" href="#${id}">${badge?`<i class="dot">${badge}</i>`:''}${ib(label,'',icon,hue)}<div><b>${esc(label)}</b>${sub?`<small>${esc(sub)}</small>`:''}</div></a>`;
const stat=(label,val,icon,hue,href)=>`<${href?`a href="#${href}"`:'div'} class="st2">${ib('',' ',icon,hue)}<div><b>${val}</b><span>${esc(label)}</span></div></${href?'a':'div'}>`;
const sec=(t,icon)=>`<h3 class="h3s">${icon?`<span class="ib xs h-blue">${ico(icon)}</span>`:''}${esc(t)}</h3>`;
const leafOK=a=>a.filter(x=>LEAF[x[1]]);
const hero=(u,set)=>{const d=new Date();return `<section class="hero2"><div class="av2">${esc(ini(u.full_name))}</div><div class="hm"><p>${greet()}</p><h2>${esc(u.full_name)}</h2><div class="chips"><span>${ROLE[u.role]||''}</span>${set.session?`<span>${esc(set.session)}</span>`:''}${set.term?`<span>${esc(set.term)}</span>`:''}</div></div><div class="hd"><b>${d.getDate()}</b><span>${d.toLocaleDateString('en-GB',{weekday:'short',month:'short'})}</span></div></section>`};

// Walk the menu tree the same way sb() does, so ids match.
function find(ns,gid,pre){pre=pre||[];for(const n of ns){const p=[...pre,n.n],id=slug(p.join('-'));if(id===gid)return {node:n,path:p,id};const r=find(n.c,gid,p);if(r)return r}return null}
const kids=(node,pre)=>node.c.map(c=>{const p=[...pre,c.n],id=slug(p.join('-'));return {n:c.n,id,group:c.c.length>0,count:c.c.length}});

async function dash(u){
  let set={};try{set=(await api('settings')).settings||{}}catch(e){}
  const tree=window.XTREE||[],top=tree.filter(n=>n.n!=='Dashboard');
  const groups=top.map(n=>{const id=slug(n.n);return qa(n.n,n.c.length?'sec-'+id:id,SUB[n.n]||(n.c.length?n.c.length+' option'+(n.c.length>1?'s':''):''))}).join('');
  let h=hero(u,set);
  if(u.role==='admin'){
    let s={},det={byClass:[]},pend=0,fs=null;
    await Promise.all([api('stats').then(x=>s=x).catch(()=>{}),api('stats-detail').then(x=>det=x).catch(()=>{}),api('lesson-notes').then(x=>{pend=x.notes.filter(n=>n.status==='submitted').length}).catch(()=>{}),api('fees/summary').then(x=>fs=x).catch(()=>{})]);
    if(pend)h+=`<a class="alr" href="#academics-lesson-plan-my-lesson-plan-s">${ico('bell')}<span><b>${pend} lesson note${pend>1?'s':''}</b> waiting for your approval</span>${ico('chevron')}</a>`;
    h+=`<div class="sg2">${stat('Pupils',s.pupils??0,'student','green','academics-students-view-all-students')}${stat('Teachers',s.teachers??0,'cap','purple','administration-users-all-users')}${stat('Parents',s.parents??0,'users','pink')}${stat('Classes',s.classes??0,'building','orange','tools-configuration-set-classes')}</div>`;
    if(fs&&fs.billed>0)h+=`<div class="sg2 two2">${stat('Fees collected this term',N(fs.paid),'wallet','green','fees-balances-and-payments')}${stat('Still outstanding',N(fs.outstanding),'alert','orange','fees-balances-and-payments')}</div>`;
    const quick=leafOK([['Register pupil','academics-students-register-students-online','Add a new pupil'],['Record payment','fees-record-payment','Cash, transfer or POS'],['Mark attendance','academics-attendance-mark-attendance','Today\'s register'],['Load scores','academics-results-load-score-online','CA and exam marks'],['Create a test','academics-cbt','Online CBT'+(fs&&fs.open_tests?' · '+fs.open_tests+' open':'')],['Create user','administration-users-create-user','Staff and parents']]);
    h+=sec('Quick actions','sparkle')+`<div class="qg">${quick.map(q=>qa(q[0],q[1],q[2])).join('')}</div>`;
    h+=sec('All sections','grid')+`<div class="qg">${groups}</div>`;
    if(det.byClass&&det.byClass.length)h+=sec('Pupils per class','chart')+`<div class="cardx">${bars(det.byClass.map(x=>[x.name,x.n]))}</div>`;
    return h;
  }
  if(u.role==='teacher'){
    let pn=0;try{pn=(await api('alerts/pending')).alerts.length}catch(e){}
    const quick=leafOK([['Mark attendance','academics-attendance-mark-attendance','Today\'s register'],['Load scores','academics-results-load-score-online','CA and exam marks'],['Lesson plans','academics-lesson-plan-create-lesson-plan','Plan your week'],['CBT tests','academics-cbt','Create and mark'],['Homework','academics-homework','Set assignments'],['Timetable','academics-timetable','Your lessons'],['Messages','messages-inbox','Inbox'],['Calendar','calendar','Term dates']]);
    if(pn)h+=`<a class="alr" href="#academics-attendance-absence-alerts">${ico('bell')}<span><b>${pn} absence alert${pn>1?'s':''}</b> waiting to be sent</span>${ico('chevron')}</a>`;
    h+=sec('Quick actions','sparkle')+`<div class="qg">${quick.map(q=>qa(q[0],q[1],q[2])).join('')}</div>`;
    h+=sec('All sections','grid')+`<div class="qg">${groups}</div>`;
    return h;
  }
  // pupils and parents: every menu item is a tile
  let extra='';
  if(u.role==='student'){
    try{const d=await api('cbt/exams');const w=d.exams.filter(x=>x.status==='published'&&!x.submitted_at).length;
      if(w)extra=`<a class="alr" href="#cbt">${ico('monitor')}<span><b>${w} test${w>1?'s':''}</b> waiting for you</span>${ico('chevron')}</a>`}catch(e){}
  }else{
    try{const d=await api('fees/mine');const b=d.children.reduce((a,c)=>a+c.balance,0);
      extra=b>0?`<a class="alr warn" href="#fees">${ico('wallet')}<span>School fees balance: <b>${N(b)}</b></span>${ico('chevron')}</a>`:(d.children.some(c=>c.total>0)?`<a class="alr ok2" href="#fees">${ico('clipcheck')}<span>School fees are <b>fully paid</b>. Thank you!</span>${ico('chevron')}</a>`:'')}catch(e){}
  }
  const tiles=top.map(n=>{const id=slug(n.n);return qa(n.n,n.c.length?'sec-'+id:id,SUB[n.n]||'')}).join('');
  return h+extra+sec('Your portal','grid')+`<div class="qg">${tiles}</div>`;
}

function section(gid){
  const f=find(window.XTREE||[],gid);
  if(!f)return '<p class="err">Section not found.</p>';
  const items=kids(f.node,f.path);
  const back=f.path.length>1?'sec-'+slug(f.path.slice(0,-1).join('-')):'dashboard';
  return `<div class="sh2"><a class="bk" href="#${back}">${ico('back')}</a>${ib(f.node.n,'')}<div><h2>${esc(f.node.n)}</h2><p>${items.length} option${items.length>1?'s':''}</p></div></div><div class="qg">${items.map(k=>qa(k.n,k.group?'sec-'+k.id:k.id,k.group?k.count+' option'+(k.count>1?'s':''):'')).join('')}</div>`;
}

window.XUI={
  ico,ib,look,dash,section,
  sbi:(label,lv)=>`<b class="ib ${lv?'xs':'s'} h-${look(label).h}">${ico(look(label).i)}</b>`,
  header:u=>`<header class="ah"><button class="hb" id="hb" aria-label="Menu">${ico('menu',22)}</button><a href="#dashboard" class="lg"><img src="/assets/images/portal-mark.svg" alt=""></a><h1>School Portal</h1><span class="av2 sm" title="${esc(u.full_name)}">${esc(ini(u.full_name))}</span><button class="hb" id="so" aria-label="Sign out">${ico('logout',20)}<span class="lbl">Sign out</span></button></header>`,
  sbHead:u=>`<div class="sbh"><span class="av2 sm">${esc(ini(u.full_name))}</span><div><b>${esc(u.full_name)}</b><small>${ROLE[u.role]||''}</small></div></div>`,
  bottom:(tree,u)=>{
    if(!tree.length)return '';
    const pri={admin:['Academics','Fees','Administration'],teacher:['Academics','Messages','Calendar'],student:['Homework','Check Results','Notes'],parent:['Check Results','Fees','Homework']};
    const names=(pri[u.role]||[]).filter(n=>tree.some(t=>t.n===n)).slice(0,3);
    const link=n=>{const nd=tree.find(t=>t.n===n);return (nd.c.length?'sec-':'')+slug(n)};
    const it=(k,i,l)=>`<a href="#${k}" data-k="${k}"><span class="pl">${ico(i)}</span><span>${esc(l)}</span></a>`;
    return `<nav class="bnav" id="bnav" aria-label="Main">${it('dashboard','home','Home')}${names.map(n=>it(link(n),look(n).i,SHORT[n]||n)).join('')}<button type="button" id="bmenu"><span class="pl">${ico('menu')}</span><span>Menu</span></button></nav><div class="scrim" id="scrim"></div>`;
  },
  toggleMenu:o=>{const sb=$('#sb');if(!sb)return;const open=typeof o==='boolean'?o:!sb.classList.contains('open');sb.classList.toggle('open',open);document.body.classList.toggle('menu-open',open)},
  wire:()=>{
    $('#hb').onclick=()=>XUI.toggleMenu();
    if($('#scrim'))$('#scrim').onclick=()=>XUI.toggleMenu(false);
    if($('#bmenu'))$('#bmenu').onclick=()=>XUI.toggleMenu();
    api('settings').then(d=>{const n=d.settings&&d.settings.school_name;const h=document.querySelector('.ah h1');if(n&&h)h.textContent=n}).catch(()=>{});
  },
  crumb:id=>{if(!id.startsWith('sec-'))return null;const f=find(window.XTREE||[],id.slice(4));return f?f.path.join(' > '):null},
  before:id=>{
    document.body.classList.remove('menu-open');
    const c=$('#c');if(c)c.innerHTML='<div class="skw"><div class="sk" style="width:45%;height:22px"></div><div class="sk" style="height:96px;margin-top:1rem"></div><div class="sk" style="height:96px;margin-top:.8rem"></div><div class="sk" style="width:70%;margin-top:.8rem"></div></div>';
  },
  after:id=>{
    const c=$('#c');if(c){c.classList.toggle('flat',id==='dashboard'||id.startsWith('sec-'));c.classList.remove('fx');void c.offsetWidth;c.classList.add('fx')}
    document.querySelectorAll('#bnav [data-k]').forEach(a=>{
      const k=a.dataset.k,g=k.replace(/^sec-/,'');
      a.classList.toggle('on',k==='dashboard'?id==='dashboard':(id===k||id===g||id.startsWith(g+'-')||id.startsWith('sec-'+g)));
    });
    window.scrollTo(0,0);
  }
};

if('serviceWorker' in navigator&&location.protocol==='https:')addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
})();
