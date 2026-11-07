import crypto from 'node:crypto';
import {sql,tx,json} from './_lib.js';

const KEY=()=>process.env.PAYSTACK_SECRET_KEY||'';
const NOSET='Set the session and term first (Tools > Configuration > Set Session and Term).';
const S=(v,n=500)=>String(v??'').trim().slice(0,n);
const r2=n=>Math.round(n*100)/100;
const setting=async k=>(await sql`select value from settings where key=${k}`)[0]?.value||null;
const period=async()=>({ses:await setting('session'),tm:await setting('term')});
const isMine=async(u,sid)=>(await sql`select 1 from students s where s.id=${sid} and (s.user_id=${u.id} or s.id in (select student_id from parent_students where parent_id=${u.id})) limit 1`).length>0;
const canSub=async(u,c,s)=>u.role==='admin'||(await sql`select 1 from teacher_assign where teacher_id=${u.id} and class_id=${c} and subject_id=${s} limit 1`).length>0;
const adminOnly=()=>json(403,{error:'Only the administrator can do this.'});

/* ---------- Paystack ---------- */
async function ps(path,opt={}){
  const r=await fetch('https://api.paystack.co'+path,{...opt,headers:{authorization:'Bearer '+KEY(),'content-type':'application/json'}});
  const d=await r.json().catch(()=>({}));
  return {ok:r.ok,d};
}

// Ask Paystack what really happened to a payment and update our record. Safe to call many times.
async function settle(ref){
  const p=(await sql`select id,amount::float8 as amount,status from fee_payments where reference=${ref} and method='paystack'`)[0];
  if(!p)return 'unknown';
  if(p.status!=='pending')return p.status;
  const {ok,d}=await ps('/transaction/verify/'+encodeURIComponent(ref));
  const t=d&&d.data;
  if(!ok||!t)return 'pending';
  if(t.status==='success'){
    if(t.amount!==Math.round(p.amount*100)||t.currency!=='NGN'){
      await sql`update fee_payments set status='review',note='Amount from Paystack did not match. Check the Paystack dashboard.' where id=${p.id} and status='pending'`;
      return 'review';
    }
    await sql`update fee_payments set status='success',paid_at=now() where id=${p.id} and status='pending'`;
    return 'success';
  }
  if(t.status==='failed'||t.status==='reversed'){
    await sql`update fee_payments set status='failed' where id=${p.id} and status='pending'`;
    return 'failed';
  }
  return 'pending'; // abandoned or still open: the parent may yet complete it
}

async function webhook(e){
  const raw=e.isBase64Encoded?Buffer.from(e.body||'','base64').toString():(e.body||'');
  const sig=String((e.headers||{})['x-paystack-signature']||'');
  const exp=crypto.createHmac('sha512',KEY()).update(raw).digest('hex');
  if(!KEY()||sig.length!==exp.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(exp)))return json(401,{error:'Bad signature.'});
  let ev;try{ev=JSON.parse(raw)}catch(x){return json(400,{error:'Bad body.'})}
  if(ev.event==='charge.success'&&ev.data&&ev.data.reference)await settle(String(ev.data.reference));
  return json(200,{ok:true});
}

/* ---------- Fees ---------- */
async function statement(sid,ses,tm){
  const s=(await sql`select s.id,s.admission_no,s.first_name,s.last_name,s.class_id,c.name as class from students s left join classes c on c.id=s.class_id where s.id=${sid}`)[0];
  if(!s)return null;
  const items=await sql`select id,item,amount::float8 as amount from fee_structure where class_id=${s.class_id} and session=${ses} and term=${tm} order by id`;
  const pays=await sql`select id,amount::float8 as amount,method,reference,status,note,created_at,paid_at from fee_payments where student_id=${sid} and session=${ses} and term=${tm} and status in ('success','pending','review') order by created_at desc`;
  const total=r2(items.reduce((a,x)=>a+x.amount,0)),paid=r2(pays.filter(p=>p.status==='success').reduce((a,x)=>a+x.amount,0));
  return {student:{id:s.id,name:s.first_name+' '+s.last_name,admission_no:s.admission_no,class:s.class},items,payments:pays,total,paid,balance:Math.max(0,r2(total-paid))};
}

async function fees(e,r,m,b,u,Q){
  const isA=u.role==='admin',{ses,tm}=await period();

  if(r==='fees/mine'&&m==='GET'){
    if(!['parent','student'].includes(u.role))return json(403,{error:'Not allowed.'});
    if(!ses||!tm)return json(400,{error:NOSET});
    const ids=u.role==='parent'?await sql`select student_id as id from parent_students where parent_id=${u.id}`:await sql`select id from students where user_id=${u.id}`;
    const kids=[];for(const x of ids)kids.push(await statement(x.id,ses,tm));
    return json(200,{session:ses,term:tm,children:kids.filter(Boolean),can_pay:u.role==='parent'&&!!KEY(),bank:await setting('bank_details'),school:await setting('school_name')});
  }

  if(r==='fees/pay'&&m==='POST'){
    if(u.role!=='parent')return json(403,{error:'Only a parent account can pay online.'});
    if(!KEY())return json(503,{error:'Online payment is not set up yet. Please pay at the school office or by bank transfer.'});
    if(!ses||!tm)return json(400,{error:NOSET});
    if(!(await isMine(u,b.student_id)))return json(403,{error:'Not allowed.'});
    const st=await statement(b.student_id,ses,tm);
    if(!st||!st.total)return json(400,{error:'No fees have been set for this class yet.'});
    if(st.balance<=0)return json(400,{error:'There is no outstanding balance.'});
    const amt=r2(Number(b.amount)),min=Math.min(100,st.balance);
    if(!(amt>=min)||amt>st.balance+0.001)return json(400,{error:'Enter an amount of at least ₦'+min+' and not more than the balance.'});
    const email=S(b.email,120);
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return json(400,{error:'Enter a valid email address for your payment receipt.'});
    const ref=('PS-'+Date.now().toString(36)+crypto.randomBytes(4).toString('hex')).toUpperCase();
    await sql`insert into fee_payments(student_id,session,term,amount,method,reference,status,payer_id) values(${b.student_id},${ses},${tm},${amt},'paystack',${ref},'pending',${u.id})`;
    const origin=process.env.URL||('https://'+e.headers.host);
    const {ok,d}=await ps('/transaction/initialize',{method:'POST',body:JSON.stringify({email,amount:Math.round(amt*100),currency:'NGN',reference:ref,callback_url:origin+'/parent.html',metadata:{student_id:b.student_id,session:ses,term:tm}})});
    if(!ok||!d.data||!d.data.authorization_url){
      await sql`update fee_payments set status='failed',note='Could not start payment' where reference=${ref}`;
      return json(502,{error:'Could not start the payment. Please try again.'});
    }
    return json(200,{url:d.data.authorization_url,reference:ref});
  }

  if(r==='fees/verify'&&m==='POST'){
    if(!KEY())return json(200,{results:[]});
    const refs=b.reference
      ?await sql`select reference from fee_payments where reference=${S(b.reference,80)} and payer_id=${u.id} and status='pending'`
      :await sql`select reference from fee_payments where payer_id=${u.id} and status='pending' and created_at>now()-interval '3 days' order by created_at desc limit 10`;
    const out=[];for(const x of refs)out.push({reference:x.reference,status:await settle(x.reference)});
    return json(200,{results:out});
  }

  if(r==='fees/receipt'&&m==='GET'){
    const p=(await sql`select p.id,p.amount::float8 as amount,p.method,p.reference,p.session,p.term,p.note,p.paid_at,p.student_id,s.first_name,s.last_name,s.admission_no,c.name as class from fee_payments p join students s on s.id=p.student_id left join classes c on c.id=s.class_id where p.id=${+Q.id||0} and p.status='success'`)[0];
    if(!p)return json(404,{error:'Receipt not found.'});
    if(!isA&&!(await isMine(u,p.student_id)))return json(403,{error:'Not allowed.'});
    const st=await statement(p.student_id,p.session,p.term);
    return json(200,{receipt:{...p,total:st.total,paid:st.paid,balance:st.balance,school:await setting('school_name')}});
  }

  // everything below is for the administrator
  if(!isA)return adminOnly();
  if(!ses||!tm)return json(400,{error:NOSET});

  if(r==='fees/summary'&&m==='GET'){
    const a=(await sql`select coalesce(sum(b),0)::float8 as billed,coalesce(sum(p),0)::float8 as paid,coalesce(sum(greatest(0,b-p)),0)::float8 as outstanding from (select (select coalesce(sum(f.amount),0) from fee_structure f where f.class_id=s.class_id and f.session=${ses} and f.term=${tm}) as b,(select coalesce(sum(x.amount),0) from fee_payments x where x.student_id=s.id and x.session=${ses} and x.term=${tm} and x.status='success') as p from students s where s.status='active') t`)[0];
    const o=(await sql`select count(*)::int as n from cbt_exams where status='published'`)[0];
    return json(200,{...a,open_tests:o.n});
  }
  if(r==='fees/structure'&&m==='GET'){
    const c=+Q.class_id;if(!c)return json(400,{error:'Choose a class.'});
    return json(200,{session:ses,term:tm,items:await sql`select id,item,amount::float8 as amount from fee_structure where class_id=${c} and session=${ses} and term=${tm} order by id`});
  }
  if(r==='fees/structure'&&m==='POST'){
    const item=S(b.item,100),amt=Number(b.amount);
    if(!item||!Number.isFinite(amt)||amt<0||amt>1e8)return json(400,{error:'Enter an item name and a valid amount.'});
    if(b.class_id==='all')await sql`insert into fee_structure(class_id,session,term,item,amount) select id,${ses}::text,${tm}::text,${item}::text,${amt}::numeric from classes`;
    else{const c=+b.class_id;if(!c)return json(400,{error:'Choose a class.'});await sql`insert into fee_structure(class_id,session,term,item,amount) values(${c},${ses},${tm},${item},${amt})`}
    return json(200,{ok:true});
  }
  if(r==='fees/structure/delete'&&m==='POST'){await sql`delete from fee_structure where id=${+b.id||0}`;return json(200,{ok:true})}

  if(r==='fees/statement'&&m==='GET'){
    const st=await statement(Q.student_id,ses,tm);
    return st?json(200,st):json(404,{error:'Pupil not found.'});
  }
  if(r==='fees/balances'&&m==='GET'){
    const c=+Q.class_id;if(!c)return json(400,{error:'Choose a class.'});
    return json(200,{session:ses,term:tm,rows:await sql`select s.id,s.admission_no,s.first_name,s.last_name,
      coalesce((select sum(f.amount) from fee_structure f where f.class_id=s.class_id and f.session=${ses} and f.term=${tm}),0)::float8 as billed,
      coalesce((select sum(p.amount) from fee_payments p where p.student_id=s.id and p.session=${ses} and p.term=${tm} and p.status='success'),0)::float8 as paid
      from students s where s.class_id=${c} and s.status='active' order by s.last_name,s.first_name`});
  }
  if(r==='fees/payments'&&m==='GET'){
    const c=+Q.class_id||0;
    const rows=c
      ?await sql`select p.id,p.amount::float8 as amount,p.method,p.reference,p.status,p.note,p.created_at,s.first_name,s.last_name,cl.name as class from fee_payments p join students s on s.id=p.student_id left join classes cl on cl.id=s.class_id where s.class_id=${c} and p.session=${ses} and p.term=${tm} and p.status<>'failed' order by p.created_at desc limit 200`
      :await sql`select p.id,p.amount::float8 as amount,p.method,p.reference,p.status,p.note,p.created_at,s.first_name,s.last_name,cl.name as class from fee_payments p join students s on s.id=p.student_id left join classes cl on cl.id=s.class_id where p.session=${ses} and p.term=${tm} and p.status<>'failed' order by p.created_at desc limit 200`;
    return json(200,{rows});
  }
  if(r==='fees/record'&&m==='POST'){
    const amt=r2(Number(b.amount));
    if(!['cash','transfer','pos'].includes(b.method))return json(400,{error:'Choose how the money was paid.'});
    if(!(amt>0)||amt>1e8)return json(400,{error:'Enter a valid amount.'});
    if(!(await sql`select 1 from students where id=${b.student_id}`).length)return json(400,{error:'Choose a pupil.'});
    const ref=('MAN-'+Date.now().toString(36)+crypto.randomBytes(3).toString('hex')).toUpperCase();
    const id=(await sql`insert into fee_payments(student_id,session,term,amount,method,reference,status,recorded_by,note,paid_at) values(${b.student_id},${ses},${tm},${amt},${b.method},${ref},'success',${u.id},${S(b.note,200)||null},now()) returning id`)[0].id;
    return json(200,{ok:true,id,reference:ref});
  }
  if(r==='fees/void'&&m==='POST'){
    const p=(await sql`select method,status from fee_payments where id=${+b.id||0}`)[0];
    if(!p)return json(404,{error:'Payment not found.'});
    if(p.method==='paystack')return json(400,{error:'Online payments cannot be removed here. Refund them from your Paystack dashboard.'});
    if(p.status!=='success')return json(400,{error:'Only a recorded payment can be removed.'});
    await sql`update fee_payments set status='voided',note=coalesce(note||' | ','')||${'Removed: '+S(b.reason,150)} where id=${+b.id}`;
    return json(200,{ok:true});
  }
  return json(404,{error:'Not found.'});
}

/* ---------- CBT ---------- */
const shuf=(a,seed)=>{let s=(seed>>>0)||1;const rnd=()=>(s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296;const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x};
const cleanAns=o=>{const out={};if(o&&typeof o==='object')for(const [k,v] of Object.entries(o).slice(0,200))if(/^\d+$/.test(k)&&['a','b','c','d'].includes(v))out[k]=v;return out};

async function finalize(a){
  const qs=await sql`select id,answer,marks::float8 as marks from cbt_questions where exam_id=${a.exam_id}`;
  const ans=a.answers||{};let sc=0,tot=0;
  for(const q of qs){tot+=q.marks;if(ans[q.id]===q.answer)sc+=q.marks}
  await sql`update cbt_attempts set submitted_at=now(),score=${r2(sc)},total=${r2(tot)} where id=${a.id} and submitted_at is null`;
}
// Mark any attempts whose time has run out (the pupil closed the page or lost data).
async function sweepExam(examId){
  const rows=await sql`select a.id,a.exam_id,a.answers from cbt_attempts a join cbt_exams x on x.id=a.exam_id where a.exam_id=${examId} and a.submitted_at is null and a.started_at+(x.duration_min*interval '1 minute')+interval '1 minute'<now()`;
  for(const a of rows)await finalize(a);
}
async function sweepStudent(stId){
  const rows=await sql`select a.id,a.exam_id,a.answers from cbt_attempts a join cbt_exams x on x.id=a.exam_id where a.student_id=${stId} and a.submitted_at is null and a.started_at+(x.duration_min*interval '1 minute')+interval '1 minute'<now()`;
  for(const a of rows)await finalize(a);
}
const outcome=async(x,stId)=>{
  const a=(await sql`select score::float8 as score,total::float8 as total from cbt_attempts where exam_id=${x.id} and student_id=${stId}`)[0];
  return x.show_result&&a?{score:a.score,total:a.total}:{};
};

async function cbt(e,r,m,b,u,Q){
  const isA=u.role==='admin',staff=isA||u.role==='teacher';
  const me=async()=>(await sql`select id,class_id from students where user_id=${u.id}`)[0];
  const own=async id=>{
    const x=(await sql`select id,teacher_id,class_id,subject_id,title,instructions,duration_min,status,show_result from cbt_exams where id=${+id||0}`)[0];
    return x&&(isA||x.teacher_id===u.id)?x:null;
  };
  const hasAttempts=async id=>(await sql`select 1 from cbt_attempts where exam_id=${id} limit 1`).length>0;

  /* ----- teachers and admin ----- */
  if(r==='cbt/exams'&&m==='GET'){
    if(staff){
      const rows=isA
        ?await sql`select x.id,x.title,x.class_id,c.name as class,s.name as subject,x.duration_min,x.status,x.created_at,(select count(*) from cbt_questions q where q.exam_id=x.id)::int as qn,(select count(*) from cbt_attempts a where a.exam_id=x.id and a.submitted_at is not null)::int as taken from cbt_exams x join classes c on c.id=x.class_id join subjects s on s.id=x.subject_id order by x.created_at desc`
        :await sql`select x.id,x.title,x.class_id,c.name as class,s.name as subject,x.duration_min,x.status,x.created_at,(select count(*) from cbt_questions q where q.exam_id=x.id)::int as qn,(select count(*) from cbt_attempts a where a.exam_id=x.id and a.submitted_at is not null)::int as taken from cbt_exams x join classes c on c.id=x.class_id join subjects s on s.id=x.subject_id where x.teacher_id=${u.id} order by x.created_at desc`;
      return json(200,{exams:rows});
    }
    if(u.role!=='student')return json(403,{error:'Not allowed.'});
    const st=await me();if(!st)return json(200,{exams:[]});
    await sweepStudent(st.id);
    return json(200,{exams:await sql`select x.id,x.title,x.status,sb.name as subject,x.duration_min,(select count(*) from cbt_questions q where q.exam_id=x.id)::int as qn,a.started_at,a.submitted_at,case when x.show_result then a.score::float8 end as score,case when x.show_result then a.total::float8 end as total from cbt_exams x join subjects sb on sb.id=x.subject_id left join cbt_attempts a on a.exam_id=x.id and a.student_id=${st.id} where x.class_id=${st.class_id} and (x.status='published' or (x.status='closed' and a.submitted_at is not null)) order by x.created_at desc`});
  }

  if(r==='cbt/exams'&&m==='POST'){
    if(!staff)return json(403,{error:'Not allowed.'});
    const title=S(b.title,150),dur=Math.round(Number(b.duration_min)),ins=S(b.instructions,1000)||null,sr=b.show_result!==false;
    if(!title)return json(400,{error:'Enter a title for the test.'});
    if(!(dur>=1&&dur<=240))return json(400,{error:'Duration must be between 1 and 240 minutes.'});
    if(!b.id){
      const cid=+b.class_id,sid=+b.subject_id;
      if(!cid||!sid)return json(400,{error:'Choose a class and a subject.'});
      if(!(await canSub(u,cid,sid)))return json(403,{error:'You are not assigned to that class and subject.'});
      const {ses,tm}=await period();if(!ses||!tm)return json(400,{error:NOSET});
      const id=(await sql`insert into cbt_exams(teacher_id,class_id,subject_id,title,instructions,duration_min,session,term,show_result) values(${u.id},${cid},${sid},${title},${ins},${dur},${ses},${tm},${sr}) returning id`)[0].id;
      return json(200,{ok:true,id});
    }
    const x=await own(b.id);if(!x)return json(404,{error:'Test not found.'});
    const d=(await hasAttempts(x.id))?x.duration_min:dur;
    await sql`update cbt_exams set title=${title},instructions=${ins},duration_min=${d},show_result=${sr} where id=${x.id}`;
    return json(200,{ok:true,id:x.id});
  }

  if(r==='cbt/exam'&&m==='GET'){
    if(!staff)return json(403,{error:'Not allowed.'});
    const x=await own(Q.id);if(!x)return json(404,{error:'Test not found.'});
    const questions=await sql`select id,q,a,b,c,d,answer,marks::float8 as marks from cbt_questions where exam_id=${x.id} order by position`;
    return json(200,{exam:x,questions,locked:await hasAttempts(x.id)});
  }

  if(r==='cbt/questions'&&m==='POST'){
    if(!staff)return json(403,{error:'Not allowed.'});
    const x=await own(b.exam_id);if(!x)return json(404,{error:'Test not found.'});
    if(await hasAttempts(x.id))return json(400,{error:'Pupils have already started this test, so the questions can no longer be changed.'});
    const L=Array.isArray(b.questions)?b.questions:[];
    if(L.length>100)return json(400,{error:'A test can have at most 100 questions.'});
    const rows=[];
    for(const [i,q] of L.entries()){
      const t=S(q.q,1000),o={a:S(q.a,300),b:S(q.b,300),c:S(q.c,300),d:S(q.d,300)},an=String(q.answer||'').toLowerCase();
      const mk=q.marks===''||q.marks==null?1:Number(q.marks);
      if(!t||!o.a||!o.b)return json(400,{error:`Question ${i+1}: enter the question and at least options A and B.`});
      if(!['a','b','c','d'].includes(an)||!o[an])return json(400,{error:`Question ${i+1}: choose a correct answer that has text.`});
      if(!(mk>0&&mk<=100))return json(400,{error:`Question ${i+1}: marks must be between 0 and 100.`});
      rows.push([i+1,t,o.a,o.b,o.c||null,o.d||null,an,mk]);
    }
    const col=n=>rows.map(z=>z[n]);
    await tx(async c=>{
      await c.query('delete from cbt_questions where exam_id=$1',[x.id]);
      if(rows.length)await c.query('insert into cbt_questions(exam_id,position,q,a,b,c,d,answer,marks) select $1::int,t.p,t.q,t.a,t.b,t.c,t.d,t.ans,t.mk from unnest($2::int[],$3::text[],$4::text[],$5::text[],$6::text[],$7::text[],$8::text[],$9::numeric[]) as t(p,q,a,b,c,d,ans,mk)',[x.id,col(0),col(1),col(2),col(3),col(4),col(5),col(6),col(7)]);
    });
    return json(200,{ok:true,count:rows.length});
  }

  if(r==='cbt/status'&&m==='POST'){
    if(!staff)return json(403,{error:'Not allowed.'});
    const x=await own(b.id);if(!x)return json(404,{error:'Test not found.'});
    const to=b.status;
    if(!['draft','published','closed'].includes(to))return json(400,{error:'Unknown status.'});
    if(to==='published'&&!(await sql`select 1 from cbt_questions where exam_id=${x.id} limit 1`).length)return json(400,{error:'Add at least one question before publishing.'});
    if(to==='draft'&&await hasAttempts(x.id))return json(400,{error:'Pupils have already started this test. Close it instead.'});
    if(to==='closed'){
      const rows=await sql`select id,exam_id,answers from cbt_attempts where exam_id=${x.id} and submitted_at is null`;
      for(const a of rows)await finalize(a);
    }
    await sql`update cbt_exams set status=${to} where id=${x.id}`;
    return json(200,{ok:true});
  }

  if(r==='cbt/delete'&&m==='POST'){
    if(!staff)return json(403,{error:'Not allowed.'});
    const x=await own(b.id);if(!x)return json(404,{error:'Test not found.'});
    await sql`delete from cbt_exams where id=${x.id}`;
    return json(200,{ok:true});
  }

  if(r==='cbt/results'&&m==='GET'){
    if(!staff)return json(403,{error:'Not allowed.'});
    const x=await own(Q.id);if(!x)return json(404,{error:'Test not found.'});
    await sweepExam(x.id);
    const rows=await sql`select s.id,s.admission_no,s.first_name,s.last_name,a.started_at,a.submitted_at,a.score::float8 as score,a.total::float8 as total from students s left join cbt_attempts a on a.exam_id=${x.id} and a.student_id=s.id where s.class_id=${x.class_id} and s.status='active' order by s.last_name,s.first_name`;
    return json(200,{exam:{id:x.id,title:x.title,status:x.status},rows});
  }

  /* ----- pupils ----- */
  if(u.role!=='student')return json(403,{error:'Not allowed.'});
  const st=await me();if(!st)return json(403,{error:'No pupil record is linked to this account.'});
  const live=async id=>{
    const x=(await sql`select id,class_id,title,instructions,duration_min,status,show_result from cbt_exams where id=${+id||0}`)[0];
    if(!x||x.class_id!==st.class_id)return null;
    const a=(await sql`select id,exam_id,answers,started_at,submitted_at,extract(epoch from (now()-started_at))::float8 as el from cbt_attempts where exam_id=${x.id} and student_id=${st.id}`)[0];
    return {x,a};
  };

  if(r==='cbt/start'&&m==='POST'){
    const x=(await sql`select id,class_id,title,instructions,duration_min,status,show_result from cbt_exams where id=${+b.exam_id||0}`)[0];
    if(!x||x.class_id!==st.class_id)return json(400,{error:'This test is not available.'});
    const prior=(await sql`select submitted_at from cbt_attempts where exam_id=${x.id} and student_id=${st.id}`)[0];
    if(x.status!=='published'&&!(prior&&prior.submitted_at))return json(400,{error:'This test is not open.'});
    await sql`insert into cbt_attempts(exam_id,student_id) values(${x.id},${st.id}) on conflict do nothing`;
    const a=(await sql`select id,exam_id,answers,started_at,submitted_at,extract(epoch from (now()-started_at))::float8 as el from cbt_attempts where exam_id=${x.id} and student_id=${st.id}`)[0];
    if(!a.submitted_at){
      const left=x.duration_min*60-a.el;
      if(left<=0)await finalize(a);
      else{
        const qs=await sql`select id,q,a,b,c,d,marks::float8 as marks from cbt_questions where exam_id=${x.id} order by position`;
        return json(200,{done:false,exam:{id:x.id,title:x.title,instructions:x.instructions,duration_min:x.duration_min},remaining:Math.floor(left),answers:a.answers,questions:shuf(qs,a.id)});
      }
    }
    return json(200,{done:true,title:x.title,...(await outcome(x,st.id))});
  }

  if(r==='cbt/save'&&m==='POST'){
    const L=await live(b.exam_id);if(!L||!L.a)return json(404,{error:'Test not found.'});
    const {x,a}=L;
    if(a.submitted_at)return json(200,{done:true});
    if(a.el>x.duration_min*60+60){await finalize(a);return json(200,{done:true})}
    await sql`update cbt_attempts set answers=${JSON.stringify(cleanAns(b.answers))}::jsonb where id=${a.id} and submitted_at is null`;
    return json(200,{ok:true,remaining:Math.max(0,Math.floor(x.duration_min*60-a.el))});
  }

  if(r==='cbt/submit'&&m==='POST'){
    const L=await live(b.exam_id);if(!L||!L.a)return json(404,{error:'Test not found.'});
    const {x,a}=L;
    if(!a.submitted_at){
      if(a.el<=x.duration_min*60+60)a.answers=cleanAns(b.answers);
      await sql`update cbt_attempts set answers=${JSON.stringify(a.answers)}::jsonb where id=${a.id} and submitted_at is null`;
      await finalize(a);
    }
    return json(200,{done:true,title:x.title,...(await outcome(x,st.id))});
  }

  return json(404,{error:'Not found.'});
}

export default async function(e,r,m,b,u){
  if(!r.startsWith('fees/')&&!r.startsWith('cbt/'))return null;
  const Q=e.queryStringParameters||{};
  return r.startsWith('fees/')?fees(e,r,m,b,u,Q):cbt(e,r,m,b,u,Q);
};
export {webhook};
export const _test={shuf,cleanAns};
