/* ========================================================================
   WURMDLE STATS SYSTEM
   Gemeinsames Modul für alle Spiele. Bindet Firebase (Firestore) an.
   Muss NACH den Firebase-Compat-Scripts eingebunden werden:
   <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js"></script>
   <script src="stats.js"></script>
   ======================================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyBf_H6zoRVRBVwocodw-hTpdsyVl-BQiVE",
    authDomain: "wurmdlegame.firebaseapp.com",
    projectId: "wurmdlegame",
    storageBucket: "wurmdlegame.firebasestorage.app",
    messagingSenderId: "1038047329011",
    appId: "1:1038047329011:web:eb6075dc116c574e5d1586"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

/* ---------- Spielername ---------- */

function getPlayerName() {
    let name = localStorage.getItem('wurmdle_player_name');
    if (!name) {
        name = prompt("Wie heißt du? (Dein Name für die Bestenliste)", "Leni");
        if (!name || !name.trim()) name = "Leni";
        name = name.trim();
        localStorage.setItem('wurmdle_player_name', name);
    }
    return name;
}

function resetPlayerName() {
    localStorage.removeItem('wurmdle_player_name');
    return getPlayerName();
}

/* ---------- Timer ---------- */

let gameStartTime = null;

function startGameTimer() {
    gameStartTime = Date.now();
}

function getElapsedSeconds() {
    if (!gameStartTime) return 0;
    return Math.round((Date.now() - gameStartTime) / 1000);
}

/* ---------- Ergebnis speichern ----------
   gameKey: z.B. "wurmdle", "dontwurmdle", "lillyleiter", "dinodle", "flaggle", "miaucode"
   result: { won: bool, guesses: number, maxGuesses: number, extra?: {counterKey: incrementAmount, ...} }
   "extra" ist ein freies Zähler-Objekt für spielspezifische Werte
   (z.B. {babybubu_played:1, babybubu_won:1, hint_sum:2, ai_sprinter_won:1}).
------------------------------------------- */

async function recordGameResult(gameKey, result) {
    const name = getPlayerName();
    const seconds = getElapsedSeconds();
    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const playerRef = db.collection('players').doc(name);

    try {
        await db.runTransaction(async (tx) => {
            const doc = await tx.get(playerRef);
            const data = doc.exists ? doc.data() : {};
            const games = data.games || {};
            const g = games[gameKey] || {
                played: 0, won: 0,
                guessDistribution: [0, 0, 0, 0, 0, 0, 0, 0],
                currentStreak: 0, bestStreak: 0,
                fastestWinGuesses: null, totalGuessesOnWins: 0,
                playtimeSeconds: 0,
                extra: {}
            };
            g.extra = g.extra || {};

            g.played += 1;
            g.playtimeSeconds = (g.playtimeSeconds || 0) + seconds;

            if (result.won) {
                g.won += 1;
                g.currentStreak = (g.currentStreak || 0) + 1;
                g.bestStreak = Math.max(g.bestStreak || 0, g.currentStreak);
                if (typeof result.guesses === 'number') {
                    const idx = Math.min(result.guesses - 1, g.guessDistribution.length - 1);
                    g.guessDistribution[idx] = (g.guessDistribution[idx] || 0) + 1;
                    g.totalGuessesOnWins = (g.totalGuessesOnWins || 0) + result.guesses;
                    if (g.fastestWinGuesses === null || result.guesses < g.fastestWinGuesses) {
                        g.fastestWinGuesses = result.guesses;
                    }
                }
            } else {
                g.currentStreak = 0;
            }

            if (result.extra) {
                for (const [k, v] of Object.entries(result.extra)) {
                    if (k.startsWith('fastest_')) {
                        g.extra[k] = (g.extra[k] === undefined || g.extra[k] === null) ? v : Math.min(g.extra[k], v);
                    } else if (k.startsWith('best_')) {
                        g.extra[k] = (g.extra[k] === undefined || g.extra[k] === null) ? v : Math.max(g.extra[k], v);
                    } else {
                        g.extra[k] = (g.extra[k] || 0) + v;
                    }
                }
            }

            games[gameKey] = g;

            const playHistory = data.playHistory || {};
            playHistory[todayKey] = (playHistory[todayKey] || 0) + 1;

            const totalPlaytimeSeconds = (data.totalPlaytimeSeconds || 0) + seconds;

            tx.set(playerRef, {
                games,
                playHistory,
                totalPlaytimeSeconds,
                lastPlayed: todayKey
            }, { merge: true });
        });
    } catch (e) {
        console.error("Stats konnten nicht gespeichert werden:", e);
    }
}
