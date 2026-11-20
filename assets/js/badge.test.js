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
  tier: 'badges', qty: '2', amount: '', name: 'Ana Test', email: 'ana@example.com', method: 'venmo'
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

test('badges left: whole badges, never under zero or over the run', () => {
  assert.equal(rules.maxBadges({ badgesTotal: 100, badgesClaimed: 37 }), 63);
  assert.equal(rules.maxBadges({ badgesTotal: 100, badgesClaimed: 140 }), 0);
  assert.equal(rules.maxBadges({ badgesTotal: 100, badgesClaimed: -3 }), 100);
  assert.equal(rules.maxBadges({ badgesTotal: 100, badgesClaimed: 12.9 }), 88);
  assert.equal(rules.maxBadges({ badgesTotal: 100, badgesClaimed: 'x' }), 100);
  assert.equal(rules.maxBadges({}), 0);
});

test('price per badge: USD 24 for one, a dollar less each for every one more, never under USD 18', () => {
  const config = rules.CONFIG;
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 20, 100].map((n) => rules.unitPrice(n, config)), [24, 23, 22, 21, 20, 19, 18, 18, 18, 18]);
  assert.equal(rules.floorQty(config), 7);
  assert.equal(rules.unitPrice(0, config), 24);
  /* buying one more never costs less in total */
  let last = 0;
  for (let n = 1; n <= rules.maxBadges(config); n++) {
    const total = rules.orderTotal({ tier: 'badges', qty: String(n) }, config);
    assert.ok(total > last, n + ' badges cost ' + total + ', not more than ' + last);
    assert.ok(total / n >= config.priceFloor);
    last = total;
  }
});

test('counts: whole numbers from 1', () => {
  assert.equal(rules.parseQty('3'), 3);
  assert.equal(rules.parseQty(' 12 '), 12);
  for (const bad of ['', '0', '-1', '2.5', '1e2', 'x', '12345', null, undefined]) {
    assert.ok(Number.isNaN(rules.parseQty(bad)), String(bad));
  }
});

test('amounts: digits with up to two decimals, comma or point', () => {
  assert.equal(rules.parseAmount('50'), 50);
  assert.equal(rules.parseAmount(' 50,5 '), 50.5);
  assert.equal(rules.parseAmount('50.25'), 50.25);
  for (const bad of ['', 'abc', '-5', '5.123', '1e3', '5 0', null, undefined]) {
    assert.ok(Number.isNaN(rules.parseAmount(bad)), String(bad));
  }
});

test('totals and how they are written', () => {
  const config = filled();
  assert.equal(rules.orderTotal({ tier: 'badges', qty: '1' }, config), 24);
  assert.equal(rules.orderTotal({ tier: 'badges', qty: '3' }, config), 66);
  assert.equal(rules.orderTotal({ tier: 'badges', qty: '10' }, config), 180);
  assert.equal(rules.orderTotal({ tier: 'badges', qty: 'x' }, config), 0);
  assert.equal(rules.orderTotal({ tier: 'donate', amount: '25,5' }, config), 25.5);
  assert.equal(rules.orderTotal({ tier: 'donate', amount: 'x' }, config), 0);
  assert.equal(rules.orderTotal({ tier: '' }, config), 0);
  assert.equal(rules.formatUsd(60), 'USD 60');
  assert.equal(rules.formatUsd(25.5), 'USD 25.50');
  assert.match(rules.formatArs(60, config), /^ARS 60[.  ]?000$/);
  assert.equal(rules.formatArs(60, rules.CONFIG), '');
});

test('empty state: each step says what is missing', () => {
  const empty = { tier: '', qty: '', amount: '', name: '', email: '', method: '' };
  assert.deepEqual(rules.validateStep(1, empty, filled()), { qty: 'err.qty' });
  assert.deepEqual(rules.validateStep(1, { ...empty, tier: 'badges' }, filled()), { qty: 'err.qty' });
  assert.deepEqual(rules.validateStep(1, { ...empty, tier: 'donate' }, filled()), { amount: 'err.amount' });
  assert.deepEqual(rules.validateStep(2, empty, filled()), { name: 'err.name', email: 'err.email', method: 'err.method' });
});

test('validation errors', () => {
  const config = filled();
  assert.deepEqual(rules.validateStep(1, { tier: 'three' }, config), { qty: 'err.qty' });
  for (const qty of ['', '0', '2.5', 'x']) {
    assert.deepEqual(rules.validateStep(1, { tier: 'badges', qty }, config), { qty: 'err.qty' }, qty);
  }
  /* more than are left: a message that does not say how many there are */
  assert.deepEqual(rules.validateStep(1, { tier: 'badges', qty: '101' }, config), { qty: 'err.qtyMax' });
  assert.deepEqual(rules.validateStep(1, { tier: 'badges', qty: '64' }, { ...config, badgesClaimed: 37 }), { qty: 'err.qtyMax' });
  assert.ok(!/\d/.test(rules.WORDS.es['err.qtyMax'] + rules.WORDS.en['err.qtyMax']));
  for (const amount of ['', 'abc', '4.99', '10001']) {
    assert.deepEqual(rules.validateStep(1, { tier: 'donate', amount }, config), { amount: 'err.amount' }, amount);
  }
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
  assert.deepEqual(rules.validateStep(1, { tier: 'badges', qty: '1' }, config), {});
  assert.deepEqual(rules.validateStep(1, { tier: 'badges', qty: '100' }, config), {});
  assert.deepEqual(rules.validateStep(1, { tier: 'donate', amount: '5' }, config), {});
  assert.deepEqual(rules.validateStep(1, { tier: 'donate', amount: '10000' }, config), {});

  const text = rules.orderText(order, config, 'en', 'JOYA-TEST0001');
  assert.deepEqual(text.split('\n'), [
    '2 badges, USD 23 each',
    'Total: USD 46',
    'Payment method: Venmo',
    'Code: JOYA-TEST0001',
    'Name: Ana Test',
    'Email: ana@example.com'
  ]);
  const url = rules.mailtoUrl(order, config, 'es', 'JOYA-TEST0001');
  assert.ok(url.startsWith('mailto:' + config.orderEmail + '?subject=Pedido%20Joya%20Badge%20JOYA-TEST0001&body='));
  assert.equal(decodeURIComponent(url.split('&body=')[1]), rules.orderText(order, config, 'es', 'JOYA-TEST0001'));
  assert.deepEqual(rules.orderItems({ tier: 'donate' }, config, 'es'), ['Donación']);
  assert.deepEqual(rules.orderItems({ tier: 'badges', qty: '1' }, config, 'es'), ['Un badge']);
  assert.deepEqual(rules.orderItems({ tier: 'badges', qty: '8' }, config, 'es'), ['8 badges, USD 18 cada uno']);
});

test('what a visitor types cannot break out of the email link', () => {
  const order = { ...validOrder(), name: 'Ana&cc=x@example.com\nBcc: y@example.com' };
  const url = rules.mailtoUrl(order, filled(), 'en', 'JOYA-TEST0001');
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

test('language: query first, then the stored choice, then Spanish', () => {
  assert.equal(rules.pickLang('en', 'es'), 'en');
  assert.equal(rules.pickLang(null, 'en'), 'en');
  assert.equal(rules.pickLang('fr', null), 'es');
  assert.equal(rules.t('en', 'err.amount', { min: 5 }), 'Enter an amount of USD 5 or more.');
  assert.equal(rules.t('es', 'no.such.key'), 'no.such.key');
});

test('Spanish and English hold the same sentences, none empty', () => {
  assert.deepEqual(Object.keys(rules.WORDS.en).sort(), Object.keys(rules.WORDS.es).sort());
  for (const lang of ['es', 'en']) {
    for (const [key, text] of Object.entries(rules.WORDS[lang])) assert.ok(text.trim(), lang + ' ' + key);
  }
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
  assert.deepEqual(attrValues('data-preset').map(Number), rules.CONFIG.donationPresets);
  assert.deepEqual(attrValues('data-method'), rules.METHOD_IDS);
  assert.ok(html.includes('name="donate"'), 'no box for a donation only');
  for (const name of ['qty', 'amount', 'name', 'email', 'method']) {
    assert.ok(html.includes('name="' + name + '"'), 'no input named ' + name);
    assert.ok(html.includes('data-error="' + name + '"'), 'no error box for ' + name);
    assert.ok(html.includes('data-field="' + name + '"'), 'no focus target for ' + name);
  }
  assert.ok(html.includes('mailto:' + rules.CONFIG.orderEmail));
  assert.ok(html.includes(NOINDEX), 'the draft must stay out of search');
  const one = rules.formatUsd(rules.unitPrice(1, rules.CONFIG));
  assert.ok(html.includes('data-qty-total>' + rules.t('es', 'qty.total', { total: one }) + '<'), 'first total differs from the settings');
  assert.ok(html.includes('data-qty-each>' + rules.t('es', 'qty.each', { unit: one }) + '<'), 'first price differs from the settings');
  assert.ok(html.includes('value="1" data-field="qty"'), 'the picker starts at one');
});

test('the page never says how many badges there are', () => {
  const cap = String(rules.CONFIG.badgesTotal);
  for (const lang of ['es', 'en']) {
    for (const [key, text] of Object.entries(rules.WORDS[lang])) assert.ok(!new RegExp('\\b' + cap + '\\b').test(text), lang + ' ' + key);
  }
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/USD 100/g, '');
  assert.ok(!new RegExp('\\b' + cap + '\\b').test(visible), 'badge.html shows ' + cap);
  assert.ok(!/<progress/.test(html));
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
