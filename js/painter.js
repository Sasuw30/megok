import {DEFAULT_SETTINGS} from "./config.js";
export class UiPainter {
    constructor(e) {
        this.width = window.innerWidth,
        this.height = window.innerHeight,
        this.uiState = "IDLE",
        this.idleMode = "SELECT",
        this.searchActive = !1,
        this.playingSongCode = null,
        this.scoreAnim = null;
        const t = document.createElement("canvas");
        if (this.measureContext = t.getContext("2d"),
        this.els = {
            viewport: document.getElementById("viewport"),
            uiLayer: document.getElementById("ui-layer"),
            screens: {
                IDLE: document.getElementById("screen-idle"),
                SCORE: document.getElementById("screen-score"),
                RANKING: document.getElementById("screen-ranking"),
                SETUP: document.getElementById("screen-setup"),
                SEARCH: document.getElementById("screen-search")
            },
            idleContent: document.querySelector(".idle-content"),
            idleText: document.getElementById("idle-text"),
            idleCode: document.getElementById("idle-code"),
            idleSub: document.getElementById("idle-sub"),
            idleSubContainer: document.querySelector(".idle-sub-container"),
            newSongsBox: document.getElementById("screen-newsongs"),
            newSongsList: document.getElementById("ns-list"),
            queueWidget: document.getElementById("widget-queue"),
            queueCount: document.getElementById("queue-count"),
            queueListText: document.getElementById("queue-list-text"),
            inputWidget: document.getElementById("widget-input"),
            inputDisplay: document.getElementById("input-display"),
            setupCats: document.getElementById("setup-cats"),
            setupOpts: document.getElementById("setup-opts"),
            searchInput: document.getElementById("search-input"),
            searchCount: document.getElementById("search-count"),
            searchResults: document.getElementById("search-results"),
            searchBox: document.querySelector(".search-box"),
            scoreNum: document.getElementById("score-number"),
            scoreMsg: document.getElementById("score-msg"),
            rankingList: document.getElementById("ranking-list"),
            scoreIcons: null,
            metaOverlay: document.getElementById("overlay-metadata"),
            metaTitle: document.getElementById("meta-title"),
            metaSinger: document.getElementById("meta-singer"),
            metaCredits: document.getElementById("meta-credits"),
            countdown: document.getElementById("overlay-countdown"),
            statusOverlay: document.getElementById("overlay-status"),
            statusLabel: document.getElementById("status-label"),
            statusBar: document.getElementById("status-bar-fill"),
            pausedOverlay: document.getElementById("overlay-paused"),
            lyricLayer: document.getElementById("lyrics-overlay"),
            lyricLine1: document.getElementById("lyric-line-1"),
            lyricLine2: document.getElementById("lyric-line-2"),
            lyricStyle: document.getElementById("megaoke-lyric-styles"),
            adUnmuteBtn: null,
            adSkipBtn: null,
            adProceedBtn: null,
            bgvSnapshot: null,
            bgvSnapshotTimeout: null
        },
        this.wipeCache = {
            line1: [],
            line2: []
        },
        this.els.screens.SCORE) {
            let e = document.getElementById("score-icons");
            if (!e) {
                const t = this.els.screens.SCORE.querySelector(".score-container");
                t && (e = document.createElement("div"),
                e.id = "score-icons",
                this.els.scoreMsg ? t.insertBefore(e, this.els.scoreMsg) : t.appendChild(e))
            }
            this.els.scoreIcons = e
        }
        this.cache = {
            idleCode: "",
            idleText: "",
            idleSub: "",
            queueHash: "",
            inputDisplay: "",
            metaTitle: "",
            metaSinger: "",
            countdown: "",
            score: -1,
            setupHash: "",
            lastScreen: null,
            lastIdleMode: null,
            newSongsPage: 0
        },
        this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
        this.showMetadataOverlay = !1,
        window.addEventListener("resize", (()=>this.resize())),
        this._injectLyricStyles(),
        this.els.queueWidget && (this.els.queueWidget.classList.add("hidden"),
        this.els.queueWidget.style.display = "none")
    }
    measureText(e, t, s) {
        return this.measureContext ? (this.measureContext.font = `${s}px ${t || "Arial"}`,
        this.measureContext.measureText(e).width) : 0
    }
    setHighlights(e, t) {}
    resize() {
        this.width = window.innerWidth,
        this.height = window.innerHeight,
        "IDLE" === this.uiState && this.els.idleSub && this.els.idleSub.textContent && this._fitTextToContainer(this.els.idleSub, this.els.idleSubContainer)
    }
    render(e) {
        this.showMetadataOverlay ? "none" !== this.els.lyricLayer.style.display && (this.els.lyricLayer.style.display = "none") : "PLAYING" === this.uiState ? ("flex" !== this.els.lyricLayer.style.display && (this.els.lyricLayer.style.display = "flex"),
        this.updateDomLyrics(e)) : (this.clearLyrics(),
        this.els.lyricLayer.style.display = "none"),
        this.overlayTimer && Date.now() > this.overlayExpiry && (this.els.statusOverlay.classList.add("hidden"),
        this.overlayTimer = null),
        this._updateScreenVisibility()
    }
    _updateScreenVisibility() {
        let e = null;
        "SETUP" === this.uiState ? e = "SETUP" : this.searchActive ? e = "SEARCH" : "SCORING" === this.uiState ? e = "SCORE" : "RANKING" === this.uiState ? e = "RANKING" : "IDLE" === this.uiState && (e = "IDLE"),
        "IDLE" === e && this.els.inputWidget && !this.els.inputWidget.classList.contains("hidden") && this.els.inputWidget.classList.add("hidden");
        const t = "IDLE" === e && this.cache.lastIdleMode !== this.idleMode
          , s = this.cache.lastScreen !== e;
        if ("SETUP" === e ? this.els.metaOverlay && !this.els.metaOverlay.classList.contains("hidden") && (this.els.metaOverlay.classList.add("hidden"),
        this.els.metaOverlay.style.display = "none") : this.showMetadataOverlay && this.els.metaOverlay && this.els.metaOverlay.classList.contains("hidden") && (this.els.metaOverlay.classList.remove("hidden"),
        this.els.metaOverlay.style.display = "flex"),
        !s && !t)
            return "IDLE" === e && "NEW_SONGS" === this.idleMode && this._applyNewSongsScroll(),
            void this._updatePausedOverlay();
        this.cache.lastScreen = e,
        "IDLE" === e && (this.cache.lastIdleMode = this.idleMode);
        for (const [t,s] of Object.entries(this.els.screens))
            s && (t === e ? (s.classList.remove("hidden"),
            s.classList.add("active"),
            s.style.display = "") : (s.classList.add("hidden"),
            s.classList.remove("active")));
        if ("IDLE" === e)
            if ("0" !== this.els.queueCount.textContent && this.els.queueListText.innerHTML && "" !== this.els.queueListText.innerHTML.trim() || (this.els.queueWidget.classList.add("hidden"),
            this.els.queueWidget.style.display = "none"),
            "NEW_SONGS" === this.idleMode)
                this.els.newSongsBox.classList.remove("hidden"),
                this.els.idleContent.classList.add("hidden"),
                this._applyNewSongsScroll();
            else if ("COMMERCIAL" === this.idleMode)
                this.els.newSongsBox.classList.add("hidden"),
                this.els.idleContent.classList.add("hidden");
            else if ("LOGO" === this.idleMode)
                this.els.newSongsBox.classList.add("hidden"),
                this.els.idleContent.classList.remove("hidden"),
                "MegaOke" !== this.els.idleText.textContent && (this.els.idleText.textContent = "MegaOke",
                this.els.idleText.style.fontSize = "18.5vh",
                this.els.idleCode.textContent = "Web Edition",
                this.els.idleCode.style.fontSize = "6vh",
                this.els.idleSub && (this.els.idleSub.textContent = "v5.0")),
                this.cache.idleText = "MegaOke",
                this.cache.idleCode = "Web Edition";
            else {
                this.els.newSongsBox.classList.add("hidden"),
                this.els.idleContent.classList.remove("hidden");
                const e = "Select a Song"
                  , t = this.cache.idleCode && "Web Edition" !== this.cache.idleCode ? this.cache.idleCode : "000000";
                "MegaOke" !== this.els.idleText.textContent && this.els.idleText.textContent === e || (this.els.idleText.textContent = e,
                this.els.idleText.style.fontSize = "14.8vh",
                this.els.idleCode.textContent = t,
                this.els.idleCode.style.fontSize = "18.5vh",
                this.els.idleSub && (this.els.idleSub.textContent = this.cache.idleSub || ""),
                this.cache.idleText = e)
            }
        this._updatePausedOverlay()
    }
    _updatePausedOverlay() {
        this.els.pausedOverlay && (this.paused && "PLAYING" === this.uiState ? this.els.pausedOverlay.classList.remove("hidden") : this.els.pausedOverlay.classList.add("hidden"))
    }
    _applyNewSongsScroll() {
        if (this.els.newSongsList && null !== this.els.newSongsList.offsetParent && this.els.newSongsList.children.length > 0) {
            const e = this.els.newSongsList.children[0].clientHeight;
            e > 0 && (this.els.newSongsList.scrollTop = 10 * this.cache.newSongsPage * e)
        }
    }
    setIdleData(e, t, s) {
        const i = this.cache
          , n = this.els;
        if ("SELECT" !== this.idleMode)
            return i.idleText = t,
            i.idleCode = (e || "").padStart(6, "0"),
            void (i.idleSub = s);
        i.idleText !== t && (n.idleText.textContent = t,
        n.idleText.style.color = this.settings.colors.idle_text,
        i.idleText = t),
        s === t && (s = "");
        const l = (e || "").padStart(6, "0");
        i.idleCode !== l && (n.idleCode.textContent = l,
        n.idleCode.style.color = this.settings.colors.idle_code,
        i.idleCode = l),
        i.idleSub !== s && (n.idleSub.textContent = s || "",
        i.idleSub = s,
        this._fitTextToContainer(n.idleSub, n.idleSubContainer))
    }
    _fitTextToContainer(e, t) {
        if (!e.textContent || !t)
            return;
        let s = 9;
        e.style.fontSize = s + "vh";
        let i = 0;
        const n = t.clientWidth
          , l = t.clientHeight;
        if (0 !== n && 0 !== l)
            for (; i < 50 && !(e.scrollWidth <= n && e.scrollHeight <= l) && (s -= .5,
            !(s < 2)); )
                e.style.fontSize = s + "vh",
                i++
    }
    setQueue(e) {
        if (!(e && e.length > 0))
            return void (this.els.queueWidget && (this.els.queueWidget.classList.add("hidden"),
            this.els.queueWidget.style.display = "none",
            this.els.queueCount.textContent = "0"));
        this.els.queueWidget.classList.remove("hidden"),
        this.els.queueWidget.style.display = "";
        let t = ""
          , s = e ? e.length : 0;
        if (this.playingSongCode) {
            t += `<span class="q-code playing">${this.playingSongCode.toString().padStart(6, "0")}</span>`
        }
        if (e)
            for (let s = 0; s < Math.min(5, e.length); s++) {
                t += `<span class="q-code">${e[s].toString().padStart(6, "0")}</span>`
            }
        this.els.queueListText.innerHTML = t,
        this.els.queueCount.textContent = `${s}`
    }
    setPlaybackInputDisplay(e, t="", s="") {
        if (!e)
            return void this.els.inputWidget.classList.add("hidden");
        this.els.inputWidget.classList.remove("hidden");
        let i = e.padStart(6, "0");
        t && (i += ` : ${t}`),
        this.els.inputDisplay.textContent = i
    }
    setSearchState(e, t, s, i, n, l, a, o) {
        if (this.searchActive = e,
        !e)
            return;
        this.els.searchBox && ("PLAYING" === this.uiState ? this.els.searchBox.classList.add("playing-mode") : this.els.searchBox.classList.remove("playing-mode")),
        this.els.searchInput && (this.els.searchInput.innerHTML = `\n                <div class="search-bar-styled">\n                    <span class="search-text">${s}_</span>\n                </div>\n             `),
        this.els.searchCount.textContent = `[${o}]`;
        const d = "PLAYING" === this.uiState ? 7 : 10;
        let r = 0;
        a > d / 2 && (r = Math.min(a - Math.floor(d / 2), Math.max(0, l.length - d)));
        const c = l.slice(r, r + d);
        let h = "";
        c.forEach(((e,t)=>{
            h += `<li class="${r + t === a ? "search-row selected" : "search-row"}">\n                <span class="sr-code">${e[0]}</span>\n                <span class="sr-title" style="color:white; -webkit-text-stroke: inherit;">${e[1]}</span>\n                <span class="sr-artist">${e[2]}</span>\n            </li>`
        }
        )),
        this.els.searchResults.innerHTML = h
    }
    setSetupData(e) {
        if (!e || !e.structure)
            return;
        const {categories: t, options_map: s} = e.structure
          , {leftIdx: i, rightIdx: n, activeCol: l} = e.state
          , a = e.currentVal
          , o = Math.max(0, i - 6)
          , d = t.slice(o, o + 10);
        let r = "";
        d.forEach(((e,t)=>{
            const s = o + t === i;
            let n = "setup-item";
            s && (n += " selected"),
            s && "left" === l && (n += " active-col"),
            r += `<div class="${n}">${e[1]}</div>`
        }
        )),
        this.els.setupCats.innerHTML = r;
        let c = "";
        if (t[i]) {
            const e = t[i][0]
              , o = s[e] || [];
            c += '<div style="color:cyan; font-weight:bold; margin-bottom:1vh; font-size:3.5vh; margin-left:1vw;">Options:</div>',
            o.forEach(((t,s)=>{
                const i = s === n && "right" === l
                  , o = String(a) === String(t);
                let d = "setup-opt-item";
                i && (d += " highlight"),
                o && (d += " current");
                let r = t;
                if (["lyrics_color", "lyrics_paint"].includes(e) && !["Auto", "Default"].includes(t)) {
                    r = `<span style="display:inline-block; width:2vw; height:2vh; background-color:${this._resolveColor(t, "#fff")}; border:1px solid white; margin-right:1vw;"></span> ${t}`
                } else {
                    r = (o ? "✔ " : "") + t
                }
                c += `<div class="${d}" >${r}</div>`
            }
            ))
        }
        this.els.setupOpts.innerHTML = c
    }
    setScore(e, t) {
        this.scoreAnim && (cancelAnimationFrame(this.scoreAnim),
        this.scoreAnim = null);
        const s = Math.floor(e);
        this.els.scoreMsg.textContent = t;
        const i = Date.now();
        if (!this.els.scoreIcons)
            return;
        const n = ()=>{
            const e = Date.now() - i;
            let t = Math.min(1, e / 1e3);
            const l = Math.floor(0 + (s - 0) * t);
            this.els.scoreNum.textContent = l,
            this._updateScoreIcons(l),
            t < 1 ? this.scoreAnim = requestAnimationFrame(n) : (this.els.scoreNum.textContent = s,
            this._updateScoreIcons(s),
            this.scoreAnim = null)
        }
        ;
        this.scoreAnim = requestAnimationFrame(n)
    }
    _updateScoreIcons(e) {
        if (!this.els.scoreIcons)
            return;
        let t = "";
        t = e < 50 ? '<span class="s-icon trophy gray">🏆</span>' : e <= 60 ? '<span class="s-icon trophy gold">🏆</span>' : e <= 70 ? '<span class="s-icon trophy gold">🏆</span><span class="s-icon trophy gold">🏆</span>' : e <= 80 ? '<span class="s-icon trophy gold">🏆</span><span class="s-icon trophy gold">🏆</span><span class="s-icon trophy gold">🏆</span>' : e <= 85 ? '<span class="s-icon trophy glowing">🏆</span><span class="s-icon trophy glowing">🏆</span><span class="s-icon trophy glowing">🏆</span>' : e <= 90 ? '<span class="s-icon trophy glowing">🏆</span><span class="s-icon trophy glowing">🏆</span>\n                    <span class="s-icon star glowing">⭐</span><span class="s-icon star glowing">⭐</span>' : e <= 95 ? '<span class="s-icon trophy glowing">🏆</span>\n                    <span class="s-icon star glowing">⭐</span><span class="s-icon star glowing">⭐</span><span class="s-icon star glowing">⭐</span>' : e < 100 ? '<span class="s-icon star glowing">⭐</span><span class="s-icon star glowing">⭐</span><span class="s-icon star glowing">⭐</span><span class="s-icon star glowing">⭐</span>' : '<span class="s-icon star shimmer">⭐</span><span class="s-icon star shimmer">⭐</span><span class="s-icon star shimmer">⭐</span><span class="s-icon star shimmer">⭐</span><span class="s-icon star shimmer">⭐</span>',
        this.els.scoreIcons.innerHTML = t
    }
    drawRanking() {
        let e = "";
        e += '<div style="margin-bottom:2vh">TOP SCORES</div>',
        [{
            rank: 1,
            score: 99,
            msg: "Excellent!"
        }, {
            rank: 2,
            score: 95,
            msg: "Great Job!"
        }, {
            rank: 3,
            score: 88,
            msg: "Nice Singing"
        }].forEach((t=>{
            e += `<div class="ranking-item">#${t.rank} - ${t.score} - ${t.msg}</div>`
        }
        )),
        this.els.rankingList.innerHTML = e
    }
    setMetadata(e) {
        if (!e)
            return;
        const t = (e.t || "").split("/").map((e=>e.trim())).filter((e=>e))
          , s = e.s || "";
        let i = e.credits || "";
        if (!i && (e.l || e.m)) {
            const t = [];
            e.l && t.push(`L: ${e.l}`),
            e.m && t.push(`M: ${e.m}`),
            i = t.join("    ")
        }
        this.els.metaTitle && (this.els.metaTitle.textContent = t.join(" / "),
        this.els.metaTitle.style.color = this.settings.colors.meta_title),
        this.els.metaSinger && (this.els.metaSinger.textContent = s ? "Singer: " + s : "",
        this.els.metaSinger.style.color = this.settings.colors.meta_singer),
        this.els.metaCredits && (this.els.metaCredits.textContent = i)
    }
    setShowMetadata(e) {
        this.els.metaOverlay && (this.showMetadataOverlay = e,
        e ? (this.els.metaOverlay.classList.remove("hidden"),
        this.els.metaOverlay.style.display = "flex") : (this.els.metaOverlay.classList.add("hidden"),
        this.els.metaOverlay.style.display = "none"))
    }
    setCountdownState(e) {
        if (!e)
            return void this.els.countdown.classList.add("hidden");
        this.els.countdown.classList.remove("hidden");
        if (["1", "2", "3", "4", "Go"].includes(e)) {
            let t = "yellow";
            "4" === e ? t = "#ef5350" : "3" === e ? t = "#ffa726" : "2" === e ? t = "#ffff00" : "1" === e ? t = "#42a5f5" : "Go" === e && (t = "#66bb6a"),
            this.els.countdown.innerHTML = `<div class="cd-number" style="color:${t}">${e}</div>`
        } else
            this.els.countdown.innerHTML = `<div class="cd-text">${e}</div>`
    }
    triggerOverlay(e, t, s, i) {
        if (this.overlayState = {
            type: e,
            value: t,
            min: s,
            max: i
        },
        this.els.statusOverlay.classList.remove("hidden"),
        this.els.statusLabel.textContent = `${e}: ${t}`,
        "MELODY" === e)
            this.els.statusBar.parentElement.style.display = "none";
        else {
            this.els.statusBar.parentElement.style.display = "block";
            const e = i - s
              , n = Math.max(0, Math.min(100, (t - s) / e * 100));
            this.els.statusBar.style.width = `${n}%`
        }
        this.overlayExpiry = Date.now() + 2e3,
        this.overlayTimer = !0
    }
    _injectLyricStyles() {
        this.els.lyricStyle || (this.els.lyricStyle = document.createElement("style"),
        this.els.lyricStyle.id = "megaoke-lyric-styles",
        document.head.appendChild(this.els.lyricStyle));
        const e = this._resolveColor(this.settings.lyrics_color, "#ffffff")
          , t = this._resolveColor(this.settings.lyrics_paint, "#00e5ff");
        let s = "";
        "Default" === this.settings.lyrics_paint && (s = "\n                .lyric-line.male .syllable .fill { color: #2196F3; }\n                .lyric-line.female .syllable .fill { color: #FF4081; }\n                .lyric-line.chorus .syllable .fill { color: #4CAF50; }\n            "),
        this.els.lyricStyle.textContent = `\n            .lyric-line { color: ${e}; }\n            .lyric-line .syllable .base-text { color: ${e}; }\n            .lyric-line .syllable .fill { color: ${t}; }\n            ${s}\n        `
    }
    updateSettings(e) {
        this.settings = {
            ...this.settings,
            ...e
        },
        this._injectLyricStyles(),
        this._applyLineStyle(this.els.lyricLine1, "lyric-line-1"),
        this._applyLineStyle(this.els.lyricLine2, "lyric-line-2"),
        "IDLE" === this.uiState && (this.els.idleText.style.color = this.settings.colors.idle_text,
        this.els.idleCode.style.color = this.settings.colors.idle_code)
    }
    setLyrics(e, t, s) {
        if (0 !== e.length) {
            if (this.lyricsTopIdx !== t || this.lyricsBotIdx !== s) {
                this.lyricsTopIdx = t,
                this.lyricsBotIdx = s;
                const i = e[t] || null
                  , n = e[s] || null;
                this.currentTopLine = i,
                this.currentBottomLine = n,
                this._buildHtmlLine(this.els.lyricLine1, i, "line1"),
                this._buildHtmlLine(this.els.lyricLine2, n, "line2")
            }
        } else
            this.clearLyrics()
    }
    clearLyrics() {
        this.lyricsTopIdx = -1,
        this.lyricsBotIdx = -1,
        this.currentTopLine = null,
        this.currentBottomLine = null,
        this.els.lyricLine1 && (this.els.lyricLine1.innerHTML = ""),
        this.els.lyricLine2 && (this.els.lyricLine2.innerHTML = ""),
        this.wipeCache.line1 = [],
        this.wipeCache.line2 = []
    }
    _buildHtmlLine(e, t, s) {
        if (this.wipeCache[s] = [],
        !e)
            return;
        if (!t)
            return e.innerHTML = "&nbsp;",
            e.className = "lyric-line",
            void this._applyLineStyle(e, e.id);
        const i = "w" === t.speaker || "female" === t.speaker ? "female" : "c" === t.speaker || "chorus" === t.speaker ? "chorus" : "male";
        e.className = `lyric-line ${i}`,
        this._applyLineStyle(e, e.id);
        const n = t.fragments.map((e=>`<span class="syllable"><span class="base-text">${e.text}</span><span class="fill" style="width:0%">${e.text}</span></span>`)).join("");
        e.innerHTML = n;
        e.querySelectorAll(".syllable").forEach(((e,i)=>{
            if (i >= t.fragments.length)
                return;
            const n = t.fragments[i]
              , l = e.querySelector(".fill");
            this.wipeCache[s].push({
                el: l,
                start: n.startMs,
                end: n.endMs,
                dur: n.endMs - n.startMs,
                lastPct: -1
            })
        }
        ))
    }
    _applyLineStyle(e, t) {
        e && ("Left/Right Split" === this.settings.lyrics_alignment ? ("lyric-line-1" === t ? (e.style.alignSelf = "flex-start",
        e.style.textAlign = "left",
        e.style.marginLeft = "5%",
        e.style.marginRight = "0") : (e.style.alignSelf = "flex-end",
        e.style.textAlign = "right",
        e.style.marginLeft = "0",
        e.style.marginRight = "5%"),
        e.style.width = "auto") : (e.style.alignSelf = "center",
        e.style.textAlign = "center",
        e.style.marginLeft = "auto",
        e.style.marginRight = "auto",
        e.style.width = "90%"))
    }
    updateDomLyrics(e) {
        this.currentTopLine && (this._fastWipe(this.wipeCache.line1, e),
        e >= this.currentTopLine.startMs ? this.els.lyricLine1.classList.remove("inactive") : this.els.lyricLine1.classList.add("inactive")),
        this.currentBottomLine && (this._fastWipe(this.wipeCache.line2, e),
        e >= this.currentBottomLine.startMs ? this.els.lyricLine2.classList.remove("inactive") : this.els.lyricLine2.classList.add("inactive"))
    }
    _fastWipe(e, t) {
        if (e && 0 !== e.length)
            for (let s = 0; s < e.length; s++) {
                const i = e[s];
                let n = 0;
                t >= i.end ? n = 100 : t > i.start && (n = (t - i.start) / i.dur * 100,
                n = Math.max(0, Math.min(100, n)));
                const l = Math.floor(10 * n) / 10;
                if (l !== i.lastPct) {
                    if (100 === i.lastPct && 100 === l)
                        continue;
                    i.el.style.width = `${n}%`,
                    i.lastPct = l
                }
            }
    }
    _resolveColor(e, t) {
        return {
            Auto: "#ffffff",
            Default: "#00e5ff",
            Blue: "#2196F3",
            Red: "#f44336",
            Green: "#4CAF50",
            Violet: "#9C27B0",
            Pink: "#E91E63",
            Orange: "#FF9800",
            White: "#ffffff"
        }[e] || t
    }
    drawAdControls(e) {
        if (this.els.adUnmuteBtn)
            return;
        const t = document.createElement("div");
        t.id = "ad-unmute-btn",
        t.innerHTML = '\n            <svg viewBox="0 0 24 24" width="24" height="24" fill="white">\n                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM3 9v6h4l5 5V4L7 9H3z"/>\n            </svg>\n            <span>UNMUTE AD</span>\n        ',
        t.onclick = e.onMuteToggle,
        document.body.appendChild(t),
        this.els.adUnmuteBtn = t;
        const s = document.createElement("div");
        s.id = "ad-skip-btn",
        s.innerHTML = "<span>Skip in 5...</span>",
        s.onclick = e.onSkip,
        document.body.appendChild(s),
        this.els.adSkipBtn = s;
        const i = document.createElement("div");
        i.id = "ad-proceed-btn",
        i.innerHTML = "<span>VISIT SITE &gt;</span>",
        i.onclick = e.onProceed,
        document.body.appendChild(i),
        this.els.adProceedBtn = i
    }
    setAdMuteVisibility(e) {
        this.els.adUnmuteBtn && (this.els.adUnmuteBtn.style.display = e ? "flex" : "none")
    }
    updateAdMuteState(e) {
        this.els.adUnmuteBtn && (this.els.adUnmuteBtn.innerHTML = e ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM3 9v6h4l5 5V4L7 9H3z"/>\n            </svg><span>UNMUTE AD</span>' : '<svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg><span>MUTE AD</span>')
    }
    setAdSkipState(e, t="", s=!1) {
        this.els.adSkipBtn && (this.els.adSkipBtn.style.display = e ? "flex" : "none",
        e && (t && (this.els.adSkipBtn.innerHTML = `<span>${t}</span>`),
        s ? this.els.adSkipBtn.classList.add("skippable") : this.els.adSkipBtn.classList.remove("skippable")))
    }
    setAdProceedState(e) {
        this.els.adProceedBtn && (this.els.adProceedBtn.style.display = e ? "flex" : "none")
    }
    initVideoSnapshot(e) {
        if (this.els.bgvSnapshot)
            return;
        const t = document.createElement("canvas");
        t.id = "bg-video-snapshot",
        e && e.parentNode ? e.parentNode.insertBefore(t, e.nextSibling) : document.body.appendChild(t),
        this.els.bgvSnapshot = t
    }
    freezeVideo(e) {
        if (this.els.bgvSnapshot && e && e.readyState >= 2)
            try {
                this.els.bgvSnapshot.width = e.clientWidth || 1280,
                this.els.bgvSnapshot.height = e.clientHeight || 720;
                this.els.bgvSnapshot.getContext("2d").drawImage(e, 0, 0, this.els.bgvSnapshot.width, this.els.bgvSnapshot.height),
                this.els.bgvSnapshot.style.display = "block",
                this.els.bgvSnapshotTimeout && clearTimeout(this.els.bgvSnapshotTimeout),
                this.els.bgvSnapshotTimeout = setTimeout((()=>this.unfreezeVideo()), 1e4)
            } catch (e) {
                console.warn("[Painter] Freeze failed", e)
            }
    }
    unfreezeVideo() {
        this.els.bgvSnapshot && (this.els.bgvSnapshot.style.display = "none"),
        this.els.bgvSnapshotTimeout && clearTimeout(this.els.bgvSnapshotTimeout)
    }
    showNoHostModal({btnText: e, downloadLink: t, hasLink: s, onStandalone: i}) {
        const n = document.createElement("div");
        n.id = "setup-modal",
        n.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: Arial, sans-serif; color: white; text-align: center;",
        n.innerHTML = `\n            <h1 style="color: yellow; font-size: 60px; margin-bottom: 20px;">Local Host Not Detected</h1>\n            <p style="font-size: 24px; max-width: 800px; margin-bottom: 40px; color: #ccc;">To use smartphones as remote controls, you need the <b>Host Application</b> running on this device.</p>\n            ${s ? `<a href="${t}" style="background: #00e5ff; color: black; padding: 20px 40px; font-size: 30px; font-weight: bold; text-decoration: none; border-radius: 10px; margin-bottom: 20px; display: inline-block;">${e}</a><p style="color: #888; margin-bottom: 40px;">Install & Run, then refresh this page.</p>` : ""}\n            <button id="btn-standalone" style="background: transparent; border: 2px solid #666; color: #aaa; padding: 15px 30px; font-size: 20px; cursor: pointer; border-radius: 8px; transition: all 0.2s;">Continue in Standalone Mode (Keyboard Only)</button>\n        `,
        document.body.appendChild(n),
        document.getElementById("btn-standalone").onclick = ()=>{
            document.body.removeChild(n),
            i()
        }
    }
    showStartOverlay({onLaunch: e}) {
        const t = document.createElement("div");
        t.id = "start-interaction-overlay",
        t.innerHTML = '\n            <div class="start-box">\n                <div style="color: #00e5ff; font-family: sans-serif; font-size: 20px; margin-bottom: 20px; letter-spacing: 3px; font-weight: bold;">SYSTEM READY</div>\n                <button id="btn-enter-karaoke">USE KARAOKE NOW</button>\n            </div>\n        ',
        document.body.appendChild(t);
        const s = document.getElementById("btn-enter-karaoke")
          , i = ()=>{
            document.body.contains(t) && (document.body.removeChild(t),
            window.removeEventListener("keydown", n),
            e())
        }
          , n = e=>{
            ["Enter", " "].includes(e.key) || 13 === e.keyCode || 32 === e.keyCode ? (e.preventDefault(),
            i()) : ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && (e.preventDefault(),
            s.focus())
        }
        ;
        s.onclick = i,
        s.ontouchend = e=>{
            e.preventDefault(),
            i()
        }
        ,
        window.addEventListener("keydown", n),
        setTimeout((()=>s.focus()), 100)
    }
    setPaused(e) {
        this.paused = e
    }
    setPlayingSongCode(e) {
        this.playingSongCode = e
    }
    set newSongsList(e) {
        let t = "";
        e.forEach(((e,s)=>{
            t += `<div class="ns-row ${s % 2 == 0 ? "even" : "odd"}">\n                <span class="col-code">${e[0]}</span>\n                <span class="col-title">${e[1]}</span>\n                <span class="col-artist">${e[2]}</span>\n            </div>`
        }
        )),
        this.els.newSongsList.innerHTML = t,
        this._newSongsData = e
    }
    get newSongsList() {
        return this._newSongsData
    }
    set newSongsPage(e) {
        this.cache.newSongsPage = e,
        this._applyNewSongsScroll()
    }
}
