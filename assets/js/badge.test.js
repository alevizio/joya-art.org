/* Tests for the badge page rules and for badge.html against them.
   Run from the repository root:  node --test assets/js/badge.test.js
   No dependencies: node's own test runner. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const rules = require('./badge.js');

const root = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(root, 'badge.html'), 'utf8');
const NOINDEX = '<meta name="robots" content="noindex">';
const attrValues = (name) => Array.from(html.matchAll(new RegExp('\\s' + name + '="([^"]*)"', 'g')), (m) => m[1]);

/* A settings object with every payment method filled in, for the cases that need one. */
const filled = () => ({
  ...rules.CONFIG,
  pricesConfirmed: true,
  arsPerUsd: 1000,
  methods: {
    mercadopago: { alias: 'joya.test', link: 'https://mpago.la/test' },
    crypto: { coin: 'USDT', network: 'Tron (TRC20)', address: 'TTestAddress' },
    venmo: { handle: '@joya-test' },
    wise: { link: 'https://wise.com/pay/test' }
  }
});
const validOrder = () => ({
  qty: '2', name: 'Ana Test', email: 'ana@example.com', method: 'venmo'
});

test('settings as shipped: nobody can pay yet, so the page is a draft', () => {
  for (const id of rules.METHOD_IDS) assert.equal(rules.methodReady(rules.CONFIG, id), false, id);
  assert.equal(rules.isDraft(rules.CONFIG), true);
  assert.equal(rules.isDraft(filled()), false);
  assert.equal(rules.isDraft({ ...filled(), pricesConfirmed: false }), true);
});

test('a payment method is ready only when its details are complete and its link is https', () => {
  const config = filled();
  for (const id of rules.METHOD_IDS) assert.equal(rules.methodReady(config, id), true, id);
  config.methods.wise.link = 'http://wise.com/pay/test';
  assert.equal(rules.methodReady(config, 'wise'), false);
  config.methods.wise.link = 'javascript:alert(1)';
  assert.equal(rules.methodReady(config, 'wise'), false);
  config.methods.crypto.network = '';
  assert.equal(rules.methodReady(config, 'crypto'), false);
  config.methods.mercadopago = { alias: '', link: 'javascript:alert(1)' };
  assert.equal(rules.methodReady(config, 'mercadopago'), false);
  assert.equal(rules.methodReady(config, 'paypal'), false);
});

test('the badge count comes from the supporters: whole badges, never under zero or over the run', () => {
  const run = (...badges) => ({ badgesTotal: 100, supporters: badges.map((n) => ({ badges: n })) });
  assert.deepEqual(rules.progress(run(30, 7)), { claimed: 37, total: 100 });
  assert.deepEqual(rules.progress(run(90, 50)), { claimed: 100, total: 100 });
  assert.deepEqual(rules.progress(run(-3, 'x', 0)), { claimed: 0, total: 100 });
  assert.deepEqual(rules.progress(run(12.9)), { claimed: 12, total: 100 });
  assert.deepEqual(rules.progress({}), { claimed: 0, total: 0 });
  assert.equal(rules.maxBadges(run(30, 7)), 63);
  assert.equal(rules.maxBadges(run(140)), 0);
  assert.equal(rules.maxBadges({}), 0);
  assert.equal(rules.t('es', 'progress.text', rules.progress(run(37))), '37 de 100 badges pedidos');
  assert.deepEqual(rules.CONFIG.supporters, [], 'the page ships with nobody on the list');
});

test('Quienes lo hacen posible: the name or Anonymous, what, how, when and how much', () => {
  const config = { ...rules.CONFIG, supporters: [
    { name: ' Ana ', badges: 2, via: 'mercadopago', date: '2026-11-21' },
    { name: '', badges: 3, via: 'venmo', date: '2026-11-20' },
    { name: '', badges: 1, via: 'nope', date: 'someday' }
  ] };
  assert.deepEqual(rules.supporterRows(config, 'es'), [
    { name: 'Ana', line: '2 badges · Mercado Pago · 21 nov', amount: 'USD 50' },
    { name: 'Anónimo', line: '3 badges · Venmo · 20 nov', amount: 'USD 75' },
    { name: 'Anónimo', line: '1 badge', amount: 'USD 25' }
  ]);
  assert.deepEqual(rules.supporterRows(config, 'en')[1], { name: 'Anonymous', line: '3 badges · Venmo · Nov 20', amount: 'USD 75' });
});

test('one price per badge, however many are in the order', () => {
  const config = rules.CONFIG;
  assert.equal(config.price, 25);
  for (const n of [1, 2, 7, 20]) assert.equal(rules.orderTotal({ qty: String(n) }, config), n * 25);
});

test('counts: whole numbers from 1', () => {
  assert.equal(rules.parseQty('3'), 3);
  assert.equal(rules.parseQty(' 12 '), 12);
  for (const bad of ['', '0', '-1', '2.5', '1e2', 'x', '12345', null, undefined]) {
    assert.ok(Number.isNaN(rules.parseQty(bad)), String(bad));
  }
});

test('totals and how they are written', () => {
  const config = filled();
  assert.equal(rules.orderTotal({ qty: '1' }, config), 25);
  assert.equal(rules.orderTotal({ qty: '3' }, config), 75);
  assert.equal(rules.orderTotal({ qty: 'x' }, config), 0);
  assert.equal(rules.orderTotal({}, config), 0);
  assert.equal(rules.formatUsd(60), 'USD 60');
  assert.equal(rules.formatUsd(25.5), 'USD 25.50');
  assert.match(rules.formatArs(60, config), /^ARS 60[.  ]?000$/);
  assert.equal(rules.formatArs(60, rules.CONFIG), '');
});

test('empty state: each step says what is missing', () => {
  const empty = { qty: '', name: '', email: '', method: '' };
  assert.deepEqual(rules.validateStep(1, empty, filled()), { qty: 'err.qty' });
  assert.deepEqual(rules.validateStep(2, empty, filled()), { name: 'err.name', email: 'err.email', method: 'err.method' });
});

test('validation errors', () => {
  const config = filled();
  assert.deepEqual(rules.validateStep(1, {}, config), { qty: 'err.qty' });
  for (const qty of ['', '0', '2.5', 'x']) {
    assert.deepEqual(rules.validateStep(1, { qty }, config), { qty: 'err.qty' }, qty);
  }
  /* more than are left: a message that does not say how many there are */
  assert.deepEqual(rules.validateStep(1, { qty: '101' }, config), { qty: 'err.qtyMax' });
  assert.deepEqual(rules.validateStep(1, { qty: '64' }, { ...config, supporters: [{ badges: 37 }] }), { qty: 'err.qtyMax' });
  assert.ok(!/\d/.test(rules.WORDS.es['err.qtyMax'] + rules.WORDS.en['err.qtyMax']));
  assert.deepEqual(rules.validateStep(2, { ...validOrder(), name: '   ' }, config), { name: 'err.name' });
  for (const email of ['ana', 'ana@', 'ana@example', 'a na@example.com']) {
    assert.deepEqual(rules.validateStep(2, { ...validOrder(), email }, config), { email: 'err.email' }, email);
  }
  /* a method that is not set up cannot be picked, even if the page is tampered with */
  assert.deepEqual(rules.validateStep(2, validOrder(), rules.CONFIG), { method: 'err.method' });
});

test('valid submission: every step passes and the email holds the order', () => {
  const config = filled();
  const order = validOrder();
  for (const step of [1, 2]) assert.deepEqual(rules.validateStep(step, order, config), {}, 'step ' + step);
  assert.deepEqual(rules.validateStep(1, { qty: '1' }, config), {});
  assert.deepEqual(rules.validateStep(1, { qty: '100' }, config), {});

  const text = rules.orderText(order, config, 'es', 'JOYA-TEST0001');
  assert.deepEqual(text.split('\n'), [
    '2 badges, USD 25 cada uno',
    'Total: USD 50',
    'Medio de pago: Venmo',
    'Código: JOYA-TEST0001',
    'Nombre: Ana Test',
    'Email: ana@example.com',
    'Mostrar mi nombre en la lista: no'
  ]);
  assert.ok(rules.orderText({ ...order, public: true }, config, 'es', 'X').endsWith('Mostrar mi nombre en la lista: sí'));
  const url = rules.mailtoUrl(order, config, 'es', 'JOYA-TEST0001');
  assert.ok(url.startsWith('mailto:' + config.orderEmail + '?subject=Pedido%20Joya%20Badge%20JOYA-TEST0001&body='));
  assert.equal(decodeURIComponent(url.split('&body=')[1]), rules.orderText(order, config, 'es', 'JOYA-TEST0001'));
  assert.deepEqual(rules.orderItems({ qty: '1' }, config, 'es'), ['Un badge']);
  assert.deepEqual(rules.orderItems({ qty: '8' }, config, 'es'), ['8 badges, USD 25 cada uno']);
});

test('the buyers Sheet: one row per order, and only a Google Apps Script address gets it', () => {
  const config = filled();
  assert.deepEqual(rules.orderRecord({ ...validOrder(), name: ' Ana Test ', public: true }, config, 'es', 'JOYA-TEST0001'), {
    ref: 'JOYA-TEST0001', name: 'Ana Test', email: 'ana@example.com', qty: 2, total: 50, method: 'venmo', public: true, lang: 'es'
  });
  assert.equal(rules.orderRecord(validOrder(), config, 'en', 'X').public, false);
  assert.equal(rules.sheetUrl(rules.CONFIG), rules.CONFIG.orderSheetUrl, 'the Sheet address in the settings is not a Google Apps Script web app');
  assert.ok(rules.CONFIG.orderSheetUrl, 'the page has no Sheet to save orders to');
  const good = 'https://script.google.com/macros/s/AKfycbx-Test_123/exec';
  assert.equal(rules.sheetUrl({ orderSheetUrl: good }), good);
  for (const bad of ['http://script.google.com/macros/s/AKfycbx/exec', 'https://evil.example/macros/s/x/exec', 'https://script.google.com/macros/s/x/dev', 'javascript:alert(1)']) {
    assert.equal(rules.sheetUrl({ orderSheetUrl: bad }), '', bad);
  }
});

test('what a visitor types cannot break out of the email link', () => {
  const order = { ...validOrder(), name: 'Ana&cc=x@example.com\nBcc: y@example.com' };
  const url = rules.mailtoUrl(order, filled(), 'es', 'JOYA-TEST0001');
  assert.equal(url.split('?')[1].split('&').length, 2);
  assert.ok(!/[\n\r]/.test(url));
});

test('links and codes', () => {
  assert.equal(rules.venmoUrl('@joya-test', 110, 'JOYA-TEST0001'), 'https://venmo.com/joya-test?txn=pay&amount=110.00&note=JOYA-TEST0001');
  assert.equal(rules.safeUrl('https://wise.com/pay/x'), 'https://wise.com/pay/x');
  for (const bad of ['http://wise.com', 'javascript:alert(1)', 'https://a b', '', null]) assert.equal(rules.safeUrl(bad), '');
  const ref = rules.newReference({ randomUUID: () => '0a1b2c3d-4e5f-6789-abcd-ef0123456789' });
  assert.equal(ref, 'JOYA-0A1B2C3D');
  assert.match(rules.newReference(require('node:crypto')), /^JOYA-[0-9A-F]{8}$/);
});

test('language: the address first, then the stored choice, then the time zone, then the browser', () => {
  assert.equal(rules.pickLang('en', 'es', 'America/Argentina/Buenos_Aires', ['es-AR']), 'en');
  assert.equal(rules.pickLang(null, 'en', 'America/Argentina/Buenos_Aires', ['es-AR']), 'en');
  assert.equal(rules.pickLang('fr', 'de', 'America/Argentina/Cordoba', ['en-US']), 'es');
  assert.equal(rules.pickLang(null, null, 'America/Buenos_Aires', []), 'es');
  for (const zone of ['America/Los_Angeles', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Indiana/Indianapolis', 'Pacific/Honolulu', 'US/Pacific']) {
    assert.equal(rules.pickLang(null, null, zone, ['es-US']), 'en', zone);
  }
  assert.equal(rules.pickLang(null, null, 'Europe/Madrid', ['es-ES']), 'es');
  assert.equal(rules.pickLang(null, null, 'Europe/Berlin', ['de-DE', 'en']), 'en');
  assert.equal(rules.pickLang(null, null, 'America/Mexico_City', ['es-MX']), 'es');
  assert.equal(rules.pickLang(null, null, '', undefined), 'es');
  assert.equal(rules.t('en', 'err.qty'), rules.WORDS.en['err.qty']);
  assert.equal(rules.t('es', 'no.such.key'), 'no.such.key');
});

test('Spanish and English hold the same sentences, none empty', () => {
  assert.deepEqual(Object.keys(rules.WORDS), ['es', 'en']);
  assert.deepEqual(Object.keys(rules.WORDS.en).sort(), Object.keys(rules.WORDS.es).sort());
  for (const lang of ['es', 'en']) {
    for (const [key, text] of Object.entries(rules.WORDS[lang])) assert.ok(text.trim(), lang + ' ' + key);
  }
  assert.equal(attrValues('data-lang').join(), 'es,en', 'the switch offers another set of languages');
});

test('badge.html asks only for sentences that exist, and starts in Spanish', () => {
  const keys = [...attrValues('data-i18n'), ...attrValues('data-i18n-marked'), ...attrValues('data-i18n-alt'), ...attrValues('data-i18n-label')];
  assert.ok(keys.length > 40);
  for (const key of keys) assert.ok(key in rules.WORDS.es, 'missing sentence: ' + key);
  for (const m of html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g)) {
    assert.equal(m[2], rules.WORDS.es[m[1]], 'page text differs from the Spanish sentence: ' + m[1]);
  }
  for (const m of html.matchAll(/alt="([^"]*)" data-i18n-alt="([^"]+)"/g)) {
    assert.equal(m[1], rules.WORDS.es[m[2]], 'alt text differs: ' + m[2]);
  }
});

test('a marked sentence is written in badge.html as the script writes it, with the same marks in both languages', () => {
  const marked = Array.from(html.matchAll(/data-i18n-marked="([^"]+)">(.*?)<\/h1>/g));
  assert.equal(marked.length, attrValues('data-i18n-marked').length);
  for (const [, key, inner] of marked) {
    const expected = rules.markedParts(rules.WORDS.es[key])
      .map((p) => (p.shape ? '<span class="hl" data-shape="' + p.shape + '" data-draw>' + p.text + '</span>' : p.text)).join('');
    assert.equal(inner, expected, 'page text differs from the Spanish sentence: ' + key);
    const shapes = (lang) => rules.markedParts(rules.WORDS[lang][key]).map((p) => p.shape).filter(Boolean);
    assert.deepEqual(shapes('en'), shapes('es'), 'marks differ between languages: ' + key);
  }
  assert.deepEqual(rules.markedParts('Wear the *light* of _Joya_'), [
    { text: 'Wear the ', shape: '' }, { text: 'light', shape: 'marker' }, { text: ' of ', shape: '' }, { text: 'Joya', shape: 'underlineCurve' },
  ]);
  assert.deepEqual(rules.markedParts('no marks'), [{ text: 'no marks', shape: '' }]);
});

test('badge.html matches the settings', () => {
  assert.deepEqual(attrValues('data-method'), rules.METHOD_IDS);
  assert.ok(!/name="(donate|amount)"|data-preset/.test(html), 'the donate only option is back');
  assert.ok(html.includes('name="public"'), 'no box to show the name on the list');
  for (const name of ['qty', 'name', 'email', 'method']) {
    assert.ok(html.includes('name="' + name + '"'), 'no input named ' + name);
    assert.ok(html.includes('data-error="' + name + '"'), 'no error box for ' + name);
    assert.ok(html.includes('data-field="' + name + '"'), 'no focus target for ' + name);
  }
  assert.ok(html.includes('mailto:' + rules.CONFIG.orderEmail));
  assert.ok(html.includes(NOINDEX), 'the draft must stay out of search');
  const one = rules.formatUsd(rules.CONFIG.price);
  assert.ok(html.includes('data-qty-total>' + rules.t('es', 'qty.total', { total: one }) + '<'), 'first total differs from the settings');
  assert.ok(html.includes('data-qty-each>' + rules.t('es', 'qty.each', { unit: one }) + '<'), 'first price differs from the settings');
  assert.ok(html.includes('value="1" data-field="qty"'), 'the picker starts at one');
  const run = rules.progress(rules.CONFIG);
  assert.ok(html.includes('data-progress-text>' + rules.t('es', 'progress.text', run) + '<'), 'badge count differs from the settings');
  assert.ok(html.includes('max="' + run.total + '" value="' + run.claimed + '"'), 'bar differs from the settings');
});

test('what each badge pays for adds up to its price, and every sentence in both languages names that price', () => {
  const cents = (text) => Math.round(Number(text.replace('−', '-').replace(',', '.')) * 100);   // "−1,75" = -175
  const rows = Array.from(html.matchAll(/<td data-usd="(-?[\d.]+)"/g));
  assert.ok(rows.length >= 3, 'the costs table is missing');
  for (const [, value, shown] of html.matchAll(/<td data-usd="(-?[\d.]+)">([−\d,]+)<\/td>/g)) {
    assert.equal(cents(shown), cents(value), 'a cost shows ' + shown + ' but counts ' + value);
  }
  /* Joya's share is a range: today's gap, up to what the final quotes may make it, in both languages */
  const [, from, upto] = html.match(/<td data-usd="(-[\d.]+)" data-usd-upto="(-[\d.]+)"><span data-i18n="costs\.joya\.range">/);
  assert.ok(cents(upto) < cents(from));
  const amounts = (text) => Array.from(text.matchAll(/−(\d+[.,]\d\d)/g), (m) => cents('-' + m[1]));
  assert.deepEqual(amounts(rules.WORDS.es['costs.joya.range']), [cents(from), cents(upto)]);
  assert.deepEqual(amounts(rules.WORDS.en['costs.joya.range']), [cents(from), cents(upto)]);
  const [, total, totalShown] = html.match(/<td data-usd-total="([\d.]+)">([\d,]+)<\/td>/);
  assert.equal(cents(totalShown), cents(total));
  assert.equal(cents(total), rules.CONFIG.price * 100, 'the table ends on another price');
  assert.equal(rows.reduce((sum, [, value]) => sum + cents(value), 0), cents(total), 'the lines do not add up to the price');
  for (const lang of ['es', 'en']) {
    for (const [key, text] of Object.entries(rules.WORDS[lang])) {
      for (const [, amount] of text.matchAll(/USD[\s\u00a0](\d+)\b/g)) {
        if (key.startsWith('costs.') || key === 'qty.why') assert.equal(Number(amount), rules.CONFIG.price, lang + ' ' + key + ' names another price');
      }
    }
  }
});

test('every file badge.html points to is in the repository', () => {
  const refs = new Set(Array.from(html.matchAll(/(\/assets\/[^"\s,?]+)/g), (m) => m[1]));
  assert.ok(refs.size > 20);
  for (const ref of refs) assert.ok(fs.existsSync(path.join(root, ref)), 'missing file: ' + ref);
});

test('sitemap.xml lists /badge exactly when the page may be indexed', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.equal(sitemap.includes('<loc>https://joya-art.org/badge</loc>'), !html.includes(NOINDEX));
});

test('every page has the same two menus, with Badge in both', () => {
  const pages = [...fs.readdirSync(root), ...fs.readdirSync(path.join(root, 'events')).map((f) => 'events/' + f)].filter((f) => f.endsWith('.html'));
  assert.ok(pages.length >= 18);
  const links = ['/', '/events', '/music', '/ethos', '/badge', '/contact'];
  for (const page of pages) {
    const navs = Array.from(fs.readFileSync(path.join(root, page), 'utf8').matchAll(/<nav class="(?:header__nav|menu__nav)"[^>]*>(.*?)<\/nav>/g), (m) => m[1]);
    assert.equal(navs.length, 2, page);
    for (const nav of navs) assert.deepEqual(Array.from(nav.matchAll(/href="([^"]*)"/g), (m) => m[1]), links, page);
  }
  assert.equal(html.match(/<a href="\/badge" aria-current="page">Badge<\/a>/g).length, 2, 'badge.html should mark Badge as the current page in both menus');
});
