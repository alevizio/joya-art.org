/* ==========================================================================
   joya-art.org: the badge fundraiser page (/badge)

   1. Settings     prices, the peso rate and the payment handles: the only part to edit
   2. Words        every sentence of the page, in Spanish and English
   3. Rules        totals, validation, links, the order email (no page needed: tested in
                   badge.test.js with `node --test assets/js/badge.test.js`)
   4. Page         language, the two steps, the badge count, summary, payment panel, send,
                   the print videos

   The page has no server. An order is the email the visitor sends from the last step; once
   CONFIG.orderSheetUrl is set, the same order is also saved to the buyers' Google Sheet.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. settings ---------- */
  var CONFIG = {
    pricesConfirmed: true,           // false marks every price as "provisional"
    price: 25,                       // USD for each badge, however many are in the order
    arsPerUsd: null,                 // pesos per dollar, e.g. 1450. null shows "to be confirmed"
    orderEmail: 'joyacamp85@gmail.com',
    /* The Google Sheet in joyacamp85@gmail.com that keeps every order, to email everyone when the badges are
       ready: the web app address its script gives (https://script.google.com/macros/s/.../exec). Empty saves
       nothing; the order email still goes out. The script is in ~/Documents/joya-badge-fundraiser/sheet. */
    orderSheetUrl: '',
    badgesTotal: 100,                // the boards that were ordered: the most that can be asked for, and the end of the bar in the hero
    /* Everyone who paid, newest first, added by hand once the payment shows up. It fills "Quienes lo hacen
       posible" and the bar in the hero (the badges here are the ones claimed). name: only if the order email
       says "Mostrar mi nombre en la lista: sí", else ''; badges: how many;
       via: mercadopago, crypto, venmo or wise; date: 'YYYY-MM-DD'. For example:
       { name: 'Ana', badges: 2, via: 'mercadopago', date: '2026-11-21' } */
    supporters: [],
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
      'progress.text': '{claimed} de {total} badges pedidos',
      'hero.cta': 'Quiero el mío',
      'hero.caption': 'Modelo 3D del badge terminado. La carcasa todavía está en pruebas.',
      'alt.badge': 'Modelo 3D del badge terminado: la placa con sus 13 luces prendidas en una carcasa negra, con un clip arriba y un lanyard',
      'viewer.flip': 'Dar vuelta',
      'viewer.open': 'Ver las capas',
      'viewer.close': 'Armarlo de nuevo',
      'viewer.coverOn': 'Con tapa',
      'viewer.coverOff': 'Sin tapa',
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
      'gallery.lead': 'Ya hay 5 placas armadas y andando, y las primeras carcasas de prueba salieron de la impresora 3D. Estas fotos son de verdad.',
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
      'order.title': 'Armá tu\u00a0pedido',
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
      'qty.total': 'Total {total}',
      'qty.why': 'Ver en qué se usan tus USD 25',
      'price.draft': 'provisorio',
      's2.title': 'Hacé tu aporte',
      'sum.title': 'Tu pedido',
      'sum.badge': 'Un badge',
      'sum.badges': '{n} badges, {unit} cada uno',
      'sum.total': 'Total',
      'sum.ars': 'Aprox. {ars}',
      'sum.arsPending': 'Monto en pesos: a confirmar',
      'sum.ref': 'Código',
      'f.name': 'Nombre',
      'f.email': 'Email',
      'f.public': 'Mostrar mi nombre en la lista',
      'f.public.text': 'Si no, figurás como Anónimo en «Quienes lo hacen posible».',
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
      'err.name': 'Decinos tu nombre.',
      'err.email': 'Revisá el email.',
      'err.method': 'Elegí cómo querés aportar.',
      'mail.subject': 'Pedido Joya Badge {ref}',
      'mail.name': 'Nombre: {name}',
      'mail.email': 'Email: {email}',
      'mail.method': 'Medio de pago: {method}',
      'mail.total': 'Total: {total}',
      'mail.ref': 'Código: {ref}',
      'mail.public': 'Mostrar mi nombre en la lista: {answer}',
      'mail.yes': 'sí',
      'mail.no': 'no',
      'costs.title': 'En qué se usan tus USD\u00a025',
      'costs.lead': 'Esto cuesta hacer cada badge, de la placa al lanyard. Vos pagás USD\u00a025 y la diferencia la pone Joya: lo que falta para llegar al precio, lo que suba algún costo y las comisiones de los medios de pago.',
      'costs.caption': 'Lo que cuesta cada badge, en dólares',
      'costs.what': 'Por badge',
      'costs.usd': 'USD',
      'costs.board': 'Placa armada',
      'costs.board.detail': 'Fabricación, componentes, envío e impuestos',
      'costs.battery': 'Batería',
      'costs.battery.detail': 'Recargable, con protección y sensor de temperatura',
      'costs.antenna': 'Antena WiFi',
      'costs.antenna.detail': 'Para manejarlo desde el celular',
      'costs.shell': 'Carcasa, clip y lanyard',
      'costs.shell.detail': 'Filamento para imprimirlos en 3D y el cordón',
      'costs.joya': 'Lo que pone Joya',
      'costs.joya.detail': 'Según los presupuestos finales, para que cada badge salga USD\u00a025',
      'costs.joya.range': '−1,75 a\u00a0−5,00',
      'costs.paid': 'Pagado',
      'costs.estimated': 'Estimado',
      'costs.total': 'Tu aporte por badge',
      'costs.note': 'Pagado: ya lo pagamos. Estimado: cotizado o calculado, lo actualizamos cuando lo paguemos.',
      'people.title': 'Quienes lo hacen\u00a0posible',
      'people.empty': 'Todavía no hay aportes confirmados. El primero puede ser el tuyo.',
      'people.anon': 'Anónimo',
      'people.one': '1 badge',
      'people.many': '{n} badges',
      'people.note': 'Sumamos cada aporte a mano cuando se confirma el pago. Quien no eligió mostrar su nombre figura como Anónimo.',
      'notes.title': 'Para que\u00a0sepas',
      'notes.1': 'Las placas ya se están fabricando.',
      'notes.2': 'Todavía no tenemos fecha de entrega. Te avisamos por mail cuándo y cómo lo recibís.',
      'notes.3': 'La carcasa todavía está en pruebas: ya imprimimos las primeras en 3D.',
      'notes.4': '¿Dudas? Escribinos al',
      'notes.4mail': 'mail',
      'notes.4or': 'o a nuestro',
      'notes.4instagram': 'Instagram',
      'privacy.title': 'Datos y privacidad',
      'privacy.1': 'La página no usa cookies ni estadísticas de visitas. Solo recuerda en tu navegador el idioma que elegiste.',
      'privacy.2': 'Cuando mandás tu pedido, guardamos tu nombre, tu mail, cuántos badges pediste y cómo pagás en una planilla de Joya en Google. Lo usamos solo para avisarte cuándo y cómo recibís tu badge.',
      'privacy.3': 'El pago lo procesa el medio que elijas, con sus propias reglas. Un pago en cripto queda a la vista de todos en la red.',
      'privacy.4': 'Tu nombre aparece en «Quienes lo hacen posible» solo si lo elegís. Si no, figurás como Anónimo.',
      'privacy.5': 'La página está en GitHub Pages, que registra las visitas por seguridad.',
      'privacy.6': '¿Querés que borremos tus datos? Escribinos y los borramos.'
    },
    en: {
      'meta.title': 'Badge — Joya',
      'draft.banner': 'Draft: payment methods are not confirmed yet.',
      'hero.title': 'Wear the *light* of _Joya_',
      'hero.lead': 'A badge with 13 LED lights and 12 animations you control from your phone. The boards are already being made. Your contribution covers the boards, the batteries and the shells.',
      'progress.text': '{claimed} of {total} badges claimed',
      'hero.cta': 'I want mine',
      'hero.caption': '3D model of the finished badge. The shell is still being tested.',
      'alt.badge': '3D model of the finished badge: the board with its 13 lights on in a black shell, with a clip on top and a lanyard',
      'viewer.flip': 'Flip it',
      'viewer.open': 'See the layers',
      'viewer.close': 'Put it back together',
      'viewer.coverOn': 'With cover',
      'viewer.coverOff': 'No cover',
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
      'gallery.lead': 'Five boards are built and working, and the first test shells came off the 3D printer. These are real photos.',
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
      'order.title': 'Build your\u00a0order',
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
      'qty.total': 'Total {total}',
      'qty.why': 'See what your USD\u00a025 pays for',
      'price.draft': 'provisional',
      's2.title': 'Make your contribution',
      'sum.title': 'Your order',
      'sum.badge': 'One badge',
      'sum.badges': '{n} badges, {unit} each',
      'sum.total': 'Total',
      'sum.ars': 'About {ars}',
      'sum.arsPending': 'Amount in pesos: to be confirmed',
      'sum.ref': 'Code',
      'f.name': 'Name',
      'f.email': 'Email',
      'f.public': 'Show my name on the list',
      'f.public.text': 'If not, you show up as Anonymous under “The people making it happen”.',
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
      'err.name': 'Tell us your name.',
      'err.email': 'Check the email address.',
      'err.method': 'Choose how you want to contribute.',
      'mail.subject': 'Joya Badge order {ref}',
      'mail.name': 'Name: {name}',
      'mail.email': 'Email: {email}',
      'mail.method': 'Payment method: {method}',
      'mail.total': 'Total: {total}',
      'mail.ref': 'Code: {ref}',
      'mail.public': 'Show my name on the list: {answer}',
      'mail.yes': 'yes',
      'mail.no': 'no',
      'costs.title': 'What your USD\u00a025 pays for',
      'costs.lead': 'This is what each badge costs to make, from the board to the lanyard. You pay USD\u00a025 and Joya covers the difference: what is missing to reach the price, any cost that goes up, and the payment fees.',
      'costs.caption': 'What each badge costs, in US dollars',
      'costs.what': 'Per badge',
      'costs.usd': 'USD',
      'costs.board': 'Assembled board',
      'costs.board.detail': 'Manufacturing, parts, shipping and taxes',
      'costs.battery': 'Battery',
      'costs.battery.detail': 'Rechargeable, with protection and a temperature sensor',
      'costs.antenna': 'WiFi antenna',
      'costs.antenna.detail': 'So you can control it from your phone',
      'costs.shell': 'Shell, clip and lanyard',
      'costs.shell.detail': 'Filament to 3D print them, and the cord',
      'costs.joya': 'What Joya puts in',
      'costs.joya.detail': 'Depending on the final quotes, so each badge comes to USD\u00a025',
      'costs.joya.range': '−1.75 to\u00a0−5.00',
      'costs.paid': 'Paid',
      'costs.estimated': 'Estimated',
      'costs.total': 'Your contribution per badge',
      'costs.note': 'Paid: we already paid it. Estimated: quoted or worked out, updated once we pay it.',
      'people.title': 'The people making it\u00a0happen',
      'people.empty': 'No contributions confirmed yet. The first one could be yours.',
      'people.anon': 'Anonymous',
      'people.one': '1 badge',
      'people.many': '{n} badges',
      'people.note': 'We add each contribution by hand once the payment is confirmed. Anyone who did not choose to show their name shows up as Anonymous.',
      'notes.title': 'Good to know',
      'notes.1': 'The boards are already being made.',
      'notes.2': 'We do not have a delivery date yet. We will email you when and how you get it.',
      'notes.3': 'The shell is still being tested: the first ones are already 3D printed.',
      'notes.4': 'Questions? Write to us by',
      'notes.4mail': 'email',
      'notes.4or': 'or on our',
      'notes.4instagram': 'Instagram',
      'privacy.title': 'Data and privacy',
      'privacy.1': 'The page uses no cookies and no visitor statistics. It only remembers, in your browser, the language you picked.',
      'privacy.2': 'When you send your order, we keep your name, your email, how many badges you ordered and how you pay in a Joya Google Sheet. We use it only to tell you when and how you get your badge.',
      'privacy.3': 'Your payment is handled by the service you pick, under its own rules. A crypto payment is visible to anyone on the network.',
      'privacy.4': 'Your name shows up under “The people making it happen” only if you choose so. If not, you show up as Anonymous.',
      'privacy.5': 'The page is hosted on GitHub Pages, which logs visits for security.',
      'privacy.6': 'Want us to delete your data? Write to us and we will.'
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

  /* The language a visitor sees first: ?lang= in the address, then the one they picked before, then where
     they are. The site has no server to read an IP address, so "where" is the device's time zone, which
     needs no outside service: Argentina gets Spanish and the United States English. Anywhere else the
     browser's own language decides, and Spanish when nothing says. */
  var US_ZONE = /^(America\/(New_York|Chicago|Denver|Phoenix|Los_Angeles|Anchorage|Juneau|Sitka|Yakutat|Nome|Metlakatla|Adak|Boise|Detroit|Menominee|Indiana\/|Kentucky\/|North_Dakota\/)|Pacific\/Honolulu$|US\/)/;
  function pickLang(fromQuery, fromStore, timeZone, browserLangs) {
    if (LANGS.indexOf(fromQuery) !== -1) return fromQuery;
    if (LANGS.indexOf(fromStore) !== -1) return fromStore;
    var zone = String(timeZone || '');
    if (/^America\/(Argentina\/|Buenos_Aires$)/.test(zone)) return 'es';
    if (US_ZONE.test(zone)) return 'en';
    var first = String((browserLangs || [])[0] || '').toLowerCase();
    return first && first.indexOf('es') !== 0 ? 'en' : 'es';
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

  /* How far the run is, for the bar in the hero: whole badges, never under zero or over the total. */
  function progress(config) {
    var total = wholeCount(config.badgesTotal);
    var claimed = (config.supporters || []).reduce(function (sum, person) { return sum + wholeCount(person.badges); }, 0);
    return { claimed: Math.min(total, claimed), total: total };
  }

  /* A count from the settings as a whole number, never under zero: 12.9 is 12, 'x' and -3 are 0. */
  function wholeCount(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  /* "Quienes lo hacen posible", one row per supporter as the settings list them: the name or Anonymous, what
     they got, how they paid and the day, and what they paid. */
  function supporterRows(config, lang) {
    return (config.supporters || []).map(function (person) {
      var badges = wholeCount(person.badges);
      var what = badges === 1 ? t(lang, 'people.one') : t(lang, 'people.many', { n: badges });
      var line = [what];
      if (METHOD_IDS.indexOf(person.via) !== -1) line.push(t(lang, 'pay.' + person.via));
      var day = new Date(String(person.date) + 'T12:00:00');
      if (!isNaN(day)) line.push(day.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-AR', { day: 'numeric', month: 'short' }));
      return {
        name: String(person.name || '').trim() || t(lang, 'people.anon'),
        line: line.join(' · '),
        amount: formatUsd(badges * config.price)
      };
    });
  }

  /* The most badges one order can hold: what is left of the run. */
  function maxBadges(config) {
    var run = progress(config);
    return run.total - run.claimed;
  }

  /* "3" is a count of badges; anything else, "0" and "2.5" included, is NaN. */
  function parseQty(raw) {
    var text = String(raw === undefined || raw === null ? '' : raw).trim();
    if (!/^\d{1,4}$/.test(text) || Number(text) < 1) return NaN;
    return Number(text);
  }

  function orderTotal(order, config) {
    var qty = parseQty(order.qty);
    return isNaN(qty) ? 0 : qty * config.price;
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
      var qty = parseQty(order.qty);
      if (isNaN(qty)) errors.qty = 'err.qty';
      else if (qty > maxBadges(config)) errors.qty = 'err.qtyMax';
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
    if (qty === 1) return [t(lang, 'sum.badge')];
    if (qty > 1) return [t(lang, 'sum.badges', { n: qty, unit: formatUsd(config.price) })];
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

  /* The row the buyers' Sheet keeps for an order; the Sheet's script checks it again before it saves it. */
  function orderRecord(order, config, lang, ref) {
    return {
      ref: ref,
      name: String(order.name || '').trim(),
      email: String(order.email || '').trim(),
      qty: parseQty(order.qty),
      total: orderTotal(order, config),
      method: order.method,
      public: Boolean(order.public),
      lang: lang
    };
  }

  /* Only a Google Apps Script web app gets the orders. */
  function sheetUrl(config) {
    var url = safeUrl(config.orderSheetUrl);
    return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url) ? url : '';
  }

  function orderText(order, config, lang, ref) {
    var lines = orderItems(order, config, lang);
    lines.push(t(lang, 'mail.total', { total: formatUsd(orderTotal(order, config)) }));
    lines.push(t(lang, 'mail.method', { method: t(lang, 'pay.' + order.method) }));
    lines.push(t(lang, 'mail.ref', { ref: ref }));
    lines.push(t(lang, 'mail.name', { name: String(order.name).trim() }));
    lines.push(t(lang, 'mail.email', { email: String(order.email).trim() }));
    lines.push(t(lang, 'mail.public', { answer: t(lang, order.public ? 'mail.yes' : 'mail.no') }));
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
    progress: progress, supporterRows: supporterRows, maxBadges: maxBadges, parseQty: parseQty,
    orderTotal: orderTotal, formatUsd: formatUsd, formatArs: formatArs,
    validateStep: validateStep, orderItems: orderItems, venmoUrl: venmoUrl,
    newReference: newReference, orderRecord: orderRecord, sheetUrl: sheetUrl, orderText: orderText, mailtoUrl: mailtoUrl
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
    order: { qty: '1', name: '', email: '', method: '', public: false }
  };
  var sentBox = document.querySelector('[data-sent]');
  var panel = document.querySelector('[data-panel]');
  var summary = document.querySelector('[data-summary]');

  function say(key, vars) { return t(state.lang, key, vars); }

  function storedLang() {
    try { return window.localStorage.getItem(LANG_STORE); } catch (e) { return null; }
  }
  function storeLang(lang) {
    try { window.localStorage.setItem(LANG_STORE, lang); } catch (e) { /* private window: the choice lasts this visit */ }
  }
  function timeZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ''; }
  }
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

  /* The picker's buttons and its price lines. */
  function renderQty() {
    var qty = parseQty(state.order.qty);
    var max = maxBadges(CONFIG);
    all('[data-qty-step]').forEach(function (button) {
      var down = Number(button.getAttribute('data-qty-step')) < 0;
      // aria-disabled, not disabled: the button keeps its focus at the end of the range
      button.setAttribute('aria-disabled', String(down ? !(qty > 1) : !(isNaN(qty) || qty < max)));
    });
    all('[data-qty-price]').forEach(function (box) { box.hidden = isNaN(qty); });
    if (isNaN(qty)) return;
    all('[data-qty-each]').forEach(function (node) { node.textContent = say('qty.each', { unit: priceLabel(CONFIG.price) }); });
    all('[data-qty-total]').forEach(function (node) { node.textContent = say('qty.total', { total: priceLabel(qty * CONFIG.price) }); });
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
      if (!video.hasAttribute('controls')) video.controls = calm.matches; // the explainer keeps its bar to pause or scrub
      seen.observe(video);
    });
  }

  function renderErrors() {
    all('[data-error]').forEach(function (box) {
      var key = state.errors[box.getAttribute('data-error')];
      box.hidden = !key;
      box.textContent = key ? say(key) : '';
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
    all('[data-method]').forEach(function (label) {
      var ready = methodReady(CONFIG, label.getAttribute('data-method'));
      label.querySelector('input').disabled = !ready;
      label.querySelector('[data-soon]').hidden = ready;
    });
    all('[data-draft]').forEach(function (box) { box.hidden = !isDraft(CONFIG); });
    renderErrors();
    if (state.step === LAST_STEP) { renderSummary(); renderPanel(); }
  }

  /* The badge count in the hero and "Quienes lo hacen posible": they change only with the settings and
     the language, so they are drawn once per language, not on every keystroke. */
  function renderRun() {
    var run = progress(CONFIG);
    all('[data-progress]').forEach(function (bar) { bar.max = run.total; bar.value = run.claimed; });
    all('[data-progress-text]').forEach(function (node) { node.textContent = say('progress.text', run); });
    var people = supporterRows(CONFIG, state.lang);
    all('[data-people]').forEach(function (list) {
      list.hidden = !people.length;
      list.replaceChildren.apply(list, people.map(function (person) {
        var row = el('li', 'bdg-people__row');
        var who = el('p', 'bdg-people__who');
        who.appendChild(el('span', 'bdg-people__name', person.name));
        who.appendChild(el('span', 'bdg-people__line', person.line));
        row.appendChild(who);
        row.appendChild(el('p', 'bdg-people__amount', person.amount));
        return row;
      }));
    });
    all('[data-people-empty]').forEach(function (node) { node.hidden = people.length > 0; });
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
      var playing = !video.paused;
      video.setAttribute('poster', video.getAttribute('data-poster-' + lang));
      video.setAttribute('src', src);
      video.load();
      if (playing) video.play().catch(function () { /* the next time it scrolls into view starts it */ });
    });
    all('[data-lang]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-lang') === lang));
    });
    if (!sentBox.hidden) showSent();
    renderRun();
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
    if (name === 'public') { state.order.public = input.checked; return; }
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
    saveOrder();
    showSent();
    window.location.href = mailtoUrl(state.order, CONFIG, state.lang, state.ref);
  });

  /* The order goes to the buyers' Sheet before the email opens. text/plain and no-cors keep it a simple
     request Apps Script accepts; keepalive lets it finish even if the mail app takes over the page. The
     answer cannot be read, so the email stays the buyer's proof. */
  function saveOrder() {
    var url = sheetUrl(CONFIG);
    if (!url || !window.fetch) return;
    fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(orderRecord(state.order, CONFIG, state.lang, state.ref))
    }).catch(function () { /* offline or blocked: the order email still holds everything */ });
  }

  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-go], [data-copy], [data-lang], [data-qty-step]');
    if (!target) return;
    if (target.hasAttribute('data-lang')) {
      storeLang(target.getAttribute('data-lang'));
      applyLang(target.getAttribute('data-lang'));
    } else if (target.hasAttribute('data-qty-step')) {
      stepQty(Number(target.getAttribute('data-qty-step')));
    } else if (target.hasAttribute('data-copy')) {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(target.getAttribute('data-copy')).then(function () {
        target.textContent = say('copied');
      }, function () { /* no clipboard permission: the text stays on screen to select by hand */ });
    } else if (target.getAttribute('data-go') === 'back') {
      goTo(state.step - 1);
    }
  });

  applyLang(pickLang(new URLSearchParams(window.location.search).get('lang'), storedLang(), timeZone(), navigator.languages));
  watchLoops();
})();
