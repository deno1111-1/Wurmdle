/* ========================================================================
   KATZEN BILD-LOOKUP
   Für miaudle.html, miaudex.html und cat-image-test.html.

   Pro Rasse (maximal 6 Bilder):
   1. Hauptbild des Wikipedia-Artikels (englisch, dann deutsch) = Vorschaubild.
      Gehört der Artikel zu einer anderen Rasse (z.B. "British Longhair" leitet auf
      "British Shorthair" weiter), wird er übersprungen.
   2. Weitere Fotos aus der Wikimedia-Commons-Kategorie der Rasse (z.B. "Peterbald cats").
      Dort liegen nur Fotos genau dieser Rasse, keine Vorlagenbilder.
   3. Reicht das nicht, sucht die Commons-Suche Fotos, deren Dateiname den Rassennamen enthält.
   Cache im localStorage. Keine Firestore-Anbindung nötig.
   ======================================================================== */

const CAT_IMAGES_VERSION = 'v8-mehrere-bilder'; // Testseite zeigt das an

/* Wikipedia-Titel pro Rasse. Ohne Präfix = englische Wikipedia, "de:" = deutsche.
   Reihenfolge = Priorität. Rassen, die hier fehlen, bekommen Standard-Varianten. */
const CAT_WIKI_TITLES = {
    "Abessinier": ["Abyssinian cat", "de:Abessinier (Katze)", "de:Abessinierkatze"],
    "American Curl": ["American Curl", "de:American Curl"],
    "Balinese": ["Balinese cat", "de:Balinese (Katze)"],
    "Bengalkatze": ["Bengal cat", "de:Bengalkatze"],
    "Britisch Kurzhaar": ["British Shorthair", "de:Britisch Kurzhaar"],
    "Britisch Langhaar": ["British Longhair", "de:Britisch Langhaar"],
    "Burmilla": ["Burmilla", "de:Burmilla"],
    "Burma": ["Burmese cat", "de:Burmakatze"],
    "Kartäuser": ["Chartreux (cat)", "Chartreux", "de:Kartäuser (Katze)", "de:Chartreux"],
    "Cornish Rex": ["Cornish Rex", "de:Cornish Rex"],
    "Devon Rex": ["Devon Rex", "de:Devon Rex"],
    "Deutsch Rex": ["German Rex", "de:Deutsch Rex"],
    "Cymric": ["Cymric cat", "de:Cymric (Katze)"],
    "Manx": ["Manx cat", "de:Manx (Katze)"],
    "Donskoy (Don Sphynx)": ["Donskoy cat", "de:Don Sphynx"],
    "Sphynx": ["Sphynx cat", "de:Sphynx (Katze)"],
    "Peterbald": ["Peterbald", "de:Peterbald"],
    "Europäisch Kurzhaar": ["European Shorthair", "de:Europäisch Kurzhaar"],
    "Exotisch Kurzhaar": ["Exotic Shorthair", "de:Exotic Shorthair"],
    "Japanisch Bobtail": ["Japanese Bobtail", "de:Japanese Bobtail"],
    "Kurilen-Bobtail": ["Kurilian Bobtail", "de:Kurilen-Bobtail"],
    "Korat": ["Korat", "de:Korat"],
    "LaPerm": ["LaPerm", "de:LaPerm"],
    "Ägyptische Mau": ["Egyptian Mau", "de:Ägyptische Mau"],
    "Maine Coon": ["Maine Coon", "de:Maine Coon"],
    "Neva Masquerade": ["Neva Masquerade", "de:Neva Masquerade", "Siberian cat"],
    "Norwegische Waldkatze": ["Norwegian Forest cat", "de:Norwegische Waldkatze"],
    "Ocicat": ["Ocicat", "de:Ocicat"],
    "Orientalisch Langhaar": ["Oriental Longhair", "de:Orientalisch Langhaar"],
    "Orientalisch Kurzhaar": ["Oriental Shorthair", "de:Orientalisch Kurzhaar"],
    "Perser": ["Persian cat", "de:Perserkatze"],
    "Ragdoll": ["Ragdoll", "de:Ragdoll"],
    "Russisch Blau": ["Russian Blue", "de:Russisch Blau"],
    "Heilige Birma": ["Birman", "de:Heilige Birma"],
    "Siam": ["Siamese cat", "de:Siamkatze"],
    "Sibirische Katze": ["Siberian cat", "de:Sibirische Katze"],
    "Singapura": ["Singapura cat", "de:Singapura (Katze)"],
    "Snowshoe": ["Snowshoe cat", "de:Snowshoe"],
    "Sokoke": ["Sokoke", "de:Sokoke"],
    "Somali": ["Somali cat", "de:Somali (Katze)"],
    "Selkirk Rex": ["Selkirk Rex", "de:Selkirk Rex"],
    "Thai": ["Thai cat", "de:Thaikatze"],
    "Türkisch Angora": ["Turkish Angora", "de:Türkisch Angora"],
    "Türkisch Van": ["Turkish Van", "de:Türkisch Van"],
    "Bombay": ["Bombay cat", "de:Bombay (Katze)"],
    "Lykoi": ["Lykoi", "de:Lykoi"],
    "Scottish Fold": ["Scottish Fold", "de:Scottish Fold"],
    "Munchkin": ["Munchkin cat", "de:Munchkin (Katze)"],
    "Twisty Cat (Squitten)": ["Twisty cat", "Squitten", "de:Twisty Cat"],
    "Bambino": ["Bambino cat", "de:Bambino (Katze)"],
    "Dwelf": ["Dwelf cat", "de:Dwelf"],
    "Ukrainische Levkoy": ["Ukrainian Levkoy", "de:Ukrainischer Levkoy"],
    "Elfenkatze": ["Elf cat", "de:Elfenkatze"],
    "Minskin": ["Minskin", "de:Minskin"],
    "Kinkalow": ["Kinkalow", "de:Kinkalow"],
    "Napoleon (Minuet)": ["Napoleon cat", "Minuet cat", "de:Napoleon (Katze)"],
    "Toybob": ["Toybob", "de:Toybob"],
    "Aegean": ["Aegean cat", "de:Ägäische Katze"],
    "American Bobtail": ["American Bobtail", "de:American Bobtail"],
    "American Shorthair": ["American Shorthair", "de:Amerikanisch Kurzhaar"],
    "American Wirehair": ["American Wirehair", "de:American Wirehair"],
    "Aphrodite Giant": ["Aphrodite Giant", "Cyprus cat", "de:Zypernkatze"],
    "Arabian Mau": ["Arabian Mau", "de:Arabian Mau"],
    "Australian Mist": ["Australian Mist", "de:Australian Mist"],
    "Brazilian Shorthair": ["Brazilian Shorthair", "de:Brasilianische Kurzhaarkatze"],
    "Chausie": ["Chausie", "de:Chausie"],
    "Colorpoint Shorthair": ["Colorpoint Shorthair", "de:Colorpoint Shorthair"],
    "Dragon Li": ["Dragon Li", "de:Dragon Li"],
    "Havana Brown": ["Havana Brown", "de:Havana Brown"],
    "Highlander": ["Highlander cat", "de:Highlander (Katze)"],
    "Himalayan": ["Himalayan cat", "de:Himalayan (Katze)", "de:Colourpoint-Perser"],
    "Khao Manee": ["Khao Manee", "de:Khao Manee"],
    "Nebelung": ["Nebelung", "de:Nebelung (Katze)"],
    "Pixiebob": ["Pixie-bob", "de:Pixiebob"],
    "RagaMuffin": ["Ragamuffin cat", "de:Ragamuffin (Katze)"],
    "Savannah": ["Savannah cat", "de:Savannahkatze"],
    "Scottish Straight": ["Scottish Straight"],
    "Serengeti": ["Serengeti cat", "de:Serengeti (Katze)"],
    "Tonkinese": ["Tonkinese cat", "de:Tonkanese"],
    "Toyger": ["Toyger", "de:Toyger"]
};

/* Optional: eigene Suchbegriffe für die Commons-Suche (nur wenn "<Name> cat" nichts Passendes findet) */
const CAT_COMMONS_QUERY = {
    "Scottish Straight": "Scottish Straight cat",
    "Britisch Langhaar": "British Longhair cat"
};

/* Optional: eigener Kategoriename auf Commons (nur wenn der automatische nicht passt) */
const CAT_COMMONS_CATEGORY = {
    "Britisch Langhaar": "British Longhair cats"
};

/* Dateinamen (klein, mit Leerzeichen), die nie angezeigt werden sollen */
const CAT_JUNK_KEYS = new Set([
]);

const CAT_IMG_LS_KEY = 'cat_images_v5';
const CAT_IMG_MAX = 6;                            // maximal so viele Bilder pro Rasse
const CAT_IMG_NEG_TTL = 24 * 60 * 60 * 1000;      // "kein Bild gefunden" wird 1 Tag gemerkt
const CAT_IMG_POS_TTL = 30 * 24 * 60 * 60 * 1000; // gefundene Bilder werden 30 Tage gemerkt
const CAT_FILE_EXT = /\.(jpe?g|png)$/i;
const CAT_FILE_BAD = /(icon|logo|flag|locator|symbol|stub|edit-|disambig|question_book|padlock|commons-logo|wiki_letter|folder|silhouette|pedigree|skeleton|xray|x-ray)|(^|[^a-z])(map|diagram|chart|drawing|illustration|painting)([^a-z]|$)/i;

/* ---------- Wikipedia / Commons ---------- */

async function catApi(host, params, ctx) {
    const base = host === 'commons' ? 'commons.wikimedia.org' : `${host}.wikipedia.org`;
    const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    try {
        const r = await fetch(`https://${base}/w/api.php?${qs}&format=json&origin=*`);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
    } catch (e) {
        if (ctx) ctx.errors++;
        console.warn(`Wikipedia-Abfrage (${host}) fehlgeschlagen:`, e);
        return null;
    }
}

function catFileKey(s) {
    let k = String(s || '');
    try { k = decodeURIComponent(k); } catch (e) { /* egal */ }
    return k.replace(/^(file|datei|image|bild):/i, '').replace(/_/g, ' ').trim().toLowerCase();
}

/* Vergleichsform eines Titels: ohne Klammern und Wörter wie "cat"/"Katze" */
function catNorm(s) {
    return String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/\b(cat|cats|katze)\b/g, '').replace(/[^a-zäöüß]+/g, '');
}

function catBaseName(name) {
    return name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
}

/* Hauptbild eines Artikels. Gibt null zurück (kein Artikel / Begriffsklärung / kein Bild)
   oder { shared: true, title } (Artikel gehört zu einer anderen Rasse)
   oder { url, key, title }. */
async function fetchLeadImage(lang, title, ctx) {
    const data = await catApi(lang, {
        action: 'query', titles: title, prop: 'pageimages|pageprops',
        piprop: 'thumbnail|name', pithumbsize: 500, ppprop: 'disambiguation', redirects: 1
    }, ctx);
    if (!data || !data.query || !data.query.pages) return null;
    const page = Object.values(data.query.pages)[0];
    if (!page || page.missing !== undefined) return null;
    if (page.pageprops && page.pageprops.disambiguation !== undefined) return null;

    const a = catNorm(title), b = catNorm(page.title);
    if (a && b && !a.includes(b) && !b.includes(a)) return { shared: true, title: page.title };

    if (!page.thumbnail || !page.thumbnail.source) return null;
    return { url: page.thumbnail.source, key: catFileKey(page.pageimage), title: page.title };
}

/* Wandelt Commons-Ergebnisseiten in eine Liste { url, key, size } um (Foto-Filter). */
function catCommonsItems(data, requiredWords, needCatTerm) {
    if (!data || !data.query || !data.query.pages) return [];
    const out = [];
    for (const p of Object.values(data.query.pages)) {
        if (!p.imageinfo || !p.imageinfo.length) continue;
        const info = p.imageinfo[0];
        const fname = p.title || '';
        if (!CAT_FILE_EXT.test(fname) || CAT_FILE_BAD.test(fname)) continue;
        if ((info.width || 0) < 500 || (info.height || 0) < 350) continue;
        const key = catFileKey(fname);
        if (CAT_JUNK_KEYS.has(key)) continue;
        if (requiredWords && !requiredWords.every(w => key.includes(w))) continue;
        if (needCatTerm && !/(cat|kitten|katze)/.test(key)) continue;
        out.push({ url: info.thumburl || info.url, key, size: (info.width || 0) * (info.height || 0), index: p.index || 0 });
    }
    return out;
}

/* Fotos aus einer Commons-Kategorie (nur Dateien direkt in der Kategorie). */
async function commonsCategoryImages(categoryName, ctx) {
    const data = await catApi('commons', {
        action: 'query', generator: 'categorymembers', gcmtitle: `Category:${categoryName}`, gcmtype: 'file', gcmlimit: 50,
        prop: 'imageinfo', iiprop: 'url|size', iiurlwidth: 960
    }, ctx);
    return catCommonsItems(data, null, false).sort((a, b) => b.size - a.size);
}

/* Fotos per Commons-Suche. Der Dateiname muss alle Wörter der Suche (außer "cat") enthalten;
   bei Ein-Wort-Namen (z.B. "Bombay") muss zusätzlich "cat"/"kitten" im Dateinamen stehen. */
async function commonsSearchImages(query, ctx) {
    const data = await catApi('commons', {
        action: 'query', generator: 'search', gsrsearch: `${query} filetype:bitmap`, gsrnamespace: 6, gsrlimit: 30,
        prop: 'imageinfo', iiprop: 'url|size', iiurlwidth: 960
    }, ctx);
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 3 && !/^(cat|cats|kitten|breed)$/.test(w));
    return catCommonsItems(data, words, words.length < 2).sort((a, b) => a.index - b.index);
}

/* Name der Commons-Kategorie: erster englischer Wikipedia-Titel + " cats" (z.B. "Peterbald cats") */
function catCategoryNames(name) {
    if (CAT_COMMONS_CATEGORY[name]) return [CAT_COMMONS_CATEGORY[name]];
    const first = (CAT_WIKI_TITLES[name] || []).find(t => !t.startsWith('de:'));
    const base = first ? first.replace(/\s*\(.*?\)/g, '').replace(/\s+cat$/i, '').trim() : catBaseName(name);
    return [`${base} cats`, `${base} cat`];
}

function catCandidates(name) {
    const base = catBaseName(name);
    const list = CAT_WIKI_TITLES[name] || [`${base} cat`, base, `de:${base} (Katze)`, `de:${base}`, `de:${base}katze`];
    return list.map(t => t.startsWith('de:') ? { lang: 'de', title: t.slice(3) } : { lang: 'en', title: t });
}

/* Sucht die Bilder einer Rasse ohne Cache. Gibt { urls, keys, title, lang, failed, note } zurück
   (title/lang = Herkunft des ersten Bildes, zum Prüfen). */
async function resolveCatImages(name) {
    const ctx = { errors: 0 };
    let note = null, title = null, lang = null;
    const urls = [], keys = [];
    const seen = new Set();
    const add = (url, key) => {
        if (urls.length >= CAT_IMG_MAX || (key && seen.has(key))) return;
        if (key) seen.add(key);
        urls.push(url); keys.push(key);
    };

    // 1. Hauptbild des Artikels
    for (const c of catCandidates(name)) {
        const r = await fetchLeadImage(c.lang, c.title, ctx);
        if (!r) continue;
        if (r.shared) { note = `Artikel "${r.title}" gehört zu einer anderen Rasse`; continue; }
        if (CAT_JUNK_KEYS.has(r.key)) continue;
        add(r.url, r.key); title = r.title; lang = c.lang;
        break;
    }

    // 2. Commons-Kategorie der Rasse
    let fromCommons = false;
    for (const cat of catCategoryNames(name)) {
        const items = await commonsCategoryImages(cat, ctx);
        if (items.length) {
            items.forEach(it => add(it.url, it.key));
            fromCommons = true;
            if (!title) { title = `Kategorie ${cat}`; lang = 'commons'; }
            break;
        }
    }

    // 3. Commons-Suche (nur wenn noch zu wenig)
    if (urls.length < 3) {
        const query = CAT_COMMONS_QUERY[name] || `${catBaseName(name)} cat`;
        const items = await commonsSearchImages(query, ctx);
        if (items.length) {
            items.forEach(it => add(it.url, it.key));
            fromCommons = true;
            if (!title) { title = `Suche "${query}"`; lang = 'commons'; }
        }
    }
    if (fromCommons) note = (note ? note + '; ' : '') + 'Bilder von Commons';

    return { urls, keys, title, lang, failed: urls.length === 0 && ctx.errors > 0, note };
}

/* ---------- Cache: Arbeitsspeicher -> localStorage -> Suche ---------- */

function catLsRead() {
    try { return JSON.parse(localStorage.getItem(CAT_IMG_LS_KEY) || '{}'); } catch (e) { return {}; }
}
function catLsSet(name, urls) {
    try {
        const all = catLsRead();
        all[name] = { urls, t: Date.now() };
        localStorage.setItem(CAT_IMG_LS_KEY, JSON.stringify(all));
    } catch (e) { /* Speicher voll oder gesperrt: egal */ }
}
function clearCatImageCache() {
    try { localStorage.removeItem(CAT_IMG_LS_KEY); } catch (e) { /* egal */ }
    catImgPromises.clear();
}

const catImgPromises = new Map(); // verhindert doppelte Anfragen für dieselbe Rasse

/* Liefert eine Liste von Bild-URLs (erstes = Vorschaubild, bis zu 6). Leere Liste = kein Bild gefunden. */
const EIGENE_KATZEN = {
    'Norwegische Waldkatze': ['eigene/waldkatze1.jpg', 'eigene/waldkatze2.jpg'],
    'Europäisch Kurzhaar':   ['eigene/kurzhaar1.jpg', 'eigene/kurzhaar2.jpg']
};

function fetchCatImages(name) {
    if (catImgPromises.has(name)) return catImgPromises.get(name);
    const p = (async () => {
        const eigene = EIGENE_KATZEN[name] || [];
        const e = catLsRead()[name];
        if (e && e.urls && e.urls.length && Date.now() - (e.t || 0) < CAT_IMG_POS_TTL) return [...eigene, ...e.urls];
        if (e && (!e.urls || !e.urls.length) && Date.now() - (e.t || 0) < CAT_IMG_NEG_TTL) return eigene;

        const res = await resolveCatImages(name);
        if (res.urls.length) catLsSet(name, res.urls);
        else if (!res.failed) catLsSet(name, []); // wirklich nichts gefunden -> 1 Tag nicht erneut suchen
        return [...eigene, ...res.urls];
    })();
    catImgPromises.set(name, p);
    return p;
}

/* ---------- Lightbox (wie in dino-images.js, aber mit no-referrer) ---------- */

function openCatImageLightbox(images, startIndex) {
    if (!images || !images.length) return;
    closeCatImageLightbox();
    startIndex = startIndex || 0;

    const overlay = document.createElement('div');
    overlay.id = 'cat-lightbox-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = (e) => { if (e.target === overlay) closeCatImageLightbox(); };

    const scroller = document.createElement('div');
    scroller.style.cssText = 'display:flex;overflow-x:auto;scroll-snap-type:x mandatory;width:100%;height:100%;-webkit-overflow-scrolling:touch;';
    images.forEach(url => {
        const slide = document.createElement('div');
        slide.style.cssText = 'flex:0 0 100%;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;';
        const img = document.createElement('img');
        img.referrerPolicy = 'no-referrer';
        img.src = url;
        img.style.cssText = 'max-width:92%;max-height:88%;object-fit:contain;';
        img.onclick = (e) => { e.stopPropagation(); closeCatImageLightbox(); };
        slide.appendChild(img);
        scroller.appendChild(slide);
    });
    overlay.appendChild(scroller);

    const closeBtn = document.createElement('div');
    closeBtn.innerText = '✕';
    closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;color:#fff;font-size:26px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    closeBtn.onclick = (e) => { e.stopPropagation(); closeCatImageLightbox(); };
    overlay.appendChild(closeBtn);

    if (images.length > 1) {
        const dots = document.createElement('div');
        dots.style.cssText = 'position:absolute;bottom:20px;left:0;right:0;display:flex;justify-content:center;gap:6px;pointer-events:none;';
        images.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:' + (i === startIndex ? '#fff' : 'rgba(255,255,255,0.4)');
            dots.appendChild(dot);
        });
        overlay.appendChild(dots);
        scroller.onscroll = () => {
            const idx = Math.round(scroller.scrollLeft / scroller.clientWidth);
            [...dots.children].forEach((d, i) => { d.style.background = i === idx ? '#fff' : 'rgba(255,255,255,0.4)'; });
        };
    }

    document.body.appendChild(overlay);
    requestAnimationFrame(() => { scroller.scrollLeft = startIndex * scroller.clientWidth; });
}

function closeCatImageLightbox() {
    const el = document.getElementById('cat-lightbox-overlay');
    if (el) el.remove();
}
