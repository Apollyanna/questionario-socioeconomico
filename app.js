/* ============================================================
   PESQUISA SOCIOECONOMICA - codigo do site
   Partes: 1) nucleo  2) resultados  3) formulario  4) inicio
   ============================================================ */

/* ============================================================
   NUCLEO: utilitarios, armazenamento local, banco online, navegacao
   ============================================================ */
(function () {
  'use strict';
  var PQ = window.PQ = window.PQ || {};
  var $ = PQ.$ = function (id) { return document.getElementById(id); };

  PQ.esc = function (s) {
    var m = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return m[c]; });
  };

  /* ---------- Armazenamento local ---------- */
  var KEY = 'socioeco_registros_v3';
  var PEND = 'socioeco_pendentes_v3';
  var PUB = 'socioeco_publico_v3';
  var memoria = null;
  var memFalhou = false;

  PQ.ler = function () {
    if (memFalhou && memoria) { return memoria; }
    try {
      var bruto = localStorage.getItem(KEY);
      var l = bruto ? JSON.parse(bruto) : [];
      if (!Array.isArray(l)) { return []; }
      return l.filter(function (r) { return r && typeof r === 'object' && r.a && typeof r.a === 'object'; });
    } catch (e) {
      return memoria || [];
    }
  };

  PQ.gravar = function (lista) {
    memoria = lista;
    try { localStorage.setItem(KEY, JSON.stringify(lista)); } catch (e) { memFalhou = true; }
    if (PQ.badge) { PQ.badge(); }
  };

  /* Resultados publicos: ligados por padrao. Para esconder, use PESQUISA.resultadosPublicos = false no config.js */
  PQ.publico = function () {
    return typeof PESQUISA === 'undefined' || !PESQUISA || PESQUISA.resultadosPublicos !== false;
  };

  /* ---------- Banco online (Google Apps Script) ---------- */
  var URL_BANCO = (typeof BANCO !== 'undefined' && BANCO && BANCO.url) ? String(BANCO.url) : '';
  PQ.REMOTO = URL_BANCO.length > 0;
  PQ.remoto = null;
  PQ.oculto = false;

  PQ.comTempo = function (url, opc, ms) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var tm = setTimeout(function () { if (ctrl) { ctrl.abort(); } }, ms);
    if (ctrl) { opc.signal = ctrl.signal; }
    return fetch(url, opc).then(function (r) { clearTimeout(tm); return r; }, function (e) { clearTimeout(tm); throw e; });
  };

  PQ.chamar = function (acao, params, ms) {
    var q = 'acao=' + encodeURIComponent(acao);
    Object.keys(params || {}).forEach(function (k) { q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); });
    var url = URL_BANCO + (URL_BANCO.indexOf('?') > -1 ? '&' : '?') + q + '&_=' + Date.now();
    return PQ.comTempo(url, { method: 'GET' }, ms || 20000).then(function (r) { return r.json(); });
  };

  PQ.novoId = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };

  PQ.rotulos = function (a) {
    var out = [];
    CATEGORIAS.forEach(function (c, ci) {
      c.perguntas.forEach(function (p, qi) {
        var v = a[ci + '-' + qi];
        out.push(v === undefined ? '' : p[1][v]);
});
    });
    return out;
  };

  PQ.enviarRemoto = function (reg) {
    var corpo = JSON.stringify({ tipo: 'resposta', v: 3, id: reg.id, t: reg.t, p: reg.p, a: reg.a, d: reg.d, rotulos: PQ.rotulos(reg.a) });
    return PQ.comTempo(URL_BANCO, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: corpo }, 20000);
  };

  function pendentes() {
    try {
      var l = JSON.parse(localStorage.getItem(PEND));
      return Array.isArray(l) ? l : [];
    } catch (e) { return []; }
  }

  function gravarPend(l) {
    try { localStorage.setItem(PEND, JSON.stringify(l)); } catch (e) { /* ignora */ }
  }

  PQ.guardarPendente = function (reg) {
    var p = pendentes();
    p.push(reg);
    gravarPend(p);
  };

  PQ.reenviarPendentes = function () {
    if (!PQ.REMOTO) { return; }
    var l = pendentes();
    if (!l.length) { return; }
    gravarPend([]);
    l.forEach(function (reg) {
      PQ.enviarRemoto(reg).catch(function () { PQ.guardarPendente(reg); });
    });
  };

  PQ.carregarPublico = function () {
    return PQ.chamar('listar').then(function (j) {
      if (!j || !j.ok) { throw new Error('resposta invalida'); }
      PQ.oculto = j.oculto === true;
      var linhas = Array.isArray(j.linhas) ? j.linhas : [];
      PQ.remoto = linhas.filter(function (r) { return r && r.a && typeof r.a === 'object'; });
      PQ.ler().forEach(function (reg) {
        if (reg.id && !PQ.remoto.some(function (x) { return x.id === reg.id; })) { PQ.remoto.push({ t: reg.t, id: reg.id, a: reg.a }); }
      });
      PQ.badge();
      return PQ.remoto;
    });
  };

  PQ.dadosPublicos = function () { return PQ.REMOTO ? (PQ.remoto || []) : PQ.ler(); };

  PQ.badge = function () {
    var n = PQ.dadosPublicos().length;
    $('bd').textContent = n;
    $('bd').hidden = !n;
  };

  /* ---------- Dispositivo ---------- */
  PQ.dispositivo = function () {
    var ua = navigator.userAgent || '';
    var tipo = /iPad|Tablet/i.test(ua) ? 'Tablet' : (/Mobi|Android|iPhone|iPod/i.test(ua) ? 'Celular' : 'Computador');
    var fuso = '';
    try { fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { fuso = ''; }
    return { tipo: tipo, largura: window.innerWidth, fuso: fuso, idioma: navigator.language || '' };
  };

  /* ---------- Tabela de respostas (conferencia, comprovante, painel) ---------- */
  PQ.tabelaCat = function (ci, a) {
    var linhas = CATEGORIAS[ci].perguntas.map(function (p, qi) {
      var v = a[ci + '-' + qi];
      return '<tr><td>' + (qi + 1) + '</td><td>' + PQ.esc(p[0]) + '</td><td>' +
        (v === undefined ? '<em>sem resposta</em>' : PQ.esc(p[1][v])) + '</td></tr>';
    }).join('');
    return '<div class="tw"><table class="tb rt"><thead><tr><th>N</th><th>Pergunta</th><th>Resposta</th></tr></thead><tbody>' +
      linhas + '</tbody></table></div>';
  };

  PQ.tabelaRespostas = function (a) {
    return CATEGORIAS.map(function (c, ci) {
      return '<h4 class="rt-h">' + PQ.esc(c.nome) + '</h4>' + PQ.tabelaCat(ci, a);
    }).join('');
  };

  /* ---------- Titulo da abertura ---------- */
  PQ.ajustarTitulos = function () {
    Array.prototype.forEach.call(document.querySelectorAll('.lt, .dt'), function (h) {
      var a = h.querySelector('.l1');
      var c = h.querySelector('.l2');
      if (!a || !c || !h.offsetParent) { return; }
      a.style.fontSize = '';
      var larg = function (el) {
        var r = document.createRange();
        r.selectNodeContents(el.firstChild);
        return r.getBoundingClientRect().width;
      };
      var w1 = larg(a);
      var w2 = larg(c);
      if (!w1 || !w2) { return; }
      var f = parseFloat(getComputedStyle(a).fontSize) * (w2 / w1);
      a.style.fontSize = Math.min(f, h.classList.contains('lt') ? 300 : 120) + 'px';
    });
  };

  /* ---------- Navegacao entre telas ---------- */
  PQ.hooks = {};

  PQ.mostrar = function (v) {
    $('hero').hidden = v !== 'ini';
    $('conteudo').hidden = v === 'ini';
    $('rodape').hidden = v === 'ini';
    $('topo').hidden = v !== 'res';
    ['form', 'res'].forEach(function (n) { $('view-' + n).hidden = v !== n; });
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-v') === v);
    });
    if (PQ.hooks[v]) { PQ.hooks[v](); }
    PQ.ajustarTitulos();
    window.scrollTo(0, 0);
  };

  /* ---------- Contatos da tela final ---------- */
  PQ.contatos = function () {
    var l = [];
    if (typeof CONTATO === 'undefined' || !CONTATO) { return; }
    var assunto = 'Pesquisa Socioeconômica';
    var msg = 'Olá! Participei da Pesquisa Socioeconômica e gostaria de falar com vocês.';
    if (CONTATO.email) {
      l.push('<a href="mailto:' + CONTATO.email + '?subject=' + encodeURIComponent(assunto) + '&body=' + encodeURIComponent(msg + '\n\n') + '" target="_blank" rel="noopener">E-mail</a>');
    }
    if (CONTATO.whatsapp) {
      var num = String(CONTATO.whatsapp).replace(/\D/g, '');
      if (num.length === 10 || num.length === 11) { num = '55' + num; }
      l.push('<a href="https://wa.me/' + num + '?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">WhatsApp</a>');
    }
    if (CONTATO.instagram) { l.push('<a href="https://instagram.com/' + CONTATO.instagram + '" target="_blank" rel="noopener">Instagram</a>'); }
    var el = $('ct-done');
    if (el) {
      el.innerHTML = l.join('');
      var w = el.parentNode;
      if (w) { w.hidden = !l.length; }
    }
  };
})();

/* ============================================================
   RESULTADOS PUBLICOS: graficos de pizza, tabela, filtros
   Mostra somente respostas agregadas (nunca dados pessoais).
   ============================================================ */
(function () {
  'use strict';
  var PQ = window.PQ;
  var $ = PQ.$;
  var CORES = ['#123f85', '#2563c9', '#3b82e0', '#7db3f5', '#a9cdf9', '#d3e4fb', '#5b6f95', '#a3b4cf'];
  var cache = {};
  var filtro = -1;
  var modo = 'graf';

  function dados() { return PQ.dadosPublicos(); }

  /* ---------- Gráficos de pizza ---------- */
  function pizza(cv, dados, prog, dest) {
    prog = prog === undefined ? 1 : prog;
    var box = cv.parentNode;
    var s = Math.floor(box.clientWidth);
    if (!s) { return; }
    var d = window.devicePixelRatio || 1;
    cv.width = s * d;
    cv.height = s * d;
    var x = cv.getContext('2d');
    x.setTransform(d, 0, 0, d, 0, 0);
    x.clearRect(0, 0, s, s);
    var soma = dados.reduce(function (a, b) { return a + b; }, 0);
    var cx = s / 2, cy = s / 2, r = s / 2 - 9;
    if (!soma) {
      x.beginPath();
      x.arc(cx, cy, r, 0, Math.PI * 2);
      x.fillStyle = '#e6f0fd';
      x.fill();
      return;
    }
    var ang = -Math.PI / 2;
    dados.forEach(function (n, i) {
      if (!n) { return; }
      var rr = i === dest ? r + 6 : r;
      var a = n / soma * Math.PI * 2 * prog;
      var inteira = a >= Math.PI * 2 - 0.0001;
      x.beginPath();
      if (inteira) {
        x.arc(cx, cy, rr, 0, Math.PI * 2);
      } else {
        x.moveTo(cx, cy);
        x.arc(cx, cy, rr, ang, ang + a);
        x.closePath();
      }
      x.fillStyle = CORES[i % CORES.length];
      x.fill();
      x.lineWidth = 2;
      x.strokeStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#14243b' : '#ffffff';
      x.stroke();
      var p = n / soma * 100;
      if (p >= 7 && prog === 1) {
        var m = ang + a / 2;
        x.fillStyle = (i === 3 || i === 4 || i === 5 || i === 7) ? '#0a2540' : '#ffffff';
        x.font = '600 ' + Math.max(11, Math.round(s / 20)) + 'px "Segoe UI", Arial, sans-serif';
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(Math.round(p) + '%', cx + (inteira ? 0 : Math.cos(m) * rr * 0.62), cy + (inteira ? 0 : Math.sin(m) * rr * 0.62));
      }
      ang += a;
    });
  }

  function desenharTodos(animar) {
    var lista = document.querySelectorAll('#charts canvas');
    var reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    Array.prototype.forEach.call(lista, function (cv) {
      var dados = cache[cv.getAttribute('data-k')];
      if (!dados) { return; }
      if (!animar || reduz) { pizza(cv, dados); return; }
      var t0 = null;
      function passo(ts) {
        if (t0 === null) { t0 = ts; }
        var p = Math.min((ts - t0) / 800, 1);
        pizza(cv, dados, 1 - Math.pow(1 - p, 3));
        if (p < 1) { requestAnimationFrame(passo); }
      }
      requestAnimationFrame(passo);
    });
  }

  function fmt(n) { return n.toFixed(1).replace('.', ','); }

  var io = null;

  function animarPizza(cv) {
    var dados = cache[cv.getAttribute('data-k')];
    if (!dados) { return; }
    var reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduz) { pizza(cv, dados); return; }
    var t0 = null;
    function passo(ts) {
      if (t0 === null) { t0 = ts; }
      var p = Math.min((ts - t0) / 900, 1);
      pizza(cv, dados, 1 - Math.pow(1 - p, 3));
      if (p < 1) { requestAnimationFrame(passo); }
    }
    requestAnimationFrame(passo);
  }

  function observar() {
    if (io) { io.disconnect(); io = null; }
    var els = document.querySelectorAll('#charts .card, #charts .tw, #charts .cat');
    if (!('IntersectionObserver' in window)) { desenharTodos(false); return; }
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        var el = e.target;
        io.unobserve(el);
        el.classList.add('in');
        var cv = el.querySelector('canvas');
        if (cv) { animarPizza(cv); }
        setTimeout(function () { el.classList.remove('rv', 'in'); el.style.transitionDelay = ''; }, 1400);
      });
    }, { threshold: 0.18 });
    Array.prototype.forEach.call(els, function (el, i) {
      el.classList.add('rv');
      el.style.transitionDelay = ((i % 3) * 90) + 'ms';
      io.observe(el);
    });
  }

  function listaRespostas(lista) {
    var itens = lista.slice().sort(function (a, b) { return b.t - a.t; }).map(function (r) {
      var p = r.p || {};
      var nome = p.nome ? PQ.esc(p.nome) : 'Participante sem identificação';
      var local = p.cidade ? ' · ' + PQ.esc(p.cidade) + (p.uf ? ' / ' + PQ.esc(p.uf) : '') : '';
      var info = '';
      if (p.email) { info += '<div><dt>E-mail</dt><dd>' + PQ.esc(p.email) + '</dd></div>'; }
      if (p.tel) { info += '<div><dt>Telefone</dt><dd>' + PQ.esc(p.tel) + '</dd></div>'; }
      return '<details class="rv-box rsp"><summary><b>' + nome + '</b><span>' + new Date(r.t).toLocaleString('pt-BR') + local + '</span></summary>' +
        (info ? '<dl class="rv-dl">' + info + '</dl>' : '') + PQ.tabelaRespostas(r.a) + '</details>';
    }).join('');
    $('charts').innerHTML = '<h2 class="cat">Respostas registradas neste navegador</h2>' + itens;
  }

  function renderResultados() {
    var lista = dados();
    var tot = lista.length;
    cache = {};
    filtros();
    modos();
    $('hint').hidden = modo !== 'graf';
    $('filtros').hidden = modo === 'resp';
    $('k1').textContent = tot;
    $('k3').textContent = tot ? new Date(Math.max.apply(null, lista.map(function (r) { return r.t; }))).toLocaleDateString('pt-BR') : '-';
    if (!tot) {
      $('charts').innerHTML = '<div class="empty">Ainda não há respostas registradas. ' +
        'Responda o questionário para visualizar os gráficos.</div>';
      return;
    }
    if (modo === 'resp') { listaRespostas(lista); return; }
    var html = '';
    CATEGORIAS.forEach(function (c, ci) {
      if (filtro >= 0 && filtro !== ci) { return; }
      html += '<h2 class="cat">' + c.nome + '</h2>' + (modo === 'tab' ?
        '<div class="tw"><table class="tb"><thead><tr><th>N</th><th>Pergunta</th><th>Resposta predominante</th><th>Participação</th></tr></thead><tbody>' :
        '<div class="grid">');
      c.perguntas.forEach(function (p, qi) {
        var k = ci + '-' + qi;
        var cont = p[1].map(function () { return 0; });
        lista.forEach(function (r) {
          var v = r.a[k];
          if (v !== undefined && cont[v] !== undefined) { cont[v]++; }
        });
        cache[k] = cont;
        var mx = 0;
        cont.forEach(function (v, vi) { if (v > cont[mx]) { mx = vi; } });
        if (modo === 'tab') {
          html += '<tr><td>' + (qi + 1) + '</td><td>' + p[0] + '</td><td>' + p[1][mx] + '</td><td class="pc">' +
            fmt(cont[mx] / tot * 100) + '%</td></tr>';
          return;
        }
        var leg = p[1].map(function (o, oi) {
          var pc = cont[oi] / tot * 100;
          var cor = CORES[oi % CORES.length];
          return '<li><div class="lr"><i style="background:' + cor + '"></i><em>' + o + '</em><b>' +
            fmt(pc) + '% (' + cont[oi] + ')</b></div><div class="pb"><u style="width:' + pc.toFixed(1) +
            '%;background:' + cor + '"></u></div></li>';
        }).join('');
        html += '<div class="card"><h3><span class="n">' + (qi + 1) + '</span><span>' + p[0] +
          '</span></h3><div class="freq">Mais frequente: <b>' + p[1][mx] + '</b></div><div class="pie"><canvas data-k="' + k + '" role="img" aria-label="Gráfico de pizza. ' + p[0] + ' Mais frequente: ' + p[1][mx] + '"></canvas></div><ul class="leg">' +
          leg + '</ul></div>';
      });
      html += modo === 'tab' ? '</tbody></table></div>' : '</div>';
    });
    $('charts').innerHTML = html;
    observar();
  }

  /* ---------- Filtros e dicas nos graficos ---------- */
  function filtros() {
    var nomes = ['Todas'].concat(CATEGORIAS.map(function (c) { return c.nome; }));
    $('filtros').innerHTML = nomes.map(function (n, i) {
      return '<button type="button" class="chip' + (i - 1 === filtro ? ' on' : '') + '" data-f="' + (i - 1) + '">' + n + '</button>';
    }).join('');
  }
  $('filtros').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.chip') : null;
    if (!b) { return; }
    filtro = parseInt(b.getAttribute('data-f'), 10);
    renderResultados();
  });

  function modos() {
    $('modos').innerHTML = [['graf', 'Gráficos'], ['tab', 'Resumo em tabela']].concat(PQ.REMOTO ? [] : [['resp', 'Respostas']]).map(function (m) {
      return '<button type="button" class="seg' + (m[0] === modo ? ' on' : '') + '" data-m="' + m[0] + '">' + m[1] + '</button>';
    }).join('');
  }
  $('modos').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.seg') : null;
    if (!b) { return; }
    modo = b.getAttribute('data-m');
    renderResultados();
  });

  var tip = document.createElement('div');
  tip.className = 'tip';
  tip.hidden = true;
  document.body.appendChild(tip);
  var ultimo = null;

  function somar(a) { return a.reduce(function (s, v) { return s + v; }, 0); }

  function fatia(cv, ev) {
    var dados = cache[cv.getAttribute('data-k')];
    var rc = cv.getBoundingClientRect();
    var s = rc.width;
    var dx = ev.clientX - rc.left - s / 2;
    var dy = ev.clientY - rc.top - s / 2;
    if (!dados || Math.sqrt(dx * dx + dy * dy) > s / 2 - 4) { return -1; }
    var soma = somar(dados);
    if (!soma) { return -1; }
    var ang = Math.atan2(dy, dx) + Math.PI / 2;
    if (ang < 0) { ang += Math.PI * 2; }
    var acc = 0;
    for (var i = 0; i < dados.length; i++) {
      acc += dados[i] / soma * Math.PI * 2;
      if (dados[i] && ang <= acc) { return i; }
    }
    return -1;
  }

  function esconder() {
    tip.hidden = true;
    if (ultimo) {
      pizza(ultimo, cache[ultimo.getAttribute('data-k')], 1);
      ultimo._d = -1;
      ultimo = null;
    }
  }

  function mover(ev) {
    var cv = ev.target;
    if (!cv || cv.tagName !== 'CANVAS') { esconder(); return; }
    var i = fatia(cv, ev);
    if (i < 0) { esconder(); return; }
    var k = cv.getAttribute('data-k').split('-');
    var pg = CATEGORIAS[k[0]].perguntas[k[1]];
    var dados = cache[cv.getAttribute('data-k')];
    tip.textContent = pg[1][i] + ': ' + fmt(dados[i] / somar(dados) * 100) + '% (' + dados[i] + ')';
    tip.hidden = false;
    tip.style.left = Math.max(8, Math.min(ev.clientX + 14, window.innerWidth - tip.offsetWidth - 8)) + 'px';
    tip.style.top = (ev.clientY + 16) + 'px';
    if (ultimo && ultimo !== cv) { pizza(ultimo, cache[ultimo.getAttribute('data-k')], 1); ultimo._d = -1; }
    if (cv._d !== i) { cv._d = i; pizza(cv, dados, 1, i); }
    ultimo = cv;
  }

  $('charts').addEventListener('pointermove', mover);
  $('charts').addEventListener('pointerdown', mover);
  $('charts').addEventListener('pointerleave', esconder);
  document.addEventListener('pointerdown', function (e) {
    if (!e.target || e.target.tagName !== 'CANVAS') { esconder(); }
  });
  window.addEventListener('scroll', function () { if (!tip.hidden) { esconder(); } }, { passive: true });

  window.addEventListener('resize', (function () {
    var t = null;
    return function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (!$('view-res').hidden) { desenharTodos(); }
      }, 120);
    };
  })());

  /* ---------- Abrir a tela de resultados ---------- */
  function avisoOculto() {
    $('k1').textContent = '-';
    $('k3').textContent = '-';
    $('charts').innerHTML = '<div class="empty">Os resultados ainda não foram divulgados pelo responsável pela pesquisa.</div>';
  }

  function abrirResultados() {
    if (!PQ.publico()) { avisoOculto(); return; }
    if (!PQ.REMOTO) {
      renderResultados();
      return;
    }
    $('charts').innerHTML = '<div class="empty">Carregando resultados...</div>';
    PQ.carregarPublico().then(function () {
      renderResultados();
    }).catch(function () {
      $('charts').innerHTML = '<div class="empty">Não foi possível carregar os resultados agora.<br><button class="btn sm" id="tentar" type="button">Tentar novamente</button></div>';
    });
  }

  $('charts').addEventListener('click', function (e) {
    if (e.target && e.target.id === 'tentar') { abrirResultados(); }
  });
  $('btn-reload').addEventListener('click', abrirResultados);
  PQ.hooks.res = abrirResultados;
})();

/* ============================================================
   FORMULARIO: cadastro, perguntas, revisao, envio e comprovante
   ============================================================ */
(function () {
  'use strict';
  var PQ = window.PQ;
  var $ = PQ.$;
  var esc = PQ.esc;
  var RASC = 'socioeco_rascunho_v3';
  var ETAPAS = ['Cadastro', 'Pessoais', 'Educação', 'Profissão', 'Revisão'];
  var UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  var ORIGENS = ['Indicação de amigo ou familiar', 'Redes sociais', 'WhatsApp', 'Escola, faculdade ou trabalho', 'Outro'];

  var etapa = 0;
  var resp = {};
  var cad = vazio();
  var voltarRev = false;
  var enviando = false;

  function vazio() {
    return { nome: '', email: '', tel: '', cidade: '', uf: '', origem: '', lgpd: false, cont: false };
  }

  /* ---------- Rascunho ---------- */
  function salvar() {
    try { localStorage.setItem(RASC, JSON.stringify({ e: etapa, a: resp, c: cad })); } catch (x) { /* ignora */ }
  }

  function limparRasc() {
    try { localStorage.removeItem(RASC); } catch (x) { /* ignora */ }
  }

  function texto(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }

  function carregar() {
    try {
      var r = JSON.parse(localStorage.getItem(RASC));
      if (!r || typeof r !== 'object') { return false; }
      var limpo = {};
      if (r.a && typeof r.a === 'object') {
        Object.keys(r.a).forEach(function (k) {
          var m = /^(\d+)-(\d+)$/.exec(k);
          var v = r.a[k];
          if (!m || typeof v !== 'number' || v % 1 !== 0 || v < 0) { return; }
          var c = CATEGORIAS[+m[1]];
          var p = c && c.perguntas[+m[2]];
          if (p && v < p[1].length) { limpo[k] = v; }
        });
      }
      var c0 = r.c && typeof r.c === 'object' ? r.c : {};
      var n = vazio();
      n.nome = texto(c0.nome, 120);
      n.email = texto(c0.email, 160);
      n.tel = texto(c0.tel, 20);
      n.cidade = texto(c0.cidade, 80);
      n.uf = UFS.indexOf(c0.uf) > -1 ? c0.uf : '';
      n.origem = ORIGENS.indexOf(c0.origem) > -1 ? c0.origem : '';
      n.lgpd = c0.lgpd === true;
      n.cont = c0.cont === true;
      if (!Object.keys(limpo).length && !n.nome && !n.email) { return false; }
      resp = limpo;
      cad = n;
      etapa = Math.min(Math.max(parseInt(r.e, 10) || 0, 0), 4);
      return true;
    } catch (x) { return false; }
  }

  var restaurou = false;

  /* ---------- Auxiliares ---------- */
  function feitasCat(ci) {
    var n = 0;
    CATEGORIAS[ci].perguntas.forEach(function (p, qi) { if (resp[ci + '-' + qi] !== undefined) { n++; } });
    return n;
  }

  function primeiraFalta() {
    for (var ci = 0; ci < CATEGORIAS.length; ci++) {
      for (var qi = 0; qi < CATEGORIAS[ci].perguntas.length; qi++) {
        if (resp[ci + '-' + qi] === undefined) { return [ci, qi]; }
      }
    }
    return null;
  }

  function mascara(v) {
    var d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length > 6) {
      var corte = d.length > 10 ? 7 : 6;
      return '(' + d.slice(0, 2) + ') ' + d.slice(2, corte) + '-' + d.slice(corte);
    }
    if (d.length > 2) { return '(' + d.slice(0, 2) + ') ' + d.slice(2); }
    return d;
  }

  function validarCad() {
    var e = {};
    var nome = cad.nome.trim();
    if (nome.length < 3 || nome.split(/\s+/).length < 2) { e.nome = 'Informe seu nome e sobrenome.'; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cad.email.trim())) { e.email = 'Informe um e-mail válido.'; }
    var dig = cad.tel.replace(/\D/g, '');
    if (dig && (dig.length < 10 || dig.length > 11)) { e.tel = 'Use DDD e número. Exemplo: (38) 99999-9999.'; }
    if (cad.cidade.trim().length < 2) { e.cidade = 'Informe a sua cidade.'; }
    if (!cad.uf) { e.uf = 'Escolha o estado.'; }
    if (!cad.lgpd) { e.lgpd = 'Para continuar, é preciso concordar.'; }
    return e;
  }

  function aplicarErros(e) {
    var primeiro = null;
    ['nome', 'email', 'tel', 'cidade', 'uf', 'lgpd'].forEach(function (k) {
      var s = $('e-' + k);
      var campo = $(k === 'lgpd' ? 'l-lgpd' : 'c-' + k);
      if (s) { s.textContent = e[k] || ''; }
      if (campo) { campo.classList.toggle('bad', !!e[k]); }
      if (e[k] && !primeiro) { primeiro = campo; }
    });
    $('msg').textContent = primeiro ? 'Corrija os campos destacados para continuar.' : '';
    if (primeiro) {
      primeiro.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var inp = primeiro.tagName === 'LABEL' ? primeiro.querySelector('input') : primeiro;
      if (inp && inp.focus) { try { inp.focus({ preventScroll: true }); } catch (x) { inp.focus(); } }
    }
  }

  /* ---------- Desenho das etapas ---------- */
  function desenharPassos() {
    $('steps').innerHTML = ETAPAS.map(function (n, i) {
      var cls = i === etapa ? 'on' : (i < etapa ? 'done' : '');
      return '<div class="sd ' + cls + '"' + (i === etapa ? ' aria-current="step"' : '') + '><i>' + (i < etapa ? '&#10003;' : (i + 1)) + '</i><span>' + n + '</span></div>';
    }).join('');
  }

  function atualizarProgresso() {
    var feitas = Object.keys(resp).length;
    var frac = (etapa >= 1 && etapa <= 3) ? feitasCat(etapa - 1) / 10 : 0;
    var pct = etapa >= 4 ? 100 : Math.round((etapa + frac) / 5 * 100);
    $('prog').style.width = pct + '%';
    $('progbar').setAttribute('aria-valuenow', pct);
    var t = 'Etapa ' + (etapa + 1) + ' de 5';
    if (etapa >= 1 && etapa <= 3) { t += ' · ' + feitas + ' de 30 perguntas respondidas'; }
    $('count').textContent = t;
  }

  function renderCadastro() {
    var ufs = '<option value="">Estado</option>' + UFS.map(function (u) {
      return '<option value="' + u + '"' + (cad.uf === u ? ' selected' : '') + '>' + u + '</option>';
    }).join('');
    var ors = '<option value="">Prefiro não informar</option>' + ORIGENS.map(function (o) {
      return '<option value="' + esc(o) + '"' + (cad.origem === o ? ' selected' : '') + '>' + esc(o) + '</option>';
    }).join('');
    $('qs').innerHTML =
      '<h2>Seu cadastro</h2>' +
      '<p class="sub">Precisamos saber quem está respondendo. Seus dados de identificação ficam visíveis só para o responsável pela pesquisa.</p>' +
      '<div class="fld"><label for="c-nome">Nome completo</label><input id="c-nome" type="text" autocomplete="name" autocapitalize="words" enterkeyhint="next" maxlength="120" placeholder="Nome e sobrenome" value="' + esc(cad.nome) + '"><small class="err" id="e-nome"></small></div>' +
      '<div class="g2">' +
      '<div class="fld"><label for="c-email">E-mail</label><input id="c-email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next" maxlength="160" placeholder="voce@exemplo.com" value="' + esc(cad.email) + '"><small class="err" id="e-email"></small></div>' +
      '<div class="fld"><label for="c-tel">WhatsApp ou telefone <em>(opcional)</em></label><input id="c-tel" type="tel" inputmode="tel" autocomplete="tel" enterkeyhint="next" maxlength="16" placeholder="(00) 00000-0000" value="' + esc(cad.tel) + '"><small class="err" id="e-tel"></small></div>' +
      '</div>' +
      '<div class="g2 g2b">' +
      '<div class="fld"><label for="c-cidade">Cidade</label><input id="c-cidade" type="text" autocomplete="address-level2" autocapitalize="words" enterkeyhint="done" maxlength="80" placeholder="Sua cidade" value="' + esc(cad.cidade) + '"><small class="err" id="e-cidade"></small></div>' +
      '<div class="fld"><label for="c-uf">Estado</label><select id="c-uf" autocomplete="address-level1">' + ufs + '</select><small class="err" id="e-uf"></small></div>' +
      '</div>' +
      '<div class="fld"><label for="c-origem">Como você conheceu esta pesquisa? <em>(opcional)</em></label><select id="c-origem">' + ors + '</select></div>' +
      '<details class="priv"><summary>Como usamos os seus dados</summary><div>' +
      '<p><strong>Quem vê:</strong> ' + (PQ.REMOTO ? 'apenas o responsável pela pesquisa.' : 'ninguém além de você. Os dados ficam salvos só neste navegador.') + '</p>' +
      '<p><strong>Para que:</strong> validar a sua participação, entender o perfil de quem respondeu e, se você permitir, entrar em contato.</p>' +
      '<p><strong>Gráficos públicos:</strong> mostram só totais, sem nome nem contato.</p>' +
      '<p><strong>Seus direitos:</strong> você pode pedir acesso, correção ou exclusão dos seus dados pelos contatos informados no final da pesquisa. A participação é voluntária.</p></div></details>' +
      '<label class="cons" id="l-lgpd"><input type="checkbox" id="c-lgpd"' + (cad.lgpd ? ' checked' : '') + '><span>Li o aviso acima e concordo com o uso dos meus dados para esta pesquisa.</span></label>' +
      '<small class="err" id="e-lgpd"></small>' +
      '<label class="cons" id="l-cont"><input type="checkbox" id="c-cont"' + (cad.cont ? ' checked' : '') + '><span>Aceito ser contatado(a) por e-mail ou WhatsApp sobre esta pesquisa <em>(opcional)</em>.</span></label>';
  }

  function renderPerguntas(ci) {
    var c = CATEGORIAS[ci];
    var html = '<h2>' + esc(c.nome) + '</h2><p class="sub">' + esc(c.desc) + '</p>';
    html += c.perguntas.map(function (p, qi) {
      var k = ci + '-' + qi;
      var ops = p[1].map(function (o, oi) {
        return '<label class="opt"><input type="radio" name="r' + k + '" value="' + oi + '"' + (resp[k] === oi ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
      }).join('');
      return '<fieldset class="q' + (resp[k] !== undefined ? ' ok' : '') + '" id="q' + k + '"><legend><span class="n">' + (qi + 1) + '</span><span>' + esc(p[0]) + '</span></legend><div class="opts">' + ops + '</div></fieldset>';
    }).join('');
    $('qs').innerHTML = html;
  }

  function renderRevisao() {
    var tel = cad.tel ? esc(cad.tel) : '<em>não informado</em>';
    var html = '<h2>Revise antes de enviar</h2><p class="sub">Confira seus dados e respostas. Se algo estiver errado, toque em Editar.</p>';
    html += '<div class="rv-box"><div class="rv-h"><h3>Seu cadastro</h3><button class="btn sm ghost" type="button" data-go="0">Editar</button></div>' +
      '<dl class="rv-dl"><div><dt>Nome</dt><dd>' + esc(cad.nome) + '</dd></div><div><dt>E-mail</dt><dd>' + esc(cad.email) + '</dd></div>' +
      '<div><dt>Telefone</dt><dd>' + tel + '</dd></div><div><dt>Cidade</dt><dd>' + esc(cad.cidade) + ' / ' + esc(cad.uf) + '</dd></div></dl></div>';
    CATEGORIAS.forEach(function (c, ci) {
      html += '<div class="rv-box"><div class="rv-h"><h3>' + esc(c.nome) + '</h3><button class="btn sm ghost" type="button" data-go="' + (ci + 1) + '">Editar</button></div>' + PQ.tabelaCat(ci, resp) + '</div>';
    });
    $('qs').innerHTML = html;
  }

  function desenhar() {
    if (etapa === 4) {
      var f = primeiraFalta();
      if (f) { etapa = f[0] + 1; }
    }
    if (etapa === 0) { renderCadastro(); }
    else if (etapa <= 3) { renderPerguntas(etapa - 1); }
    else { renderRevisao(); }
    $('msg').textContent = '';
    var q = $('qs');
    q.classList.remove('troca');
    void q.offsetWidth;
    q.classList.add('troca');
    $('back').disabled = etapa === 0;
    $('next').textContent = etapa === 4 ? 'Enviar respostas' : (voltarRev ? 'Voltar à revisão' : (etapa === 3 ? 'Revisar respostas' : 'Continuar'));
    desenharPassos();
    atualizarProgresso();
    salvar();
  }

  /* ---------- Navegacao ---------- */
  function irTopo() { window.scrollTo(0, 0); }

  function proximo() {
    if (etapa === 0) {
      var e = validarCad();
      if (Object.keys(e).length) { aplicarErros(e); return; }
      etapa = voltarRev ? 4 : 1;
    } else if (etapa <= 3) {
      var ci = etapa - 1;
      var faltam = [];
      CATEGORIAS[ci].perguntas.forEach(function (p, qi) { if (resp[ci + '-' + qi] === undefined) { faltam.push(qi); } });
      if (faltam.length) {
        faltam.forEach(function (qi) { $('q' + ci + '-' + qi).classList.add('miss'); });
        $('msg').textContent = 'Responda todas as perguntas desta etapa para continuar (' + faltam.length + (faltam.length > 1 ? ' pendentes' : ' pendente') + ').';
        $('q' + ci + '-' + faltam[0]).scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      etapa = voltarRev ? 4 : etapa + 1;
    } else {
      enviar();
      return;
    }
    voltarRev = false;
    desenhar();
    irTopo();
  }

  function voltar() {
    if (etapa === 0) { return; }
    if (voltarRev) { etapa = 4; voltarRev = false; } else { etapa--; }
    desenhar();
    irTopo();
  }

  /* ---------- Eventos do formulario ---------- */
  var CAMPOS = { 'c-nome': 'nome', 'c-email': 'email', 'c-tel': 'tel', 'c-cidade': 'cidade' };

  function limparErro(id) {
    var campo = $(id);
    if (campo) { campo.classList.remove('bad'); }
    var s = $('e-' + id.replace('c-', ''));
    if (s) { s.textContent = ''; }
    $('msg').textContent = '';
  }

  $('qs').addEventListener('input', function (e) {
    var t = e.target;
    var k = CAMPOS[t.id];
    if (!k) { return; }
    if (k === 'tel') { t.value = mascara(t.value); }
    cad[k] = t.value;
    limparErro(t.id);
    $('resume').hidden = true;
    salvar();
  });

  $('qs').addEventListener('change', function (e) {
    var t = e.target;
    if (t.type === 'radio') {
      resp[t.name.slice(1)] = parseInt(t.value, 10);
      var f = t.closest('.q');
      if (f) {
        f.classList.remove('miss');
        f.classList.add('ok');
        var prox = f.nextElementSibling;
        while (prox && prox.classList.contains('ok')) { prox = prox.nextElementSibling; }
        if (prox && prox.classList.contains('q')) {
          setTimeout(function () { prox.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 280);
        }
      }
      $('msg').textContent = '';
      $('resume').hidden = true;
      desenharPassos();
      atualizarProgresso();
      salvar();
    } else if (t.id === 'c-uf') {
      cad.uf = t.value; limparErro('c-uf'); salvar();
    } else if (t.id === 'c-origem') {
      cad.origem = t.value; salvar();
    } else if (t.id === 'c-lgpd') {
      cad.lgpd = t.checked; $('l-lgpd').classList.remove('bad'); $('e-lgpd').textContent = ''; $('msg').textContent = ''; salvar();
    } else if (t.id === 'c-cont') {
      cad.cont = t.checked; salvar();
    }
  });

  $('qs').addEventListener('click', function (e) {
    var go = e.target.closest ? e.target.closest('[data-go]') : null;
    if (go) {
      etapa = parseInt(go.getAttribute('data-go'), 10);
      voltarRev = true;
      desenhar();
      irTopo();
      return;
    }
  });

  $('qs').addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.key === 'Enter' && etapa === 0 && t.tagName === 'INPUT' && t.type !== 'checkbox') {
      e.preventDefault();
      proximo();
    }
  });

  $('next').addEventListener('click', proximo);
  $('back').addEventListener('click', voltar);

  /* ---------- Envio ---------- */
  function protocolo(id) { return 'PS-' + String(id).slice(-8).toUpperCase(); }

  function mostrarFinal(reg) {
    $('rc-prot').textContent = protocolo(reg.id);
    $('rc-data').textContent = new Date(reg.t).toLocaleString('pt-BR');
    $('rc-nome').textContent = reg.p.nome;
    $('rc-tab').innerHTML = PQ.tabelaRespostas(reg.a);
    $('rc-tab').hidden = true;
    $('rc-ver').textContent = 'Ver minhas respostas';
    $('btn-ver').hidden = !PQ.publico();
    $('wizard').hidden = true;
    $('done').hidden = false;
    PQ.ajustarTitulos();
    irTopo();
  }

  function enviar() {
    if (enviando) { return; }
    var e = validarCad();
    if (Object.keys(e).length) { etapa = 0; desenhar(); aplicarErros(e); return; }
    var f = primeiraFalta();
    if (f) {
      etapa = f[0] + 1;
      desenhar();
      var el = $('q' + f[0] + '-' + f[1]);
      if (el) { el.classList.add('miss'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      $('msg').textContent = 'Ainda há perguntas sem resposta nesta etapa.';
      return;
    }
    enviando = true;
    setTimeout(function () { enviando = false; }, 1500);
    var reg = {
      id: PQ.novoId(),
      t: Date.now(),
      p: {
        nome: cad.nome.trim(),
        email: cad.email.trim().toLowerCase(),
        tel: cad.tel.replace(/\D/g, ''),
        cidade: cad.cidade.trim(),
        uf: cad.uf,
        origem: cad.origem,
        contato: cad.cont
      },
      a: JSON.parse(JSON.stringify(resp)),
      d: PQ.dispositivo()
    };
    var lista = PQ.ler();
    lista.push({ id: reg.id, t: reg.t, a: reg.a, d: reg.d, p: reg.p });
    PQ.gravar(lista);
    limparRasc();
    if (PQ.REMOTO) {
      PQ.enviarRemoto(reg).catch(function () { PQ.guardarPendente(reg); });
    }
    mostrarFinal(reg);
  }

  $('rc-ver').addEventListener('click', function () {
    var t = $('rc-tab');
    t.hidden = !t.hidden;
    $('rc-ver').textContent = t.hidden ? 'Ver minhas respostas' : 'Esconder minhas respostas';
  });
  $('btn-ver').addEventListener('click', function () { PQ.mostrar('res'); });

  /* ---------- Nova resposta e recomeco ---------- */
  function zerar() {
    resp = {};
    cad = vazio();
    etapa = 0;
    voltarRev = false;
    limparRasc();
  }

  function novaResposta() {
    zerar();
    $('done').hidden = true;
    $('wizard').hidden = false;
    $('resume').hidden = true;
    desenhar();
    irTopo();
  }

  $('btn-new').addEventListener('click', novaResposta);

  $('recom').addEventListener('click', function () {
    zerar();
    $('resume').hidden = true;
    desenhar();
    irTopo();
  });

  PQ.hooks.form = function () {
    if (!$('done').hidden) { novaResposta(); } else { desenhar(); }
  };

  restaurou = carregar();
  $('resume').hidden = !restaurou;

  PQ.form = {
    temRascunho: function () { return $('done').hidden && (Object.keys(resp).length > 0 || !!cad.nome || !!cad.email); }
  };
})();

/* ============================================================
   INICIO: liga as pecas e escolhe a tela de abertura
   ============================================================ */
(function () {
  'use strict';
  var PQ = window.PQ;
  var $ = PQ.$;

  PQ.contatos();

  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
    b.addEventListener('click', function () { PQ.mostrar(b.getAttribute('data-v')); });
  });
  $('ini-go').addEventListener('click', function () { PQ.mostrar('form'); });
  PQ.hooks.ini = function () {
    $('ini-go').textContent = PQ.form.temRascunho() ? 'Continuar' : 'Começar';
  };

  /* efeito sutil no grafico da abertura */
  var viz = document.querySelector('#hero .viz-svg');
  if (viz) {
    $('hero').addEventListener('pointermove', function (e) {
      var r = $('hero').getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      viz.style.translate = (x * -30) + 'px ' + (y * -30) + 'px';
    });
  }

  /* titulo da abertura: refaz o ajuste quando a fonte termina de carregar */
  window.addEventListener('resize', function () { PQ.ajustarTitulos(); });
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(PQ.ajustarTitulos); }
  if (document.fonts && document.fonts.addEventListener) { document.fonts.addEventListener('loadingdone', PQ.ajustarTitulos); }
  window.addEventListener('load', function () {
    PQ.ajustarTitulos();
    setTimeout(PQ.ajustarTitulos, 400);
    setTimeout(PQ.ajustarTitulos, 1500);
  });

  /* modo local x online */
  $('btn-reload').hidden = !PQ.REMOTO;
  $('btn-reload').parentNode.hidden = !PQ.REMOTO;
  var fp = $('rodape').querySelector('p');
  if (fp) {
    fp.textContent = PQ.REMOTO
      ? 'Pesquisa socioeconômica. Seus dados de identificação ficam visíveis só para o responsável pela pesquisa.'
      : 'Pesquisa socioeconômica. As respostas ficam salvas neste navegador.';
  }

  PQ.reenviarPendentes();
  PQ.badge();

  function rota() {
    var h = location.hash;
    if (h === '#resultados') { PQ.mostrar('res'); return true; }
    return false;
  }

  window.addEventListener('hashchange', rota);
  if (!rota()) { PQ.mostrar('ini'); }
})();
