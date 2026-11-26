(() => {
  "use strict";

  const PAGE_SIZE = 12;
  const CATS = [
    { name: "Electronics", slug: "electronics", h: "100%" },
    { name: "Home & Kitchen", slug: "home", h: "84%" },
    { name: "Outdoors", slug: "outdoors", h: "93%" },
    { name: "Office", slug: "office", h: "76%" },
    { name: "Apparel", slug: "apparel", h: "88%" },
    { name: "Toys", slug: "toys", h: "68%" },
  ];
  const slugOf = (cat) => (CATS.find((c) => c.name === cat) || { slug: "office" }).slug;

  const G = (inner) => `<svg class="glyph" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const GLYPHS = {
    electronics: G('<path d="M22 72V62a38 38 0 0 1 76 0v10"/><rect x="14" y="68" width="18" height="30" rx="8"/><rect x="88" y="68" width="18" height="30" rx="8"/>'),
    home: G('<path d="M30 52h48v30a16 16 0 0 1-16 16H46a16 16 0 0 1-16-16z"/><path d="M78 60h8a10 10 0 0 1 0 20h-8"/><path d="M44 40c-4-6 4-8 0-14M58 40c-4-6 4-8 0-14"/>'),
    outdoors: G('<path d="M60 22 22 94h76z"/><path d="M60 22v72M60 94l-14-26M60 94l14-26"/><path d="M10 94h100"/>'),
    office: G('<path d="M38 100h44"/><path d="M60 100V66l24-30"/><path d="M76 28l22 18-10 12-22-18z"/>'),
    apparel: G('<path d="M60 40c0-8 10-8 10-16a10 10 0 1 0-20 0"/><path d="M60 40 14 80a6 6 0 0 0 4 10h84a6 6 0 0 0 4-10z"/>'),
    toys: G('<rect x="24" y="64" width="72" height="30" rx="5"/><rect x="36" y="38" width="48" height="26" rx="5"/><circle cx="48" cy="30" r="5"/><circle cx="72" cy="30" r="5"/><circle cx="42" cy="56" r="0"/>'),
  };

  // One line drawing per kind of product, matched by name; categories above are the fallback.
  Object.assign(GLYPHS, {
    mouse: G('<rect x="38" y="20" width="44" height="80" rx="22"/><path d="M60 20v30M38 50h44"/>'),
    keyboard: G('<rect x="12" y="38" width="96" height="48" rx="8"/><path d="M26 52h2M42 52h2M58 52h2M74 52h2M90 52h2M26 64h2M42 64h36M90 64h2M26 76h2M42 76h36"/>'),
    monitor: G('<rect x="16" y="24" width="88" height="56" rx="6"/><path d="M60 80v16M40 98h40"/>'),
    webcam: G('<circle cx="60" cy="46" r="28"/><circle cx="60" cy="46" r="10"/><path d="M60 74v16M40 98h40"/>'),
    ssd: G('<rect x="26" y="28" width="68" height="64" rx="10"/><path d="M40 46h40"/><circle cx="74" cy="74" r="3"/>'),
    speaker: G('<rect x="34" y="16" width="52" height="88" rx="16"/><circle cx="60" cy="42" r="8"/><circle cx="60" cy="76" r="15"/>'),
    dock: G('<rect x="14" y="58" width="92" height="30" rx="8"/><path d="M32 73h2M50 73h2M68 73h2M86 73h2"/><path d="M60 58V40a14 14 0 0 1 14-14h14"/>'),
    tracker: G('<circle cx="60" cy="64" r="36"/><circle cx="60" cy="64" r="9"/><path d="M60 28V14"/>'),
    charger: G('<circle cx="60" cy="60" r="38"/><circle cx="60" cy="60" r="22"/><path d="M62 46l-8 15h12l-8 15"/>'),
    press: G('<rect x="34" y="42" width="48" height="58" rx="6"/><path d="M58 14v28M46 14h24"/><path d="M82 54h8a9 9 0 0 1 0 24h-8"/>'),
    skillet: G('<circle cx="46" cy="64" r="32"/><circle cx="46" cy="64" r="22"/><path d="M78 58l30-12"/>'),
    knives: G('<rect x="30" y="58" width="60" height="42" rx="6"/><path d="M44 58V20M60 58V14M76 58V26"/>'),
    kettle: G('<path d="M34 48h52l-6 50H40z"/><path d="M86 58c14 0 14 22 0 22"/><path d="M34 54l-14-10"/><path d="M52 48c0-10 16-10 16 0"/>'),
    fryer: G('<rect x="26" y="24" width="68" height="76" rx="20"/><circle cx="60" cy="52" r="12"/><path d="M44 82h32"/>'),
    board: G('<rect x="28" y="18" width="64" height="84" rx="14"/><circle cx="60" cy="36" r="5"/>'),
    towel: G('<rect x="22" y="28" width="76" height="24" rx="7"/><rect x="22" y="56" width="76" height="24" rx="7"/><path d="M34 88h52"/>'),
    bottle: G('<path d="M48 14h24v14H48z"/><path d="M42 38a8 8 0 0 1 8-8h20a8 8 0 0 1 8 8v56a8 8 0 0 1-8 8H50a8 8 0 0 1-8-8z"/><path d="M42 62h36"/>'),
    sleeping: G('<rect x="36" y="10" width="48" height="100" rx="24"/><path d="M60 24v72M52 40h16"/>'),
    poles: G('<path d="M38 106 70 22M82 106 52 26"/><path d="M64 16l12 6M46 20l12 6"/>'),
    headlamp: G('<path d="M16 56a44 26 0 0 1 88 0"/><rect x="40" y="50" width="40" height="32" rx="12"/><circle cx="60" cy="66" r="8"/>'),
    stove: G('<rect x="24" y="68" width="72" height="28" rx="8"/><path d="M60 68V56"/><path d="M60 18c12 10 12 24 0 34-12-10-12-24 0-34z"/>'),
    cooler: G('<rect x="18" y="44" width="84" height="56" rx="8"/><path d="M18 64h84M44 44V30h32v14"/>'),
    chair: G('<path d="M42 14h36v42H42z"/><path d="M32 62h56v10H32zM60 72v22M38 104l22-10 22 10"/>'),
    desk: G('<rect x="14" y="36" width="92" height="12" rx="4"/><path d="M26 48v52M94 48v52"/><rect x="44" y="48" width="32" height="22" rx="3"/>'),
    arm: G('<path d="M22 100h30"/><path d="M38 100V64l32-24"/><rect x="62" y="18" width="42" height="30" rx="4"/>'),
    shredder: G('<rect x="26" y="54" width="68" height="46" rx="8"/><path d="M36 54l4-14h40l4 14M44 74v14M60 74v14M76 74v14"/>'),
    jacket: G('<path d="M44 20 18 42l10 16 12-8v54h40V50l12 8 10-16-26-22"/><path d="M44 20c4 12 28 12 32 0"/><path d="M60 34v70"/>'),
    shoes: G('<path d="M14 88V52l24 8 14 16 38 6a16 16 0 0 1 16 14v6z"/><path d="M14 94h92M52 76l-8-14"/>'),
    beanie: G('<path d="M24 74a36 36 0 0 1 72 0z"/><rect x="18" y="74" width="84" height="18" rx="7"/><circle cx="60" cy="28" r="8"/>'),
    pullover: G('<path d="M44 20 14 54l14 12 14-12v52h36V54l14 12 14-12-30-34"/><path d="M44 20c4 12 28 12 32 0"/>'),
    socks: G('<path d="M42 12h32v52l24 18a14 14 0 0 1-9 25H50a16 16 0 0 1-16-16V12z"/><path d="M42 30h32"/>'),
    car: G('<path d="M14 80l10-28h52l22 28v12H14z"/><path d="M32 52l8-16h28l12 16"/><circle cx="36" cy="94" r="9"/><circle cx="84" cy="94" r="9"/>'),
    game: G('<rect x="20" y="20" width="80" height="80" rx="8"/><path d="M60 20v80M20 60h80"/><circle cx="40" cy="40" r="7"/><path d="M72 72l16 16M88 72 72 88"/>'),
    puzzle: G('<path d="M22 28h28a10 10 0 1 1 20 0h28v28a10 10 0 1 0 0 20v24H70a10 10 0 1 0-20 0H22z"/>'),
    drone: G('<circle cx="60" cy="60" r="12"/><path d="M50 50 30 30M70 50l20-20M50 70 30 90M70 70l20 20"/><circle cx="24" cy="24" r="11"/><circle cx="96" cy="24" r="11"/><circle cx="24" cy="96" r="11"/><circle cx="96" cy="96" r="11"/>'),
  });
  const GLYPH_RULES = [
    [/monitor arm/, "arm"], [/monitor/, "monitor"], [/mouse/, "mouse"], [/keyboard/, "keyboard"], [/webcam/, "webcam"], [/ssd/, "ssd"],
    [/speaker/, "speaker"], [/dock/, "dock"], [/tracker/, "tracker"], [/charger/, "charger"], [/french press/, "press"],
    [/skillet/, "skillet"], [/knife/, "knives"], [/kettle/, "kettle"], [/fryer/, "fryer"], [/cutting board/, "board"],
    [/towel/, "towel"], [/bottle/, "bottle"], [/sleeping/, "sleeping"], [/poles/, "poles"], [/headlamp/, "headlamp"],
    [/stove/, "stove"], [/cooler/, "cooler"], [/chair/, "chair"], [/lamp/, "office"], [/desk/, "desk"], [/shredder/, "shredder"],
    [/jacket/, "jacket"], [/shoes/, "shoes"], [/beanie/, "beanie"], [/pullover/, "pullover"], [/socks/, "socks"],
    [/remote control car/, "car"], [/board game/, "game"], [/puzzle/, "puzzle"], [/drone/, "drone"],
  ];
  function glyphFor(p) {
    const n = String(p.Name || "").toLowerCase();
    const hit = GLYPH_RULES.find(([re]) => re.test(n));
    return GLYPHS[hit ? hit[1] : slugOf(p.Category)];
  }

  const $ = (s, el = document) => el.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + Number(n).toFixed(2);
  const round2 = (n) => Math.round(n * 100) / 100;

  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  async function api(path, opts) {
    const res = await fetch(path, opts);
    let body = null;
    try { body = await res.json(); } catch { /* no body */ }
    if (!res.ok) {
      const base = (body && body.error) || `Request failed (${res.status})`;
      const e = new Error(body && body.reason ? `${base} (${body.reason})` : base);
      e.status = res.status; throw e;
    }
    return body;
  }

  // Business events for Datadog RUM; harmless when RUM is not loaded.
  const rum = (fn) => { try { if (window.DD_RUM) fn(window.DD_RUM); } catch { /* ignore */ } };

  const state = { category: "", q: "", page: 1, products: new Map(), bag: store.get("aurelle.bag", {}), orders: store.get("aurelle.orders", []) };

  /* ---------- tiles ---------- */
  function tileHtml(p) {
    const slug = slugOf(p.Category);
    const s = 46 + ((p.Id * 7) % 18);
    const x = 8 + ((p.Id * 37) % 46);
    const y = 6 + ((p.Id * 53) % 34);
    return `<span class="orb" style="--s:${s}%;--x:${x}%;--y:${y}%"></span>${glyphFor(p)}`;
  }
  const cssColor = (slug) => `var(--${slug})`;

  /* ---------- hero arches + chips ---------- */
  function renderArches(counts) {
    $("#arches").innerHTML = CATS.map((c, i) => `
      <li><button type="button" class="arch" data-cat="${esc(c.name)}" style="--c:${cssColor(c.slug)};--h:${c.h};--i:${i}" aria-label="Shop ${esc(c.name)}, ${counts[c.name] || 0} pieces">
        ${GLYPHS[c.slug]}
        <span class="label"><b>${esc(c.name)}</b><span>${counts[c.name] || 0} pieces</span></span>
      </button></li>`).join("");
  }
  function renderChips() {
    const all = `<button type="button" class="chip" data-all data-cat="" aria-pressed="${state.category === ""}">All</button>`;
    $("#chips").innerHTML = all + CATS.map((c) => `<button type="button" class="chip" data-cat="${esc(c.name)}" style="--c:${cssColor(c.slug)}" aria-pressed="${state.category === c.name}">${esc(c.name)}</button>`).join("");
  }

  /* ---------- collection ---------- */
  function cardHtml(p) {
    const slug = slugOf(p.Category);
    return `<article class="card">
      <button type="button" class="tile" data-open="${p.Id}" style="--c:${cssColor(slug)}" aria-label="View ${esc(p.Name)}">${tileHtml(p)}</button>
      <div class="meta">
        <h3>${esc(p.Name)}</h3>
        <p class="sku">${esc(p.Sku)}</p>
        <div class="row"><span class="price">${money(p.Price)}</span><button type="button" class="add" data-add="${p.Id}" aria-label="Add ${esc(p.Name)} to bag">Add to bag</button></div>
      </div>
    </article>`;
  }
  function skeletons() {
    $("#grid").innerHTML = Array.from({ length: 8 }, () => `<article class="card skeleton"><div class="tile" style="border-radius:999px 999px 10px 10px"></div></article>`).join("");
  }
  async function loadProducts(reset) {
    if (reset) { state.page = 1; skeletons(); $("#moreBtn").hidden = true; }
    const params = new URLSearchParams({ page: state.page, pageSize: PAGE_SIZE });
    if (state.category) params.set("category", state.category);
    if (state.q) params.set("q", state.q);
    $("#status").textContent = "";
    try {
      const data = await api(`/api/products?${params}`);
      data.products.forEach((p) => state.products.set(p.Id, p));
      const html = data.products.map(cardHtml).join("");
      if (reset) $("#grid").innerHTML = html; else $("#grid").insertAdjacentHTML("beforeend", html);
      $("#moreBtn").hidden = data.count < PAGE_SIZE;
      if (reset && data.count === 0) {
        $("#status").innerHTML = `Nothing matches that search. <button type="button" id="clearBtn">Clear filters</button>`;
      }
    } catch (e) {
      $("#grid").innerHTML = "";
      $("#status").innerHTML = `The collection did not load. Check that the API is running, then <button type="button" id="retryBtn">try again</button>.`;
    }
  }
  function setCategory(cat, scroll) {
    state.category = cat; renderChips(); loadProducts(true);
    if (scroll) $("#collection").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  /* ---------- bag ---------- */
  const bagLines = () => Object.values(state.bag);
  const units = () => bagLines().reduce((s, l) => s + l.qty, 0);
  function saveBag() { store.set("aurelle.bag", state.bag); $("#bagCount").textContent = units(); }
  function addToBag(p, qty = 1) {
    const cur = state.bag[p.Id];
    state.bag[p.Id] = { product: p, qty: Math.min((cur ? cur.qty : 0) + qty, 20) };
    saveBag(); toast(`${p.Name} is in your bag`);
    rum((r) => r.addAction("add_to_bag", { product_id: p.Id, sku: p.Sku, category: p.Category, price: p.Price, quantity: qty }));
  }
  function totals() {
    const subtotal = round2(bagLines().reduce((s, l) => s + round2(l.product.Price * l.qty), 0));
    const n = units();
    const discount = subtotal >= 500 ? round2(subtotal * 0.1) : 0;
    const taxable = subtotal - discount;
    const tax = round2(taxable * 0.0825);
    const shipping = subtotal === 0 || subtotal >= 250 ? 0 : round2(5 + 0.75 * n);
    return { subtotal, discount, tax, shipping, total: round2(taxable + tax + shipping) };
  }
  function shipNudge(sub) {
    if (sub >= 250) return `<div class="ship">Shipping is free on this order.<div class="bar"><i style="width:100%"></i></div></div>`;
    return `<div class="ship">Add ${money(250 - sub)} more for free shipping.<div class="bar"><i style="width:${Math.round((sub / 250) * 100)}%"></i></div></div>`;
  }
  function summaryHtml(t) {
    return `<dl class="sum">
      <dt>Subtotal</dt><dd>${money(t.subtotal)}</dd>
      ${t.discount ? `<dt>Discount, 10%</dt><dd>-${money(t.discount)}</dd>` : ""}
      <dt>Shipping</dt><dd>${t.shipping ? money(t.shipping) : "Free"}</dd>
      <dt>Tax</dt><dd>${money(t.tax)}</dd>
      <dt class="tot">Total</dt><dd class="tot">${money(t.total)}</dd></dl>`;
  }
  function renderBag(step = "bag", extra = {}) {
    const dlg = $("#bag");
    const lines = bagLines();
    if (step === "done") {
      const o = extra.order;
      dlg.innerHTML = `<div class="panel done"><header><h2>Order placed</h2><button class="close" data-close>Close</button></header>
        <p>Thank you, ${esc(o.customerName || "friend")}. Your order number is <span class="chipnum">${o.orderId}</span>.</p>
        <dl class="sum"><dt>Items</dt><dd>${o.totalUnits}</dd><dt>Subtotal</dt><dd>${money(o.subtotal)}</dd>${o.discount ? `<dt>Discount</dt><dd>-${money(o.discount)}</dd>` : ""}<dt>Shipping</dt><dd>${o.shipping ? money(o.shipping) : "Free"}</dd><dt>Tax</dt><dd>${money(o.tax)}</dd><dt class="tot">Total</dt><dd class="tot">${money(o.total)}</dd></dl>
        <div class="push"><button class="btn" data-close>Keep browsing</button></div></div>`;
      return;
    }
    if (!lines.length) {
      dlg.innerHTML = `<div class="panel"><header><h2>Your bag</h2><button class="close" data-close>Close</button></header>
        <p class="empty">Your bag is empty. Pick something from the collection and it will wait here.</p>
        <div class="push"><button class="btn" data-close data-go="collection">Browse the collection</button></div></div>`;
      return;
    }
    const t = totals();
    if (step === "checkout") {
      dlg.innerHTML = `<form class="panel" id="checkoutForm" novalidate><header><h2>Delivery details</h2><button type="button" class="close" data-back>Back to bag</button></header>
        <div class="form">
          <div class="field"><label for="f-name">Full name</label><input id="f-name" name="customerName" autocomplete="name" required></div>
          <div class="field"><label for="f-email">Email</label><input id="f-email" name="customerEmail" type="email" autocomplete="email" required></div>
          <div class="field full"><label for="f-street">Street address</label><input id="f-street" name="street" autocomplete="street-address" required></div>
          <div class="field"><label for="f-city">City</label><input id="f-city" name="city" autocomplete="address-level2" required></div>
          <div class="field"><label for="f-state">State or region</label><input id="f-state" name="state" autocomplete="address-level1"></div>
          <div class="field"><label for="f-zip">Postal code</label><input id="f-zip" name="zip" autocomplete="postal-code"></div>
          <div class="field"><label for="f-country">Country</label><input id="f-country" name="country" autocomplete="country-name" value="US"></div>
          <div class="field full"><label for="f-notes">Delivery notes (optional)</label><textarea id="f-notes" name="notes" rows="2"></textarea></div>
        </div>
        ${extra.error ? `<p class="error" role="alert">${esc(extra.error)}</p>` : ""}
        ${summaryHtml(t)}
        <div class="push"><button class="btn" type="submit" style="width:100%">Place order, ${money(t.total)}</button></div></form>`;
      return;
    }
    dlg.innerHTML = `<div class="panel"><header><h2>Your bag</h2><button class="close" data-close>Close</button></header>
      <ul class="lines">${lines.map((l) => {
        const p = l.product, slug = slugOf(p.Category);
        return `<li class="line"><div class="mini" style="--c:${cssColor(slug)}">${glyphFor(p)}</div>
          <div><h3>${esc(p.Name)}</h3><p class="sub">${money(p.Price)} each</p>
            <div class="stepper"><button type="button" data-dec="${p.Id}" aria-label="One fewer ${esc(p.Name)}">&minus;</button><span aria-live="polite">${l.qty}</span><button type="button" data-inc="${p.Id}" aria-label="One more ${esc(p.Name)}">+</button></div></div>
          <div class="amt">${money(round2(p.Price * l.qty))}<button type="button" class="remove" data-rm="${p.Id}">Remove</button></div></li>`;
      }).join("")}</ul>
      ${shipNudge(t.subtotal)}
      ${summaryHtml(t)}
      <div class="push"><button class="btn" data-checkout style="width:100%">Continue to delivery</button></div></div>`;
  }
  function openBag(step) { renderBag(step); const d = $("#bag"); if (!d.open) d.showModal(); }

  async function placeOrder(form) {
    const f = new FormData(form);
    const get = (k) => String(f.get(k) || "").trim();
    if (!get("customerName") || !get("customerEmail") || !get("street") || !get("city")) {
      renderBag("checkout", { error: "Please fill in your name, email, street address and city." });
      return;
    }
    const btn = form.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = "Placing order";
    const body = {
      customerName: get("customerName"), customerEmail: get("customerEmail"), notes: get("notes") || undefined,
      shippingAddress: { street: get("street"), city: get("city"), state: get("state"), zip: get("zip"), country: get("country") },
      items: bagLines().map((l) => ({ productId: l.product.Id, quantity: l.qty })),
    };
    try {
      const order = await api("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      state.orders = [order.orderId, ...state.orders.filter((id) => id !== order.orderId)].slice(0, 12);
      store.set("aurelle.orders", state.orders);
      state.bag = {}; saveBag();
      rum((r) => {
        r.setUser({ id: body.customerEmail, name: body.customerName, email: body.customerEmail });
        r.addAction("order_placed", { order_id: order.orderId, total: order.total, items: order.totalUnits, payment_status: order.paymentStatus });
      });
      renderBag("done", { order });
    } catch (e) {
      rum((r) => r.addError(e, { flow: "checkout", status: e.status }));
      renderBag("checkout", { error: `${e.message}. Your bag is unchanged, so you can try again.` });
    }
  }

  /* ---------- product detail ---------- */
  async function openDetail(id) {
    const dlg = $("#detail");
    let p = state.products.get(id);
    dlg.innerHTML = `<div class="detail"><div class="info"><p class="empty">Loading</p></div></div>`;
    dlg.showModal();
    try { p = await api(`/api/products/${id}`); state.products.set(p.Id, p); } catch (e) { if (!p) { dlg.innerHTML = `<div class="detail"><div class="info"><h2>Not available</h2><p class="empty">${esc(e.message)}</p><button class="btn ghost" data-close>Close</button></div></div>`; return; } }
    const slug = slugOf(p.Category);
    dlg.innerHTML = `<div class="detail">
      <div class="tile" style="--c:${cssColor(slug)}">${tileHtml(p)}</div>
      <div class="info">
        <p class="cat">${esc(p.Category)}, ${esc(p.Sku)}</p>
        <h2>${esc(p.Name)}</h2>
        <span class="big">${money(p.Price)}</span>
        ${typeof p.Available === "number" ? `<p class="cat">${p.Available > 0 ? `${p.Available} in stock` : "Currently out of stock"}</p>` : ""}
        <p class="empty">Free shipping on orders over $250. Orders above $500 take 10% off at checkout.</p>
        <div class="actions"><button class="btn" data-add-close="${p.Id}">Add to bag</button><button class="close" data-close>Close</button></div>
      </div></div>`;
  }

  /* ---------- orders ---------- */
  function orderCard(d) {
    const o = d.order, a = o.shippingAddress || {};
    return `<div class="found"><h3>Order ${o.id}, ${money(o.total)}</h3>
      <p>${esc(o.customerName)} (${esc(o.customerEmail)})</p>
      <p>${esc([a.street, a.city, a.state, a.zip, a.country].filter(Boolean).join(", "))}</p>
      <p>Placed ${esc(new Date(o.createdAtUtc).toLocaleString())}</p>
      <ul class="lines">${d.items.map((i) => `<li class="line" style="grid-template-columns:1fr auto"><div><h3>${esc(i.ProductName)}</h3><p class="sub">${i.Quantity} x ${money(i.UnitPrice)}</p></div><div class="amt">${money(i.LineTotal)}</div></li>`).join("")}</ul></div>`;
  }
  function renderOrders(resultHtml = "") {
    $("#orders").innerHTML = `<div class="panel"><header><h2>Your orders</h2><button class="close" data-close>Close</button></header>
      <form class="inline" id="orderForm"><label class="vh" for="oid">Order number</label><input id="oid" inputmode="numeric" placeholder="Order number" autocomplete="off"><button class="btn" type="submit">Find order</button></form>
      ${state.orders.length ? `<div><p class="empty" style="margin:0 0 8px">Placed in this browser</p><div class="ordlist">${state.orders.map((id) => `<button class="chip" data-order="${id}">Order ${id}</button>`).join("")}</div></div>` : `<p class="empty">Orders you place here will be listed so you can look them up again.</p>`}
      <div id="orderResult" aria-live="polite">${resultHtml}</div></div>`;
  }
  async function findOrder(id) {
    const box = $("#orderResult");
    if (!/^\d+$/.test(String(id))) { box.innerHTML = `<p class="error" role="alert">Enter the order number as digits only.</p>`; return; }
    box.innerHTML = `<p class="empty">Looking up order ${esc(id)}</p>`;
    try { box.innerHTML = orderCard(await api(`/api/orders/${id}`)); }
    catch (e) { box.innerHTML = `<p class="error" role="alert">${e.status === 404 ? `No order has the number ${esc(id)}.` : esc(e.message)}</p>`; }
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 2200);
  }

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) { if (e.target.tagName === "DIALOG") e.target.close(); return; }
    const d = t.dataset;
    if (d.cat !== undefined && (t.classList.contains("arch") || t.classList.contains("chip"))) return setCategory(d.cat, t.classList.contains("arch"));
    if (d.open) return openDetail(Number(d.open));
    if (d.add) { const p = state.products.get(Number(d.add)); if (p) addToBag(p); return; }
    if (d.addClose) { const p = state.products.get(Number(d.addClose)); if (p) { addToBag(p); $("#detail").close(); } return; }
    if (d.inc || d.dec) { const l = state.bag[d.inc || d.dec]; if (l) { l.qty += d.inc ? 1 : -1; if (l.qty < 1) delete state.bag[l.product.Id]; l.qty = Math.min(l.qty, 20); saveBag(); renderBag(); } return; }
    if (d.rm) { delete state.bag[d.rm]; saveBag(); return renderBag(); }
    if (d.checkout !== undefined) return renderBag("checkout");
    if (d.back !== undefined) return renderBag();
    if (d.order) return findOrder(d.order);
    if (d.close !== undefined) { const dlg = t.closest("dialog"); dlg && dlg.close(); if (d.go) setTimeout(() => $("#collection").scrollIntoView(), 50); return; }
    if (t.id === "clearBtn") { state.q = ""; $("#q").value = ""; return setCategory("", false); }
    if (t.id === "retryBtn") return loadProducts(true);
    if (t.id === "moreBtn") { state.page += 1; return loadProducts(false); }
    if (t.id === "bagBtn") return openBag();
    if (t.id === "ordersBtn") { renderOrders(); $("#orders").showModal(); return; }
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id === "searchForm") { e.preventDefault(); state.q = $("#q").value.trim(); loadProducts(true); }
    if (e.target.id === "checkoutForm") { e.preventDefault(); placeOrder(e.target); }
    if (e.target.id === "orderForm") { e.preventDefault(); findOrder($("#oid").value.trim()); }
  });

  /* ---------- start ---------- */
  async function init() {
    $("#bagCount").textContent = units();
    renderChips();
    skeletons();
    try {
      const all = await api("/api/products?pageSize=100");
      const counts = {};
      all.products.forEach((p) => { state.products.set(p.Id, p); counts[p.Category] = (counts[p.Category] || 0) + 1; });
      renderArches(counts);
    } catch { renderArches({}); }
    loadProducts(true);
  }
  init();
})();
