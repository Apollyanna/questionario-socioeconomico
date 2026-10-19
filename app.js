/* ============================================================
   PESQUISA SOCIOECONÔMICA — app.js (lógica completa)
   Substitui: Main.js, Core.js, Form.js, Results.js, Config.js
============================================================ */
(function(){
'use strict';

/* ================= CONFIG ================= */
const CONTATO = {
  email: 'apolianadealmeidarocha97@gmail.com',
  whatsapp: '5538998650423',
  instagram: ''
};

const BANCO = { url: '' }; // cole aqui o link do Google Apps Script (/exec) para enviar respostas remotamente

const PESQUISA = { resultadosPublicos: true };

const STORAGE_KEY = 'pesq_socio_respostas_v1';
const DRAFT_KEY   = 'pesq_socio_rascunho_v1';
const UF_LIST = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

/* ================= CATEGORIAS ================= */
const CATEGORIAS = [
  {
    nome:'Dados pessoais',
    desc:'Informações gerais sobre você, sua família e o contexto em que vive.',
    perguntas:[
      ['Qual é a sua faixa etária?',['Menos de 18 anos','18 a 25 anos','26 a 35 anos','36 a 50 anos','Mais de 50 anos']],
      ['Com qual gênero você se identifica?',['Feminino','Masculino','Não binário','Prefiro não informar']],
      ['Qual é o seu estado civil?',['Solteiro(a)','Casado(a) ou em união estável','Divorciado(a)','Viúvo(a)']],
      ['Quantas pessoas moram na sua casa, contando com você?',['1 pessoa','2 pessoas','3 a 4 pessoas','5 ou mais pessoas']],
      ['Qual é a renda mensal total da sua família?',['Até 1 salário mínimo','De 1 a 3 salários mínimos','De 3 a 5 salários mínimos','De 5 a 10 salários mínimos','Acima de 10 salários mínimos']],
      ['Você é o(a) principal responsável financeiro(a) da família?',['Sim','Não','Divido essa responsabilidade com outra pessoa']],
      ['Em que tipo de área você mora?',['Área central da cidade','Bairro residencial','Periferia','Zona rural']],
      ['Como você acessa os serviços de saúde com mais frequência?',['Plano de saúde particular','Plano de saúde oferecido pelo trabalho','Somente pelo SUS (rede pública)','Pago consultas particulares quando preciso']],
      ['Como é o seu acesso à internet em casa?',['Banda larga fixa','Apenas internet móvel (celular)','Não possuo internet em casa']],
      ['Como você avalia a situação financeira da sua família hoje?',['Consegue poupar com folga','Fecha o mês com equilíbrio','Fecha o mês com dificuldade','Costuma ficar endividada']]
    ]
  },
  {
    nome:'Dados educacionais',
    desc:'Sua trajetória de estudos e as condições de acesso à educação.',
    perguntas:[
      ['Qual é o seu nível de escolaridade atual?',['Ensino Fundamental incompleto','Ensino Fundamental completo','Ensino Médio incompleto','Ensino Médio completo','Ensino Superior incompleto','Ensino Superior completo','Pós-graduação (especialização, mestrado ou doutorado)']],
      ['Em que tipo de escola você cursou a maior parte do ensino básico?',['Pública','Privada com bolsa','Privada sem bolsa','Parte pública e parte privada']],
      ['Qual foi a última instituição de ensino que você frequentou?',['Escola pública (municipal ou estadual)','Escola particular','Universidade ou faculdade pública','Universidade ou faculdade privada','Instituto federal ou escola técnica']],
      ['Qual é a sua situação em relação ao ensino superior?',['Já concluí','Estou cursando','Ainda pretendo cursar','Não pretendo cursar']],
      ['Você já fez algum curso técnico ou profissionalizante?',['Sim, concluído','Sim, em andamento','Não, mas tenho interesse','Não, e não tenho interesse']],
      ['Quantos idiomas você domina além do português?',['Nenhum','Um','Dois','Três ou mais']],
      ['Você possui alguma certificação profissional reconhecida?',['Sim, várias','Sim, uma ou duas','Não, mas estou buscando','Não']],
      ['Como você avalia a qualidade da educação que recebeu?',['Excelente','Boa','Regular','Ruim','Péssima']],
      ['O que você pretende estudar nos próximos dois anos?',['Graduação','Pós-graduação','Cursos livres ou técnicos','Não pretendo estudar']],
      ['Qual foi o principal fator que influenciou a sua trajetória educacional?',['Apoio da família','Interesse e vocação pessoal','Exigência do mercado de trabalho','Bolsas e oportunidades financeiras','Limitações financeiras','Influência de professores ou amigos']]
    ]
  },
  {
    nome:'Dados profissionais',
    desc:'Sua ocupação atual, renda e perspectivas de carreira.',
    perguntas:[
      ['Qual é a sua situação atual no mercado de trabalho?',['Empregado(a) com carteira assinada','Empregado(a) sem carteira','Autônomo(a)','Empresário(a)','Desempregado(a)','Aposentado(a)','Estudante']],
      ['Há quanto tempo você está na sua ocupação atual?',['Menos de 1 ano','De 1 a 3 anos','De 3 a 5 anos','Mais de 5 anos','Não estou trabalhando']],
      ['Qual é o seu ramo de atuação?',['Tecnologia','Saúde','Educação','Comércio','Indústria','Serviços','Outro']],
      ['Qual é o seu nível hierárquico atual?',['Estagiário(a) ou aprendiz','Operacional ou auxiliar','Técnico(a) ou analista','Coordenação ou supervisão','Gerência','Diretoria']],
      ['Você trabalha na sua área de formação?',['Sim, totalmente','Parcialmente','Não','Não sou formado(a)']],
      ['Qual é a sua renda mensal individual?',['Não tenho renda','Até 1 salário mínimo','De 1 a 3 salários mínimos','De 3 a 5 salários mínimos','De 5 a 10 salários mínimos','Acima de 10 salários mínimos']],
      ['Você possui outro emprego ou outra fonte de renda?',['Sim','Não']],
      ['Como você avalia a estabilidade do seu trabalho atual?',['Muito estável','Estável','Incerto','Instável','Não se aplica']],
      ['Você pretende mudar de emprego nos próximos 12 meses?',['Sim, com certeza','Talvez','Não','Não se aplica']],
      ['Qual fator mais influencia a sua satisfação profissional?',['Salário','Ambiente de trabalho','Oportunidades de crescimento','Reconhecimento','Equilíbrio entre vida pessoal e trabalho']]
    ]
  }
];

// Índice plano das perguntas
const FLAT = [];
CATEGORIAS.forEach((c,ci)=>c.perguntas.forEach((_,qi)=>FLAT.push({ci,qi})));
const TOTAL_Q = FLAT.length; // 30

const CORES = ['#0b2545','#13386b','#1b4fa8','#2563c9','#3b82e0','#5a9be8','#82bcff','#a8c6f0','#c6e0ff','#dbe9fb'];

/* ================= ESTADO ================= */
let state = {
  step: 0,               // 0=cadastro, 1..3=categorias, 4=revisão
  answers: new Array(TOTAL_Q).fill(null),
  cad: {nome:'',email:'',tel:'',cidade:'',uf='',fonte:''},
  proto: null,
  ts: null
};

/* ================= HELPERS DOM ================= */
const $ = id => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m])}

function showView(v){
  $$('.view').forEach(x=>x.classList.remove('on'));
  const el=$('view-'+v); if(el) el.classList.add('on');
  $('hero').hidden = v!=='ini';
  $('topo').hidden = false;
  $('rodape').hidden = (v==='form' && !$('wizard').hidden===false); // sempre mostra rodapé exceto durante wizard? vamos manter visível
  $('rodape').hidden = false;
  $$('.tab').forEach(t=>t.classList.toggle('on', t.dataset.v===v));
  window.scrollTo({top:0,behavior:'auto'});
}

/* ================= PERSISTÊNCIA ================= */
function getLocal(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]}catch(e){return []}}
function saveLocal(arr){localStorage.setItem(STORAGE_KEY,JSON.stringify(arr))}
function saveDraft(){localStorage.setItem(DRAFT_KEY,JSON.stringify({step:state.step,answers:state.answers,cad:state.cad}))}
function loadDraft(){try{return JSON.parse(localStorage.getItem(DRAFT_KEY))}catch(e){return null}}
function clearDraft(){localStorage.removeItem(DRAFT_KEY)}

/* ================= PROTOCOLO ================= */
function novoProto(){
  const rnd=Math.random().toString(36).slice(2,8).toUpperCase();
  return 'PS-'+rnd;
}

/* ================= STEPS ================= */
function renderSteps(){
  const ol=$('steps'); ol.innerHTML='';
  const labels=['Cadastro','Pessoais','Educação','Profissão','Revisão'];
  labels.forEach((lb,i)=>{
    const li=document.createElement('li');
    li.className='sd'+(i<state.step?' done':i===state.step?' on':'');
    li.innerHTML=`<i>${i<state.step?'✓':i+1}</i><span>${esc(lb)}</span>`;
    ol.appendChild(li);
  });
}

function updateProgress(){
  const pct=(state.step/5)*100;
  $('prog-bar').style.width=pct+'%';
  const progEl=document.querySelector('.prog');
  if(progEl) progEl.setAttribute('aria-valuenow', Math.round(pct));
  const answered=state.answers.filter(Boolean).length;
  $('counter').textContent=`Etapa ${state.step+1} de 5${state.step>=1&&state.step<=3 ? ` · ${answered} de ${TOTAL_Q} perguntas respondidas`:''}`;
  renderSteps();
}

/* ================= ETAPA 0: CADASTRO ================= */
function renderCadastro(){
  $('qs').innerHTML=`
    <h2>Seu cadastro</h2>
    <p class="sub">Precisamos saber quem está respondendo. Seus dados de identificação ficam visíveis só para o responsável pela pesquisa.</p>
    <form id="frmCad" novalidate>
      <div class="fld">
        <label for="cad-nome">Nome completo</label>
        <input type="text" id="cad-nome" autocomplete="name" placeholder="Nome e sobrenome" value="${esc(state.cad.nome)}" required>
        <small class="err" id="err-nome"></small>
      </div>
      <div class="fld">
        <label for="cad-email">E-mail</label>
        <input type="email" id="cad-email" autocomplete="email" placeholder="voce@exemplo.com" value="${esc(state.cad.email)}" required>
        <small class="err" id="err-email"></small>
      </div>
      <div class="fld">
        <label for="cad-tel">WhatsApp ou telefone <em>(opcional)</em></label>
        <input type="tel" id="cad-tel" autocomplete="tel" placeholder="(00) 00000-0000" value="${esc(state.cad.tel)}">
      </div>
      <div class="g2">
        <div class="fld">
          <label for="cad-cidade">Cidade</label>
          <input type="text" id="cad-cidade" placeholder="Sua cidade" value="${esc(state.cad.cidade)}" required>
          <small class="err" id="err-cidade"></small>
        </div>
        <div class="fld">
          <label for="cad-uf">Estado</label>
          <select id="cad-uf" required>
            <option value="">UF</option>
            ${UF_LIST.map(u=>`<option ${state.cad.uf===u?'selected':''}>${u}</option>`).join('')}
          </select>
          <small class="err" id="err-uf"></small>
        </div>
      </div>
      <div class="fld">
        <label for="cad-fonte">Como você conheceu esta pesquisa? <em>(opcional)</em></label>
        <select id="cad-fonte">
          <option value="Prefiro não informar" ${state.cad.fonte==='Prefiro não informar'||!state.cad.fonte?'selected':''}>Prefiro não informar</option>
          <option ${state.cad.fonte==='Instagram'?'selected':''}>Instagram</option>
          <option ${state.cad.fonte==='WhatsApp'?'selected':''}>WhatsApp</option>
          <option ${state.cad.fonte==='Indicação de amigo/familiar'?'selected':''}>Indicação de amigo/familiar</option>
          <option ${state.cad.fonte==='Professor(escola/universidade)'?'selected':''}>Professor(escola/universidade)</option>
          <option ${state.cad.fonte==='Redes sociais'?'selected':''}>Redes sociais</option>
          <option ${state.cad.fonte==='Outro'?'selected':''}>Outro</option>
        </select>
      </div>
      <details class="priv">
        <summary>Como usamos os seus dados</summary>
        <p>Os dados são armazenados localmente neste dispositivo e podem ser enviados ao organizador desta pesquisa apenas para fins estatísticos agregados. Nome, e-mail e telefone servem para eventual contato e ficam separados das respostas. Você pode apagar tudo a qualquer momento pelos controles do navegador.</p>
      </details>
      <label class="cons" id="lgpd-wrap">
        <input type="checkbox" id="ck-lgpd" ${state.cad._lgpd?'checked':''}>
        <span>Li o aviso acima e concordo com o uso dos meus dados para esta pesquisa.</span>
      </label>
      <small class="err" id="err-lgpd"></small>
      <label class="cons" id="contato-wrap">
        <input type="checkbox" id="ck-contato" ${state.cad._contato?'checked':''}>
        <span>Aceito ser contatado(a) por e-mail ou WhatsApp sobre esta pesquisa <em>(opcional)</em>.</span>
      </label>
    </form>`;
  $('msg').textContent='';
  $('back').disabled=true;
  $('next').textContent='Continuar';
}

function validarCadastro(){
  const nome=$('cad-nome').value.trim();
  const email=$('cad-email').value.trim();
  const tel=$('cad-tel').value.trim();
  const cidade=$('cad-cidade').value.trim();
  const uf=$('cad-uf').value;
  const fonte=$('cad-fonte').value;
  const lgpd=$('ck-lgpd').checked;
  const contato=$('ck-contato').checked;
  let ok=true;
  ['err-nome','err-email','err-cidade','err-uf','err-lgpd'].forEach(i=>$(i).textContent='');
  ['cad-nome','cad-email','cad-cidade','cad-uf'].forEach(i=>$(i).classList.remove('bad'));
  ['lgpd-wrap','contato-wrap'].forEach(i=>$(i).classList.remove('bad'));
  if(!nome){$('err-nome').textContent='Informe seu nome.';$('cad-nome').classList.add('bad');ok=false}
  if(!email){$('err-email').textContent='Informe um e-mail.';$('cad-email').classList.add('bad');ok=false}
  else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){$('err-email').textContent='E-mail inválido.';$('cad-email').classList.add('bad');ok=false}
  if(!cidade){$('err-cidade').textContent='Informe sua cidade.';$('cad-cidade').classList.add('bad');ok=false}
  if(!uf){$('err-uf').textContent='Selecione o estado.';$('cad-uf').classList.add('bad');ok=false}
  if(!lgpd){$('err-lgpd').textContent='É necessário aceitar para prosseguir.';$('lgpd-wrap').classList.add('bad');ok=false}
  if(!ok)return false;
  state.cad={nome,email,tel,cidade,uf,fonte,_lgpd:true,_contato:contato};
  return true;
}

/* ================= ETAPAS 1-3: PERGUNTAS EM BLOCO ================= */
function renderCategoria(catIdx){
  const cat=CATEGORIAS[catIdx];
  const offset=FLAT.findIndex(f=>f.ci===catIdx);
  let html=`<h2>${esc(cat.nome)}</h2><p class="sub">${esc(cat.desc)}</p><div class="q-list">`;
  cat.perguntas.forEach((p,qi)=>{
    const gi=offset+qi;
    html+=`<fieldset class="q" data-gi="${gi}">
      <legend><span class="n">${qi+1}</span><span>${esc(p[0])}</span></legend>
      <div class="opts">${p[1].map(o=>`
        <label class="opt">
          <input type="radio" name="q${gi}" value="${esc(o)}" ${state.answers[gi]===o?'checked':''}>
          <span>${esc(o)}</span>
        </label>`).join('')}</div>
    </fieldset>`;
  });
  html+='</div>';
  $('qs').innerHTML=html;
  $('msg').textContent='';
  $('back').disabled=false;
  $('next').textContent = catIdx===2 ? 'Revisar respostas' : 'Continuar';
  // marca campos preenchidos
  $$('#qs .q').forEach(q=>{
    const gi=parseInt(q.dataset.gi,10);
    if(state.answers[gi]) q.classList.add('ok');
  });
  // listeners
  $$('#qs input[type=radio]').forEach(inp=>inp.addEventListener('change',()=>{
    const gi=parseInt(inp.name.replace('q',''),10);
    state.answers[gi]=inp.value;
    inp.closest('.q').classList.remove('miss');
    inp.closest('.q').classList.add('ok');
    updateProgress();
    saveDraft();
  }));
}

function validarCategoria(catIdx){
  const offset=FLAT.findIndex(f=>f.ci===catIdx);
  const faltando=[];
  CATEGORIAS[catIdx].perguntas.forEach((_,qi)=>{
    if(!state.answers[offset+qi])faltando.push(offset+qi);
  });
  if(faltando.length){
    faltando.forEach(gi=>{
      const el=$(`qs`).querySelector(`.q[data-gi="${gi}"]`);
      if(el) el.classList.add('miss');
    });
    $('msg').textContent=`Responda todas as perguntas antes de continuar (${faltando.length} pendente(s)).`;
    const first=$(`qs`).querySelector(`.q[data-gi="${faltando[0]}"]`);
    if(first) first.scrollIntoView({behavior:'smooth',block:'center'});
    return false;
  }
  $('msg').textContent='';
  return true;
}

/* ================= ETAPA 4: REVISÃO ================= */
function renderReview(){
  let html=`<h2>Revise antes de enviar</h2><p class="sub">Confira seus dados e respostas. Se algo estiver errado, toque em Editar.</p>`;
  // Cadastro
  html+=`<div class="rv-box">
    <div class="rv-h"><h3>Seu cadastro</h3><button class="btn sm ghost" data-edit="0" type="button">Editar</button></div>
    <dl class="rv-dl">
      <div><dt>Nome</dt><dd>${esc(state.cad.nome)}</dd></div>
      <div><dt>E-mail</dt><dd>${esc(state.cad.email)}</dd></div>
      <div><dt>Telefone</dt><dd>${esc(state.cad.tel||'—')}</dd></div>
      <div><dt>Cidade</dt><dd>${esc(state.cad.cidade)} / ${esc(state.cad.uf)}</dd></div>
    </dl>
  </div>`;
  // Categorias
  CATEGORIAS.forEach((cat,ci)=>{
    const offset=FLAT.findIndex(f=>f.ci===ci);
    html+=`<div class="rv-box">
      <div class="rv-h"><h3>${esc(cat.nome)}</h3><button class="btn sm ghost" data-edit="${ci+1}" type="button">Editar</button></div>
      <table class="tb" style="min-width:0">
        <thead><tr><th>Pergunta</th><th>Resposta</th></tr></thead>
        <tbody>${cat.perguntas.map((p,qi)=>`<tr><td>${esc(p[0])}</td><td>${state.answers[offset+qi]?esc(state.answers[offset+qi]):'<em style="color:#b42318">não respondida</em>'}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
  });
  $('qs').innerHTML=html;
  $('msg').textContent='';
  $('back').disabled=false;
  $('next').textContent='Enviar respostas ✓';
  $$('#qs [data-edit]').forEach(b=>b.onclick=()=>{
    state.step=parseInt(b.dataset.edit,10);
    renderStep();saveDraft();
  });
}

/* ================= RENDER STEP ATUAL ================= */
function renderStep(){
  updateProgress();
  if(state.step===0) renderCadastro();
  else if(state.step<=3) renderCategoria(state.step-1);
  else renderReview();
}

/* ================= AVANÇAR/VOLTAR ================= */
function next(){
  if(state.step===0){
    if(!validarCadastro())return;
  } else if(state.step>=1 && state.step<=3){
    if(!validarCategoria(state.step-1))return;
  } else if(state.step===4){
    enviar();return;
  }
  state.step++;saveDraft();renderStep();
}
function back(){
  if(state.step>0){state.step--;saveDraft();renderStep()}
  else showView('ini');
}

/* ================= ENVIO ================= */
async function enviar(){
  // checagem final
  const faltando=state.answers.findIndex(a=>!a);
  if(faltando>=0){
    alert('Algumas perguntas ficaram sem resposta. Voltando...');
    state.step=FLAT[faltando].ci+1;renderStep();return;
  }
  state.proto=novoProto();
  state.ts=new Date().toISOString();
  const registro={
    proto:state.proto,ts:state.ts,
    cad:{nome:state.cad.nome,email:state.cad.email,tel:state.cad.tel,cidade:state.cad.cidade,uf:state.cad.uf,fonte:state.cad.fonte,aceitouContato:!!state.cad._contato},
    respostas:[...state.answers]
  };
  // salva local
  const arr=getLocal();arr.push(registro);saveLocal(arr);
  updateBadge();
  // tenta remoto
  if(BANCO.url){
    try{
      await fetch(BANCO.url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(registro)});
    }catch(e){console.warn('Falha ao enviar para o servidor:',e)}
  }
  clearDraft();
  mostrarDone(registro);
}

function mostrarDone(r){
  $('wizard').hidden=true;
  $('done').hidden=false;
  $('rc-prot').textContent=r.proto;
  $('rc-data').textContent=new Date(r.ts).toLocaleString('pt-BR');
  $('rc-nome').textContent=r.cad.nome||'Anônimo';
  renderContatosFinal();
  renderSteps();
  updateProgress();
}

function renderContatosFinal(){
  const box=$('contatos-final');box.innerHTML='';
  if(CONTATO.email){const a=document.createElement('a');a.href='mailto:'+CONTATO.email;a.textContent='E-mail';box.appendChild(a)}
  if(CONTATO.whatsapp){const a=document.createElement('a');a.href='https://wa.me/'+CONTATO.whatsapp;a.target='_blank';a.rel='noopener';a.textContent='WhatsApp';box.appendChild(a)}
  if(CONTATO.instagram){const a=document.createElement('a');a.href='https://instagram.com/'+CONTATO.instagram;a.target='_blank';a.rel='noopener';a.textContent='Instagram';box.appendChild(a)}
}

/* ================= RESULTADOS ================= */
let modoAtual='graficos';
let filtroCat=-1;

function aggregate(ci,qi,data){
  const idx=FLAT.findIndex(f=>f.ci===ci&&f.qi===qi);
  const opts=CATEGORIAS[ci].perguntas[qi][1];
  const counts=Object.fromEntries(opts.map(o=>[o,0]));
  let answered=0;
  data.forEach(r=>{
    const v=r.respostas[idx];
    if(v&&counts[v]!=null){counts[v]++;answered++}
  });
  return {opts,counts,answered,total:data.length};
}

function drawPie(canvas,opts,counts){
  const ctx=canvas.getContext('2d');
  const size=Math.min(canvas.clientWidth,canvas.clientHeight)||200;
  const dpr=window.devicePixelRatio||1;
  canvas.width=size*dpr;canvas.height=size*dpr;
  ctx.scale(dpr,dpr);
  const cx=size/2,cy=size/2,R=size/2-4;
  const entries=opts.map(o=>({label:o,value:counts[o]||0})).filter(e=>e.value>0);
  const sum=entries.reduce((s,e)=>s+e.value,0);
  if(!sum){ctx.fillStyle='#dbe4f0';ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fill();return}
  let ang=-Math.PI/2;
  canvas._segments=[];
  entries.forEach((e,i)=>{
    const slice=(e.value/sum)*Math.PI*2;
    const color=CORES[i%CORES.length];
    ctx.beginPath();ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,R,ang,ang+slice);ctx.closePath();
    ctx.fillStyle=color;ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
    // rótulo % dentro da fatia se >10%
    const pct=e.value/sum*100;
    if(pct>=8){
      const mid=ang+slice/2;
      const tx=cx+Math.cos(mid)*(R*.65);
      const ty=cy+Math.sin(mid)*(R*.65);
      ctx.fillStyle='#fff';ctx.font='bold '+Math.max(11,R*.12)+'px Inter,sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(Math.round(pct)+'%',tx,ty);
    }
    canvas._segments.push({start:ang,end:ang+slice,label:e.label,value:e.value,pct:pct.toFixed(1),color});
    ang+=slice;
  });
}

function bindPieHover(canvas){
  const tip=$('tip');
  function move(ev){
    const rect=canvas.getBoundingClientRect();
    const x=ev.clientX-rect.left,y=ev.clientY-rect.top;
    const cx=rect.width/2,cy=rect.height/2;
    const dx=x-cx,dy=y-cy;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const R=Math.min(rect.width,rect.height)/2-4;
    if(dist>R){tip.style.display='none';return}
    let ang=Math.atan2(dy,dx);if(ang<-Math.PI/2)ang+=Math.PI*2;
    const seg=(canvas._segments||[]).find(s=>ang>=s.start&&ang<s.end);
    if(seg){
      tip.innerHTML=`${esc(seg.label)}<br><b>${seg.value}</b> (${seg.pct}%)`;
      tip.style.display='block';
      tip.style.left=Math.min(window.innerWidth-280,ev.clientX+12)+'px';
      tip.style.top=(ev.clientY+12)+'px';
    }else tip.style.display='none';
  }
  canvas.addEventListener('mousemove',move);
  canvas.addEventListener('mouseleave',()=>tip.style.display='none');
  canvas.addEventListener('click',move);
}

function renderFilters(){
  const f=$('filtros');f.innerHTML='';
  const mk=(label,val,on)=>{
    const b=document.createElement('button');b.className='chip'+(on?' on':'');
    b.type='button';b.textContent=label;b.onclick=()=>{filtroCat=val;renderResults()};
    f.appendChild(b);
  };
  mk('Todas',-1,filtroCat===-1);
  CATEGORIAS.forEach((c,i)=>mk(c.nome,i,filtroCat===i));
}

function renderTable(data,body){
  const rows=[];
  FLAT.forEach(({ci,qi},idx)=>{
    const agg=aggregate(ci,qi,data);
    const top=agg.opts.map(o=>({o,v:agg.counts[o]||0})).sort((a,b)=>b.v-a.v)[0];
    const pct=agg.answered?(top.v/agg.answered*100).toFixed(1):'0.0';
    rows.push(`<tr><td>${idx+1}</td><td>${esc(CATEGORIAS[ci].nome)}</td><td>${esc(top.o)}</td><td>${top.v}</td><td class="pc">${pct}%</td></tr>`);
  });
  body.innerHTML=`<div class="tw"><table class="tb">
    <thead><tr><th>#</th><th>Categoria</th><th>Resposta mais frequente</th><th>Nº</th><th>%</th></tr></thead>
    <tbody>${rows.join('')}</tbody></table></div>`;
}

function renderResults(){
  const data=getLocal();
  renderFilters();
  const last=data.length?new Date(data[data.length-1].ts).toLocaleDateString('pt-BR'):'—';
  $('kpis').innerHTML=`
    <div class="kc"><b>${data.length}</b><span>respostas registradas</span></div>
    <div class="kc"><b>${TOTAL_Q}</b><span>perguntas analisadas</span></div>
    <div class="kc"><b style="font-size:1.4rem">${last}</b><span>última resposta</span></div>`;
  const body=$('resultBody');body.innerHTML='';
  if(!data.length){
    body.innerHTML='<div class="empty">Ainda não há respostas registradas.<br><button class="btn" id="emptyGo" type="button">Responder agora</button></div>';
    const eg=$('emptyGo');if(eg)eg.onclick=startFlow;
    return;
  }
  if(modoAtual==='tabela'){renderTable(data,body);return}
  const cats=filtroCat===-1?[0,1,2]:[filtroCat];
  cats.forEach(ci=>{
    const cat=CATEGORIAS[ci];
    const h=document.createElement('h3');h.className='cat';h.textContent=cat.nome;
    body.appendChild(h);
    const grid=document.createElement('div');grid.className='grid';
    cat.perguntas.forEach((p,qi)=>{
      const agg=aggregate(ci,qi,data);
      const card=document.createElement('article');card.className='card';
      const top=agg.opts.map(o=>({o,v:agg.counts[o]||0})).sort((a,b)=>b.v-a.v)[0];
      card.innerHTML=`<h3><span class="n">${qi+1}</span>${esc(p[0])}</h3>
        <div class="freq">Mais frequente: <b>${esc(top.o)}</b></div>
        <div class="pie"><canvas></canvas></div>
        <ul class="leg">${agg.opts.map((o,i)=>{
          const v=agg.counts[o]||0;
          const pct=agg.answered?(v/agg.answered*100).toFixed(1):'0.0';
          return `<li><div class="lr"><i style="background:${CORES[i%CORES.length]}"></i><em>${esc(o)}</em><b>${pct}% (${v})</b></div><div class="pb"><u style="width:${pct}%;background:${CORES[i%CORES.length]}"></u></div></li>`;
        }).join('')}</ul>`;
      grid.appendChild(card);
      const cv=card.querySelector('canvas');
      requestAnimationFrame(()=>{drawPie(cv,agg.opts,agg.counts);bindPieHover(cv)});
    });
    body.appendChild(grid);
  });
}

function updateBadge(){
  const n=getLocal().length;
  const bd=$('bd');
  if(n>0){bd.hidden=false;bd.textContent=n}else bd.hidden=true;
}

/* ================= EXPORT ================= */
function download(name,content,mime){
  const blob=new Blob([content],{type:mime});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function expJson(){download('pesquisa.json',JSON.stringify(getLocal(),null,2),'application/json')}
function expCsv(){
  const data=getLocal();if(!data.length)return alert('Sem dados.');
  const header=['protocolo','data','nome','email','telefone','cidade','uf','fonte',...FLAT.map(({ci,qi})=>`Q${ci+1}.${qi+1}: ${CATEGORIAS[ci].perguntas[qi][0]}`)];
  const esc2=s=>`"${String(s==null?'':s).replace(/"/g,'""')}"`;
  const lines=[header.map(esc2).join(',')];
  data.forEach(r=>lines.push([r.proto,r.ts,r.cad.nome,r.cad.email,r.cad.tel,r.cad.cidade,r.cad.uf,r.cad.fonte,...r.respostas].map(esc2).join(',')));
  download('pesquisa.csv','\ufeff'+lines.join('\r\n'),'text/csv;charset=utf-8');
}

/* ================= FLUXO ================= */
function startFlow(fromDraft){
  if(!fromDraft){
    state={step:0,answers:new Array(TOTAL_Q).fill(null),cad:{nome:'',email:'',tel:'',cidade:'',uf:'',fonte:''},proto:null,ts:null};
  }
  $('wizard').hidden=false;
  $('done').hidden=true;
  showView('form');
  renderStep();
}

/* ================= EVENTOS ================= */
$$('.tab').forEach(t=>t.onclick=()=>{
  const v=t.dataset.v;
  if(v==='ini')showView('ini');
  else if(v==='form')startFlow(false);
  else if(v==='res'){if(!PESQUISA.resultadosPublicos){alert('Os resultados estão ocultos nesta pesquisa.');return}renderResults();showView('res')}
});
$('ini-go').onclick=()=>startFlow(false);
$('lnk-resume').onclick=e=>{e.preventDefault();const d=loadDraft();if(!d)return alert('Nenhum rascunho salvo.');state=Object.assign(state,d);startFlow(true)};
$('lnk-results').onclick=e=>{e.preventDefault();renderResults();showView('res')};
$('f-inicio').onclick=()=>showView('ini');
$('recom').onclick=()=>{if(confirm('Descartar rascunho e recomeçar?')){clearDraft();startFlow(false)}};
$('back').onclick=back;
$('next').onclick=next;
$('btn-ver').onclick=()=>{renderResults();showView('res')};
$('btn-new').onclick=()=>startFlow(false);
$('rc-copy').onclick=async()=>{try{await navigator.clipboard.writeText(state.proto);$('rc-copy').textContent='Copiado ✓';setTimeout(()=>$('rc-copy').textContent='Copiar protocolo',1500)}catch(e){prompt('Copie manualmente:',state.proto)}};
$('rc-print').onclick=()=>window.print();
$('atualizar').onclick=()=>renderResults();
$('exp-json').onclick=expJson;
$('exp-csv').onclick=expCsv;
$$('.seg[data-modo]').forEach(s=>s.onclick=()=>{
  $$('.seg[data-modo]').forEach(x=>x.classList.remove('on'));
  s.classList.add('on');modoAtual=s.dataset.modo;renderResults();
});
// Enter avança
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.shiftKey && $('view-form').classList.contains('on') && !$('wizard').hidden){
    const tag=(e.target.tagName||'').toLowerCase();
    if(tag==='textarea')return;
    e.preventDefault();next();
  }
});
// Resize redesenha gráficos
let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if($('view-res').classList.contains('on')&&modoAtual==='graficos')renderResults()},250)});

/* ================= INIT ================= */
$('ano').textContent=new Date().getFullYear();
updateBadge();
const draft=loadDraft();
if(draft){$('resume-note').hidden=false}
showView('ini');

})();