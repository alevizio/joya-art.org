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
  style: 'clip', tier: 'two', friendStyle: 'lanyard', amount: '',
  name: 'Ana Test', email: 'ana@example.com', method: 'venmo'
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

test('progress: whole badges, never under zero or over the total', () => {
  assert.deepEqual(rules.progress({ badgesTotal: 100, badgesClaimed: 37 }), { claimed: 37, total: 100 });
  assert.deepEqual(rules.progress({ badgesTotal: 100, badgesClaimed: 140 }), { claimed: 100, total: 100 });
  assert.deepEqual(rules.progress({ badgesTotal: 100, badgesClaimed: -3 }), { claimed: 0, total: 100 });
  assert.deepEqual(rules.progress({ badgesTotal: 100, badgesClaimed: 12.9 }), { claimed: 12, total: 100 });
  assert.deepEqual(rules.progress({ badgesTotal: 100, badgesClaimed: 'x' }), { claimed: 0, total: 100 });
  assert.deepEqual(rules.progress({}), { claimed: 0, total: 0 });
  assert.equal(rules.t('en', 'progress.text', rules.progress({ badgesTotal: 100, badgesClaimed: 37 })), '37 of 100 badges claimed');
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
  assert.equal(rules.orderTotal({ tier: 'one' }, config), config.priceOne);
  assert.equal(rules.orderTotal({ tier: 'two' }, config), config.priceTwo);
  assert.equal(rules.orderTotal({ tier: 'donate', amount: '25,5' }, config), 25.5);
  assert.equal(rules.orderTotal({ tier: 'donate', amount: 'x' }, config), 0);
  assert.equal(rules.orderTotal({ tier: '' }, config), 0);
  assert.equal(rules.formatUsd(60), 'USD 60');
  assert.equal(rules.formatUsd(25.5), 'USD 25.50');
  assert.match(rules.formatArs(60, config), /^ARS 60[.  ]?000$/);
  assert.equal(rules.formatArs(60, rules.CONFIG), '');
});

test('empty state: each step says what is missing', () => {
  const empty = { style: '', tier: '', friendStyle: '', amount: '', name: '', email: '', method: '' };
  assert.deepEqual(rules.validateStep(1, empty, filled()), { style: 'err.style' });
  assert.deepEqual(rules.validateStep(2, empty, filled()), { tier: 'err.tier' });
  assert.deepEqual(rules.validateStep(3, empty, filled()), { name: 'err.name', email: 'err.email', method: 'err.method' });
});

test('validation errors', () => {
  const config = filled();
  assert.deepEqual(rules.validateStep(1, { style: 'necklace' }, config), { style: 'err.style' });
  assert.deepEqual(rules.validateStep(2, { tier: 'one', style: '' }, config), { tier: 'err.styleMissing' });
  assert.deepEqual(rules.validateStep(2, { tier: 'two', style: 'clip', friendStyle: '' }, config), { friendStyle: 'err.style' });
  for (const amount of ['', 'abc', '4.99', '10001']) {
    assert.deepEqual(rules.validateStep(2, { tier: 'donate', amount }, config), { amount: 'err.amount' }, amount);
  }
  assert.deepEqual(rules.validateStep(3, { ...validOrder(), name: '   ' }, config), { name: 'err.name' });
  for (const email of ['ana', 'ana@', 'ana@example', 'a na@example.com']) {
    assert.deepEqual(rules.validateStep(3, { ...validOrder(), email }, config), { email: 'err.email' }, email);
  }
  /* a method that is not set up cannot be picked, even if the page is tampered with */
  assert.deepEqual(rules.validateStep(3, validOrder(), rules.CONFIG), { method: 'err.method' });
});

test('valid submission: every step passes and the email holds the order', () => {
  const config = filled();
  const order = validOrder();
  for (const step of [1, 2, 3]) assert.deepEqual(rules.validateStep(step, order, config), {}, 'step ' + step);
  assert.deepEqual(rules.validateStep(2, { tier: 'donate', amount: '5' }, config), {});
  assert.deepEqual(rules.validateStep(2, { tier: 'donate', amount: '10000' }, config), {});

  const text = rules.orderText(order, config, 'en', 'JOYA-TEST0001');
  assert.deepEqual(text.split('\n'), [
    'Badge with clip',
    'Badge for your friend, with lanyard',
    'Total: ' + rules.formatUsd(config.priceTwo),
    'Payment method: Venmo',
    'Code: JOYA-TEST0001',
    'Name: Ana Test',
    'Email: ana@example.com'
  ]);
  const url = rules.mailtoUrl(order, config, 'es', 'JOYA-TEST0001');
  assert.ok(url.startsWith('mailto:' + config.orderEmail + '?subject=Pedido%20Joya%20Badge%20JOYA-TEST0001&body='));
  assert.equal(decodeURIComponent(url.split('&body=')[1]), rules.orderText(order, config, 'es', 'JOYA-TEST0001'));
  assert.deepEqual(rules.orderItems({ tier: 'donate' }, 'es'), ['Donación']);
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
  const keys = [...attrValues('data-i18n'), ...attrValues('data-i18n-alt'), ...attrValues('data-i18n-label')];
  assert.ok(keys.length > 40);
  for (const key of keys) assert.ok(key in rules.WORDS.es, 'missing sentence: ' + key);
  for (const m of html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g)) {
    assert.equal(m[2], rules.WORDS.es[m[1]], 'page text differs from the Spanish sentence: ' + m[1]);
  }
  for (const m of html.matchAll(/alt="([^"]*)" data-i18n-alt="([^"]+)"/g)) {
    assert.equal(m[1], rules.WORDS.es[m[2]], 'alt text differs: ' + m[2]);
  }
});

test('badge.html matches the settings', () => {
  assert.deepEqual(attrValues('data-preset').map(Number), rules.CONFIG.donationPresets);
  assert.deepEqual(attrValues('data-method'), rules.METHOD_IDS);
  for (const name of ['style', 'tier', 'friendStyle', 'amount', 'name', 'email', 'method']) {
    assert.ok(html.includes('name="' + name + '"'), 'no input named ' + name);
    assert.ok(html.includes('data-error="' + name + '"'), 'no error box for ' + name);
    assert.ok(html.includes('data-field="' + name + '"'), 'no focus target for ' + name);
  }
  assert.ok(html.includes('mailto:' + rules.CONFIG.orderEmail));
  assert.ok(html.includes(NOINDEX), 'the draft must stay out of search');
  const run = rules.progress(rules.CONFIG);
  assert.ok(html.includes('data-progress-text>' + rules.t('es', 'progress.text', run) + '<'), 'progress text differs from the settings');
  assert.ok(html.includes('<progress class="bdg-progress__bar" max="' + run.total + '" value="' + run.claimed + '"'), 'progress bar differs from the settings');
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
