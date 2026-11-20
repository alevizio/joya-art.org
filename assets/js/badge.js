/* ==========================================================================
   joya-art.org: the badge fundraiser page (/badge)

   1. Settings     prices, the peso rate and the payment handles: the only part to edit
   2. Words        every sentence of the page, in Spanish and English
   3. Rules        totals, validation, links, the order email (no page needed: tested in
                   badge.test.js with `node --test assets/js/badge.test.js`)
   4. Page         language switch, the two steps, the badge count, summary, payment panel, send,
                   the print videos

   The page has no server. An order is the email the visitor sends from the last step,
   so nothing is stored anywhere until that email arrives.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. settings ---------- */
  var CONFIG = {
    pricesConfirmed: true,           // false marks every price as "provisional"
    priceFirst: 24,                  // USD for one badge
    priceStep: 1,                    // USD off every badge in the order for each badge more
    priceFloor: 18,                  // USD, the least one badge ever costs
    donationPresets: [20, 50, 100],  // USD, the suggested amounts for "just donate"
    donationMin: 5,                  // USD
    donationMax: 10000,              // USD
    arsPerUsd: null,                 // pesos per dollar, e.g. 1450. null shows "to be confirmed"
    orderEmail: 'joyacamp85@gmail.com',
    badgesTotal: 100,                // the boards that were ordered: the most that can be asked for. Never shown on the page
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
  var LAST_STEP = 2;
  var LANGS = ['es', 'en'];
  var LANG_STORE = 'joya-badge-lang';

  /* ---------- 2. words ---------- */
  var WORDS = {
    es: {
      'meta.title': 'Badge — Joya',
      'draft.banner': 'Borrador: los medios de pago todavía no están confirmados.',
      'hero.title': 'Llevá la *luz* de _Joya_\u00a0puesta',
      'hero.lead': 'Un badge con 13 luces LED y 12 animaciones que manejás desde el celular. Las placas ya se están fabricando. Con tu aporte cubrimos las placas, las baterías y las carcasas.',
      'hero.cta': 'Quiero el mío',
      'hero.caption': 'Modelo 3D del badge terminado. La carcasa todavía está en pruebas.',
      'alt.badge': 'Modelo 3D del badge terminado: la placa con sus 13 luces prendidas en una carcasa negra, con un clip arriba y un lanyard',
      'viewer.flip': 'Dar vuelta',
      'viewer.open': 'Ver las capas',
      'viewer.close': 'Armarlo de nuevo',
      'viewer.hint': 'Arrastralo para girarlo.',
      'layer.clamp': 'Clip del lanyard',
      'layer.leds': 'LEDs y capacitores',
      'layer.fmask': 'Máscara negra',
      'layer.fcu': 'Cobre de adelante',
      'layer.core': 'Fibra de vidrio, 1 mm',
      'layer.bcu': 'Cobre de atrás',
      'layer.bmask': 'Máscara y textos',
      'layer.parts': 'WiFi, cargador, USB-C',
      'layer.battery': 'Batería',
      'layer.shell': 'Carcasa impresa en\u00a03D',
      'gallery.title': 'La placa, hoy',
      'gallery.lead': 'Ya hay 5 placas armadas y andando. Estas fotos son de verdad.',
      'gallery.boards': 'Las 5 placas, todavía en el panel',
      'gallery.on': 'Prendida, con la batería y el cable\u00a0USB-C',
      'gallery.dark': 'Tres prendidas a oscuras',
      'gallery.panel': 'Una placa en su panel, con la batería al lado',
      'gallery.stand': 'Ya fuera del panel, con su antena y la batería',
      'gallery.flash': 'Cargándole el programa de las luces',
      'gallery.rig': 'Una en la pinza de programación y las demás esperando su turno',
      'alt.photoBoards': 'Cinco placas del badge sobre un escritorio, todavía en el panel de fábrica',
      'alt.photoOn': 'La placa del badge vista de atrás, prendida, con la batería y el cable USB-C enchufados',
      'alt.photoDark': 'Tres placas del badge prendidas en un cuarto oscuro, con las luces en verde, celeste y violeta',
      'alt.photoPanel': 'La placa del badge con sus 13 LEDs, parada dentro del panel, con una batería adelante',
      'alt.photoStand': 'La placa del badge sola, parada sobre la mesa, con la antena y la batería conectadas',
      'alt.photoFlash': 'La placa del badge con un adaptador de programación conectado',
      'alt.photoRig': 'Una placa en la pinza roja de programación al lado de la computadora, y otras placas esperando en sus paneles',
      'print.title': 'La carcasa, en la impresora 3D',
      'print.lead': 'Ya salieron las primeras carcasas de prueba. Las imprimimos capa por capa y las vamos ajustando con cada prueba.',
      'print.timelapse': 'La primera impresión, vista por la cámara de la impresora',
      'print.close': 'Imprimiendo una carcasa, con sus soportes',
      'print.printer': 'La impresora, a mitad de camino',
      'print.ready': 'Lista para imprimir dos carcasas y el clip',
      'print.slicer': 'Las piezas preparadas: casi dos horas de impresión',
      'alt.printSlicer': 'Pantalla del programa de impresión con dos carcasas y un clip sobre la cama de la impresora',
      'alt.printReady': 'Impresora 3D con la pantalla que muestra las piezas del badge listas para imprimir',
      'video.title': 'Qué recibís',
      'video.lead': 'Cada badge trae la placa armada, su batería, una carcasa impresa en 3D y un lanyard. El video muestra todo lo que tiene la placa.',
      'video.label': 'Video: qué tiene la placa del badge',
      'video.note': 'Animación 3D hecha con el diseño real de la placa.',
      'remote.title': '12 animaciones, desde tu celular',
      'remote.lead': 'Cada badge arma su propia red WiFi. Te conectás desde el celular y elegís la animación, los colores y el brillo.',
      'remote.mode': 'El botón MODE de atrás también cambia de animación.',
      'remote.try': 'Probalo: tocá una animación en el teléfono. Las luces corren con el mismo código que el badge.',
      'facts.title': 'Qué trae',
      'facts.leds': 'luces LED',
      'facts.anims': 'animaciones',
      'facts.wifi': 'Lo manejás desde el celular',
      'facts.usb': 'Batería recargable',
      'order.title': 'Armá tu pedido',
      'steps.label': 'Pasos',
      'steps.1': 'Cantidad',
      'steps.2': 'Aporte',
      'nav.next': 'Seguir',
      'nav.back': 'Volver',
      's1.title': '¿Cuántos querés?',
      's1.note': 'Cada badge trae su lanyard y se puede llevar prendido a la ropa o colgado: no hace falta elegir.',
      'qty.label': 'Cantidad de badges',
      'qty.less': 'Uno menos',
      'qty.more': 'Uno más',
      'qty.each': '{unit} cada uno',
      'qty.save': 'Ahorrás {save}',
      'qty.total': 'Total {total}',
      'ladder.title': 'Cuantos más llevás, menos sale cada uno',
      'ladder.qty': 'Badges',
      'ladder.each': 'USD c/u',
      'tier.donate.title': 'Solo quiero donar, sin badge',
      'tier.donate.text': 'Vos elegís el monto.',
      's1.amount.presets': 'Montos sugeridos',
      's1.amount.label': 'Monto en USD',
      'price.draft': 'provisorio',
      's2.title': 'Hacé tu aporte',
      'sum.title': 'Tu pedido',
      'sum.badge': 'Un badge',
      'sum.badges': '{n} badges, {unit} cada uno',
      'sum.donation': 'Donación',
      'sum.total': 'Total',
      'sum.ars': 'Aprox. {ars}',
      'sum.arsPending': 'Monto en pesos: a confirmar',
      'sum.ref': 'Código',
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
      's2.send': 'Mandar mi pedido por mail',
      's2.sendNote': 'Después de pagar, mandanos este mail. Así sabemos qué badge es tuyo.',
      'sent.title': '¿No se abrió tu mail?',
      'sent.text': 'Copiá este texto y mandalo a {email}.',
      'err.qty': 'Elegí cuántos badges querés.',
      'err.qtyMax': 'Por ahora no tenemos tantos. Probá con menos o escribinos.',
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
      'notes.title': 'Para que\u00a0sepas',
      'notes.1': 'Las placas ya se están fabricando.',
      'notes.2': 'Todavía no tenemos fecha de entrega. Te avisamos por mail cuándo y cómo lo recibís.',
      'notes.3': 'La carcasa todavía está en pruebas: ya imprimimos las primeras en 3D.',
      'notes.4': '¿Dudas? Escribinos a'
    },
    en: {
      'meta.title': 'Badge — Joya',
      'draft.banner': 'Draft: payment methods are not confirmed yet.',
      'hero.title': 'Wear the *light* of _Joya_',
      'hero.lead': 'A badge with 13 LED lights and 12 animations you control from your phone. The boards are already being made. Your contribution covers the boards, the batteries and the shells.',
      'hero.cta': 'I want mine',
      'hero.caption': '3D model of the finished badge. The shell is still being tested.',
      'alt.badge': '3D model of the finished badge: the board with its 13 lights on in a black shell, with a clip on top and a lanyard',
      'viewer.flip': 'Flip it',
      'viewer.open': 'See the layers',
      'viewer.close': 'Put it back together',
      'viewer.hint': 'Drag to turn it.',
      'layer.clamp': 'Lanyard clip',
      'layer.leds': 'LEDs and capacitors',
      'layer.fmask': 'Black mask',
      'layer.fcu': 'Front copper',
      'layer.core': 'Fibreglass, 1 mm',
      'layer.bcu': 'Back copper',
      'layer.bmask': 'Mask and labels',
      'layer.parts': 'WiFi, charger, USB-C',
      'layer.battery': 'Battery',
      'layer.shell': '3D printed shell',
      'gallery.title': 'The board\u00a0today',
      'gallery.lead': 'Five boards are built and working. These are real photos.',
      'gallery.boards': 'The five boards, still in their panels',
      'gallery.on': 'Switched on, with its battery and USB-C\u00a0cable',
      'gallery.dark': 'Three of them lit up in the dark',
      'gallery.panel': 'One board in its panel, with the battery beside it',
      'gallery.stand': 'Out of its panel, with its antenna and battery',
      'gallery.flash': 'Loading the light program onto it',
      'gallery.rig': 'One on the programming clip, the rest waiting their turn',
      'alt.photoBoards': 'Five badge boards on a desk, still in their factory panels',
      'alt.photoOn': 'The badge board from the back, switched on, with the battery and USB-C cable plugged in',
      'alt.photoDark': 'Three badge boards switched on in a dark room, their lights green, blue and purple',
      'alt.photoPanel': 'The badge board with its 13 LEDs, standing in its panel, with a battery in front',
      'alt.photoStand': 'The badge board on its own, standing on the table, with the antenna and battery connected',
      'alt.photoFlash': 'The badge board with a programming adapter clipped on',
      'alt.photoRig': 'One board on the red programming clip next to a laptop, and more boards waiting in their panels',
      'print.title': 'The shell, on the 3D printer',
      'print.lead': 'The first test shells are already off the printer. We print them layer by layer and adjust them after every test.',
      'print.timelapse': 'The first print, seen by the printer\'s camera',
      'print.close': 'Printing a shell, with its supports',
      'print.printer': 'The printer, halfway through',
      'print.ready': 'Ready to print two shells and the clip',
      'print.slicer': 'The parts laid out: almost two hours of printing',
      'alt.printSlicer': 'The print software showing two shells and a clip on the printer\'s bed',
      'alt.printReady': '3D printer whose screen shows the badge parts ready to print',
      'video.title': 'What you get',
      'video.lead': 'Every badge comes with the assembled board, its battery, a 3D printed shell and a lanyard. The video shows everything on the board.',
      'video.label': 'Video: what is on the badge board',
      'video.note': '3D animation made from the real board design.',
      'remote.title': '12 animations, from your phone',
      'remote.lead': 'Every badge makes its own WiFi network. Join it from your phone and pick the animation, the colours and the brightness.',
      'remote.mode': 'The MODE button on the back changes the animation too.',
      'remote.try': 'Try it: tap an animation on the phone. The lights run on the same code as the badge.',
      'facts.title': 'What it has',
      'facts.leds': 'LED lights',
      'facts.anims': 'animations',
      'facts.wifi': 'Controlled from your phone',
      'facts.usb': 'Rechargeable battery',
      'order.title': 'Build your order',
      'steps.label': 'Steps',
      'steps.1': 'How many',
      'steps.2': 'Contribution',
      'nav.next': 'Continue',
      'nav.back': 'Back',
      's1.title': 'How many do you want?',
      's1.note': 'Every badge comes with a lanyard and can be pinned to your clothes or hung around your neck: no need to choose.',
      'qty.label': 'Number of badges',
      'qty.less': 'One fewer',
      'qty.more': 'One more',
      'qty.each': '{unit} each',
      'qty.save': 'You save {save}',
      'qty.total': 'Total {total}',
      'ladder.title': 'The more you get, the less each one costs',
      'ladder.qty': 'Badges',
      'ladder.each': 'USD each',
      'tier.donate.title': 'I just want to donate, no badge',
      'tier.donate.text': 'You choose the amount.',
      's1.amount.presets': 'Suggested amounts',
      's1.amount.label': 'Amount in USD',
      'price.draft': 'provisional',
      's2.title': 'Make your contribution',
      'sum.title': 'Your order',
      'sum.badge': 'One badge',
      'sum.badges': '{n} badges, {unit} each',
      'sum.donation': 'Donation',
      'sum.total': 'Total',
      'sum.ars': 'About {ars}',
      'sum.arsPending': 'Amount in pesos: to be confirmed',
      'sum.ref': 'Code',
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
      's2.send': 'Send my order by email',
      's2.sendNote': 'After paying, send us this email. That is how we know which badge is yours.',
      'sent.title': 'Did your email app not open?',
      'sent.text': 'Copy this text and send it to {email}.',
      'err.qty': 'Choose how many badges you want.',
      'err.qtyMax': 'We do not have that many right now. Try fewer, or write to us.',
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
      'notes.1': 'The boards are already being made.',
      'notes.2': 'We do not have a delivery date yet. We will email you when and how you get it.',
      'notes.3': 'The shell is still being tested: the first ones are already 3D printed.',
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

  /* The most badges one order can hold: what is left of the run, in whole badges, never under zero.
     The page never says it. */
  function maxBadges(config) {
    var total = Math.max(0, Math.floor(Number(config.badgesTotal) || 0));
    var claimed = Math.min(total, Math.max(0, Math.floor(Number(config.badgesClaimed) || 0)));
    return total - claimed;
  }

  /* What each badge costs in an order of `qty`: the first price for one, `priceStep` less on every
     badge for each one more, never under the floor. */
  function unitPrice(qty, config) {
    var more = Math.max(0, Math.floor(Number(qty) || 0) - 1);
    return Math.max(config.priceFloor, config.priceFirst - config.priceStep * more);
  }

  /* The smallest order that gets the floor price: the last column of the price table. */
  function floorQty(config) {
    return 1 + Math.ceil((config.priceFirst - config.priceFloor) / config.priceStep);
  }

  /* "3" is a count of badges; anything else, "0" and "2.5" included, is NaN. */
  function parseQty(raw) {
    var text = String(raw === undefined || raw === null ? '' : raw).trim();
    if (!/^\d{1,4}$/.test(text) || Number(text) < 1) return NaN;
    return Number(text);
  }

  /* "50", "50.5" and "50,5" are amounts; anything else is NaN. */
  function parseAmount(raw) {
    var text = String(raw === undefined || raw === null ? '' : raw).trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return NaN;
    return Number(text);
  }

  function orderTotal(order, config) {
    if (order.tier === 'badges') {
      var qty = parseQty(order.qty);
      return isNaN(qty) ? 0 : qty * unitPrice(qty, config);
    }
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
    if (step === 1) {
      if (order.tier === 'badges') {
        var qty = parseQty(order.qty);
        if (isNaN(qty)) errors.qty = 'err.qty';
        else if (qty > maxBadges(config)) errors.qty = 'err.qtyMax';
      } else if (order.tier === 'donate') {
        var amount = parseAmount(order.amount);
        if (isNaN(amount) || amount < config.donationMin || amount > config.donationMax) errors.amount = 'err.amount';
      } else {
        errors.qty = 'err.qty';
      }
    }
    if (step === 2) {
      if (!String(order.name || '').trim()) errors.name = 'err.name';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(order.email || '').trim())) errors.email = 'err.email';
      if (!methodReady(config, order.method)) errors.method = 'err.method';
    }
    return errors;
  }

  /* What the order holds, one sentence per line, for the summary and the email. */
  function orderItems(order, config, lang) {
    var qty = parseQty(order.qty);
    if (order.tier === 'badges' && qty === 1) return [t(lang, 'sum.badge')];
    if (order.tier === 'badges' && qty > 1) return [t(lang, 'sum.badges', { n: qty, unit: formatUsd(unitPrice(qty, config)) })];
    if (order.tier === 'donate') return [t(lang, 'sum.donation')];
    return [];
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
    var lines = orderItems(order, config, lang);
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
    CONFIG: CONFIG, WORDS: WORDS, METHOD_IDS: METHOD_IDS,
    t: t, markedParts: markedParts, pickLang: pickLang, safeUrl: safeUrl, methodReady: methodReady, isDraft: isDraft,
    maxBadges: maxBadges, unitPrice: unitPrice, floorQty: floorQty, parseQty: parseQty,
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
    order: { tier: 'badges', qty: '1', amount: '', name: '', email: '', method: '' }
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
    orderItems(state.order, CONFIG, state.lang).forEach(function (item) {
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

  /* The price table under the picker: one column per count until the floor price, the last one "7+". */
  function renderLadder() {
    var last = floorQty(CONFIG);
    all('[data-ladder]').forEach(function (table) {
      var head = el('tr');
      var body = el('tr');
      head.appendChild(el('th', '', say('ladder.qty')));
      body.appendChild(el('th', '', say('ladder.each')));
      for (var n = 1; n <= last; n++) {
        var count = el('th', '', n === last ? n + '+' : String(n));
        count.scope = 'col';
        count.setAttribute('data-ladder-qty', n);
        head.appendChild(count);
        var price = el('td', '', String(unitPrice(n, CONFIG)));
        price.setAttribute('data-ladder-qty', n);
        body.appendChild(price);
      }
      head.firstChild.scope = body.firstChild.scope = 'row';
      var caption = el('caption', '', say('ladder.title'));
      table.replaceChildren(caption, el('thead'), el('tbody'));
      table.tHead.appendChild(head);
      table.tBodies[0].appendChild(body);
    });
  }

  /* The picker's buttons, its price lines and the column of the table that applies now. */
  function renderQty() {
    var qty = parseQty(state.order.qty);
    var max = maxBadges(CONFIG);
    all('[data-qty-step]').forEach(function (button) {
      var down = Number(button.getAttribute('data-qty-step')) < 0;
      // aria-disabled, not disabled: the button keeps its focus at the end of the range
      button.setAttribute('aria-disabled', String(down ? !(qty > 1) : !(isNaN(qty) || qty < max)));
    });
    all('[data-qty-price]').forEach(function (box) { box.hidden = isNaN(qty); });
    var column = isNaN(qty) ? 0 : Math.min(qty, floorQty(CONFIG));
    all('[data-ladder-qty]').forEach(function (cell) {
      cell.classList.toggle('is-now', Number(cell.getAttribute('data-ladder-qty')) === column);
    });
    if (isNaN(qty)) return;
    var unit = unitPrice(qty, CONFIG);
    var save = qty * (CONFIG.priceFirst - unit);
    all('[data-qty-each]').forEach(function (node) { node.textContent = say('qty.each', { unit: priceLabel(unit) }); });
    all('[data-qty-save]').forEach(function (node) {
      node.hidden = !save;
      node.textContent = save ? say('qty.save', { save: formatUsd(save) }) : '';
    });
    all('[data-qty-total]').forEach(function (node) { node.textContent = say('qty.total', { total: priceLabel(qty * unit) }); });
  }

  /* Steps the picker by one, inside 1 and the badges left. */
  function stepQty(by) {
    var input = form.querySelector('input[name="qty"]');
    var qty = parseQty(input.value);
    var next = Math.min(maxBadges(CONFIG), Math.max(1, (isNaN(qty) ? 0 : qty) + by));
    input.value = String(next);
    readField(input);
  }

  /* The print videos play, muted and looping, only while they are on screen. With reduced motion they
     keep their still and get the player's controls, so they play only when tapped. */
  function watchLoops() {
    var loops = all('video[data-loop]');
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!loops.length || !('IntersectionObserver' in window)) return;
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (!entry.isIntersecting || calm.matches) { video.pause(); return; }
        var playing = video.play();
        if (playing) playing.catch(function () { video.controls = true; }); // autoplay refused: let a tap start it
      });
    }, { threshold: 0.35 });
    loops.forEach(function (video) {
      video.muted = true;
      video.controls = calm.matches;
      seen.observe(video);
    });
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
    renderQty();
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
    all('video[data-video-' + lang + ']').forEach(function (video) {
      var src = video.getAttribute('data-video-' + lang);
      if (video.getAttribute('src') === src) return;
      video.setAttribute('poster', video.getAttribute('data-poster-' + lang));
      video.setAttribute('src', src);
      video.load();
    });
    all('[data-lang]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-lang') === lang));
    });
    if (!sentBox.hidden) showSent();
    renderLadder();
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
    if (name === 'donate') {
      // the box under the picker: donate only, or back to badges
      state.order.tier = input.checked ? 'donate' : 'badges';
      delete state.errors.qty;
      delete state.errors.amount;
      render();
      return;
    }
    if (!(name in state.order)) return;
    if (input.type === 'radio' && !input.checked) return;
    state.order[name] = input.value;
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
    var target = event.target.closest('[data-go], [data-preset], [data-copy], [data-lang], [data-qty-step]');
    if (!target) return;
    if (target.hasAttribute('data-qty-step')) {
      stepQty(Number(target.getAttribute('data-qty-step')));
    } else if (target.hasAttribute('data-lang')) {
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
    }
  });

  applyLang(pickLang(new URLSearchParams(window.location.search).get('lang'), storedLang()));
  watchLoops();
})();
