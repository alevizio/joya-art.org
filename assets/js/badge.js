/* ==========================================================================
   joya-art.org: the badge fundraiser page (/badge)

   1. Settings     prices, the peso rate and the payment handles: the only part to edit
   2. Words        every sentence of the page, in Spanish and English
   3. Rules        totals, validation, links, the order email (no page needed: tested in
                   badge.test.js with `node --test assets/js/badge.test.js`)
   4. Page         language switch, the three steps, summary, payment panel, send

   The page has no server. An order is the email the visitor sends from the last step,
   so nothing is stored anywhere until that email arrives.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. settings ---------- */
  var CONFIG = {
    pricesConfirmed: true,           // false marks the two prices below as "provisional"
    priceOne: 20,                    // USD, one badge: the board at the 100 piece price, nothing else
    priceTwo: 40,                    // USD, one badge plus one for a friend
    donationPresets: [20, 50, 100],  // USD, the suggested amounts for "just donate"
    donationMin: 5,                  // USD
    donationMax: 10000,              // USD
    arsPerUsd: null,                 // pesos per dollar, e.g. 1450. null shows "to be confirmed"
    orderEmail: 'joyacamp85@gmail.com',
    badgesTotal: 100,                // the boards that were ordered
    badgesClaimed: 0,                // badges asked for so far. Nothing counts them: raise it by hand as order emails arrive
    /* A method with nothing filled in shows as "coming soon" and cannot be picked. */
    methods: {
      mercadopago: { alias: '', link: '' },               // alias and/or an https payment link
      crypto: { coin: 'USDC', network: '', address: '' }, // network as the wallet names it, e.g. 'Base', and the address
      venmo: { handle: '' },                              // without the @
      wise: { link: '' }                                  // an https Wise payment link
    }
  };
  var METHOD_IDS = ['mercadopago', 'crypto', 'venmo', 'wise'];
  var STYLE_IDS = ['lanyard', 'clip'];
  var LAST_STEP = 3;
  var LANGS = ['es', 'en'];
  var LANG_STORE = 'joya-badge-lang';

  /* ---------- 2. words ---------- */
  var WORDS = {
    es: {
      'meta.title': 'Badge — Joya',
      'draft.banner': 'Borrador: los medios de pago todavía no están confirmados.',
      'hero.title': 'Llevá la *luz* de _Joya_ puesta',
      'hero.lead': 'Un badge con 13 luces LED y 12 animaciones que manejás desde el celular. Las 100 placas ya están encargadas. Con tu aporte cubrimos las placas, las baterías y las carcasas.',
      'hero.cta': 'Quiero el mío',
      'progress.text': '{claimed} de {total} badges pedidos',
      'hero.caption': 'Render del diseño',
      'facts.title': 'Qué trae',
      'facts.leds': 'luces LED',
      'facts.anims': 'animaciones',
      'facts.wifi': 'Lo manejás desde el celular',
      'facts.usb': 'Batería recargable',
      'order.title': 'Armá tu pedido',
      'steps.label': 'Pasos',
      'steps.1': 'Estilo',
      'steps.2': 'Cantidad',
      'steps.3': 'Aporte',
      'nav.next': 'Seguir',
      'nav.back': 'Volver',
      's1.title': '¿Cómo lo querés llevar?',
      's1.lanyard.text': 'Colgado del cuello',
      's1.clip.text': 'Prendido a la ropa',
      's1.note': 'Imágenes: render del diseño. La carcasa final puede cambiar.',
      's1.donate': 'Solo quiero donar',
      'alt.lanyardFront': 'Badge con lanyard visto de frente, con las luces prendidas',
      'alt.lanyardBack': 'Badge con lanyard visto de atrás',
      'alt.clipFront': 'Badge con clip visto de frente, con las luces prendidas',
      'alt.clipBack': 'Badge con clip visto de atrás',
      's2.title': '¿Cuántos querés?',
      'tier.one.title': 'Un badge',
      'tier.one.text': 'Para vos',
      'tier.two.title': 'Uno para mí y uno para un amigo o amiga',
      'tier.two.text': 'Dos badges',
      'tier.donate.title': 'Solo donar',
      'tier.donate.text': 'Sin badge. Vos elegís el monto.',
      's2.friend.legend': '¿Cómo lo lleva tu amigo o amiga?',
      's2.amount.presets': 'Montos sugeridos',
      's2.amount.label': 'Monto en USD',
      'price.draft': 'provisorio',
      's3.title': 'Hacé tu aporte',
      'sum.title': 'Tu pedido',
      'sum.badge': 'Badge con {style}',
      'sum.friend': 'Badge para tu amigo o amiga, con {style}',
      'sum.donation': 'Donación',
      'sum.total': 'Total',
      'sum.ars': 'Aprox. {ars}',
      'sum.arsPending': 'Monto en pesos: a confirmar',
      'sum.ref': 'Código',
      'style.lanyard': 'lanyard',
      'style.clip': 'clip',
      'f.name': 'Nombre',
      'f.email': 'Email',
      'pay.legend': '¿Cómo querés aportar?',
      'pay.mercadopago': 'Mercado Pago',
      'pay.mercadopago.text': 'Desde Argentina, en pesos',
      'pay.crypto': 'Cripto',
      'pay.crypto.text': 'Desde cualquier lugar',
      'pay.venmo': 'Venmo',
      'pay.venmo.text': 'Desde Estados Unidos',
      'pay.wise': 'Wise',
      'pay.wise.text': 'Desde otros países',
      'pay.soon': 'Próximamente',
      'panel.mp.alias': 'Transferí {amount} a este alias de Mercado Pago:',
      'panel.mp.link': 'Pagar con Mercado Pago',
      'panel.mp.noRate': 'Te confirmamos el monto en pesos por mail antes de que pagues.',
      'panel.crypto.text': 'Mandá el equivalente a {amount} en {coin} por la red {network} a esta dirección:',
      'panel.crypto.warn': 'Revisá la red antes de mandar. Un envío por otra red se pierde.',
      'panel.venmo.text': 'Pagá {amount} por Venmo a @{handle}.',
      'panel.venmo.link': 'Abrir Venmo',
      'panel.wise.text': 'Pagá {amount} por Wise.',
      'panel.wise.link': 'Abrir Wise',
      'panel.ref': 'Poné este código en la nota del pago: {ref}',
      'copy': 'Copiar',
      'copied': 'Copiado',
      's3.send': 'Mandar mi pedido por mail',
      's3.sendNote': 'Después de pagar, mandanos este mail. Así sabemos qué badge es tuyo.',
      'sent.title': '¿No se abrió tu mail?',
      'sent.text': 'Copiá este texto y mandalo a {email}.',
      'err.style': 'Elegí lanyard o clip.',
      'err.tier': 'Elegí una opción.',
      'err.styleMissing': 'Te falta elegir lanyard o clip. Volvé al paso anterior.',
      'err.amount': 'Ingresá un monto de USD {min} o más.',
      'err.name': 'Decinos tu nombre.',
      'err.email': 'Revisá el email.',
      'err.method': 'Elegí cómo querés aportar.',
      'mail.subject': 'Pedido Joya Badge {ref}',
      'mail.name': 'Nombre: {name}',
      'mail.email': 'Email: {email}',
      'mail.method': 'Medio de pago: {method}',
      'mail.total': 'Total: {total}',
      'mail.ref': 'Código: {ref}',
      'notes.title': 'Para que sepas',
      'notes.1': 'Las 100 placas ya están encargadas.',
      'notes.2': 'Todavía no tenemos fecha de entrega. Te avisamos por mail cuándo y cómo lo recibís.',
      'notes.3': 'Las imágenes de la carcasa son renders del diseño. La versión final puede cambiar.',
      'notes.4': '¿Dudas? Escribinos a'
    },
    en: {
      'meta.title': 'Badge — Joya',
      'draft.banner': 'Draft: payment methods are not confirmed yet.',
      'hero.title': 'Wear the *light* of _Joya_',
      'hero.lead': 'A badge with 13 LED lights and 12 animations you control from your phone. The 100 boards are already ordered. Your contribution covers the boards, the batteries and the shells.',
      'hero.cta': 'I want mine',
      'progress.text': '{claimed} of {total} badges claimed',
      'hero.caption': 'Design render',
      'facts.title': 'What it has',
      'facts.leds': 'LED lights',
      'facts.anims': 'animations',
      'facts.wifi': 'Controlled from your phone',
      'facts.usb': 'Rechargeable battery',
      'order.title': 'Build your order',
      'steps.label': 'Steps',
      'steps.1': 'Style',
      'steps.2': 'How many',
      'steps.3': 'Contribution',
      'nav.next': 'Continue',
      'nav.back': 'Back',
      's1.title': 'How do you want to wear it?',
      's1.lanyard.text': 'Around your neck',
      's1.clip.text': 'Pinned to your clothes',
      's1.note': 'Pictures: design renders. The final shell may change.',
      's1.donate': 'I just want to donate',
      'alt.lanyardFront': 'Badge on a lanyard seen from the front, with the lights on',
      'alt.lanyardBack': 'Badge on a lanyard seen from the back',
      'alt.clipFront': 'Badge with a clip seen from the front, with the lights on',
      'alt.clipBack': 'Badge with a clip seen from the back',
      's2.title': 'How many do you want?',
      'tier.one.title': 'One badge',
      'tier.one.text': 'For you',
      'tier.two.title': 'One for me and one for a friend',
      'tier.two.text': 'Two badges',
      'tier.donate.title': 'Just donate',
      'tier.donate.text': 'No badge. You choose the amount.',
      's2.friend.legend': 'How will your friend wear it?',
      's2.amount.presets': 'Suggested amounts',
      's2.amount.label': 'Amount in USD',
      'price.draft': 'provisional',
      's3.title': 'Make your contribution',
      'sum.title': 'Your order',
      'sum.badge': 'Badge with {style}',
      'sum.friend': 'Badge for your friend, with {style}',
      'sum.donation': 'Donation',
      'sum.total': 'Total',
      'sum.ars': 'About {ars}',
      'sum.arsPending': 'Amount in pesos: to be confirmed',
      'sum.ref': 'Code',
      'style.lanyard': 'lanyard',
      'style.clip': 'clip',
      'f.name': 'Name',
      'f.email': 'Email',
      'pay.legend': 'How do you want to contribute?',
      'pay.mercadopago': 'Mercado Pago',
      'pay.mercadopago.text': 'From Argentina, in pesos',
      'pay.crypto': 'Crypto',
      'pay.crypto.text': 'From anywhere',
      'pay.venmo': 'Venmo',
      'pay.venmo.text': 'From the United States',
      'pay.wise': 'Wise',
      'pay.wise.text': 'From other countries',
      'pay.soon': 'Coming soon',
      'panel.mp.alias': 'Send {amount} to this Mercado Pago alias:',
      'panel.mp.link': 'Pay with Mercado Pago',
      'panel.mp.noRate': 'We will confirm the amount in pesos by email before you pay.',
      'panel.crypto.text': 'Send the equivalent of {amount} in {coin} over the {network} network to this address:',
      'panel.crypto.warn': 'Check the network before sending. A transfer over another network is lost.',
      'panel.venmo.text': 'Pay {amount} on Venmo to @{handle}.',
      'panel.venmo.link': 'Open Venmo',
      'panel.wise.text': 'Pay {amount} with Wise.',
      'panel.wise.link': 'Open Wise',
      'panel.ref': 'Put this code in the payment note: {ref}',
      'copy': 'Copy',
      'copied': 'Copied',
      's3.send': 'Send my order by email',
      's3.sendNote': 'After paying, send us this email. That is how we know which badge is yours.',
      'sent.title': 'Did your email app not open?',
      'sent.text': 'Copy this text and send it to {email}.',
      'err.style': 'Choose lanyard or clip.',
      'err.tier': 'Choose an option.',
      'err.styleMissing': 'You still need to choose lanyard or clip. Go back one step.',
      'err.amount': 'Enter an amount of USD {min} or more.',
      'err.name': 'Tell us your name.',
      'err.email': 'Check the email address.',
      'err.method': 'Choose how you want to contribute.',
      'mail.subject': 'Joya Badge order {ref}',
      'mail.name': 'Name: {name}',
      'mail.email': 'Email: {email}',
      'mail.method': 'Payment method: {method}',
      'mail.total': 'Total: {total}',
      'mail.ref': 'Code: {ref}',
      'notes.title': 'Good to know',
      'notes.1': 'The 100 boards are already ordered.',
      'notes.2': 'We do not have a delivery date yet. We will email you when and how you get it.',
      'notes.3': 'The shell pictures are design renders. The final version may change.',
      'notes.4': 'Questions? Write to'
    }
  };

  /* ---------- 3. rules ---------- */

  /* The sentence for `key` in `lang`, with {name} places filled from `vars`. */
  function t(lang, key, vars) {
    var text = (WORDS[lang] || WORDS.es)[key];
    if (text === undefined) return key;
    return text.replace(/\{(\w+)\}/g, function (whole, name) {
      return vars && vars[name] !== undefined ? String(vars[name]) : whole;
    });
  }

  /* A sentence with hand drawn marks, split into pieces: *word* gets the marker, _word_ the
     curved underline (the shapes site.js draws). Pieces without a mark have shape ''. */
  var MARKS = { '*': 'marker', '_': 'underlineCurve' };
  function markedParts(text) {
    var parts = [];
    var last = 0;
    text.replace(/([*_])([^*_]+)\1/g, function (whole, mark, word, at) {
      if (at > last) parts.push({ text: text.slice(last, at), shape: '' });
      parts.push({ text: word, shape: MARKS[mark] });
      last = at + whole.length;
    });
    if (last < text.length) parts.push({ text: text.slice(last), shape: '' });
    return parts;
  }

  function pickLang(fromQuery, fromStore) {
    if (LANGS.indexOf(fromQuery) !== -1) return fromQuery;
    if (LANGS.indexOf(fromStore) !== -1) return fromStore;
    return 'es';
  }

  /* Only https links from the settings are ever put on the page. */
  function safeUrl(url) {
    return typeof url === 'string' && /^https:\/\/[^\s]+$/.test(url) ? url : '';
  }

  function methodReady(config, id) {
    var m = config.methods[id];
    if (!m) return false;
    if (id === 'mercadopago') return Boolean(m.alias || safeUrl(m.link));
    if (id === 'crypto') return Boolean(m.coin && m.network && m.address);
    if (id === 'venmo') return Boolean(m.handle);
    return Boolean(safeUrl(m.link));
  }

  /* The page is a draft while a price is provisional or nobody can pay yet. */
  function isDraft(config) {
    return !config.pricesConfirmed || !METHOD_IDS.some(function (id) { return methodReady(config, id); });
  }

  /* How far the run is: whole badges, never under zero or over the total. */
  function progress(config) {
    var total = Math.max(0, Math.floor(Number(config.badgesTotal) || 0));
    var claimed = Math.min(total, Math.max(0, Math.floor(Number(config.badgesClaimed) || 0)));
    return { claimed: claimed, total: total };
  }

  /* "50", "50.5" and "50,5" are amounts; anything else is NaN. */
  function parseAmount(raw) {
    var text = String(raw === undefined || raw === null ? '' : raw).trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return NaN;
    return Number(text);
  }

  function orderTotal(order, config) {
    if (order.tier === 'one') return config.priceOne;
    if (order.tier === 'two') return config.priceTwo;
    if (order.tier === 'donate') {
      var amount = parseAmount(order.amount);
      return isNaN(amount) ? 0 : amount;
    }
    return 0;
  }

  function formatUsd(amount) {
    return 'USD ' + (Number.isInteger(amount) ? String(amount) : amount.toFixed(2));
  }

  function formatArs(usd, config) {
    if (!config.arsPerUsd) return '';
    return 'ARS ' + Math.round(usd * config.arsPerUsd).toLocaleString('es-AR');
  }

  /* What is wrong on a step: { field: key of the sentence to show }. Empty means go on. */
  function validateStep(step, order, config) {
    var errors = {};
    var wantsBadge = order.tier === 'one' || order.tier === 'two';
    if (step === 1) {
      if (STYLE_IDS.indexOf(order.style) === -1) errors.style = 'err.style';
    }
    if (step === 2) {
      if (!wantsBadge && order.tier !== 'donate') errors.tier = 'err.tier';
      else if (wantsBadge && STYLE_IDS.indexOf(order.style) === -1) errors.tier = 'err.styleMissing';
      if (order.tier === 'two' && STYLE_IDS.indexOf(order.friendStyle) === -1) errors.friendStyle = 'err.style';
      if (order.tier === 'donate') {
        var amount = parseAmount(order.amount);
        if (isNaN(amount) || amount < config.donationMin || amount > config.donationMax) errors.amount = 'err.amount';
      }
    }
    if (step === 3) {
      if (!String(order.name || '').trim()) errors.name = 'err.name';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(order.email || '').trim())) errors.email = 'err.email';
      if (!methodReady(config, order.method)) errors.method = 'err.method';
    }
    return errors;
  }

  /* What the order holds, one sentence per line, for the summary and the email. */
  function orderItems(order, lang) {
    var items = [];
    if (order.tier === 'one' || order.tier === 'two') {
      items.push(t(lang, 'sum.badge', { style: t(lang, 'style.' + order.style) }));
    }
    if (order.tier === 'two') {
      items.push(t(lang, 'sum.friend', { style: t(lang, 'style.' + order.friendStyle) }));
    }
    if (order.tier === 'donate') {
      items.push(t(lang, 'sum.donation'));
    }
    return items;
  }

  function venmoUrl(handle, amount, note) {
    return 'https://venmo.com/' + encodeURIComponent(String(handle).replace(/^@/, '')) +
      '?txn=pay&amount=' + amount.toFixed(2) + '&note=' + encodeURIComponent(note);
  }

  /* A short code the payer puts in the payment note, so payment and email can be matched. */
  function newReference(cryptoObj) {
    var uuid = cryptoObj.randomUUID();
    return 'JOYA-' + uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
  }

  function orderText(order, config, lang, ref) {
    var lines = orderItems(order, lang);
    lines.push(t(lang, 'mail.total', { total: formatUsd(orderTotal(order, config)) }));
    lines.push(t(lang, 'mail.method', { method: t(lang, 'pay.' + order.method) }));
    lines.push(t(lang, 'mail.ref', { ref: ref }));
    lines.push(t(lang, 'mail.name', { name: String(order.name).trim() }));
    lines.push(t(lang, 'mail.email', { email: String(order.email).trim() }));
    return lines.join('\n');
  }

  function mailtoUrl(order, config, lang, ref) {
    return 'mailto:' + config.orderEmail +
      '?subject=' + encodeURIComponent(t(lang, 'mail.subject', { ref: ref })) +
      '&body=' + encodeURIComponent(orderText(order, config, lang, ref));
  }

  var rules = {
    CONFIG: CONFIG, WORDS: WORDS, METHOD_IDS: METHOD_IDS, STYLE_IDS: STYLE_IDS,
    t: t, markedParts: markedParts, pickLang: pickLang, safeUrl: safeUrl, methodReady: methodReady, isDraft: isDraft,
    progress: progress,
    parseAmount: parseAmount, orderTotal: orderTotal, formatUsd: formatUsd, formatArs: formatArs,
    validateStep: validateStep, orderItems: orderItems, venmoUrl: venmoUrl,
    newReference: newReference, orderText: orderText, mailtoUrl: mailtoUrl
  };
  if (typeof module === 'object' && module.exports) { module.exports = rules; return; }

  /* ---------- 4. page ---------- */
  var form = document.querySelector('[data-form]');
  if (!form) return;

  var state = {
    step: 1,
    lang: 'es',
    errors: {},
    ref: newReference(window.crypto),
    order: { style: '', tier: '', friendStyle: '', amount: '', name: '', email: '', method: '' }
  };
  var sentBox = document.querySelector('[data-sent]');
  var panel = document.querySelector('[data-panel]');
  var summary = document.querySelector('[data-summary]');

  function say(key, vars) { return t(state.lang, key, vars); }
  function all(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* Writes a marked sentence as text plus .hl spans, then asks site.js to draw the marks again
     (it redraws on resize). Left alone when the words already match, so the first load does not
     restart the drawing. */
  function setMarked(node) {
    var parts = markedParts(say(node.getAttribute('data-i18n-marked')));
    var plain = parts.map(function (part) { return part.text; }).join('');
    if (node.textContent === plain) return;
    node.textContent = '';
    parts.forEach(function (part) {
      if (!part.shape) { node.appendChild(document.createTextNode(part.text)); return; }
      var span = el('span', 'hl', part.text);
      span.setAttribute('data-shape', part.shape);
      span.setAttribute('data-draw', '');
      node.appendChild(span);
    });
    window.dispatchEvent(new Event('resize'));
  }

  function storedLang() {
    try { return window.localStorage.getItem(LANG_STORE); } catch (e) { return null; }
  }
  function storeLang(lang) {
    try { window.localStorage.setItem(LANG_STORE, lang); } catch (e) { /* private window: the choice lasts this visit */ }
  }

  function priceLabel(usd) {
    return formatUsd(usd) + (CONFIG.pricesConfirmed ? '' : ' (' + say('price.draft') + ')');
  }

  function copyRow(value) {
    var row = el('p', 'bdg-copy');
    row.appendChild(el('code', 'bdg-copy__value', value));
    var button = el('button', 'bdg-btn bdg-btn--ghost bdg-btn--small', say('copy'));
    button.type = 'button';
    button.setAttribute('data-copy', value);
    row.appendChild(button);
    return row;
  }

  function linkButton(url, label) {
    var a = el('a', 'bdg-btn', label);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  function renderSummary() {
    var total = orderTotal(state.order, CONFIG);
    var items = el('ul', 'bdg-summary__items');
    orderItems(state.order, state.lang).forEach(function (item) {
      items.appendChild(el('li', '', item));
    });
    var list = el('dl', 'bdg-summary__list');
    list.appendChild(el('dt', 'bdg-summary__label', say('sum.total')));
    list.appendChild(el('dd', 'bdg-summary__total', priceLabel(total)));
    list.appendChild(el('dt', 'bdg-summary__label', say('sum.ref')));
    list.appendChild(el('dd', 'bdg-summary__value', state.ref));
    var ars = formatArs(total, CONFIG);
    summary.replaceChildren(
      el('h4', 'bdg-summary__title', say('sum.title')),
      items,
      list,
      el('p', 'bdg-summary__ars t-small', ars ? say('sum.ars', { ars: ars }) : say('sum.arsPending'))
    );
  }

  function renderPanel() {
    var id = state.order.method;
    panel.replaceChildren();
    if (!methodReady(CONFIG, id)) return;
    var m = CONFIG.methods[id];
    var total = orderTotal(state.order, CONFIG);
    var usd = formatUsd(total);
    if (id === 'mercadopago') {
      var ars = formatArs(total, CONFIG);
      if (!ars) panel.appendChild(el('p', '', say('panel.mp.noRate')));
      if (m.alias) {
        panel.appendChild(el('p', '', say('panel.mp.alias', { amount: ars || usd })));
        panel.appendChild(copyRow(m.alias));
      }
      if (safeUrl(m.link)) panel.appendChild(linkButton(m.link, say('panel.mp.link')));
    }
    if (id === 'crypto') {
      panel.appendChild(el('p', '', say('panel.crypto.text', { amount: usd, coin: m.coin, network: m.network })));
      panel.appendChild(copyRow(m.address));
      panel.appendChild(el('p', 'bdg-panel__warn', say('panel.crypto.warn')));
    }
    if (id === 'venmo') {
      panel.appendChild(el('p', '', say('panel.venmo.text', { amount: usd, handle: String(m.handle).replace(/^@/, '') })));
      panel.appendChild(linkButton(venmoUrl(m.handle, total, state.ref), say('panel.venmo.link')));
    }
    if (id === 'wise') {
      panel.appendChild(el('p', '', say('panel.wise.text', { amount: usd })));
      panel.appendChild(linkButton(m.link, say('panel.wise.link')));
    }
    panel.appendChild(el('p', 'bdg-panel__ref', say('panel.ref', { ref: state.ref })));
  }

  function renderErrors() {
    all('[data-error]').forEach(function (box) {
      var key = state.errors[box.getAttribute('data-error')];
      box.hidden = !key;
      box.textContent = key ? say(key, { min: CONFIG.donationMin }) : '';
    });
    all('[data-field]').forEach(function (input) {
      if (state.errors[input.getAttribute('data-field')]) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
  }

  function render() {
    all('[data-step]').forEach(function (box) {
      box.hidden = Number(box.getAttribute('data-step')) !== state.step;
    });
    all('[data-step-tab]').forEach(function (tab) {
      if (Number(tab.getAttribute('data-step-tab')) === state.step) tab.setAttribute('aria-current', 'step');
      else tab.removeAttribute('aria-current');
    });
    all('[data-price]').forEach(function (node) {
      node.textContent = priceLabel(node.getAttribute('data-price') === 'two' ? CONFIG.priceTwo : CONFIG.priceOne);
    });
    all('[data-when-tier]').forEach(function (box) {
      box.hidden = box.getAttribute('data-when-tier') !== state.order.tier;
    });
    all('[data-preset]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(parseAmount(state.order.amount) === Number(button.getAttribute('data-preset'))));
    });
    all('[data-method]').forEach(function (label) {
      var ready = methodReady(CONFIG, label.getAttribute('data-method'));
      label.querySelector('input').disabled = !ready;
      label.querySelector('[data-soon]').hidden = ready;
    });
    all('[data-draft]').forEach(function (box) { box.hidden = !isDraft(CONFIG); });
    var run = progress(CONFIG);
    all('[data-progress]').forEach(function (bar) { bar.max = run.total; bar.value = run.claimed; });
    all('[data-progress-text]').forEach(function (node) { node.textContent = say('progress.text', run); });
    renderErrors();
    if (state.step === LAST_STEP) { renderSummary(); renderPanel(); }
  }

  function applyLang(lang) {
    state.lang = lang;
    document.documentElement.lang = lang;
    document.title = say('meta.title');
    all('[data-i18n]').forEach(function (node) { node.textContent = say(node.getAttribute('data-i18n')); });
    all('[data-i18n-marked]').forEach(setMarked);
    all('[data-i18n-alt]').forEach(function (node) { node.alt = say(node.getAttribute('data-i18n-alt')); });
    all('[data-i18n-label]').forEach(function (node) { node.setAttribute('aria-label', say(node.getAttribute('data-i18n-label'))); });
    all('[data-lang]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-lang') === lang));
    });
    if (!sentBox.hidden) showSent();
    render();
  }

  function goTo(step) {
    state.step = step;
    state.errors = {};
    sentBox.hidden = true;
    render();
    var box = document.querySelector('[data-step="' + step + '"]');
    var title = box.querySelector('[data-step-title]');
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    title.focus({ preventScroll: true });
    document.querySelector('[data-order]').scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  }

  /* Checks the step in view. Shows what is wrong and puts the cursor on it, or returns true. */
  function stepIsValid() {
    state.errors = validateStep(state.step, state.order, CONFIG);
    renderErrors();
    var first = Object.keys(state.errors)[0];
    if (!first) return true;
    var target = document.querySelector('[data-step="' + state.step + '"] [data-field="' + first + '"]');
    if (target) target.focus();
    return false;
  }

  function showSent() {
    sentBox.querySelector('[data-sent-text]').textContent = say('sent.text', { email: CONFIG.orderEmail });
    var text = orderText(state.order, CONFIG, state.lang, state.ref);
    sentBox.querySelector('[data-sent-body]').textContent = text;
    sentBox.querySelector('[data-copy]').setAttribute('data-copy', text);
    sentBox.hidden = false;
  }

  function readField(input) {
    var name = input.name;
    if (!(name in state.order)) return;
    if (input.type === 'radio' && !input.checked) return;
    state.order[name] = input.value;
    if (name === 'style' && !state.order.friendStyle) {
      state.order.friendStyle = input.value;
      var twin = form.querySelector('input[name="friendStyle"][value="' + input.value + '"]');
      if (twin) twin.checked = true;
    }
    delete state.errors[name];
    render();
  }

  form.addEventListener('input', function (event) { readField(event.target); });
  form.addEventListener('change', function (event) { readField(event.target); });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!stepIsValid()) return;
    if (state.step < LAST_STEP) { goTo(state.step + 1); return; }
    showSent();
    window.location.href = mailtoUrl(state.order, CONFIG, state.lang, state.ref);
  });

  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-go], [data-preset], [data-copy], [data-lang]');
    if (!target) return;
    if (target.hasAttribute('data-lang')) {
      storeLang(target.getAttribute('data-lang'));
      applyLang(target.getAttribute('data-lang'));
    } else if (target.hasAttribute('data-preset')) {
      var amountInput = form.querySelector('input[name="amount"]');
      amountInput.value = target.getAttribute('data-preset');
      readField(amountInput);
    } else if (target.hasAttribute('data-copy')) {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(target.getAttribute('data-copy')).then(function () {
        target.textContent = say('copied');
      }, function () { /* no clipboard permission: the text stays on screen to select by hand */ });
    } else if (target.getAttribute('data-go') === 'back') {
      goTo(state.step - 1);
    } else if (target.getAttribute('data-go') === 'donate') {
      var donate = form.querySelector('input[name="tier"][value="donate"]');
      donate.checked = true;
      readField(donate);
      goTo(2);
    }
  });

  applyLang(pickLang(new URLSearchParams(window.location.search).get('lang'), storedLang()));
})();
