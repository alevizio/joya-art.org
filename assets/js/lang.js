/* joya-art.org: which language a page shows, English or Spanish. Every page holds its words in both
   (elements marked lang="en" and lang="es"); site.css hides the one not chosen. This runs in <head>,
   before the page is drawn, so a visitor never sees the other language first.
   The pick, the same as on /badge: ?lang= in the address, then the visitor's earlier choice, then the
   time zone (Argentina Spanish, the United States English), then the browser's language, else Spanish.
   The ES / EN switch in the header changes it (site.js) and remembers it for every page. */
(function () {
  'use strict';

  var LANGS = ['es', 'en'];
  var STORE = 'joya-lang';
  var US_ZONE = /^(America\/(New_York|Chicago|Denver|Phoenix|Los_Angeles|Anchorage|Juneau|Sitka|Yakutat|Nome|Metlakatla|Adak|Boise|Detroit|Menominee|Indiana\/|Kentucky\/|North_Dakota\/)|Pacific\/Honolulu$|US\/)/;

  function pick(fromQuery, fromStore, timeZone, browserLangs) {
    if (LANGS.indexOf(fromQuery) !== -1) return fromQuery;
    if (LANGS.indexOf(fromStore) !== -1) return fromStore;
    var zone = String(timeZone || '');
    if (/^America\/(Argentina\/|Buenos_Aires$)/.test(zone)) return 'es';
    if (US_ZONE.test(zone)) return 'en';
    var first = String((browserLangs || [])[0] || '').toLowerCase();
    return first && first.indexOf('es') !== 0 ? 'en' : 'es';
  }

  var api = { LANGS: LANGS, STORE: STORE, pick: pick };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }
  window.JoyaLang = api;

  var query = null, stored = null, zone = '';
  try { query = new URLSearchParams(window.location.search).get('lang'); } catch (e) { /* old browser */ }
  try { stored = window.localStorage.getItem(STORE); } catch (e) { /* private window */ }
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* no time zone */ }
  document.documentElement.lang = pick(query, stored, zone, navigator.languages || [navigator.language]);
})();
