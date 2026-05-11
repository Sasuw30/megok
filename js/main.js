import {KEY_MAP, DEFAULT_SETTINGS, SETUP_MENU_STRUCTURE, SECTOR_SIZE, VIDEO_EXTENSIONS} from "./config.js";
import {loadSoundFontBank, decodeControlVoltage} from "./parser.js";
import {AudioEngine} from "./audio.js";
import {UiPainter} from "./painter.js";
import {SearchEngine} from "./search.js";
import AdManager from "./ads.js";
import {StorageManager} from "./storage.js";
class MegaOkeApp {
    constructor() {
        this.audio = new AudioEngine,
        this.painter = new UiPainter("viewport"),
        this.search = new SearchEngine,
        this.ads = new AdManager,
        this.storage = new StorageManager,
        this.stateObservers = [],
        this.serverSocket = null,
        this.isHost = !1,
        this.hostIp = "localhost",
        this.reconnectTimer = null,
        this.heartbeatTimer = null,
        this.debugEl = null,
        this.initDebugLogger(),
        this.files = {
            idx: null
        },
        this.idxPath = "assets/IDX/MEGIDX",
        this.database = [],
        this.newSongsList = [],
        this.currentBlobUrl = null,
        this.fileInputs = {
            bgv: null,
            sf2: null
        },
        this.customSf2Imported = !1,
        this.state = "BOOT",
        this.searchActive = !1,
        this.songQueue = [],
        this.currentSongCode = null,
        this.inputBuffer = "",
        this.lastInputTime = 0,
        this.playbackInputCode = "",
        this.idleTimer = 0,
        this.idleStateDuration = 0,
        this.lastTimeBroadcast = 0,
        this.lastUiUpdate = 0,
        this.currentLyrics = null,
        this.lyricLines = [],
        this.topLineIdx = 0,
        this.botLineIdx = 1,
        this.lastBroadcastLinesHash = "",
        this.lastAudioTime = 0,
        this.lastSystemTime = 0,
        this.smoothedTime = 0,
        this.interludeSwitchTime = 0,
        this.currentInterludeText = "",
        this.lastCountdownState = "",
        this.searchInput = "",
        this.searchSelection = 0,
        this.searchResults = [],
        this.settings = {
            ...DEFAULT_SETTINGS
        },
        this.loadSettings(),
        this.tempSettings = {},
        this.setupState = {
            leftIdx: 0,
            rightIdx: 0,
            activeCol: "left"
        },
        this.currentTranspose = 0,
        this.bgvVideoEl = document.getElementById("bg-video"),
        this.bgvList = [],
        this.bgvSnapshot = null,
        this.bgvSnapshotTimeout = null,
        this.bgvState = {
            currentContentUrl: "",
            resumeTime: 0,
            hasStarted: !0
        },
        this.forceVideoChangeOnSongEnd = !1,
        this.initAutoLoad(),
        this.initVisibilityHandler()
    }
    get currentPlayTime() {
        if ("PLAYING" !== this.state || this.audio && this.audio.isPaused)
            return this.smoothedTime;
        const t = this.audio.getCurrentTime()
          , e = performance.now()
          , s = e - this.lastSystemTime;
        return t !== this.lastAudioTime || Math.abs(this.smoothedTime - t) > 200 ? (this.lastAudioTime = t,
        this.smoothedTime = t,
        this.lastSystemTime = e) : (this.smoothedTime += s,
        this.lastSystemTime = e),
        this.smoothedTime
    }
    precalculateSongMetrics() {
        if (!this.lyricLines || 0 === this.lyricLines.length)
            return;
        this.log(`Pre-calculating widths for ${this.lyricLines.length} lines...`);
        const t = this.settings.font_family || "Arial";
        this.lyricLines.forEach((e=>{
            let s = 0;
            e.fragments && e.fragments.forEach((e=>{
                const i = this.painter.measureText(e.text, t, 60);
                e.widthPx = i,
                s += i
            }
            )),
            e.totalWidthPx = s
        }
        )),
        this.topLineIdx = 0,
        this.botLineIdx = 1,
        this.painter.setLyrics(this.lyricLines, this.topLineIdx, this.botLineIdx)
    }
    addStateObserver(t) {
        this.stateObservers.push(t)
    }
    notifyObservers(t) {
        this.stateObservers.forEach((e=>e(t)))
    }
    simulateKey(t) {
        this.warmUpAudio(),
        this.handleInput({
            key: t,
            preventDefault: ()=>{}
        })
    }
    initDebugLogger() {
        this.debugEl = null,
        this.log("System v8.0.8 (Stable Import)...")
    }
    log(t) {
        if (console.log(`[DEBUG] ${t}`),
        !this.debugEl)
            return;
        const e = document.createElement("div");
        e.textContent = `[${(new Date).toLocaleTimeString().split(" ")[0]}] ${t}`,
        e.style.borderBottom = "1px solid #333",
        this.debugEl.prepend(e)
    }
    initVisibilityHandler() {
        document.addEventListener("visibilitychange", (()=>{
            "visible" === document.visibilityState && (this.log("App Foregrounded - Warming Up..."),
            this.warmUpAudio(),
            this.broadcastState())
        }
        ))
    }
    warmUpAudio() {
        if (!this.audio || !this.audio.synth || !this.audio.synth.context)
            return;
        const t = this.audio.synth.context;
        "suspended" === t.state && t.resume().catch((t=>{}
        ));
        try {
            const e = t.createOscillator()
              , s = t.createGain();
            e.connect(s),
            s.connect(t.destination),
            s.gain.value = 1e-4,
            e.start(0),
            e.stop(t.currentTime + .1)
        } catch (t) {}
    }
    async checkServerConnection() {
        return window.__MOBILE_THEATRE__ ? (this.log("Mobile Theatre Mode: Bypassing Server Check"),
        this.isHost = !0,
        !0) : new Promise((t=>{
            if (this.log("Connecting..."),
            this.serverSocket) {
                try {
                    this.serverSocket.close()
                } catch (t) {}
                this.serverSocket = null
            }
            const e = new WebSocket("ws://localhost:8080")
              , s = setTimeout((()=>{
                this.log("Timeout."),
                e.close(),
                t(!1),
                this.scheduleReconnect()
            }
            ), 5e3);
            e.onopen = ()=>{
                clearTimeout(s),
                this.log("CONNECTED!"),
                this.debugEl && (this.debugEl.style.borderColor = "#00ff00"),
                this.serverSocket = e,
                this.isHost = !0,
                this.stopReconnectLoop(),
                this.startHeartbeat(),
                this.setupServerListeners(e),
                this.broadcastState(),
                this.registerIndexPath(),
                t(!0)
            }
            ,
            e.onerror = t=>{
                this.log("Socket Error")
            }
            ,
            e.onclose = t=>{
                this.log(`Closed (Code: ${t.code})`),
                this.debugEl && (this.debugEl.style.borderColor = "#ff0000"),
                this.isHost && (this.isHost = !1,
                this.serverSocket = null,
                this.stopHeartbeat(),
                this.scheduleReconnect())
            }
        }
        ))
    }
    scheduleReconnect() {
        this.reconnectTimer || window.__MOBILE_THEATRE__ || (this.log("Auto-Reconnect Active"),
        this.reconnectTimer = setInterval((()=>{
            this.attemptSilentReconnect()
        }
        ), 2e3))
    }
    stopReconnectLoop() {
        this.reconnectTimer && (clearInterval(this.reconnectTimer),
        this.reconnectTimer = null)
    }
    startHeartbeat() {
        this.stopHeartbeat(),
        this.heartbeatTimer = setInterval((()=>{
            this.serverSocket && this.serverSocket.readyState === WebSocket.OPEN && this.serverSocket.send(JSON.stringify({
                type: "ping"
            }))
        }
        ), 6e4)
    }
    stopHeartbeat() {
        this.heartbeatTimer && (clearInterval(this.heartbeatTimer),
        this.heartbeatTimer = null)
    }
    attemptSilentReconnect() {
        if (this.isHost)
            return;
        const t = new WebSocket("ws://localhost:8080");
        t.onopen = ()=>{
            this.log("RECONNECTED!"),
            this.debugEl && (this.debugEl.style.borderColor = "#00ff00"),
            this.serverSocket = t,
            this.isHost = !0,
            this.stopReconnectLoop(),
            this.startHeartbeat(),
            this.setupServerListeners(t),
            this.broadcastState(),
            this.registerIndexPath(),
            "PLAYING" === this.state && (this.lastBroadcastLinesHash = "",
            this._broadcastLyricsIfChanged())
        }
        ,
        t.onclose = t=>{
            this.isHost && (this.log("Reconnected Socket Dropped."),
            this.debugEl && (this.debugEl.style.borderColor = "#ff0000"),
            this.isHost = !1,
            this.serverSocket = null,
            this.stopHeartbeat(),
            this.scheduleReconnect())
        }
        ,
        t.onerror = ()=>{}
    }
    setupServerListeners(t) {
        t.onmessage = t=>{
            if (!(t.data instanceof Blob || t.data instanceof ArrayBuffer))
                try {
                    const e = JSON.parse(t.data);
                    this.handleServerMessage(e)
                } catch (t) {
                    console.error("[Server] Message Error:", t)
                }
        }
    }
    handleServerMessage(t) {
        if ("NEW_DEVICE_CONNECTED" === t.type)
            return this.log("Remote Connected"),
            this.broadcastState(),
            this.registerIndexPath(),
            void ("PLAYING" === this.state && (this.lastBroadcastLinesHash = "",
            this._broadcastLyricsIfChanged()));
        if ("INFO" === t.type && t.ip)
            return this.hostIp = t.ip,
            void this.updateIdleDisplay();
        let e = null;
        if ("command_relay" === t.type)
            this.log(`CMD(Wrap): ${t.data.action}`),
            e = t.data;
        else if (t.action && !t.type)
            this.log(`CMD(Raw): ${t.action}`),
            e = t;
        else if ("QUEUE" === t.type)
            e = {
                action: "queue",
                code: t.code
            };
        else if ("COMMAND" === t.type) {
            const s = {
                PLAY: "play",
                PAUSE: "pause",
                NEXT: "next",
                STOP: "stop"
            };
            s[t.action] && (e = {
                action: s[t.action]
            })
        }
        e && (this.warmUpAudio(),
        this.processUniversalCommand(e))
    }
    processUniversalCommand(t) {
        if (t)
            try {
                switch (t.action) {
                case "get_database":
                    this.files.idx && this.serverSocket && this.serverSocket.readyState === WebSocket.OPEN ? (console.log("[System] Sending Database Binary to Remote..."),
                    this.serverSocket.send(this.files.idx)) : console.warn("[System] Database requested but not ready.");
                    break;
                case "play":
                    t.code ? this.playSongByCode(t.code) : this.audio.isPaused && this.triggerPlayPause();
                    break;
                case "pause":
                    this.audio.isPlaying && this.triggerPlayPause();
                    break;
                case "play_pause":
                    this.triggerPlayPause();
                    break;
                case "next":
                case "skip":
                    this.startNextSong();
                    break;
                case "stop":
                    this.triggerStop();
                    break;
                case "restart":
                case "replay":
                    this.currentSongCode && (this.songQueue.unshift(this.currentSongCode),
                    this.stopSong(!0));
                    break;
                case "queue":
                case "reserve":
                    t.code && this.reserveSong(t.code);
                    break;
                case "priority":
                case "insert":
                    t.code && this.priorityReserveSong(t.code);
                    break;
                case "cancel":
                case "remove":
                    t.code && this.cancelReservation(t.code);
                    break;
                case "melody":
                    {
                        const e = void 0 !== t.value ? t.value : void 0 !== t.val ? t.val : t.payload;
                        if (void 0 !== e) {
                            const t = parseInt(e);
                            Math.abs(t) <= 1 ? this.audio.changeMelodyLevel(t) : this.audio.setMelodyLevel(t)
                        } else
                            this.audio.toggleMelody();
                        this.painter.triggerOverlay("MELODY", this.audio.melodyLevel, 0, 8),
                        this.broadcastState();
                        break
                    }
                case "key":
                case "pitch":
                    {
                        const e = void 0 !== t.value ? t.value : void 0 !== t.val ? t.val : t.payload;
                        void 0 !== e && this.changeKey(parseInt(e));
                        break
                    }
                case "tempo":
                    {
                        const e = void 0 !== t.value ? t.value : void 0 !== t.val ? t.val : t.payload;
                        void 0 !== e && this.changeTempo(.1 * parseInt(e));
                        break
                    }
                case "vol_up":
                    this.changeVolume(5);
                    break;
                case "vol_down":
                    this.changeVolume(-5);
                    break;
                case "volume":
                    {
                        const e = void 0 !== t.value ? t.value : void 0 !== t.val ? t.val : t.payload;
                        if (void 0 !== e) {
                            const t = parseInt(e);
                            Math.abs(t) <= 10 ? this.changeVolume(5 * t) : (this.audio.setVolume(t),
                            this.painter.triggerOverlay("VOLUME", this.audio.volume, 0, 100),
                            this.broadcastState())
                        }
                        break
                    }
                }
            } catch (t) {
                this.log(`CMD Failed: ${t.message}`),
                console.error(t)
            }
    }
    broadcast(t) {
        this.serverSocket && this.serverSocket.readyState === WebSocket.OPEN && this.serverSocket.send(JSON.stringify(t))
    }
    registerIndexPath() {
        this.isHost && this.broadcast({
            type: "register_idx_path",
            path: this.idxPath
        })
    }
    broadcastState() {
        const t = [];
        if (this.currentSongCode) {
            const e = this.findSong(this.currentSongCode);
            t.push({
                code: this.currentSongCode,
                title: e ? e.name : "Unknown",
                artist: e ? e.artistName : "Unknown",
                status: "playing",
                id: "current"
            })
        }
        this.songQueue.forEach(((e,s)=>{
            const i = this.findSong(e);
            t.push({
                code: e,
                title: i ? i.name : "Unknown",
                artist: i ? i.artistName : "Unknown",
                status: "reserved",
                id: `q-${s}`
            })
        }
        ));
        let e = {
            code: null,
            title: "Unknown",
            artist: "",
            time: 0
        };
        if (this.currentSongCode) {
            const t = this.findSong(this.currentSongCode);
            t && (e.code = this.currentSongCode,
            e.title = t.name,
            e.artist = t.artistName),
            "PLAYING" === this.state && (e.time = Math.floor(this.currentPlayTime / 1e3))
        }
        const s = Math.round(10 * (this.audio.tempoRatio - 1));
        const i = {
            type: "state_update",
            status: "PLAYING" === this.state && this.audio.isPaused ? "paused" : this.state,
            volume: this.audio.volume,
            transpose: this.currentTranspose,
            tempo: s,
            queue: t,
            now_playing: e,
            score: {
                score: 0
            },
            input: this.inputBuffer,
            idle_mode: this.painter.idleMode
        };
        this.notifyObservers(i),
        this.isHost && this.broadcast(i)
    }
    _broadcastLyricsIfChanged() {
        if (!this.lyricLines || !this.lyricLines.length)
            return;
        const t = this.topLineIdx
          , e = this.botLineIdx
          , s = `${t}_ ${e}`;
        if (s !== this.lastBroadcastLinesHash) {
            this.lastBroadcastLinesHash = s;
            const i = {
                type: "lyrics_update",
                lines: [],
                now_playing: {
                    code: this.currentSongCode,
                    title: "",
                    artist: ""
                },
                queue: []
            };
            if (this.currentSongCode) {
                const t = this.findSong(this.currentSongCode);
                t && (i.now_playing.title = t.name || "Unknown",
                i.now_playing.artist = t.artistName || "")
            }
            for (let t = 0; t < Math.min(5, this.songQueue.length); t++) {
                const e = this.songQueue[t]
                  , s = this.findSong(e);
                i.queue.push({
                    code: e,
                    title: s && s.name || "Unknown",
                    artist: s && s.artistName || "",
                    status: "queued"
                })
            }
            const n = (t,e)=>{
                if (t >= 0 && t < this.lyricLines.length) {
                    const s = this.lyricLines[t]
                      , i = (s.fragments || []).map((t=>({
                        text: t.text,
                        time: Math.floor(t.startMs)
                    })));
                    return {
                        position: e,
                        text: s.text || "",
                        start: Math.floor(s.startMs),
                        end: Math.floor(s.endMs),
                        fragments: i
                    }
                }
                return null
            }
              , a = n(t, "top")
              , o = n(e, "bottom");
            a && i.lines.push(a),
            o && i.lines.push(o),
            i.lines.length > 0 && (this.notifyObservers(i),
            this.isHost && this.broadcast(i))
        }
    }
    broadcastCountdown(t) {
        this.isHost && this.broadcast({
            type: "countdown_update",
            text: t
        })
    }
    loadSettings() {
        try {
            const t = localStorage.getItem("weboke_settings");
            t && (this.settings = {
                ...DEFAULT_SETTINGS,
                ...JSON.parse(t)
            })
        } catch (t) {}
    }
    saveSettings() {
        try {
            localStorage.setItem("weboke_settings", JSON.stringify(this.settings))
        } catch (t) {}
    }
    createFileInputs() {
        const t = (t,e,s)=>{
            const i = document.createElement("input");
            return i.type = "file",
            i.id = t,
            i.accept = e,
            i.multiple = "import-bgv" === t,
            i.style.display = "none",
            i.onchange = s,
            document.body.appendChild(i),
            i
        }
        ;
        this.fileInputs.bgv = t("import-bgv", "image/*,video/*", (async t=>{
            const e = t.target.files;
            if (e && e.length > 0) {
                const t = Array.from(e);
                this.log(`Importing ${t.length} BGV files...`);
                let s = 0;
                for (const e of t)
                    try {
                        s += await this.storage.saveCustomBGVs([e])
                    } catch (t) {
                        console.error(`Failed to import ${e.name}`, t)
                    }
                s > 0 ? (this.settings.bgv_source = "Custom",
                this.saveSettings(),
                alert(`Imported ${s} / ${t.length} files. Switched to Custom Source.`),
                this.scanBackgroundVideos()) : alert("Import Failed! Storage is likely full or corrupted.\nTry 'Delete All' in Settings to free up space.")
            }
            t.target.value = ""
        }
        )),
        this.fileInputs.sf2 = t("import-sf2", ".sf2,.sf3", (async t=>{
            const e = t.target.files[0];
            if (e) {
                this.log(`Importing SF2: ${e.name}...`);
                await this.storage.saveCustomSF2(e) ? (this.settings.midi_soundfont = "Custom",
                this.customSf2Imported = !0,
                this.saveSettings(),
                alert("SoundFont Imported. Restart app or go to Settings -> Exit & Save to apply.")) : alert("SF2 Import Failed! Storage error.")
            }
            t.target.value = ""
        }
        ))
    }
    async loadCustomSoundFont() {
        if ("Custom" === this.settings.midi_soundfont) {
            this.log("Loading Custom SoundFont from Storage...");
            try {
                const t = await this.storage.getCustomSF2();
                t ? this.audio.loadSoundFont ? (await this.audio.loadSoundFont(t),
                this.log("Custom SF2 Loaded Successfully.")) : console.warn("AudioEngine.loadSoundFont not found. Ensure AudioEngine supports dynamic loading.") : (console.warn("Custom SF2 selected but file not found in storage. Reverting to Default."),
                this.settings.midi_soundfont = "Default")
            } catch (t) {
                console.error("Failed to load Custom SF2:", t),
                this.settings.midi_soundfont = "Default"
            }
        }
    }
    async initAutoLoad() {
        const t = document.getElementById("loader-status")
          , e = document.getElementById("progress-bar")
          , s = document.getElementById("startup-overlay");
        document.querySelectorAll(".file-group, #btn-launch").forEach((t=>t.style.display = "none")),
        t && (t.textContent = "Auto-Loading Assets...");
        try {
            t && (t.textContent = "Initializing Storage..."),
            await this.storage.init(),
            this.createFileInputs(),
            "Custom" === this.settings.midi_soundfont && (t && (t.textContent = "Loading Custom SoundFont..."),
            await this.loadCustomSoundFont()),
            t && (t.textContent = "Scanning Background Videos...");
            const i = this.scanBackgroundVideos();
            t && (t.textContent = "Loading Database Index..."),
            e && (e.style.width = "20%");
            const n = await fetch(`${this.idxPath}?t=${Date.now()}`);
            if (!n.ok)
                throw new Error("MEGIDX Missing");
            this.files.idx = await n.arrayBuffer(),
            t && (t.textContent = "Parsing Database..."),
            e && (e.style.width = "60%"),
            this.database = await loadSoundFontBank(this.files.idx),
            t && (t.textContent = "Indexing Search..."),
            await this.search.loadDatabase(this.database),
            this.generateNewSongs(),
            t && (t.textContent = "Finalizing..."),
            await i,
            t && (t.textContent = "Checking Local Host...");
            let a = await this.checkServerConnection();
            e && (e.style.width = "100%"),
            setTimeout((()=>{
                s && (s.style.display = "none"),
                a || window.__MOBILE_THEATRE__ ? this.showStartButton() : this.showSetupModal()
            }
            ), 500)
        } catch (e) {
            console.error(e),
            t && (t.textContent = "Error: " + e.message,
            t.style.color = "red")
        }
    }
    async scanBackgroundVideos() {
        if (this.bgvList = [],
        "Custom" === this.settings.bgv_source) {
            const t = await this.storage.getBGVKeys();
            if (t && t.length > 0)
                return console.log(`[Media] Using Custom Source: ${t.length} files found.`),
                this.bgvList = t,
                void this.changeBackgroundVideo();
            console.warn("[Media] Custom Source Empty. Reverting to Default."),
            this.settings.bgv_source = "Default"
        }
        const t = [];
        for (let e = 1; e <= 20; e++) {
            const s = new Promise((t=>setTimeout((()=>t(null)), 3e3)))
              , i = fetch(`assets/BGV/bgv ${e}.mp4`, {
                method: "HEAD"
            }).then((t=>{
                const s = t.headers.get("content-type");
                return t.ok && s && s.includes("video") ? `assets/BGV/bgv ${e}.mp4` : null
            }
            )).catch((()=>null));
            t.push(Promise.race([i, s]))
        }
        const e = await Promise.all(t);
        this.bgvList = e.filter((t=>t)),
        0 === this.bgvList.length ? console.warn("No valid videos found.") : this.changeBackgroundVideo()
    }
    generateNewSongs() {
        const t = Math.min(50, this.database.length);
        for (let e = Math.max(0, this.database.length - t); e < this.database.length; e++) {
            const t = this.database[e];
            this.newSongsList.push([String(t.code), t.name, t.artistName])
        }
        this.painter.newSongsList = this.newSongsList
    }
    showSetupModal() {
        if (window.__MOBILE_THEATRE__)
            return void this.startSystem();
        const t = navigator.userAgent;
        let e = "No Host App Available"
          , s = "#";
        t.includes("Windows") ? (e = "Download Windows Host (.exe)",
        s = "downloads/MegaOke_Setup.exe") : t.includes("Android") && (e = "Download Android Host (.apk)",
        s = "downloads/MegaOke.apk");
        const i = `\n            <div id="setup-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: Arial, sans-serif; color: white; text-align: center;">\n                <h1 style="color: yellow; font-size: 60px; margin-bottom: 20px;">Local Host Not Detected</h1>\n                <p style="font-size: 24px; max-width: 800px; margin-bottom: 40px; color: #ccc;">To use smartphones as remote controls, you need the <b>Host Application</b> running on this device.</p>\n                ${t.includes("Windows") || t.includes("Android") ? `\n                <div style="display: flex; gap: 20px; justify-content: center; align-items: center; margin-bottom: 40px;">\n                    <a href="${s}" style="background: #00e5ff; color: black; padding: 20px 40px; font-size: 30px; font-weight: bold; text-decoration: none; border-radius: 10px;">${e}</a>\n                    <button id="btn-force-launch" style="background: #ff9800; color: black; padding: 20px 40px; font-size: 30px; font-weight: bold; border: none; border-radius: 10px; cursor: pointer;">Launch Installed Host</button>\n                </div>\n                <p style="color: #888; margin-bottom: 40px;">If installed, click Launch. Otherwise Download & Run.</p>` : ""}\n                <button id="btn-standalone" style="background: transparent; border: 2px solid #666; color: #aaa; padding: 15px 30px; font-size: 20px; cursor: pointer; border-radius: 8px; transition: all 0.2s;">Continue in Standalone Mode (Keyboard Only)</button>\n            </div>`
          , n = document.createElement("div");
        n.innerHTML = i,
        document.body.appendChild(n);
        const a = document.getElementById("btn-force-launch");
        a && (a.onclick = async()=>{
            await this.attemptProtocolLaunch(),
            setTimeout((()=>location.reload()), 3e3)
        }
        ),
        document.getElementById("btn-standalone").onclick = ()=>{
            document.body.removeChild(n);
            try {
                this.audio.playDigitSound("0")
            } catch (t) {}
            this.startSystem()
        }
    }
    attemptProtocolLaunch() {
        return new Promise((t=>{
            const e = document.createElement("iframe");
            e.style.display = "none",
            document.body.appendChild(e);
            try {
                e.contentWindow.location.href = "megaoke://start"
            } catch (t) {}
            setTimeout((()=>{
                document.body.removeChild(e),
                t()
            }
            ), 4e3)
        }
        ))
    }
    showStartButton() {
        const t = document.createElement("div");
        t.id = "start-interaction-overlay",
        t.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 99999; display: flex; flex-direction: column; justify-content: center; align-items: center; backdrop-filter: blur(5px);",
        t.innerHTML = '\n            <div style="background: rgba(0,0,0,0.6); border: 2px solid #00e5ff; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 0 50px rgba(0, 229, 255, 0.3);">\n                <div style="color: #00e5ff; font-family: sans-serif; font-size: 20px; margin-bottom: 20px; letter-spacing: 3px; font-weight: bold;">SYSTEM READY</div>\n                <button id="btn-enter-karaoke" style="\n                    background: #00e5ff;\n                    color: black;\n                    border: none;\n                    padding: 20px 50px;\n                    font-size: 24px;\n                    font-weight: bold;\n                    border-radius: 50px;\n                    cursor: pointer;\n                    transition: transform 0.2s, box-shadow 0.2s;\n                    font-family: sans-serif;\n                    box-shadow: 0 0 20px rgba(0, 229, 255, 0.5);\n                    outline: none;\n                ">USE KARAOKE NOW</button>\n            </div>\n        ',
        document.body.appendChild(t);
        const e = document.getElementById("btn-enter-karaoke")
          , s = ()=>{
            if (document.body.contains(t)) {
                document.body.removeChild(t),
                window.removeEventListener("keydown", a);
                try {
                    this.audio.playDigitSound("0")
                } catch (t) {}
                this.startSystem()
            }
        }
          , i = ()=>{
            e.style.transform = "scale(1.05)",
            e.style.boxShadow = "0 0 40px rgba(0, 229, 255, 0.8)"
        }
          , n = ()=>{
            e.style.transform = "scale(1)",
            e.style.boxShadow = "0 0 20px rgba(0, 229, 255, 0.5)"
        }
        ;
        e.onmouseover = i,
        e.onmouseout = n,
        e.onfocus = i,
        e.onblur = n,
        e.onclick = s,
        e.ontouchend = t=>{
            t.preventDefault(),
            s()
        }
        ;
        const a = t=>{
            ["Enter", " "].includes(t.key) || 13 === t.keyCode || 32 === t.keyCode ? (t.preventDefault(),
            s()) : (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(t.key) || [37, 38, 39, 40].includes(t.keyCode)) && (t.preventDefault(),
            e.focus())
        }
        ;
        window.addEventListener("keydown", a),
        setTimeout((()=>e.focus()), 100)
    }
    startSystem() {
        this.state = "IDLE",
        this.painter.uiState = "IDLE",
        this.painter.updateSettings(this.settings),
        this.setupBackgroundVideo(),
        this.ads.init(),
        console.log("[System] Auto-starting Broadcast Engine."),
        this.initiateBroadcastSequence();
        const t = ()=>{
            this.warmUpAudio()
        }
        ;
        document.addEventListener("mousedown", t),
        document.addEventListener("keydown", t),
        document.addEventListener("touchstart", t),
        document.addEventListener("click", t),
        requestAnimationFrame((t=>this.gameLoop(t))),
        setInterval((()=>this.logicLoop()), 1e3),
        this.initBackgroundLoop(),
        document.addEventListener("keydown", (t=>this.handleInput(t))),
        this.updateIdleDisplay(),
        this.painter.render(0)
    }
    async initiateBroadcastSequence() {
        console.log("[Broadcast] Negotiating handshake..."),
        setTimeout((()=>{
            console.log("[Broadcast] Initiating playback sequence..."),
            this.loadNextContentVideo()
        }
        ), 1e3)
    }
    setupBackgroundVideo() {
        this.bgvVideoEl && (this.bgvSnapshot || (this.bgvSnapshot = document.createElement("canvas"),
        this.bgvSnapshot.id = "bg-video-snapshot",
        this.bgvSnapshot.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:10; display:none; pointer-events:none;",
        this.bgvVideoEl.parentNode && this.bgvVideoEl.parentNode.insertBefore(this.bgvSnapshot, this.bgvVideoEl.nextSibling)),
        0 !== this.bgvList.length ? (this.bgvVideoEl.onerror = ()=>{
            console.error("[Media] Playback Error. Force-unfreezing and recycling."),
            this.unfreezeFrame(),
            setTimeout((()=>this.changeBackgroundVideo()), 2e3)
        }
        ,
        this.bgvVideoEl.ontimeupdate = null) : this.bgvVideoEl.style.display = "none")
    }
    async changeBackgroundVideo() {
        this.loadNextContentVideo()
    }
    async loadNextContentVideo(t=!1) {
        if (!this.bgvVideoEl)
            return;
        if (0 === this.bgvList.length && (console.warn("[Media] BGV List empty. Attempting rescan..."),
        await this.scanBackgroundVideos(),
        0 === this.bgvList.length))
            return;
        this.freezeFrame(),
        this.currentBlobUrl && (URL.revokeObjectURL(this.currentBlobUrl),
        this.currentBlobUrl = null);
        let e = this.bgvState.currentContentUrl
          , s = "Custom" === this.settings.bgv_source;
        if (!t || !e) {
            const i = Math.floor(Math.random() * this.bgvList.length);
            e = this.bgvList[i],
            this.bgvList.length > 1 && (!s && this.bgvVideoEl.src.includes(e) || s && this.bgvState.currentContentUrl === e) && (e = this.bgvList[(i + 1) % this.bgvList.length]),
            this.bgvState.currentContentUrl = e,
            this.bgvState.resumeTime = 0,
            t || console.log(`[Media] Loaded new content: ${e}.`)
        }
        if (s)
            try {
                const t = await this.storage.getBGVFile(e);
                if (!t)
                    return console.warn("File not found in DB"),
                    void this.changeBackgroundVideo();
                this.currentBlobUrl = URL.createObjectURL(t),
                this.bgvVideoEl.src = this.currentBlobUrl
            } catch (t) {
                console.error("Disk Read Error", t);
                try {
                    await this.storage.init()
                } catch (t) {
                    console.error("Storage revival failed", t)
                }
                return void setTimeout((()=>this.changeBackgroundVideo()), 500)
            }
        else
            this.bgvVideoEl.src = e;
        this.bgvVideoEl.muted = !0,
        this.bgvVideoEl.volume = 0,
        this.bgvVideoEl.loop = !1,
        this.bgvVideoEl.onended = ()=>this.handleContentEnded();
        try {
            await this.bgvVideoEl.load(),
            t && this.bgvState.resumeTime > 0 && (this.bgvVideoEl.currentTime = this.bgvState.resumeTime),
            await this.bgvVideoEl.play(),
            setTimeout((()=>this.unfreezeFrame()), 150)
        } catch (t) {
            console.warn("[Media] BGV Autoplay Blocked / Failed.", t),
            this.unfreezeFrame(),
            setTimeout((()=>this.changeBackgroundVideo()), 2e3)
        }
    }
    handleContentEnded() {
        return this.bgvVideoEl.duration < 1 || this.bgvVideoEl.currentTime < 1 ? (console.warn("[Media] Content ended prematurely, likely a load error. Changing video."),
        void setTimeout((()=>this.changeBackgroundVideo()), 1e3)) : (console.log("[Media] Content video finished. Initiating next video change."),
        0 === this.bgvList.length ? (console.warn("[Media] List empty on cycle. Rescanning..."),
        void this.scanBackgroundVideos()) : void this.changeBackgroundVideo())
    }
    freezeFrame() {
        if (this.bgvSnapshot && this.bgvVideoEl && this.bgvVideoEl.readyState >= 2)
            try {
                this.bgvSnapshot.width = this.bgvVideoEl.clientWidth || 1280,
                this.bgvSnapshot.height = this.bgvVideoEl.clientHeight || 720;
                this.bgvSnapshot.getContext("2d").drawImage(this.bgvVideoEl, 0, 0, this.bgvSnapshot.width, this.bgvSnapshot.height),
                this.bgvSnapshot.style.display = "block",
                this.bgvSnapshotTimeout && clearTimeout(this.bgvSnapshotTimeout),
                this.bgvSnapshotTimeout = setTimeout((()=>this.unfreezeFrame()), 1e4)
            } catch (t) {
                console.warn("[Media] Freeze failed.", t)
            }
    }
    unfreezeFrame() {
        this.bgvSnapshot && (this.bgvSnapshot.style.display = "none"),
        this.bgvSnapshotTimeout && clearTimeout(this.bgvSnapshotTimeout)
    }
    initBackgroundLoop() {
        setInterval((()=>{
            if (Date.now() - this.lastUiUpdate < 300)
                return;
            if ("PLAYING" !== this.state)
                return;
            const t = this.currentPlayTime;
            this.isHost && (!this.lastTimeBroadcast || performance.now() - this.lastTimeBroadcast > 200) && (this.broadcast({
                type: "time_update",
                time: t
            }),
            this.lastTimeBroadcast = performance.now()),
            this.lyricLines.length && (this.updateLyricsLogic(t),
            this.audio.isPlaying || this.audio.isPaused || this.handleSongEnd())
        }
        ), 200)
    }
    gameLoop(t) {
        this.lastUiUpdate = Date.now();
        const e = this.currentPlayTime;
        if ("PLAYING" === this.state && (this.isHost && (!this.lastTimeBroadcast || t - this.lastTimeBroadcast > 200) && (this.broadcast({
            type: "time_update",
            time: e
        }),
        this.lastTimeBroadcast = t),
        this.lyricLines.length)) {
            this.checkScrollLogic(e);
            const t = this.calculateHighlightForLine(this.topLineIdx, e)
              , s = this.calculateHighlightForLine(this.botLineIdx, e);
            this.painter.setHighlights(t, s),
            this.updateLyricsLogic(e),
            this.audio.isPlaying || this.audio.isPaused || this.handleSongEnd()
        }
        this.painter.render(e),
        requestAnimationFrame((t=>this.gameLoop(t)))
    }
    logicLoop() {
        const t = Date.now();
        "IDLE" === this.state && this.inputBuffer && t - this.lastInputTime > 15e3 && (this.inputBuffer = "",
        this.updateIdleDisplay()),
        this.playbackInputCode && t - this.lastInputTime > 5e3 && (this.playbackInputCode = "",
        this.painter.setPlaybackInputDisplay(""));
        let e = !1;
        if ("IDLE" !== this.state || this.searchActive || this.inputBuffer)
            this.idleStateDuration = 0,
            "SELECT" !== this.painter.idleMode && (this.painter.idleMode = "SELECT",
            this.ads.hideIdleBanner(),
            e = !0);
        else {
            this.idleStateDuration++;
            const t = this.idleStateDuration % 90
              , s = this.painter.idleMode
              , i = this.painter.cache ? this.painter.cache.newSongsPage : -1;
            t < 15 ? (this.painter.idleMode = "SELECT",
            this.ads.hideIdleBanner()) : t < 45 ? (this.painter.idleMode = "COMMERCIAL",
            this.ads.showIdleBanner()) : t < 55 ? (this.ads.hideIdleBanner(),
            this.painter.idleMode = "LOGO") : (this.ads.hideIdleBanner(),
            this.painter.idleMode = "NEW_SONGS",
            this.painter.newSongsPage = Math.floor((t - 55) / 5)),
            this.painter.idleMode !== s && (e = !0),
            "NEW_SONGS" === this.painter.idleMode && this.painter.cache && this.painter.cache.newSongsPage !== i && (e = !0),
            this.painter.render(0)
        }
        e && this.broadcastState()
    }
    handleInput(t) {
        const e = t.key;
        t.preventDefault && (e.startsWith("F") || "Tab" === e) && t.preventDefault(),
        this.lastInputTime = Date.now(),
        "MediaPlayPause" !== e ? "MediaStop" !== e ? "MediaTrackNext" !== e ? "MediaTrackPrevious" !== e ? e !== KEY_MAP.search ? e !== KEY_MAP.setup ? e !== KEY_MAP.fullscreen ? e !== KEY_MAP.volume_up ? e !== KEY_MAP.volume_down ? this.searchActive ? this.handleSearchInput(e) : "SETUP" === this.state ? this.handleSetupInput(e) : "IDLE" === this.state ? this.handleIdleInput(e) : "PLAYING" === this.state ? this.handlePlayingInput(e) : ["SCORING", "RANKING"].includes(this.state) && ["Enter", KEY_MAP.next, KEY_MAP.stop].includes(e) && this.startNextSong() : this.changeVolume(-5) : this.changeVolume(5) : this.toggleFullscreen() : this.toggleSetup() : this.toggleSearch() : "PLAYING" === this.state && this.stopSong(!1) : this.startNextSong() : this.triggerStop() : this.triggerPlayPause()
    }
    toggleFullscreen() {
        document.fullscreenElement ? document.exitFullscreen && document.exitFullscreen() : document.documentElement.requestFullscreen().catch((()=>{}
        ))
    }
    handleIdleInput(t) {
        /^\d$/.test(t) ? (this.inputBuffer = (this.inputBuffer + t).slice(-6),
        this.settings.digit_key_sound && this.audio.playDigitSound(t),
        this.updateIdleDisplay()) : "Backspace" === t || t === KEY_MAP.cancel ? (this.inputBuffer = this.inputBuffer.slice(0, -1),
        this.updateIdleDisplay()) : "Enter" !== t && t !== KEY_MAP.reserve && t !== KEY_MAP.first_reserve || this.inputBuffer && (this.playSongByCode(this.inputBuffer),
        this.inputBuffer = "",
        this.updateIdleDisplay())
    }
    updateIdleDisplay() {
        const t = this.findSong(this.inputBuffer)
          , e = t ? t.name : ""
          , s = t ? t.artistName : "";
        let i = t ? `${e} / ${s}` : "";
        i || (i = this.isHost ? `Connect to: ${this.hostIp}` : "Select a Song"),
        this.painter.setIdleData(this.inputBuffer || "", "Select a Song", i),
        this.broadcastState()
    }
    handlePlayingInput(t) {
        if (t === KEY_MAP.stop)
            this.triggerStop();
        else if (t === KEY_MAP.next)
            this.startNextSong();
        else if (t === KEY_MAP.play_pause)
            this.playbackInputCode ? (this.playSongByCode(this.playbackInputCode),
            this.playbackInputCode = "",
            this.painter.setPlaybackInputDisplay("")) : this.triggerPlayPause();
        else if (t === KEY_MAP.tempo_fast)
            this.changeTempo(.1);
        else if (t === KEY_MAP.tempo_slow)
            this.changeTempo(-.1);
        else if (t === KEY_MAP.pitch_down)
            this.changeKey(-1);
        else if (t === KEY_MAP.pitch_up)
            this.playbackInputCode.length > 0 ? this.handleBackspaceInPlayback() : this.changeKey(1);
        else if (t === KEY_MAP.melody) {
            const t = this.audio.toggleMelody();
            this.painter.triggerOverlay("MELODY", t, 0, 8)
        } else if (/^\d$/.test(t)) {
            this.playbackInputCode = (this.playbackInputCode + t).slice(-6),
            this.settings.digit_key_sound && this.audio.playDigitSound(t);
            const e = this.findSong(this.playbackInputCode);
            this.painter.setPlaybackInputDisplay(this.playbackInputCode, e?.name, e?.artistName)
        } else
            "Backspace" === t || t === KEY_MAP.cancel ? this.handleBackspaceInPlayback() : "Enter" === t || t === KEY_MAP.reserve ? this.playbackInputCode && (this.reserveSong(this.playbackInputCode),
            this.playbackInputCode = "",
            this.painter.setPlaybackInputDisplay("")) : t === KEY_MAP.first_reserve && this.playbackInputCode && (this.priorityReserveSong(this.playbackInputCode),
            this.playbackInputCode = "",
            this.painter.setPlaybackInputDisplay(""))
    }
    handleBackspaceInPlayback() {
        if (this.playbackInputCode.length > 0) {
            this.playbackInputCode = this.playbackInputCode.slice(0, -1);
            const t = this.findSong(this.playbackInputCode);
            this.painter.setPlaybackInputDisplay(this.playbackInputCode, t?.name, t?.artistName)
        }
    }
    changeKey(t) {
        this.currentTranspose = Math.max(-12, Math.min(12, this.currentTranspose + t)),
        this.audio.setTranspose(this.currentTranspose),
        this.painter.triggerOverlay("KEY", (this.currentTranspose > 0 ? "+" : "") + this.currentTranspose, -12, 12),
        this.broadcastState()
    }
    changeTempo(t) {
        let e = Math.max(.5, Math.min(2, this.audio.tempoRatio + t));
        this.audio.setTempo(e),
        this.painter.triggerOverlay("TEMPO", `${Math.round(100 * (e - 1))}%`, -50, 100),
        this.broadcastState()
    }
    changeVolume(t) {
        let e = Math.max(0, Math.min(100, this.audio.volume + t));
        this.audio.setVolume(e),
        this.painter.triggerOverlay("VOLUME", e, 0, 100),
        this.broadcastState()
    }
    async openSetupMenu() {}
    async toggleSetup() {
        "SETUP" === this.state ? this.executeSetupAction("exit") : (this.searchActive && (this.searchActive = !1,
        this.painter.searchActive = !1),
        this.previousState = this.state,
        this.state = "SETUP",
        this.painter.uiState = "SETUP",
        await this._refreshMidiOptions(),
        this.tempSettings = {
            ...this.settings
        },
        this.setupState = {
            leftIdx: 0,
            rightIdx: 0,
            activeCol: "left"
        },
        this.updatePainterSetupData()),
        this.painter.render(0)
    }
    async _refreshMidiOptions() {
        SETUP_MENU_STRUCTURE.options_map.midi_device || (SETUP_MENU_STRUCTURE.options_map.midi_device = ["Web Audio", "SpessaSynth", "LibFluidSynth"]);
        let t = [...SETUP_MENU_STRUCTURE.options_map.midi_device];
        if (window.JZZ)
            try {
                await window.JZZ().refresh();
                (await window.JZZ().info()).outputs.forEach((e=>{
                    t.includes(e.name) || "Web Audio" === e.name || t.push(e.name)
                }
                ))
            } catch (t) {}
        SETUP_MENU_STRUCTURE.options_map.midi_device = t
    }
    handleSetupInput(t) {
        const e = SETUP_MENU_STRUCTURE
          , s = e.categories;
        if ("left" === this.setupState.activeCol) {
            if ("ArrowUp" === t)
                this.setupState.leftIdx = (this.setupState.leftIdx - 1 + s.length) % s.length;
            else if ("ArrowDown" === t)
                this.setupState.leftIdx = (this.setupState.leftIdx + 1) % s.length;
            else if ("Enter" === t || "ArrowRight" === t) {
                const t = s[this.setupState.leftIdx][0];
                ["default", "exit", "exit_save"].includes(t) ? this.executeSetupAction(t) : (this.setupState.activeCol = "right",
                this.setupState.rightIdx = 0)
            }
        } else {
            const i = s[this.setupState.leftIdx][0]
              , n = e.options_map[i] || [];
            if ("ArrowUp" === t)
                this.setupState.rightIdx = (this.setupState.rightIdx - 1 + n.length) % n.length;
            else if ("ArrowDown" === t)
                this.setupState.rightIdx = (this.setupState.rightIdx + 1) % n.length;
            else if ("ArrowLeft" === t)
                this.setupState.activeCol = "left";
            else if ("Enter" === t) {
                const t = n[this.setupState.rightIdx];
                if ("Import New..." === t || "Delete All" === t)
                    return void this.executeSetupAction({
                        category: i,
                        action: t
                    });
                "bgv_custom_settings" === i && ("On (Custom)" === t ? this.tempSettings.bgv_source = "Custom" : "Off (Default)" === t && (this.tempSettings.bgv_source = "Default")),
                "sf2_custom_settings" === i && ("On (Custom)" === t ? this.tempSettings.midi_soundfont = "Custom" : "Off (Default)" === t && (this.tempSettings.midi_soundfont = "Default")),
                this.tempSettings[i] = n[this.setupState.rightIdx],
                this.setupState.activeCol = "left"
            }
        }
        this.updatePainterSetupData(),
        this.painter.render(0)
    }
    async executeSetupAction(t) {
        if ("object" == typeof t) {
            const {category: e, action: s} = t;
            return "bgv_custom_settings" === e ? void ("Import New..." === s ? this.fileInputs.bgv && this.fileInputs.bgv.click() : "Delete All" === s && confirm("Remove all custom pictures and videos?") && (await this.storage.clearCustomBGVs(),
            this.settings.bgv_source = "Default",
            this.tempSettings.bgv_source = "Default",
            this.tempSettings.bgv_custom_settings = "Off (Default)",
            this.saveSettings(),
            this.scanBackgroundVideos(),
            alert("Custom Backgrounds Cleared."))) : "sf2_custom_settings" === e ? void ("Import New..." === s ? ("Web Audio" === this.settings.midi_device && alert("NOTE: Custom SoundFonts do NOT work with 'Web Audio'.\nPlease switch MIDI Device to 'LibFluidSynth' or 'SpessaSynth'."),
            this.fileInputs.sf2 && this.fileInputs.sf2.click()) : "Delete All" === s && confirm("Remove custom SoundFont?") && (await this.storage.clearCustomSF2(),
            this.settings.midi_soundfont = "Default",
            this.tempSettings.midi_soundfont = "Default",
            this.tempSettings.sf2_custom_settings = "Off (Default)",
            this.saveSettings(),
            alert("Custom SoundFont Cleared. Restart required."))) : void 0
        }
        const e = t;
        if ("default" === e)
            this.tempSettings = {
                ...DEFAULT_SETTINGS
            };
        else if ("exit" === e)
            this.state = this.previousState || "IDLE",
            this.painter.uiState = this.state;
        else if ("exit_save" === e) {
            const t = this.tempSettings.midi_device
              , e = this.settings.midi_device
              , s = this.tempSettings.bgv_custom_settings;
            "On (Custom)" === s ? this.tempSettings.bgv_source = "Custom" : "Off (Default)" === s && (this.tempSettings.bgv_source = "Default");
            const i = this.tempSettings.sf2_custom_settings;
            "On (Custom)" === i ? this.tempSettings.midi_soundfont = "Custom" : "Off (Default)" === i && (this.tempSettings.midi_soundfont = "Default");
            const n = this.settings.midi_device !== this.tempSettings.midi_device
              , a = this.settings.midi_soundfont !== this.tempSettings.midi_soundfont
              , o = this.customSf2Imported
              , r = a || o || n && "Custom" === this.tempSettings.midi_soundfont;
            this.settings = {
                ...this.tempSettings
            },
            this.saveSettings(),
            t !== e && await this.audio.changeMidiDevice(t),
            this.painter.updateSettings(this.settings),
            r && (this.audio.stop(),
            "Custom" === this.settings.midi_soundfont ? await this.loadCustomSoundFont() : this.audio.loadSoundFont && await this.audio.loadSoundFont(null),
            this.customSf2Imported = !1),
            this.scanBackgroundVideos(),
            "Picture" === this.settings.bgv_mode ? (this.bgvVideoEl.style.display = "none",
            this.bgvVideoEl.pause()) : "none" === this.bgvVideoEl.style.display && (this.bgvVideoEl.style.display = "block",
            this.changeBackgroundVideo()),
            this.state = this.previousState || "IDLE",
            this.painter.uiState = this.state
        }
        this.updatePainterSetupData(),
        this.painter.render(0)
    }
    updatePainterSetupData() {
        "Custom" === this.tempSettings.bgv_source ? this.tempSettings.bgv_custom_settings = "On (Custom)" : this.tempSettings.bgv_custom_settings = "Off (Default)",
        "Custom" === this.tempSettings.midi_soundfont ? this.tempSettings.sf2_custom_settings = "On (Custom)" : this.tempSettings.sf2_custom_settings = "Off (Default)",
        this.painter.setSetupData({
            structure: SETUP_MENU_STRUCTURE,
            state: this.setupState,
            currentVal: this.tempSettings[SETUP_MENU_STRUCTURE.categories[this.setupState.leftIdx][0]]
        })
    }
    toggleSearch() {
        "SETUP" !== this.state && (this.searchActive = !this.searchActive,
        this.painter.searchActive = this.searchActive,
        this.searchActive && (this.searchInput = "",
        this.runSearch()),
        this.painter.render(0))
    }
    handleSearchInput(t) {
        if ("ArrowUp" === t)
            this.searchSelection > 0 && (this.searchSelection--,
            this.updateSearchUI());
        else if ("ArrowDown" === t)
            this.searchResults && this.searchSelection < this.searchResults.length - 1 && (this.searchSelection++,
            this.updateSearchUI());
        else if ("Enter" === t || t === KEY_MAP.reserve) {
            if (this.searchResults[this.searchSelection]) {
                const t = this.searchResults[this.searchSelection][0];
                "IDLE" === this.state ? this.playSongByCode(t) : this.reserveSong(t),
                this.toggleSearch()
            }
        } else if (t === KEY_MAP.first_reserve) {
            if (this.searchResults[this.searchSelection]) {
                const t = this.searchResults[this.searchSelection][0];
                "IDLE" === this.state ? this.playSongByCode(t) : this.priorityReserveSong(t),
                this.toggleSearch()
            }
        } else
            /^[a-zA-Z0-9 ]$/.test(t) ? (this.searchInput += t.toUpperCase(),
            this.runSearch()) : "Backspace" === t ? (this.searchInput = this.searchInput.slice(0, -1),
            this.runSearch()) : t !== KEY_MAP.search && "Escape" !== t || this.toggleSearch();
        this.painter.render(0)
    }
    async runSearch() {
        this.searchResults = await this.search.search(this.searchInput),
        this.searchSelection = 0,
        this.updateSearchUI()
    }
    updateSearchUI() {
        this.painter.setSearchState(this.searchActive, "IDLE", this.searchInput, "", "", this.searchResults, this.searchSelection, this.searchResults.length),
        this.painter.render(0)
    }
    findSong(t) {
        if (t)
            return this.database.find((e=>parseInt(e.code, 10) === parseInt(t, 10)))
    }
    reserveSong(t) {
        "IDLE" !== this.state ? this.findSong(t) && (this.songQueue.push(t),
        this.painter.setQueue(this.songQueue),
        this.broadcastState()) : this.playSongByCode(t)
    }
    priorityReserveSong(t) {
        "IDLE" !== this.state ? this.findSong(t) && (this.songQueue.unshift(t),
        this.painter.setQueue(this.songQueue),
        this.broadcastState()) : this.playSongByCode(t)
    }
    cancelReservation(t) {
        const e = this.songQueue.findIndex((e=>String(e) === String(t)));
        e > -1 ? (this.songQueue.splice(e, 1),
        this.painter.setQueue(this.songQueue),
        this.broadcastState()) : String(this.currentSongCode) === String(t) && this.stopSong(!0)
    }
    async playSongByCode(t) {
        const e = this.findSong(t);
        if (e) {
            this.stopSong(!1),
            this.currentSongCode = t,
            this.painter.setPlayingSongCode(t),
            this.broadcastState(),
            this.state = "LOADING",
            this.currentLyrics = null,
            this.lyricLines = [],
            this.painter.setLyrics([], -1, -1),
            this.lastBroadcastLinesHash = "";
            try {
                let t = null;
                if ("midi" === e.type) {
                    const s = e.midi_pos * SECTOR_SIZE
                      , i = s + e.midi_size * SECTOR_SIZE - 1
                      , n = await fetch("assets/IDX/MEGMID", {
                        headers: {
                            Range: `bytes=${s}-${i}`
                        }
                    });
                    t = await n.arrayBuffer();
                    const a = await decodeControlVoltage(t, e.langName, "");
                    this.lyricLines = a.lines,
                    this.currentLyrics = a
                } else if ("mp3" === e.type) {
                    const s = e.mp3_vol || 0
                      , i = 0 === s ? "MEGVOL" : `MEGVOL ${s}`
                      , n = e.mp3_pos * SECTOR_SIZE
                      , a = n + e.mp3_size * SECTOR_SIZE - 1
                      , o = await fetch(`assets/IDX/${i}`, {
                        headers: {
                            Range: `bytes=${n}-${a}`
                        }
                    });
                    if (t = await o.arrayBuffer(),
                    e.midi_size > 0 && 65535 !== e.midi_size) {
                        const t = e.midi_pos * SECTOR_SIZE
                          , s = t + e.midi_size * SECTOR_SIZE - 1
                          , i = await fetch("assets/IDX/MEGMID", {
                            headers: {
                                Range: `bytes=${t}-${s}`
                            }
                        });
                        if (i.ok) {
                            const t = await parseMidiData(await i.arrayBuffer(), e.langName, "");
                            this.lyricLines = t.lines,
                            this.currentLyrics = t
                        }
                    }
                }
                this.lyricLines.length || (this.lyricLines = [],
                this.currentLyrics = {
                    lines: [],
                    metadata: {}
                }),
                this.precalculateSongMetrics(),
                this.painter.uiState = "PLAYING",
                this.topLineIdx = 0,
                this.botLineIdx = 1,
                this.currentInterludeText = "",
                this.lastCountdownState = "",
                this.currentTranspose = 0,
                this.audio.setTranspose(0),
                this.smoothedTime = 0,
                this.lastAudioTime = 0,
                this.lastSystemTime = performance.now();
                const s = this.currentLyrics.metadata || {};
                s.t || (s.t = e.name),
                s.s || (s.s = e.artistName),
                this.painter.setMetadata(s),
                this.painter.setShowMetadata(!0),
                await this.audio.play({
                    type: e.type,
                    buffer: t
                }),
                this.state = "PLAYING",
                this.broadcastState(),
                this.painter.render(0)
            } catch (t) {
                console.error(t),
                this.stopSong()
            }
        }
    }
    handleSongEnd() {
        this.settings.score_mode ? this.startScoring() : this.startNextSong()
    }
    startScoring() {
        this.state = "SCORING",
        this.painter.uiState = "SCORING",
        this.painter.setCountdownState(""),
        this.lastCountdownState = "";
        let t = 90;
        const e = this.settings.score_settings || "Mid";
        t = "High" === e ? Math.floor(16 * Math.random()) + 85 : "Mid" === e ? Math.floor(26 * Math.random()) + 75 : Math.floor(51 * Math.random()) + 50;
        let s = "Good Job!";
        if (s = t <= 50 ? "Try again next time" : t <= 75 ? "Improve your singing" : t <= 85 ? "Nice singing" : t <= 90 ? "What a nice voice!" : "Excellent Singer!",
        this.painter.setScore(t, s),
        this.broadcastState(),
        this.broadcast({
            type: "score",
            value: t
        }),
        this.settings.fanfare_mode) {
            let e = t > 90 ? 6 : t > 80 ? 5 : t > 70 ? 4 : t > 60 ? 3 : 2;
            this.audio.playScoreSound(e)
        }
        this.painter.render(0),
        setTimeout((()=>{
            "SCORING" === this.state && this.startNextSong()
        }
        ), 4e3)
    }
    startNextSong() {
        if (this.songQueue.length > 0) {
            const t = this.songQueue.shift();
            this.playSongByCode(t),
            this.painter.setQueue(this.songQueue),
            this.broadcastState()
        } else
            this.stopSong(!0)
    }
    stopSong(t=!0) {
        this.audio.stop(),
        t && (this.state = "IDLE",
        this.painter.uiState = "IDLE",
        this.currentSongCode = null,
        this.painter.setPlayingSongCode(null),
        this.painter.setShowMetadata(!1),
        this.painter.setCountdownState(""),
        this.lastCountdownState = "",
        this.updateIdleDisplay(),
        this.painter.render(0))
    }
    updateLyricsLogic(t) {
        if (!this.lyricLines || !this.lyricLines.length)
            return;
        if (this.painter.showMetadataOverlay) {
            const e = this.lyricLines[0].startMs;
            t >= e - 4500 && this.painter.setShowMetadata(!1)
        }
        let e = this.lyricLines.findIndex((e=>t >= e.startMs && t <= e.endMs));
        -1 === e && (e = this.lyricLines.findIndex((e=>t < e.startMs))),
        -1 !== e && (e % 2 == 0 ? (this.topLineIdx = e,
        this.botLineIdx = e + 1) : (this.botLineIdx = e,
        this.topLineIdx = e + 1)),
        this.painter.setLyrics(this.lyricLines, this.topLineIdx, this.botLineIdx),
        this.painter.showMetadataOverlay || (this.calculateCountdown(t, this.lyricLines),
        this._broadcastLyricsIfChanged())
    }
    calculateHighlightForLine(t, e) {
        if (t < 0 || t >= this.lyricLines.length)
            return 0;
        const s = this.lyricLines[t];
        if (e < s.startMs)
            return 0;
        const i = this.getLineEndTime(t);
        if (e >= i)
            return s.totalWidthPx || 0;
        let n = 0;
        for (; n + 1 < s.fragments.length && e >= s.fragments[n + 1].absMs; )
            n++;
        const a = s.fragments[n]
          , o = a.absMs;
        let r;
        r = n + 1 < s.fragments.length ? s.fragments[n + 1].absMs : i;
        const h = Math.max(0, Math.min(1, (e - o) / (r - o)));
        let d = 0;
        for (let t = 0; t < n; t++)
            d += s.fragments[t].widthPx || 0;
        return d + (a.widthPx || 0) * h
    }
    getLineEndTime(t) {
        if (t >= this.lyricLines.length)
            return 1 / 0;
        if (t + 1 < this.lyricLines.length)
            return this.lyricLines[t + 1].startMs;
        return this.lyricLines[t].startMs + 2e3
    }
    checkScrollLogic(t) {
        let e = !1;
        t >= this.getLineEndTime(this.topLineIdx) && this.topLineIdx + 2 < this.lyricLines.length && (this.topLineIdx += 2,
        e = !0);
        t >= this.getLineEndTime(this.botLineIdx) && this.botLineIdx + 2 < this.lyricLines.length && (this.botLineIdx += 2,
        e = !0),
        e && this.painter.setLyrics(this.lyricLines, this.topLineIdx, this.botLineIdx)
    }
    calculateCountdown(t, e) {
        let s = ""
          , i = null
          , n = 0;
        for (let s = 0; s < e.length; s++) {
            const a = e[s];
            if (a.startMs > t - 1e3) {
                i = a.startMs,
                n = s > 0 ? a.startMs - e[s - 1].endMs : 999999;
                break
            }
        }
        if (null !== i) {
            const e = i - t;
            if (n > 1e4)
                if (e > 5e3) {
                    if (Date.now() > this.interludeSwitchTime)
                        if (this.interludeSwitchTime = Date.now() + 8e3,
                        Math.random() > .5 && this.songQueue.length > 0) {
                            const t = this.findSong(this.songQueue[0]);
                            this.currentInterludeText = t ? `Next: ${t.name}` : "Next: ..."
                        } else {
                            const t = ["Enjoy Singing!", "MegaOke 8.0", "Relax & Sing"];
                            this.currentInterludeText = t[Math.floor(Math.random() * t.length)]
                        }
                    s = this.currentInterludeText
                } else
                    e > 2800 ? s = "" : e > 2100 ? s = "4" : e > 1400 ? s = "3" : e > 700 ? s = "2" : e > 0 ? s = "1" : e > -800 && (s = "Go")
        }
        s !== this.lastCountdownState && (this.lastCountdownState = s,
        this.painter.setCountdownState(s),
        this.broadcastCountdown(s))
    }
    triggerStop() {
        this.state = "IDLE",
        this.audio.stop(),
        this.songQueue.length > 0 ? setTimeout((()=>this.startNextSong()), 300) : this.stopSong(!0)
    }
    triggerPlayPause() {
        this.audio.isPaused ? (this.audio.resume(),
        this.painter.setPaused(!1),
        this.broadcastState()) : this.audio.isPlaying && (this.audio.pause(),
        this.painter.setPaused(!0),
        this.broadcastState())
    }
}
window.onload = ()=>window.app = new MegaOkeApp;
