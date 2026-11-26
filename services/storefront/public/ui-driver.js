// UI traffic driver: lets a real browser tab "use" the storefront on its own, so RUM sessions, user actions and
// the backend traces they trigger are produced by clicks on the actual page.
//
//   http://localhost:8080/?driver=10      run for 10 minutes (any number of minutes)
//
// It browses categories, searches, opens products, fills the bag, checks out (about 1 in 12 carts uses a card that
// gets declined), and looks up orders. About every 2.5 minutes it ends the RUM session and starts a new visitor.
// A small badge in the bottom-left corner shows the time left. Without ?driver= this file does nothing.
(() => {
  "use strict";
  const KEY = "aurelle.driver";
  const SESSION_MS = 150000;
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pause = (min = 700, max = 2200) => sleep(min + Math.random() * (max - min));
  const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; } };
  const write = (s) => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } };

  const params = new URLSearchParams(location.search);
  let state = read();
  if (params.has("driver")) {
    const minutes = parseFloat(params.get("driver")) || 10;
    state = { end: Date.now() + minutes * 60000, sessionEnd: Date.now() + SESSION_MS, sessions: 1, journeys: 0, orders: 0, declined: 0 };
    write(state);
    history.replaceState(null, "", location.pathname);
  }
  if (!state) return;

  const badge = document.createElement("div");
  badge.setAttribute("role", "status");
  badge.setAttribute("data-dd-privacy", "allow");
  badge.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:300;background:#2b2640;color:#faf8fc;padding:8px 16px;border-radius:999px;font:500 13px/1.4 system-ui,sans-serif;opacity:.92;pointer-events:none";
  const showBadge = () => {
    const left = Math.max(0, state.end - Date.now());
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    badge.textContent = `UI traffic running, ${m}:${String(s).padStart(2, "0")} left. ${state.journeys} journeys, ${state.orders} orders, visitor ${state.sessions}`;
  };
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(badge));
  if (document.body) document.body.appendChild(badge);

  const $q = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  async function waitFor(fn, timeout = 8000) {
    const t = Date.now();
    while (Date.now() - t < timeout) { const v = fn(); if (v) return v; await sleep(150); }
    return null;
  }
  // A full pointer sequence (down, up, click) so Datadog RUM records it as a user action, like a real mouse click.
  function click(el) {
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, view: window, button: 0, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: "mouse", isPrimary: true };
    el.dispatchEvent(new PointerEvent("pointerdown", { ...o, buttons: 1 }));
    el.dispatchEvent(new MouseEvent("mousedown", { ...o, buttons: 1 }));
    el.dispatchEvent(new PointerEvent("pointerup", o));
    el.dispatchEvent(new MouseEvent("mouseup", o));
    el.click();
    return true;
  }
  function type(el, value) {
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const closeDialogs = () => $$("dialog[open]").forEach((d) => d.close());
  const bagCount = () => parseInt(($q("#bagCount") || {}).textContent, 10) || 0;

  const words = ["mouse", "chair", "lamp", "jacket", "tent", "board", "bottle", "desk", "SKU", "ELEC", "HOME", "OUT", "stove", "drone"];
  const first = ["Amira", "Omar", "Layla", "Yusuf", "Noor", "Khalid", "Sara", "Ravi", "Meera", "Daniel", "Hana", "Tariq"];
  const last = ["Haddad", "Rahman", "Nair", "Khan", "Mirza", "Verma", "Saleh", "Iyer", "Farouk", "Bose"];
  const cities = [["Dubai", "DU", "AE"], ["Abu Dhabi", "AZ", "AE"], ["Mumbai", "MH", "IN"], ["Pune", "MH", "IN"], ["Austin", "TX", "US"], ["London", "LDN", "GB"]];

  async function browseCategory() {
    click(pick($$(".arch")) || pick($$(".chip")));
    await pause();
    await waitFor(() => $$(".card").length);
    await pause();
    if (rnd(2)) { click($q(".chip[data-all]")); await pause(); }
  }
  async function searchProducts() {
    const form = $q("#searchForm");
    type($q("#q"), pick(words));
    form.requestSubmit();
    await pause(1200, 2600);
    if (rnd(2)) { type($q("#q"), ""); form.requestSubmit(); await pause(); }
  }
  async function viewProduct() {
    click(pick($$(".tile[data-open]")));
    const add = await waitFor(() => $q("#detail[open] [data-add-close]"));
    await pause(1200, 3000);
    if (add && rnd(10) < 6) click(add); else closeDialogs();
  }
  async function quickAdd() { click(pick($$("[data-add]"))); await pause(400, 1200); }
  async function showMore() { const b = $q("#moreBtn"); if (b && !b.hidden) { click(b); await pause(); } }

  async function emptyBag() {
    click($q("#bagBtn"));
    await waitFor(() => $q("#bag[open]"));
    for (let i = 0; i < 30 && $q("#bag [data-rm]"); i++) { click($q("#bag [data-rm]")); await sleep(120); }
    closeDialogs();
  }
  async function checkout() {
    if (bagCount() === 0) { for (let i = 1 + rnd(3); i > 0; i--) await quickAdd(); }
    click($q("#bagBtn"));
    await waitFor(() => $q("#bag [data-checkout]"));
    await pause();
    if (rnd(3) === 0) { click($q("#bag [data-inc]")); await pause(500, 1000); }
    click($q("#bag [data-checkout]"));
    if (!(await waitFor(() => $q("#f-name")))) { closeDialogs(); return; }
    const name = `${pick(first)} ${pick(last)}`;
    const [city, state2, country] = pick(cities);
    const declined = rnd(12) === 0;
    type($q("#f-name"), name);
    await pause(300, 700);
    type($q("#f-email"), declined ? `${first[rnd(first.length)].toLowerCase()}${rnd(90)}@declined.test` : `${name.toLowerCase().replace(/[^a-z]+/g, ".")}${rnd(900)}@example.test`);
    type($q("#f-street"), `${1 + rnd(240)} ${pick(["Palm", "Marina", "Cedar", "Harbour", "Garden"])} Street`);
    type($q("#f-city"), city); type($q("#f-state"), state2); type($q("#f-zip"), String(10000 + rnd(89999))); type($q("#f-country"), country);
    if (rnd(4) === 0) type($q("#f-notes"), "Please leave with the concierge");
    await pause(900, 2000);
    click($q("#checkoutForm button[type=submit]"));
    const result = await waitFor(() => $q("#bag .done") || $q("#bag .error"), 15000);
    await pause(1500, 3000);
    if (result && result.classList.contains("done")) state.orders++;
    else if (result) { state.declined++; closeDialogs(); await emptyBag(); }
    closeDialogs();
  }
  async function lookupOrder() {
    click($q("#ordersBtn"));
    await waitFor(() => $q("#orderForm"));
    await pause();
    const own = $$("#orders [data-order]");
    if (own.length && rnd(3)) click(pick(own));
    else { type($q("#oid"), String(3000 + rnd(300))); $q("#orderForm").requestSubmit(); }
    await pause(1500, 3000);
    closeDialogs();
  }

  const journeys = [[3, browseCategory], [3, searchProducts], [4, viewProduct], [3, quickAdd], [6, checkout], [2, lookupOrder], [1, showMore]];
  const total = journeys.reduce((s, j) => s + j[0], 0);
  function choose() { let r = rnd(total); for (const [w, fn] of journeys) { if ((r -= w) < 0) return fn; } }

  async function run() {
    const clock = setInterval(showBadge, 1000);
    await waitFor(() => $$(".card").length, 15000);
    while (Date.now() < state.end) {
      if (Date.now() > state.sessionEnd) {
        // new visitor: end the RUM session, forget the bag and orders, and reload
        try { window.DD_RUM && window.DD_RUM.stopSession(); } catch { /* ignore */ }
        try { localStorage.removeItem("aurelle.bag"); localStorage.removeItem("aurelle.orders"); } catch { /* ignore */ }
        state.sessionEnd = Date.now() + SESSION_MS;
        state.sessions++;
        write(state);
        setTimeout(() => location.reload(), 600);
        return;
      }
      closeDialogs();
      if (bagCount() > 8) await emptyBag();
      try { await choose()(); } catch (e) { console.warn("driver step failed", e); }
      state.journeys++;
      write(state);
      showBadge();
      await pause(900, 2600);
    }
    clearInterval(clock);
    closeDialogs();
    badge.textContent = `UI traffic finished: ${state.journeys} journeys, ${state.orders} orders, ${state.declined} declined, ${state.sessions} visitors`;
    sessionStorage.removeItem(KEY);
    try { window.DD_RUM && window.DD_RUM.stopSession(); } catch { /* ignore */ }
  }
  run();
})();
