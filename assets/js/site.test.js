/* Every page in English and Spanish: node --test assets/js/ */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const lang = require('./lang.js');
const badge = require('./badge.js');

const root = path.join(__dirname, '..', '..');
const PAGES = ['index.html', 'home.html', '404.html', 'events.html', 'music.html', 'ethos.html', 'contact.html', 'badge.html']
  .concat(fs.readdirSync(path.join(root, 'events')).filter((f) => f.endsWith('.html')).map((f) => 'events/' + f));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const textOf = (html) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

test('the site and /badge pick the language the same way, and remember it under the same name', () => {
  const cases = [
    ['en', 'es', 'America/Argentina/Buenos_Aires', ['es-AR']],
    [null, 'es', 'America/New_York', ['en-US']],
    [null, null, 'America/Argentina/Cordoba', ['en-US']],
    [null, null, 'America/Buenos_Aires', []],
    [null, null, 'America/Los_Angeles', ['es-AR']],
    [null, null, 'Pacific/Honolulu', []],
    [null, null, 'Europe/Madrid', ['es-ES']],
    [null, null, 'Europe/London', ['en-GB']],
    [null, null, '', []],
    ['fr', 'de', 'Asia/Tokyo', ['ja']]
  ];
  for (const c of cases) assert.equal(lang.pick(...c), badge.pickLang(...c), JSON.stringify(c));
  assert.equal(lang.pick(null, null, 'America/Argentina/Salta', ['en']), 'es');
  assert.equal(lang.pick(null, null, 'America/Chicago', ['es']), 'en');
  assert.equal(lang.STORE, 'joya-lang');
  assert.match(read('assets/js/badge.js'), /var LANG_STORE = 'joya-lang';/);
});

test('every page sets its language in <head>, before the styles, and offers the ES / EN switch', () => {
  for (const page of PAGES) {
    const html = read(page);
    const head = html.split('</head>')[0];
    assert.ok(head.indexOf('<script src="/assets/js/lang.js') !== -1, page + ': no lang.js');
    assert.ok(head.indexOf('/assets/js/lang.js') < head.indexOf('/assets/css/site.css'), page + ': lang.js after the styles');
    assert.ok(!/<script[^>]*defer[^>]*lang\.js/.test(head), page + ': lang.js must not wait');
    assert.match(html.replace(/>\s+</g, '><'), /<div class="lang" role="group" aria-label="Idioma \/ Language"><button class="lang__btn" type="button" data-lang="es" lang="es"[^>]*>ES<\/button><button class="lang__btn" type="button" data-lang="en" lang="en"[^>]*>EN<\/button><\/div>/, page + ': no switch');
  }
  assert.equal(read('index.html'), read('home.html'));
});

test('the menus, the skip link, the footer and the event links read in both languages', () => {
  for (const page of PAGES) {
    const html = read(page);
    for (const nav of ['header__nav', 'menu__nav']) {
      const menu = html.match(new RegExp('<nav class="' + nav + '"[^>]*>.*?</nav>'))[0];
      for (const [en, es] of [['Home', 'Inicio'], ['Events', 'Eventos'], ['Music', 'Música'], ['Contact', 'Contacto']]) {
        assert.ok(menu.includes('<span lang="en">' + en + '</span><span lang="es">' + es + '</span>'), page + ' ' + nav + ': ' + en);
      }
      assert.match(menu, /data-label-es="[^"]+" aria-label="[^"]+"/, page + ' ' + nav + ': label');
    }
    assert.ok(html.includes('<span lang="es">Saltar al contenido</span>'), page + ': skip link');
    assert.ok(html.includes('<span lang="es">© 2026 Joya Art LLC. Todos los derechos reservados.</span>'), page + ': footer');
    if (html.includes('class="pager"')) assert.ok(html.includes('<span lang="es">Anterior: </span>') || html.includes('<span lang="es">Siguiente: </span>'), page + ': pager');
  }
});

/* Outside /badge (badge.js swaps its own words), every heading and paragraph in <main> comes as an
   English and Spanish pair, or is a name that reads the same in both. */
test('no text on a page is left in one language only', () => {
  const SAME = /^(Pasala Joya 💎|Crystallized|Joya Crystallized|Global Eclipse Patagonia Gathering 2020|.*\b20\d\d\b.*|Juan Cassinelli .*Alejandro Vizio|)$/;
  for (const page of PAGES.filter((p) => p !== 'badge.html')) {
    const main = read(page).match(/<main[\s\S]*?<\/main>/)[0].replace(/<nav class="pager"[\s\S]*?<\/nav>/, '');
    const blocks = main.match(/<(h[1-6]|p)\b[^>]*>[\s\S]*?<\/\1>/g) || [];
    blocks.forEach((b, i) => {
      const m = b.match(/^<(\w+)[^>]*?(?: lang="(en|es)")?>/);
      const own = (b.match(/^<\w+[^>]*>/)[0].match(/ lang="(en|es)"/) || [])[1];
      if (!own && b.includes('data-es=')) return;   // swapped in place by site.js (the marquee)
      if (!own) {
        assert.match(textOf(b), SAME, page + ': only in one language: ' + textOf(b).slice(0, 60));
        return;
      }
      if (own === 'en') {
        const next = blocks[i + 1] || '';
        assert.equal((next.match(/^<\w+[^>]*>/)[0].match(/ lang="(en|es)"/) || [])[1], 'es', page + ': no Spanish after ' + textOf(b).slice(0, 40));
        assert.equal(next.match(/^<(\w+)/)[1], m[1], page + ': the Spanish twin is another kind of block');
        assert.notEqual(textOf(next), textOf(b), page + ': the Spanish is the English');
      }
    });
  }
});

test('the words that cannot be doubled: the marquee, the titles, the labels', () => {
  const contact = read('contact.html');
  assert.equal((contact.match(/data-es="ESCRIBINOS">CONTACT US</g) || []).length, 9);
  for (const [page, title] of [['events.html', 'Eventos — Joya'], ['music.html', 'Música — Joya'], ['contact.html', 'Contacto — Joya']]) {
    assert.ok(read(page).includes('<html lang="en-US" data-title-es="' + title + '">'), page);
  }
  const site = read('assets/js/site.js');
  assert.ok(site.includes("'Abrir menú'") && site.includes("'Cerrar menú'"), 'burger labels');
  const css = read('assets/css/site.css');
  assert.ok(css.includes('html:not([lang|="es"]) [lang="es"]:not([data-lang]),\nhtml[lang|="es"] [lang="en"]:not([data-lang]) { display: none !important; }'));
});
