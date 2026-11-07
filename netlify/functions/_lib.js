import crypto from 'node:crypto';
// Netlify Database (Postgres built into Netlify). The connection is set up by Netlify; no URL or password to manage.
let _db=null;
const db=async()=>{if(!_db){const m=await import('@netlify/database');const cs=process.env.DB_CONNECTION_STRING;_db=cs?m.getDatabase({connectionString:cs}):m.getDatabase()}return _db};
const sql=(strings,...vals)=>db().then(d=>d.sql(strings,...vals));
sql.unsafe=(text,params)=>db().then(d=>d.sql.unsafe(text,params||[]));
// Run several statements as one all-or-nothing transaction: tx(async c=>{await c.query('insert ... $1',[x])})
const tx=async fn=>{const d=await db();const c=await d.pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r}catch(e){try{await c.query('ROLLBACK')}catch(x){}throw e}finally{c.release()}};
const mac=p=>crypto.createHmac('sha256',process.env.SESSION_SECRET).update(p).digest('base64url');
const sign=o=>{const p=Buffer.from(JSON.stringify(o)).toString('base64url');return p+'.'+mac(p)};
const verify=t=>{if(!t)return null;const [p,s]=t.split('.');if(!p||!s)return null;const e=mac(p);if(s.length!==e.length||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(e)))return null;const o=JSON.parse(Buffer.from(p,'base64url'));return o.exp>Date.now()?o:null};
const hash=pw=>{const s=crypto.randomBytes(16).toString('hex');return s+':'+crypto.scryptSync(pw,s,64).toString('hex')};
const check=(pw,h)=>{const [s,k]=h.split(':');return crypto.timingSafeEqual(crypto.scryptSync(pw,s,64),Buffer.from(k,'hex'))};
const cookies=e=>Object.fromEntries((e.headers.cookie||'').split(';').map(c=>c.trim().split('=')).filter(c=>c[0]));
const user=async e=>{const t=verify(cookies(e).schoolportal);if(!t)return null;const r=await sql`select id,username,full_name,role,must_change_password from users where id=${t.uid} and active`;return r[0]||null};
const json=(s,o,h={})=>({statusCode:s,headers:{'content-type':'application/json','cache-control':'no-store',...h},body:JSON.stringify(o)});
export {sql,tx,sign,hash,check,user,json};
