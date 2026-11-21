const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ler = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch (e) { return d } };
const R = v => "R$ " + v.toFixed(2).replace(".", ",");
const esc = s => String(s).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
const FRETE = 16;

const PRATOS = { "Borscht (Sopa Ucraniana)": "D01", "Pierogi (Pastel Polonês)": "D02", "Holubtsi (Charuto Ucraniano)": "D03", "Varenyky (Pastel de Massa)": "D04", "Goulash": "D05", "Chicken Kiev": "D06", "Solyanka": "D07", "Pelmeni": "D08", "Bigos": "D09" };

const proxId = (pre, ids) => pre + String(Math.max(0, ...ids.map(i => parseInt(String(i).replace(/\D/g, "")) || 0)) + 1).padStart(3, "0");

const ABREV_USUARIO = { tel: "telefone", end: "endereco" };
const ABREV_PEDIDO = { n: "numero", obs: "observacao", pgto: "pagamento" };
const ABREV_ITEM = { n: "nome", q: "quantidade", p: "preco", d: "descricao" };
const renomear = (o, mapa) => Object.fromEntries(Object.entries(o).map(([k, v]) => [mapa[k] || k, v]));

const garantirIds = us => {
  us = us.map(u => renomear(u, ABREV_USUARIO));
  const idsUsu = us.map(u => u.id);
  us = us.map((u, i) => { if (u.id) return u; idsUsu[i] = proxId("U", idsUsu); return { id: idsUsu[i], ...u } });
  const idsPed = us.flatMap(x => (x.pedidos || []).map(p => p.id));
  us.forEach(u => {
    u.pedidos = (u.pedidos || []).map(o => {
      o = renomear(o, ABREV_PEDIDO);
      if (!o.id) { const id = proxId("P", idsPed); idsPed.push(id); o = { id, ...o } }
      o.idUsuario = u.id;
      o.itens = (o.itens || []).map(i => { i = renomear(i, ABREV_ITEM); return i.idPrato ? i : { idPrato: PRATOS[i.nome] || "", ...i } });
      return o;
    });
  });
  return us;
};

let DB = ler("usuarios", []), servidorOk = false;

const sincronizar = () => Promise.resolve(true);
const salvar = (k, v) => {
  localStorage.setItem(k, JSON.stringify(v));
  if (k === "usuarios") { DB = v; return sincronizar() }
  return Promise.resolve(true);
};

const depois = (p, destino) => p.then(() => { location.href = destino });
const usuarios = () => DB;
const logado = () => DB.find(u => u.email === ler("sessao", ""));
const carrinho = () => ler("carrinho", []).map(i => renomear(i, ABREV_ITEM)).filter(i => i.nome).map(i => ({ ...i, idPrato: i.idPrato || PRATOS[i.nome] || "" }));
const total = c => c.reduce((s, i) => s + i.preco * i.quantidade, 0);
const preco = t => parseFloat(t.replace(/[^\d,]/g, "").replace(",", "."));

const ico = () => $("#tema").textContent = document.documentElement.dataset.tema === "escuro" ? "☀️" : "🌙";
function badge() { $("#bd").textContent = carrinho().reduce((s, i) => s + i.quantidade, 0) }
let tt; function aviso(h) { const t = $("#toast"); t.innerHTML = h; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 3500) }
const letras = () => $$("[data-ls]").forEach(e => { e.innerHTML = e.textContent.split(" ").map(w => `<span class="w">${[...w].map(c => `<i class="l">${c}</i>`).join("")}</span>`).join(" ") });
const erro = (f, t) => { const m = $(".msg", f); m.textContent = t; m.style.display = "block" };

const MASC = {
  cpf: v => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"),
  telefone: v => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2"),
  cep: v => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"),
  nome: v => v.replace(/[^A-Za-zÀ-ÿ ]/g, "")
};

Promise.resolve().then(() => {

  let mudou = false;
  if (servidorOk && !ler("sincronizado", false)) {
    ler("usuarios", []).forEach(u => { if (!DB.some(x => x.email === u.email)) { DB.push(u); mudou = true } });
    localStorage.setItem("sincronizado", "true");
  }

  const antes = JSON.stringify(DB); DB = garantirIds(DB);
  if (JSON.stringify(DB) !== antes) mudou = true;
  if (mudou) { localStorage.setItem("usuarios", JSON.stringify(DB)); if (servidorOk) sincronizar() }

  const u0 = logado();
  document.documentElement.dataset.tema = ler("tema", "escuro"); ico();
  if (u0) { $("#visitante").hidden = true; $("#usuario").hidden = false; $("#nome-usuario").textContent = u0.nome.split(" ")[0] }
  $("#bur").onclick = () => $("#nav").classList.toggle("on");
  $("#tema").onclick = () => { const t = document.documentElement.dataset.tema === "escuro" ? "claro" : "escuro"; document.documentElement.dataset.tema = t; salvar("tema", t); ico() };
  $("#hs").onsubmit = e => { e.preventDefault(); location.href = "cardapio.html?q=" + encodeURIComponent($("#hs input").value.trim()) };
  $("#sair").onclick = () => { localStorage.removeItem("sessao"); location.href = "index.html" };
  letras(); badge();
  $$("[data-mask]").forEach(i => i.addEventListener("input", () => i.value = MASC[i.dataset.mask](i.value)));

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-add]"); if (!b) return;
    const k = b.closest(".card"), idPrato = k.dataset.id, nome = $("h3", k).textContent.trim(), valor = preco($(".rod b", k).textContent), descricao = $("p", k).textContent.trim();
    const c = carrinho(), x = c.find(i => i.idPrato === idPrato);
    x ? x.quantidade++ : c.push({ idPrato, nome, preco: valor, descricao, quantidade: 1 }); salvar("carrinho", c); badge();
    aviso(`✔ ${nome.split(" (")[0]} adicionado! <a href="carrinho.html">Ver carrinho</a>`);
  });

  if ($("#lista")) {
    let cat = "todos"; const q = $("#q"), cs = $$("#lista .card");
    q.value = new URLSearchParams(location.search).get("q") || "";
    const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filtra = () => {
      const t = norm(q.value); let v = 0;
      cs.forEach(c => { const ok = (cat == "todos" || $("small", c).textContent.trim() == cat) && norm($("h3", c).textContent + $("p", c).textContent).includes(t); c.hidden = !ok; v += ok });
      $("#nada").hidden = v > 0
    };
    $$(".fil .btn").forEach(b => b.onclick = () => { cat = b.dataset.c; $$(".fil .btn").forEach(x => x.classList.toggle("on", x == b)); filtra() });
    q.oninput = filtra; $("#busca").onsubmit = e => { e.preventDefault(); filtra() };
    filtra();
  }

  if ($("#itens")) {
    const render = () => {
      const c = carrinho(), u = logado(), sub = total(c), fr = c.length ? FRETE : 0;
      $("#itens").innerHTML = c.length ? c.map((i, x) => `<div class="box it" id="item-${esc(i.idPrato)}" data-id="${esc(i.idPrato)}"><h4>${esc(i.nome.split(" (")[0])}</h4><small>Porção individual - ${esc(i.descricao)}</small><p>${R(i.preco)} / porção</p><div class="qt"><button data-m="${x}" aria-label="menos">−</button><span>${i.quantidade}</span><button data-a="${x}" aria-label="mais">+</button></div></div>`).join("") : `<p class="vazio">Seu carrinho está vazio. <a class="btn" href="cardapio.html">Ver cardápio</a></p>`;
      $("#sub").textContent = R(sub); $("#fre").textContent = R(fr); $("#tot").textContent = R(sub + fr);
      $("#end").innerHTML = u ? `${esc(u.endereco)}<br>CEP ${esc(u.cep)}` : "Entre na sua conta para informar o endereço.";
    };
    document.addEventListener("click", e => {
      const m = e.target.dataset.m, a = e.target.dataset.a; if (m == null && a == null) return;
      const c = carrinho(); c[+(m ?? a)].quantidade += m != null ? -1 : 1;
      salvar("carrinho", c.filter(i => i.quantidade > 0)); badge(); render();
    });
    $("#ok").onclick = () => {
      const c = carrinho(), u = logado();
      if (!c.length) return aviso("Seu carrinho está vazio.");
      if (!u) return aviso('Faça login para confirmar. <a href="conta.html">Entrar</a>');
      u.pedidos = u.pedidos || [];
      const idsPed = usuarios().flatMap(x => (x.pedidos || []).map(p => p.id));
      u.pedidos.push({ id: proxId("P", idsPed), idUsuario: u.id, numero: u.pedidos.length + 1, data: new Date().toLocaleString("pt-BR"), itens: c.map(i => ({ idPrato: i.idPrato, nome: i.nome, quantidade: i.quantidade, preco: i.preco })), observacao: $("#obs").value, pagamento: $("#pg").value, total: total(c) + FRETE, status: "Em preparo" });
      const gravando = salvar("usuarios", usuarios().map(x => x.email === u.email ? u : x));
      salvar("carrinho", []); depois(gravando, "pedidos.html");
    };
    render();
  }

  if ($("#pedidos")) {
    const u = logado(), ps = u ? u.pedidos || [] : [];
    $("#pedidos").innerHTML = !u ? `<p class="vazio">Entre na sua conta para ver seus pedidos. <a class="btn" href="conta.html">Entrar</a></p>` : !ps.length ? `<p class="vazio">Você ainda não fez pedidos. <a class="btn" href="cardapio.html">Ver cardápio</a></p>` : [...ps].reverse().map(o => `<div class="box ped" id="${esc(o.id)}"><h4><b>Pedido #${esc(o.id)}</b><span class="st">● ${o.status}</span></h4><small>${o.data} · ${esc(o.pagamento)}</small><ul>${o.itens.map(i => `<li>${i.quantidade}x ${esc(i.nome)} — ${R(i.preco * i.quantidade)}</li>`).join("")}</ul>${o.observacao ? `<small>Obs: ${esc(o.observacao)}</small>` : ""}<p><b>Total: ${R(o.total)}</b></p></div>`).join("");
  }

  if ($("#fl")) {
    const aba = c => { $("#fl").hidden = c; $("#fc").hidden = !c; $("#tl").classList.toggle("on", !c); $("#tc").classList.toggle("on", c) };
    $("#tl").onclick = () => aba(0); $("#tc").onclick = () => aba(1); aba(location.hash == "#cadastro");
    $("#fl").onsubmit = e => {
      e.preventDefault(); const d = new FormData(e.target), u = usuarios().find(x => x.email === d.get("email").trim().toLowerCase() && x.senha === d.get("senha"));
      if (!u) return erro(e.target, "E-mail ou senha incorretos.");
      salvar("sessao", u.email); location.href = "index.html"
    };
    $("#fc").onsubmit = e => {
      e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f)), n = s => d[s].replace(/\D/g, "").length;
      if (d.nome.trim().split(" ").length < 2) return erro(f, "Digite nome e sobrenome.");
      if (n("cpf") != 11) return erro(f, "CPF incompleto.");
      if (n("telefone") < 10) return erro(f, "Telefone incompleto.");
      if (n("cep") != 8) return erro(f, "CEP incompleto.");
      if (d.senha.length < 6) return erro(f, "A senha precisa ter de 6 a 20 caracteres.");
      if (d.senha !== d.senha2) return erro(f, "As senhas não conferem.");
      const us = usuarios(), email = d.email.trim().toLowerCase();
      if (us.some(x => x.email === email || x.cpf === d.cpf)) return erro(f, "E-mail ou CPF já cadastrado.");
      delete d.senha2; d.email = email; d.pedidos = [];
      us.push({ id: proxId("U", us.map(x => x.id)), ...d });
      const gravando = salvar("usuarios", us); salvar("sessao", email); depois(gravando, "index.html")
    };
  }

  if ($("#pf")) {
    const u = logado(), F = $("#pf");
    if (!u) F.outerHTML = `<p class="vazio">Entre na sua conta para ver seu perfil. <a class="btn" href="conta.html">Entrar</a></p>`;
    else {
      ["nome", "email", "cpf", "telefone", "cep", "endereco"].forEach(k => F.elements[k].value = u[k]);
      F.onsubmit = async e => {
        e.preventDefault(); const g = k => F.elements[k].value;
        if (g("nome").trim().length < 3 || g("telefone").length < 14 || g("cep").length != 9) return erro(F, "Confira nome, telefone e CEP.");
        ["nome", "telefone", "cep", "endereco"].forEach(k => u[k] = g(k));
        $(".msg", F).style.display = "none";
        await salvar("usuarios", usuarios().map(x => x.email === u.email ? u : x));
        aviso("✔ Dados salvos!")
      };
    }
  }
});
