/* ========================================================================
   DINO BILD-LOOKUP (Wikipedia/Wikidata mit Fallbacks)
   Gemeinsames Modul für dinodle.html und dinodex.html.
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
