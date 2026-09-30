const CORS={"content-type":"application/json; charset=utf-8"};
async function init(db){
 await db.exec(`CREATE TABLE IF NOT EXISTS modalities(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,min_players INTEGER NOT NULL,max_players INTEGER NOT NULL,active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS teams(id INTEGER PRIMARY KEY AUTOINCREMENT,class_name TEXT NOT NULL,modality_id INTEGER NOT NULL,team_name TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(modality_id) REFERENCES modalities(id));
 CREATE TABLE IF NOT EXISTS players(id INTEGER PRIMARY KEY AUTOINCREMENT,team_id INTEGER NOT NULL,name TEXT NOT NULL,FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE);`);
 const c=await db.prepare("SELECT COUNT(*) n FROM modalities").first();
 if(!c?.n){
  const seed=[["Pebolim",2,2],["Basquete 3x3",3,5],["Futsal",5,10],["Vôlei",6,12],["Handebol",7,14]];
  for(const m of seed) await db.prepare("INSERT INTO modalities(name,min_players,max_players) VALUES(?,?,?)").bind(...m).run();
 }
}
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function page(){
return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Interclasse • Inscrições</title><style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f4f6f8;color:#17202a}header{background:#111827;color:#fff;padding:24px 18px}header b{font-size:24px}header p{margin:5px 0 0;color:#cbd5e1}.wrap{max-width:760px;margin:auto;padding:18px}.card{background:#fff;border-radius:18px;padding:20px;margin-bottom:16px;box-shadow:0 3px 18px #0000000d}h2{margin:0 0 16px}label{display:block;font-weight:700;margin:14px 0 6px}input,select,button{width:100%;padding:13px;border:1px solid #d5dbe3;border-radius:11px;font-size:16px;background:#fff}button{border:0;background:#111827;color:#fff;font-weight:800;margin-top:16px;cursor:pointer}.player{margin-top:8px}.hint{font-size:13px;color:#64748b;margin-top:6px}.ok,.err{padding:12px;border-radius:10px;margin-top:12px}.ok{background:#dcfce7;color:#166534}.err{background:#fee2e2;color:#991b1b}.tabs{display:flex;gap:8px;margin-bottom:16px}.tabs button{margin:0}.tabs .alt{background:#e5e7eb;color:#111827}.team{border-top:1px solid #eee;padding:12px 0}.team:first-child{border-top:0}.muted{color:#64748b;font-size:14px}@media(max-width:520px){header{padding:20px 16px}.wrap{padding:12px}.card{padding:16px;border-radius:14px}}</style></head><body>
<header><b>🏆 Interclasse</b><p>Inscrição de equipes</p></header><main class="wrap">
<div class="tabs"><button id="tabForm">Nova inscrição</button><button class="alt" id="tabList">Equipes inscritas</button></div>
<section class="card" id="formCard"><h2>Inscrever equipe</h2>
<form id="f"><label>Turma</label><select id="class_name" required><option value="">Selecione...</option>
<option>6º Ano</option><option>7º Ano</option><option>8º Ano</option><option>9º Ano</option><option>1º Médio</option><option>2º Médio</option><option>3º Médio</option></select>
<label>Modalidade</label><select id="modality" required><option value="">Carregando...</option></select>
<label>Nome da equipe <span class="muted">(opcional)</span></label><input id="team_name" maxlength="60" placeholder="Ex.: Trovão">
<div id="players"></div><button>Confirmar inscrição</button><div id="msg"></div></form></section>
<section class="card" id="listCard" style="display:none"><h2>Equipes inscritas</h2><div id="list">Carregando...</div></section>
</main><script>
let mods=[];
async function loadMods(){mods=await fetch('/api/modalities').then(r=>r.json());modality.innerHTML='<option value="">Selecione...</option>'+mods.map(m=>'<option value="'+m.id+'">'+m.name+'</option>').join('')}
function fields(){let m=mods.find(x=>x.id==modality.value);players.innerHTML='';if(!m)return;let n=m.min_players;players.innerHTML='<label>Integrantes</label><div class="hint">Mínimo '+m.min_players+' • máximo '+m.max_players+'</div>';for(let i=0;i<n;i++){let x=document.createElement('input');x.className='player';x.placeholder='Integrante '+(i+1);x.required=true;x.maxLength=80;players.appendChild(x)}if(m.max_players>n){let b=document.createElement('button');b.type='button';b.textContent='+ Adicionar integrante';b.style.background='#e5e7eb';b.style.color='#111827';b.onclick=()=>{if(players.querySelectorAll('input').length<m.max_players){let x=document.createElement('input');x.className='player';x.placeholder='Integrante '+(players.querySelectorAll('input').length+1);x.required=true;players.insertBefore(x,b)}};players.appendChild(b)}}
modality.onchange=fields;
f.onsubmit=async e=>{e.preventDefault();msg.innerHTML='';let body={class_name:class_name.value,modality_id:+modality.value,team_name:team_name.value.trim(),players:[...players.querySelectorAll('input')].map(x=>x.value.trim())};let r=await fetch('/api/teams',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});let j=await r.json();msg.className=r.ok?'ok':'err';msg.textContent=j.message||j.error;if(r.ok){f.reset();players.innerHTML='';loadList()}};
async function loadList(){let data=await fetch('/api/teams').then(r=>r.json());if(!data.length){list.innerHTML='<p class="muted">Nenhuma equipe inscrita ainda.</p>';return}let groups={};for(let t of data)(groups[t.modality_name]??=[]).push(t);list.innerHTML=Object.entries(groups).map(([m,ts])=>'<h3>'+m+'</h3>'+ts.map(t=>'<div class="team"><b>'+t.class_name+(t.team_name?' • '+t.team_name:'')+'</b><div class="muted">'+t.players.join(', ')+'</div></div>').join('')).join('')}
tabForm.onclick=()=>{formCard.style.display='block';listCard.style.display='none';tabForm.className='';tabList.className='alt'}
tabList.onclick=()=>{formCard.style.display='none';listCard.style.display='block';tabForm.className='alt';tabList.className='';loadList()}
loadMods();loadList();
</script></body></html>`}
}
export default {async fetch(req,env){
 try{
  await init(env.DB); const u=new URL(req.url);
  if(u.pathname==="/api/modalities"&&req.method==="GET"){const {results}=await env.DB.prepare("SELECT id,name,min_players,max_players FROM modalities WHERE active=1 ORDER BY name").all();return Response.json(results)}
  if(u.pathname==="/api/teams"&&req.method==="GET"){const {results}=await env.DB.prepare(`SELECT t.id,t.class_name,t.team_name,m.name modality_name,GROUP_CONCAT(p.name,'|||') players FROM teams t JOIN modalities m ON m.id=t.modality_id LEFT JOIN players p ON p.team_id=t.id GROUP BY t.id ORDER BY m.name,t.class_name,t.created_at`).all();return Response.json(results.map(x=>({...x,players:x.players?x.players.split("|||"):[]})))}
  if(u.pathname==="/api/teams"&&req.method==="POST"){
   const b=await req.json(); const m=await env.DB.prepare("SELECT * FROM modalities WHERE id=? AND active=1").bind(b.modality_id).first();
   if(!m)return Response.json({error:"Modalidade inválida."},{status:400,headers:CORS});
   const ps=(b.players||[]).map(x=>String(x).trim()).filter(Boolean);
   if(!b.class_name||ps.length<m.min_players||ps.length>m.max_players)return Response.json({error:"Confira a turma e a quantidade de integrantes."},{status:400,headers:CORS});
   const dup=await env.DB.prepare(`SELECT p.name FROM players p JOIN teams t ON t.id=p.team_id WHERE t.modality_id=? AND lower(p.name) IN (${ps.map(()=>"?").join(",")}) LIMIT 1`).bind(b.modality_id,...ps.map(x=>x.toLowerCase())).first();
   if(dup)return Response.json({error:dup.name+" já está inscrito(a) nesta modalidade."},{status:409,headers:CORS});
   const r=await env.DB.prepare("INSERT INTO teams(class_name,modality_id,team_name) VALUES(?,?,?)").bind(String(b.class_name).slice(0,40),b.modality_id,String(b.team_name||"").slice(0,60)).run();
   for(const p of ps)await env.DB.prepare("INSERT INTO players(team_id,name) VALUES(?,?)").bind(r.meta.last_row_id,p.slice(0,80)).run();
   return Response.json({message:"Equipe inscrita com sucesso!"},{status:201});
  }
  return new Response(page(),{headers:{"content-type":"text/html; charset=utf-8"}});
 }catch(e){return Response.json({error:"Erro interno: "+e.message},{status:500})}
}};