export class SearchEngine {
    constructor() {
        this.database = [];
        this.isReady = false;
        this.results = [];
        this.query = "";
        this.searchType = "TITLE"; 
        this.langId = 0;
        this.searchLimit = 200;
        this.batchSize = 500;
    }

    /**
     * Normalizes text by strictly allowing only A-Z, 0-9, spaces, and '&'.
     */
    normalizeText(text) {
        if (!text) return "";
        return String(text).toUpperCase()
            .replace(/['"´`’%]/g, "")
            .replace(/[^A-Z0-9&\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    async loadDatabase(e) {
        console.log(`[Search] Indexing ${e.length} songs...`);
        this.database = e;
        const t = this.database.length;
        let s = 0;

        return new Promise((resolve => {
            const a = () => {
                const i = Math.min(s + 2000, t);
                for (let e = s; e < i; e++) {
                    const song = this.database[e];
                    song._search_title = this.normalizeText(song.name);
                    song._search_artist = this.normalizeText(song.artistName);
                    song._search_code = String(song.code || "");
                }
                s = i;
                if (s < t) {
                    setTimeout(a, 0);
                } else {
                    this.isReady = true;
                    console.log("[Search] Indexing Complete.");
                    resolve();
                }
            };
            a();
        }));
    }

    async search(e, t = "TITLE", s = 0) {
        if (this.isReady) {
            this.query = this.normalizeText(e);
            this.searchType = t;
            this.langId = s;
            this.results = [];
            return this._runSearchLoop();
        }
        return [];
    }

    _runSearchLoop() {
        return new Promise((resolve => {
            let t = 0;
            const s = this.database.length;
            const q = this.query;
            const r = this.langId;
            const limit = this.searchLimit;

            // STRICT 6-TIER HIERARCHY BUCKETS
            const lvl1 = []; // Title Starts With
            const lvl2 = []; // Title Word Boundary
            const lvl3 = []; // Artist Starts With
            const lvl4 = []; // Artist Word Boundary
            const lvl5 = []; // Code Exact/EndsWith Match
            const lvl6 = []; // Generic Substring (Title/Artist/Code)

            const isNum = /^\d+$/.test(q);

            const c = () => {
                const o = performance.now();
                
                for (; t < s && performance.now() - o < 10;) {
                    const e = this.database[t];
                    t++;

                    if (r !== 0 && e.lang_id !== r) continue;

                    let matchLevel = 0;

                    if (!q) {
                        matchLevel = 1; 
                    } else {
                        const normName = e._search_title;
                        const normArtist = e._search_artist;
                        const normCode = e._search_code;

                        // ABSOLUTE PRIORITY CHAIN (Top to Bottom)
                        if (normName.startsWith(q)) {
                            matchLevel = 1;
                        } else if (normName.includes(" " + q)) {
                            matchLevel = 2;
                        } else if (normArtist.startsWith(q)) {
                            matchLevel = 3;
                        } else if (normArtist.includes(" " + q)) {
                            matchLevel = 4;
                        } else if (isNum && (normCode === q || normCode.endsWith(q))) {
                            matchLevel = 5;
                        } else if (normName.includes(q) || normArtist.includes(q) || (isNum && normCode.includes(q))) {
                            matchLevel = 6;
                        }
                    }

                    // Push to appropriate bucket based on matched level
                    if (matchLevel > 0) {
                        const formattedResult = [String(e.code).padStart(6, "0"), e.name, e.artistName];

                        if (matchLevel === 1 && lvl1.length < limit) lvl1.push(formattedResult);
                        else if (matchLevel === 2 && lvl2.length < limit) lvl2.push(formattedResult);
                        else if (matchLevel === 3 && lvl3.length < limit) lvl3.push(formattedResult);
                        else if (matchLevel === 4 && lvl4.length < limit) lvl4.push(formattedResult);
                        else if (matchLevel === 5 && lvl5.length < limit) lvl5.push(formattedResult);
                        else if (matchLevel === 6 && lvl6.length < limit) lvl6.push(formattedResult);
                    }

                    // Early Exit: ONLY trigger if Bucket 1 (Title Matches) is completely full.
                    // This guarantees we scan the whole DB to find Titles before settling for Artists/Codes.
                    if (lvl1.length >= limit) {
                        t = s; 
                        break;
                    }
                }

                if (t < s) {
                    setTimeout(c, 0);
                } else {
                    // Combine all buckets in strict priority order
                    const merged = [...lvl1, ...lvl2, ...lvl3, ...lvl4, ...lvl5, ...lvl6].slice(0, limit);
                    this.results = merged;
                    resolve(merged);
                }
            };
            
            c();
        }));
    }
}
