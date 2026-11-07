/* School fees and CBT screens. Loaded after portal.js; uses its helpers ($, esc, api, row, tbl, O, okm, lab, dl, toast, AFTER, route). */
const XN=n=>'₦'+Number(n||0).toLocaleString('en-NG',{maximumFractionDigits:2});
const XD=d=>d?new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
const XDT=d=>d?new Date(d).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
const XST={pending:'Awaiting confirmation',success:'Paid',review:'Under review',voided:'Removed',failed:'Failed'};
const XMT={paystack:'Online',cash:'Cash',transfer:'Bank transfer',pos:'POS'};
const XCSS='border:1px solid #dbe5f5;border-radius:14px;padding:1rem;margin:1rem 0';

/* ---------- Receipt (opens a printable page) ---------- */
async function Xreceipt(id){
  const w=window.open('','_blank');
  if(!w){toast('Please allow pop-ups to see the receipt.');return}
  try{
    const r=(await api('fees/receipt?id='+id)).receipt;
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Receipt ${esc(r.reference)}</title><body style="font:16px/1.6 system-ui,sans-serif;max-width:560px;margin:2rem auto;padding:0 1rem;color:#1d2040">
<h2 style="margin:0">${esc(r.school||'School')}</h2><p style="margin:0 0 1rem;color:#555">Fee payment receipt</p><hr>
<table style="width:100%;border-collapse:collapse;margin:1rem 0">
<tr><td>Receipt no.</td><td style="text-align:right"><b>${esc(r.reference)}</b></td></tr>
<tr><td>Date</td><td style="text-align:right">${XD(r.paid_at)}</td></tr>
<tr><td>Pupil</td><td style="text-align:right">${esc(r.first_name+' '+r.last_name)} (${esc(r.admission_no)})</td></tr>
<tr><td>Class</td><td style="text-align:right">${esc(r.class||'')}</td></tr>
<tr><td>Session / term</td><td style="text-align:right">${esc(r.session)} · ${esc(r.term)}</td></tr>
<tr><td>Paid by</td><td style="text-align:right">${esc(XMT[r.method]||r.method)}</td></tr>
<tr><td style="padding-top:.8rem"><b>Amount paid</b></td><td style="text-align:right;padding-top:.8rem;font-size:1.3rem"><b>${XN(r.amount)}</b></td></tr></table><hr>
<p>Fees this term: ${XN(r.total)}<br>Total paid so far: ${XN(r.paid)}<br><b>Balance: ${XN(r.balance)}</b></p>
${r.note?`<p style="color:#555">Note: ${esc(r.note)}</p>`:''}
<p style="color:#777;font-size:.85rem;margin-top:2rem">This receipt was produced by the school portal.</p></body>`);
    w.document.close();w.focus();setTimeout(()=>w.print(),400);
  }catch(x){w.close();toast(x.message)}
}

/* ---------- Admin: school name and bank details ---------- */
async function XschoolInfo(){
  const s=(await api('settings')).settings;
  AFTER=()=>$('#xf').onsubmit=async e=>{e.preventDefault();try{
    await api('settings','POST',{key:'school_name',value:$('#xn').value});
    await api('settings','POST',{key:'bank_details',value:$('#xb').value});
    $('#xo').textContent='Saved.';
  }catch(x){$('#e').textContent=x.message}};
  return `<form id="xf">${row('School name (shown on receipts)',`<input id="xn" value="${esc(s.school_name||'')}">`)}${row('Bank account details (shown to parents who prefer to pay by transfer)',`<textarea id="xb" rows="4" placeholder="Bank name&#10;Account name&#10;Account number">${esc(s.bank_details||'')}</textarea>`)}<button class="gb">Save</button> <span id="xo"></span><p class="err" id="e"></p></form>`;
}

/* ---------- Admin: fee structure ---------- */
async function XfeeStruct(){
  const cl=(await api('classes')).classes;
  AFTER=()=>{
    const load=async()=>{
      const c=$('#xc').value;if(!c){$('#xl').innerHTML='';return}
      try{
        const d=await api('fees/structure?class_id='+c);
        $('#xl').innerHTML=`<p class="lead">${esc(d.session)} · ${esc(d.term)}</p>`+
          (d.items.length?tbl(['Item','Amount',''],d.items.map(x=>[esc(x.item),XN(x.amount),`<button type="button" class="gb sm red" data-del="${x.id}">Remove</button>`]))+`<p><b>Total per pupil: ${XN(d.items.reduce((a,x)=>a+x.amount,0))}</b></p>`:'<p class="lead">No fees set for this class yet.</p>');
        document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{try{await api('fees/structure/delete','POST',{id:+b.dataset.del});load()}catch(x){toast(x.message)}});
      }catch(x){$('#xl').innerHTML=`<p class="err">${esc(x.message)}</p>`}
    };
    $('#xc').onchange=load;
    $('#xf').onsubmit=async e=>{e.preventDefault();$('#e').textContent='';
      const all=$('#xall').checked;if(!all&&!$('#xc').value){$('#e').textContent='Choose a class first.';return}
      try{await api('fees/structure','POST',{class_id:all?'all':$('#xc').value,item:$('#xi').value,amount:$('#xa').value});$('#xi').value='';$('#xa').value='';load()}catch(x){$('#e').textContent=x.message}};
  };
  return `<p class="lead">Fees are set for the current session and term.</p>${row('Class',`<select id="xc"><option value="">Choose class</option>${O(cl,'id','name')}</select>`)}<div id="xl"></div><form id="xf"><h3>Add a fee item</h3>${row('Item *','<input id="xi" required maxlength="100" placeholder="e.g. Tuition, Uniform, Books">')}${row('Amount (₦) *','<input id="xa" type="number" min="0" step="0.01" required>')}${lab('<input type="checkbox" id="xall"> Add this item to every class')}<button class="gb">Add</button><p class="err" id="e"></p></form>`;
}

/* ---------- Admin: record a payment ---------- */
async function XrecordPay(){
  const [cl,st]=await Promise.all([api('classes'),api('students')]);
  const kids=st.students.filter(x=>x.status==='active');
  AFTER=()=>{
    $('#xc').onchange=()=>{const c=+$('#xc').value;$('#xs').innerHTML='<option value="">Choose pupil</option>'+kids.filter(x=>x.class_id===c).map(x=>`<option value="${x.id}">${esc(x.last_name+' '+x.first_name)} (${esc(x.admission_no)})</option>`).join('');$('#xst').innerHTML=''};
    $('#xs').onchange=async()=>{
      if(!$('#xs').value){$('#xst').innerHTML='';return}
      try{const d=await api('fees/statement?student_id='+$('#xs').value);
        $('#xst').innerHTML=`<p class="lead">Fees ${XN(d.total)} · Paid ${XN(d.paid)} · <b>Balance ${XN(d.balance)}</b></p>`;
        if(d.balance)$('#xa').value=d.balance}catch(x){$('#e').textContent=x.message}};
    $('#xf').onsubmit=async e=>{e.preventDefault();$('#e').textContent='';
      try{const d=await api('fees/record','POST',{student_id:$('#xs').value,amount:$('#xa').value,method:$('#xm').value,note:$('#xn').value});
        $('#xr').innerHTML=okm('Payment recorded.')+' <button type="button" class="gb sm" id="xrc">Print receipt</button>';
        $('#xrc').onclick=()=>Xreceipt(d.id);$('#xa').value='';$('#xn').value='';$('#xs').onchange()}catch(x){$('#e').textContent=x.message}};
  };
  return `<form id="xf">${row('Class',`<select id="xc"><option value="">Choose class</option>${O(cl.classes,'id','name')}</select>`)}${row('Pupil *','<select id="xs" required><option value="">Choose a class first</option></select>')}<div id="xst"></div>${row('Amount received (₦) *','<input id="xa" type="number" min="1" step="0.01" required>')}${row('Paid by',`<select id="xm"><option value="cash">Cash</option><option value="transfer">Bank transfer</option><option value="pos">POS</option></select>`)}${row('Teller or reference note','<input id="xn" maxlength="200">')}<button class="gb">Record payment</button><p class="err" id="e"></p><div id="xr"></div></form>`;
}

/* ---------- Admin: balances and payments ---------- */
async function XbalPay(){
  const cl=(await api('classes')).classes;
  AFTER=()=>{
    const load=async()=>{
      const c=$('#xc').value;if(!c){$('#xl').innerHTML='';return}
      try{
        const [b,p]=await Promise.all([api('fees/balances?class_id='+c),api('fees/payments?class_id='+c)]);
        const bal=x=>Math.max(0,x.billed-x.paid);
        const tb=b.rows.reduce((a,x)=>a+x.billed,0),tp=b.rows.reduce((a,x)=>a+x.paid,0),to=b.rows.reduce((a,x)=>a+bal(x),0);
        $('#xl').innerHTML=`<p class="lead">${esc(b.session)} · ${esc(b.term)}</p>`+
          tbl(['S/N','Admission no.','Pupil','Fees','Paid','Balance'],b.rows.map((x,i)=>[i+1,esc(x.admission_no),esc(x.last_name+' '+x.first_name),XN(x.billed),XN(x.paid),'<b>'+XN(bal(x))+'</b>']))+
          `<p><b>Fees ${XN(tb)} · Paid ${XN(tp)} · Outstanding ${XN(to)}</b></p><button type="button" class="gb sm" id="xcsv">Download CSV</button><h3 style="margin:1.4rem 0 .6rem">Payments this term</h3>`+
          (p.rows.length?tbl(['Date','Pupil','Method','Amount','Status',''],p.rows.map(x=>[XD(x.created_at),esc(x.last_name+' '+x.first_name),esc(XMT[x.method]||x.method),XN(x.amount),esc(XST[x.status]||x.status)+(x.status==='review'&&x.note?`<br><small>${esc(x.note)}</small>`:''),
            (x.status==='success'?`<button type="button" class="gb sm" data-rc="${x.id}">Receipt</button> `:'')+(x.status==='success'&&x.method!=='paystack'?`<button type="button" class="gb sm red" data-vd="${x.id}">Remove</button>`:'')])):'<p class="lead">No payments yet.</p>');
        $('#xcsv').onclick=()=>dl('fees-'+b.session.replace(/\W+/g,'-')+'-'+b.term.replace(/\W+/g,'-')+'.csv',[['Admission no.','Pupil','Fees','Paid','Balance'],...b.rows.map(x=>[x.admission_no,x.last_name+' '+x.first_name,x.billed,x.paid,bal(x)])]);
        document.querySelectorAll('[data-rc]').forEach(b=>b.onclick=()=>Xreceipt(b.dataset.rc));
        document.querySelectorAll('[data-vd]').forEach(b=>b.onclick=async()=>{const why=prompt('Why are you removing this payment? (e.g. entered by mistake)');if(why===null)return;try{await api('fees/void','POST',{id:+b.dataset.vd,reason:why});load()}catch(x){toast(x.message)}});
      }catch(x){$('#xl').innerHTML=`<p class="err">${esc(x.message)}</p>`}
    };
    $('#xc').onchange=load;
  };
  return `${row('Class',`<select id="xc"><option value="">Choose class</option>${O(cl,'id','name')}</select>`)}<div id="xl"></div>`;
}

/* ---------- Parent / pupil: fees page ---------- */
async function XfeesMine(){
  const ref=new URLSearchParams(location.search).get('reference');
  let note=ref?'<p class="lead">Thank you. If your payment went through, it will show below.</p>':'';
  let d=await api('fees/mine');
  const pend=d.children.some(c=>c.payments.some(p=>p.status==='pending'));
  if(d.can_pay&&(ref||pend)){
    try{
      const v=await api('fees/verify','POST',ref?{reference:ref}:{});
      if(v.results.length){
        d=await api('fees/mine');
        if(ref){const s=v.results[0].status;
          note=s==='success'?okm('Payment received. Thank you!'):s==='failed'?'<p class="err">That payment was not completed. You have not been charged.</p>':'<p class="lead">Your payment is still being confirmed. Please check again in a few minutes.</p>'}
      }
    }catch(x){}
  }
  if(ref)history.replaceState(null,'',location.pathname+'#fees');
  AFTER=()=>{
    document.querySelectorAll('[data-rc]').forEach(b=>b.onclick=()=>Xreceipt(b.dataset.rc));
    document.querySelectorAll('.xpay').forEach(f=>{
      try{const m=localStorage.getItem('xpayEmail');if(m&&!f.querySelector('[name=email]').value)f.querySelector('[name=email]').value=m}catch(e){}
      f.onsubmit=async e=>{e.preventDefault();const er=f.querySelector('.err');er.textContent='';
        try{const email=f.querySelector('[name=email]').value;try{localStorage.setItem('xpayEmail',email)}catch(e){}
          const r=await api('fees/pay','POST',{student_id:f.dataset.id,amount:f.querySelector('[name=amount]').value,email});
          location.href=r.url}catch(x){er.textContent=x.message}};
    });
  };
  const bank=d.bank?`<div style="${XCSS}"><h3>Pay by bank transfer</h3><pre style="white-space:pre-wrap;font:inherit">${esc(d.bank)}</pre><p class="lead">After you pay, tell the school office so the payment can be recorded.</p></div>`:'';
  return `<h2>School fees</h2>${note}`+(d.children.length?d.children.map(c=>`<div style="${XCSS}"><h3>${esc(c.student.name)}</h3><p class="lead">${esc(c.student.class||'')} · ${esc(d.session)} · ${esc(d.term)}</p>`+
    (c.items.length?tbl(['Item','Amount'],c.items.map(i=>[esc(i.item),XN(i.amount)])):'<p class="lead">No fees have been set for this class yet.</p>')+
    `<p style="margin:.6rem 0"><b>Total ${XN(c.total)} · Paid ${XN(c.paid)} · Balance ${XN(c.balance)}</b></p>`+
    (c.payments.length?tbl(['Date','Method','Amount','Status',''],c.payments.map(p=>[XD(p.paid_at||p.created_at),esc(XMT[p.method]||p.method),XN(p.amount),esc(XST[p.status]||p.status),p.status==='success'?`<button type="button" class="gb sm" data-rc="${p.id}">Receipt</button>`:''])):'')+
    (d.can_pay&&c.balance>0?`<form class="xpay" data-id="${c.student.id}" style="background:none;padding:0;border:0;margin-top:1rem"><h4>Pay online</h4>${row('Amount (₦)',`<input name="amount" type="number" min="1" max="${c.balance}" step="0.01" value="${c.balance}" required>`)}${row('Your email (for the payment receipt)','<input name="email" type="email" required>')}<button class="gb">Pay now</button><p class="err"></p></form>`:'')+`</div>`).join('')+bank:'<p class="lead">No pupil is linked to your account yet.</p>');
}

/* ---------- CBT: teachers and admin ---------- */
function XparseQ(t){
  const out=[];let cur=null;
  const push=()=>{if(cur&&cur.q&&cur.a&&cur.b)out.push(cur);cur=null};
  for(const raw of String(t).split(/\r?\n/)){
    const l=raw.trim();if(!l)continue;let m;
    if((m=l.match(/^(?:q(?:uestion)?\s*)?\d+\s*[.):-]\s*(.+)$/i))){push();cur={q:m[1],a:'',b:'',c:'',d:'',answer:'',marks:1};continue}
    if(!cur)continue;
    if((m=l.match(/^\(?([a-d])\s*[.):]\s*(.+)$/i))){cur[m[1].toLowerCase()]=m[2];continue}
    if((m=l.match(/^(?:answer|ans|correct)\s*[:=-]?\s*\(?([a-d])\)?/i))){cur.answer=m[1].toLowerCase();continue}
    if(!cur.a)cur.q+=' '+l;
  }
  push();return out;
}
const XCBTS={draft:'Draft',published:'Open to pupils',closed:'Closed'};

async function XcbtStaff(){
  const [ex,cl]=await Promise.all([api('cbt/exams'),api('my-classes')]);
  AFTER=()=>{
    $('#xc').onchange=async()=>{
      $('#xs').innerHTML='<option value="">Choose subject</option>';if(!$('#xc').value)return;
      try{$('#xs').innerHTML='<option value="">Choose subject</option>'+O((await api('my-subjects?class_id='+$('#xc').value)).subjects,'id','name')}catch(x){$('#e').textContent=x.message}};
    $('#xf').onsubmit=async e=>{e.preventDefault();$('#e').textContent='';
      try{const d=await api('cbt/exams','POST',{class_id:$('#xc').value,subject_id:$('#xs').value,title:$('#xt').value,duration_min:$('#xd').value});XcbtEdit(d.id)}catch(x){$('#e').textContent=x.message}};
    document.querySelectorAll('[data-act]').forEach(b=>b.onclick=async()=>{
      const id=+b.dataset.id,a=b.dataset.act;
      if(a==='edit')return XcbtEdit(id);
      if(a==='res')return XcbtRes(id);
      try{
        if(a==='del'){if(!confirm('Delete this test and all its results? This cannot be undone.'))return;await api('cbt/delete','POST',{id})}
        else{if(a==='closed'&&!confirm('Close this test? Pupils still writing will be submitted automatically.'))return;await api('cbt/status','POST',{id,status:a})}
        route();
      }catch(x){toast(x.message)}});
  };
  return `<h2>Computer-based tests</h2>`+(ex.exams.length?tbl(['Test','Class','Subject','Questions','Minutes','Taken','Status',''],ex.exams.map(x=>[esc(x.title),esc(x.class),esc(x.subject),x.qn,x.duration_min,x.taken,esc(XCBTS[x.status]),
    `<button type="button" class="gb sm" data-act="edit" data-id="${x.id}">${x.taken?'View':'Edit'}</button> <button type="button" class="gb sm" data-act="res" data-id="${x.id}">Results</button> `+
    (x.status==='draft'?`<button type="button" class="gb sm" data-act="published" data-id="${x.id}">Open to pupils</button> `:x.status==='published'?`<button type="button" class="gb sm" data-act="closed" data-id="${x.id}">Close</button> `:'')+
    `<button type="button" class="gb sm red" data-act="del" data-id="${x.id}">Delete</button>`])):'<p class="lead">No tests yet. Create one below.</p>')+
    `<form id="xf"><h3>Create a test</h3>${row('Class *',`<select id="xc" required><option value="">Choose class</option>${O(cl.classes,'id','name')}</select>`)}${row('Subject *','<select id="xs" required><option value="">Choose a class first</option></select>')}${row('Title *','<input id="xt" required maxlength="150" placeholder="e.g. Mathematics Mid-Term Test">')}${row('Time allowed (minutes) *','<input id="xd" type="number" min="1" max="240" value="30" required>')}<button class="gb">Create and add questions</button><p class="err" id="e"></p></form>`;
}

async function XcbtEdit(id){
  const d=await api('cbt/exam?id='+id),ex=d.exam,lk=d.locked;
  let Q=d.questions.map(q=>({q:q.q,a:q.a,b:q.b||'',c:q.c||'',d:q.d||'',answer:q.answer,marks:q.marks}));
  const dis=lk?' disabled':'';
  const draw=()=>{
    $('#c').innerHTML=`<p><a href="#academics-cbt" id="xback">← All tests</a></p><h2>${esc(ex.title)}</h2>`+(lk?'<p class="lead">Pupils have started this test, so the questions are locked.</p>':'')+
    `<form id="xf" style="background:none;padding:0;border:0">${row('Title',`<input id="xt" value="${esc(ex.title)}">`)}${row('Instructions for pupils',`<textarea id="xi" rows="2">${esc(ex.instructions||'')}</textarea>`)}${row('Time allowed (minutes)',`<input id="xd" type="number" min="1" max="240" value="${ex.duration_min}"${dis}>`)}${lab(`<input type="checkbox" id="xr"${ex.show_result?' checked':''}> Show pupils their score after submitting`)}`+
    (lk?'':`<h3 style="margin-top:1.2rem">Paste questions</h3><p class="lead">Format: a numbered question, options A to D on their own lines, then "Answer: B".</p><textarea id="xp" rows="6" placeholder="1. What is 2 + 2?&#10;A. 3&#10;B. 4&#10;C. 5&#10;D. 6&#10;Answer: B"></textarea><p><button type="button" class="gb sm" id="xpb">Add pasted questions</button></p>`)+
    `<h3 style="margin-top:1.2rem">Questions (${Q.length})</h3>`+Q.map((q,i)=>`<div style="${XCSS}" data-i="${i}"><p><b>Question ${i+1}</b>${lk?'':` <button type="button" class="gb sm red" data-rm="${i}">Remove</button>`}</p><textarea data-k="q" rows="2"${dis}>${esc(q.q)}</textarea>${['a','b','c','d'].map(k=>`<div class="fr"><label>${k.toUpperCase()}${k==='c'||k==='d'?' (optional)':''}</label><input data-k="${k}" value="${esc(q[k])}"${dis}></div>`).join('')}<div class="fr"><label>Correct answer</label><select data-k="answer"${dis}>${['','a','b','c','d'].map(k=>`<option value="${k}"${q.answer===k?' selected':''}>${k?k.toUpperCase():'Choose'}</option>`).join('')}</select></div><div class="fr"><label>Marks</label><input data-k="marks" type="number" min="1" step="0.5" value="${q.marks}"${dis}></div></div>`).join('')+
    (lk?'':`<p><button type="button" class="gb sm" id="xadd">+ Add a question</button></p>`)+
    `<button class="gb">Save test</button> <span id="xo"></span><p class="err" id="e"></p></form>`;
    const sync=()=>{ex.title=$('#xt').value;ex.instructions=$('#xi').value;ex.duration_min=$('#xd').value;ex.show_result=$('#xr').checked};
    document.querySelectorAll('[data-i] [data-k]').forEach(el=>el.oninput=el.onchange=()=>{Q[+el.closest('[data-i]').dataset.i][el.dataset.k]=el.value});
    document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{sync();Q.splice(+b.dataset.rm,1);draw()});
    if(!lk){
      $('#xadd').onclick=()=>{sync();Q.push({q:'',a:'',b:'',c:'',d:'',answer:'',marks:1});draw()};
      $('#xpb').onclick=()=>{sync();const n=XparseQ($('#xp').value);if(!n.length){$('#e').textContent='No questions were found. Check the format.';return}Q=Q.concat(n);draw();$('#xo').textContent=n.length+' question(s) added. Check each correct answer, then save.'};
    }
    $('#xback').onclick=e=>{e.preventDefault();location.hash==='#academics-cbt'?route():location.hash='academics-cbt'};
    $('#xf').onsubmit=async e=>{e.preventDefault();$('#e').textContent='';sync();
      try{await api('cbt/exams','POST',{id:ex.id,class_id:ex.class_id,subject_id:ex.subject_id,title:ex.title,instructions:ex.instructions,duration_min:ex.duration_min,show_result:ex.show_result});
        if(!lk)await api('cbt/questions','POST',{exam_id:ex.id,questions:Q});
        $('#xo').textContent='Saved.'}catch(x){$('#e').textContent=x.message}};
  };
  draw();
}

async function XcbtRes(id){
  const d=await api('cbt/results?id='+id);
  const done=d.rows.filter(x=>x.submitted_at&&x.total);
  const avg=done.length?Math.round(done.reduce((a,x)=>a+x.score/x.total*100,0)/done.length):null;
  $('#c').innerHTML=`<p><a href="#academics-cbt" id="xback">← All tests</a></p><h2>${esc(d.exam.title)}: results</h2><p class="lead">${done.length} of ${d.rows.length} pupils have submitted${avg!==null?` · class average ${avg}%`:''}.</p>`+
    tbl(['S/N','Admission no.','Pupil','Score','Out of','%','Submitted'],d.rows.map((x,i)=>[i+1,esc(x.admission_no),esc(x.last_name+' '+x.first_name),x.submitted_at?x.score:(x.started_at?'<i>writing</i>':'-'),x.submitted_at?x.total:'',x.submitted_at&&x.total?Math.round(x.score/x.total*100)+'%':'',XDT(x.submitted_at)]))+
    '<p><button type="button" class="gb sm" id="xcsv">Download CSV</button></p>';
  $('#xcsv').onclick=()=>dl('cbt-'+id+'.csv',[['Admission no.','Pupil','Score','Out of','Submitted'],...d.rows.map(x=>[x.admission_no,x.last_name+' '+x.first_name,x.submitted_at?x.score:'',x.submitted_at?x.total:'',x.submitted_at||''])]);
  $('#xback').onclick=e=>{e.preventDefault();location.hash==='#academics-cbt'?route():location.hash='academics-cbt'};
}

/* ---------- CBT: pupils ---------- */
async function XcbtStudent(){
  const d=await api('cbt/exams');
  AFTER=()=>document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>XcbtTake(+b.dataset.go,b.dataset.re==='1'));
  return `<h2>Tests</h2>`+(d.exams.length?tbl(['Test','Subject','Time','Questions','Status',''],d.exams.map(x=>{
    const sub=!!x.submitted_at;
    return [esc(x.title),esc(x.subject),x.duration_min+' min',x.qn,
      sub?'Submitted'+(x.score!=null?` · <b>${x.score}/${x.total}</b>`:''):x.started_at?'In progress':'Not started',
      sub?'':`<button type="button" class="gb sm" data-go="${x.id}">${x.started_at?'Continue':'Start test'}</button>`]})):'<p class="lead">There are no tests for you right now.</p>');
}

function XcbtDone(d){
  return `<div style="${XCSS};text-align:center"><h2>Test submitted</h2><p class="lead" style="margin:.5rem auto">${esc(d.title||'')}</p>`+(d.score!=null?`<p style="font-size:2rem;margin:.8rem 0"><b>${d.score} / ${d.total}</b></p>`:'<p class="lead">Your teacher will share your result.</p>')+`<p><button type="button" class="gb" onclick="route()">Back to tests</button></p></div>`;
}

async function XcbtTake(id,again){
  clearInterval(window.XT1);clearInterval(window.XT2);
  if(!again&&!confirm('Start this test now? The timer begins immediately and cannot be paused.'))return;
  let d;try{d=await api('cbt/start','POST',{exam_id:id})}catch(x){toast(x.message);return}
  if(d.done){$('#c').innerHTML=XcbtDone(d);return}
  const Qs=d.questions,A={...d.answers};
  let i=0,end=Date.now()+d.remaining*1000,dirty=false,busy=false,retry=0;
  window.onbeforeunload=()=>true;
  const stop=()=>{clearInterval(window.XT1);clearInterval(window.XT2);window.onbeforeunload=null};
  const fmt=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
  const submit=async auto=>{
    if(busy)return;
    const left=Qs.filter(q=>!A[q.id]).length;
    if(!auto&&!confirm(left?`You have ${left} unanswered question(s). Submit anyway?`:'Submit your test now?'))return;
    busy=true;
    try{const r=await api('cbt/submit','POST',{exam_id:id,answers:A});stop();$('#c').innerHTML=XcbtDone(r)}
    catch(x){busy=false;retry=Date.now()+5000;toast('Could not submit. Check your connection'+(auto?'. Trying again...':' and press Submit again.'))}
  };
  const draw=()=>{
    const q=Qs[i];
    $('#c').innerHTML=`<div id="xq"><div class="xbar"><b>${esc(d.exam.title)}</b><span id="xt" class="xtm"></span></div>`+
      (i===0&&d.exam.instructions?`<p class="lead">${esc(d.exam.instructions)}</p>`:'')+
      `<p class="xqn">Question ${i+1} of ${Qs.length}</p><h3 class="xqt">${esc(q.q)}</h3>`+
      ['a','b','c','d'].filter(k=>q[k]).map(k=>`<label class="xo${A[q.id]===k?' on':''}"><input type="radio" name="xo" value="${k}"${A[q.id]===k?' checked':''}><span><b>${k.toUpperCase()}.</b> ${esc(q[k])}</span></label>`).join('')+
      `<div class="xnav">${i>0?'<button type="button" class="gb sm" id="xprev">← Previous</button>':'<span></span>'}${i<Qs.length-1?'<button type="button" class="gb sm" id="xnext">Next →</button>':'<button type="button" class="gb sm" id="xsub" style="background:#2e9e3e">Submit test</button>'}</div>`+
      `<div class="xgrid">${Qs.map((z,n)=>`<button type="button" data-n="${n}" class="${n===i?'cur ':''}${A[z.id]?'ans':''}">${n+1}</button>`).join('')}</div></div>`;
    document.querySelectorAll('input[name=xo]').forEach(r=>r.onchange=()=>{A[q.id]=r.value;dirty=true;draw()});
    if($('#xprev'))$('#xprev').onclick=()=>{i--;draw()};
    if($('#xnext'))$('#xnext').onclick=()=>{i++;draw()};
    if($('#xsub'))$('#xsub').onclick=()=>submit(false);
    document.querySelectorAll('.xgrid button').forEach(b=>b.onclick=()=>{i=+b.dataset.n;draw()});
    tick();
  };
  const tick=()=>{
    if(!$('#xq')){stop();return}
    const s=Math.max(0,Math.round((end-Date.now())/1000));
    $('#xt').textContent=fmt(s);$('#xt').classList.toggle('low',s<=60);
    if(s<=0&&!busy&&Date.now()>=retry)submit(true);
  };
  window.XT1=setInterval(tick,1000);
  window.XT2=setInterval(async()=>{
    if(!dirty||busy||!$('#xq'))return;dirty=false;
    try{const r=await api('cbt/save','POST',{exam_id:id,answers:A});if(r.remaining!=null)end=Date.now()+r.remaining*1000}catch(x){dirty=true}
  },15000);
  draw();
}

window.EXT={
  'fees-fee-structure':XfeeStruct,
  'fees-record-payment':XrecordPay,
  'fees-balances-and-payments':XbalPay,
  'tools-configuration-school-name-and-bank-details':XschoolInfo,
  'fees':XfeesMine,
  'academics-cbt':XcbtStaff,
  'cbt':XcbtStudent
};
