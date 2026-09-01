/* ========================================================================
   DINO BILD-LOOKUP (Wikipedia/Wikidata mit Fallbacks + Firestore-Cache)
   Gemeinsames Modul für dinodle.html und dinodex.html.
   Nutzt die globale `db`-Variable aus stats.js - stats.js MUSS vor dieser
   Datei eingebunden werden.
   ======================================================================== */

async function fetchWikiThumb(lang, title) {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=500&redirects=1&origin=*`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId !== "-1" && pages[pageId].thumbnail) {
            return pages[pageId].thumbnail.source;
        }
    } catch (e) {
        console.error(`Fehler beim Laden des ${lang}-Wikipedia-Bildes:`, e);
    }
    return null;
}

async function fetchWikidataImage(name) {
    try {
        const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=de&format=json&origin=*&limit=1`;
        const sr = await fetch(searchUrl);
        const sdata = await sr.json();
        if (!sdata.search || !sdata.search.length) return null;
        const qid = sdata.search[0].id;

        const entUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P18&format=json&origin=*`;
        const er = await fetch(entUrl);
        const edata = await er.json();
        const claims = edata.claims && edata.claims.P18;
        if (!claims || !claims.length) return null;

        const filename = claims[0].mainsnak.datavalue.value;
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=500`;
    } catch (e) {
        console.error("Fehler beim Laden des Wikidata-Bildes:", e);
    }
    return null;
}

async function fetchWikipediaImage(dinoName) {
    const genus = dinoName.split(' ')[0]; // Gattung als Titel-Variante, falls die volle Art fehlt
    const attempts = [
        () => fetchWikiThumb('de', dinoName),
        () => fetchWikiThumb('en', dinoName),
        () => fetchWikiThumb('de', genus),
        () => fetchWikiThumb('en', genus),
        () => fetchWikidataImage(dinoName),
        () => fetchWikidataImage(genus)
    ];
    for (const attempt of attempts) {
        const url = await attempt();
        if (url) return url;
    }
    return null;
}

/* ---------- Mehrere Bilder pro Dino (für Galerie/Lightbox) ---------- */

async function fetchPageGalleryImages(lang, title) {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&generator=images&gimlimit=40&prop=imageinfo&iiprop=url|size&redirects=1&format=json&origin=*`;
    try {
        const r = await fetch(url);
        const data = await r.json();
        if (!data.query || !data.query.pages) return [];
        const results = [];
        for (const p of Object.values(data.query.pages)) {
            if (!p.imageinfo || !p.imageinfo.length) continue;
            const info = p.imageinfo[0];
            const fname = (p.title || '').toLowerCase();
            if (!/\.(jpe?g|png|gif)$/.test(fname)) continue;
            if (/(icon|logo|flag|locator|symbol|stub|edit-|disambig|question_book|padlock|commons-logo|wiki_letter|folder)/i.test(fname)) continue;
            if ((info.width || 0) < 200 || (info.height || 0) < 150) continue;
            results.push({ url: info.url, width: info.width, height: info.height });
        }
        return results;
    } catch (e) {
        console.error(`Fehler beim Laden der ${lang}-Bildergalerie:`, e);
        return [];
    }
}

async function fetchWikipediaImages(dinoName) {
    try {
        const cacheDoc = await db.collection('dinoImages').doc(dinoName).get();
        if (cacheDoc.exists) {
            const data = cacheDoc.data();
            if (data.urls && data.urls.length) return data.urls;
        }
    } catch (e) {
        console.error("Konnte Bild-Cache nicht lesen:", e);
    }

    const genus = dinoName.split(' ')[0];
    let results = await fetchPageGalleryImages('de', dinoName);
    if (results.length < 2) results = results.concat(await fetchPageGalleryImages('en', dinoName));
    if (results.length < 2) results = results.concat(await fetchPageGalleryImages('de', genus));
    if (results.length < 2) results = results.concat(await fetchPageGalleryImages('en', genus));

    const seen = new Set();
    let unique = results.filter(r => { if (seen.has(r.url)) return false; seen.add(r.url); return true; });
    unique.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    unique = unique.slice(0, 6);

    let finalUrls;
    if (unique.length === 0) {
        const single = await fetchWikipediaImage(dinoName);
        finalUrls = single ? [single] : [];
    } else {
        finalUrls = unique.map(u => u.url);
    }

    if (finalUrls.length) {
        db.collection('dinoImages').doc(dinoName).set({ urls: finalUrls, cachedAt: Date.now() })
            .catch(e => console.error("Konnte Bild-Cache nicht schreiben:", e));
    }

    return finalUrls;
}

/* ---------- Lightbox: Bild(er) in voller Größe anzeigen ---------- */

function openImageLightbox(images, startIndex) {
    if (!images || !images.length) return;
    closeImageLightbox();

    const overlay = document.createElement('div');
    overlay.id = 'img-lightbox-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = (e) => { if (e.target === overlay) closeImageLightbox(); };

    const scroller = document.createElement('div');
    scroller.style.cssText = 'display:flex;overflow-x:auto;scroll-snap-type:x mandatory;width:100%;height:100%;-webkit-overflow-scrolling:touch;';

    images.forEach(url => {
        const slide = document.createElement('div');
        slide.style.cssText = 'flex:0 0 100%;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;';
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'max-width:92%;max-height:88%;object-fit:contain;';
        img.onclick = (e) => { e.stopPropagation(); closeImageLightbox(); };
        slide.appendChild(img);
        scroller.appendChild(slide);
    });

    overlay.appendChild(scroller);

    const closeBtn = document.createElement('div');
    closeBtn.innerText = '✕';
    closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;color:#fff;font-size:26px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    closeBtn.onclick = (e) => { e.stopPropagation(); closeImageLightbox(); };
    overlay.appendChild(closeBtn);

    if (images.length > 1) {
        const dots = document.createElement('div');
        dots.style.cssText = 'position:absolute;bottom:20px;left:0;right:0;display:flex;justify-content:center;gap:6px;';
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

function closeImageLightbox() {
    const el = document.getElementById('img-lightbox-overlay');
    if (el) el.remove();
}
