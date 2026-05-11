import {DEFAULT_SETTINGS, SOUNDFONT_URL} from "./config.js";
import {WorkletSynthesizer} from "./index.min.js";
const JZZ = window.JZZ;
async function loadScript(t) {
    return new Promise(((i,s)=>{
        if (document.querySelector(`script[src="${t}"]`))
            return i();
        const e = document.createElement("script");
        e.src = t,
        e.onload = i,
        e.onerror = s,
        document.head.appendChild(e)
    }
    ))
}
class LibFluidAdapter {
    constructor(t) {
        this.ctx = t,
        this.synth = null,
        this.audioNode = null,
        this.sf2Data = null,
        this.transpose = 0,
        this.melodyLevel = 8,
        this.melodyChannel = 0,
        this.channelVolumes = new Array(16).fill(100),
        this.forceDrumsOnCh11 = !1
    }
    async init() {
        const t = new URL("js/libfluid/libfluidsynth-2.4.6-with-libsndfile.js",document.baseURI).href
          , i = new URL("js/libfluid/js-synthesizer.min.js",document.baseURI).href
          , s = new URL("js/libfluid/js-synthesizer.worklet.min.js",document.baseURI).href;
        await loadScript(t),
        await loadScript(i),
        await JSSynth.waitForReady(),
        "function" == typeof JSSynth.disableLogging && JSSynth.disableLogging();
        const e = new Blob([`\n            importScripts('${t}');\n            importScripts('${s}');\n        `],{
            type: "application/javascript"
        })
          , n = URL.createObjectURL(e);
        try {
            await this.ctx.audioWorklet.addModule(n),
            console.log("[LibFluid] AudioWorklet Loaded.")
        } catch (t) {
            console.warn("[LibFluid] Worklet Failed, fallback to ScriptProcessor.", t)
        }
        console.log(`[LibFluid] Fetching SoundFont: ${SOUNDFONT_URL}`);
        const h = await fetch(SOUNDFONT_URL);
        if (!h.ok)
            throw new Error("SoundFont Fetch Failed");
        this.sf2Data = await h.arrayBuffer(),
        console.log("[LibFluid] Ready.")
    }
    async _createFreshSynth() {
        if (this.synth)
            try {
                this.audioNode && (this.audioNode.disconnect(),
                this.audioNode = null),
                this.synth.close()
            } catch (t) {}
        this.synth = new JSSynth.Synthesizer,
        await this.synth.init(this.ctx.sampleRate),
        await this.synth.loadSFont(this.sf2Data),
        this.audioNode = this.synth.createAudioNode(this.ctx, 8192),
        this.audioNode.connect(this.ctx.destination),
        this.synth.hookPlayerMIDIEvents(((t,i,s)=>{
            const e = s.getChannel();
            if (this.forceDrumsOnCh11 && 10 === e) {
                const e = 9;
                return 144 === i ? t.midiNoteOn(e, s.getKey(), s.getVelocity()) : 128 === i ? t.midiNoteOff(e, s.getKey()) : 176 === i ? t.midiControl(e, s.getKey(), s.getValue()) : 192 === i ? (console.log(`[LibFluid] Rerouting PC: Ch 11 -> 10 | Prog: ${s.getKey()}`),
                t.midiProgramChange(e, s.getKey())) : 224 === i && t.midiPitchBend(e, s.getValue()),
                !0
            }
            if (192 === i)
                return console.log(`[LibFluid] Instrument Change | Ch: ${e + 1} | Prog: ${s.getKey()}`),
                !1;
            if ((144 === i || 128 === i) && 9 !== e && 10 !== e && 0 !== this.transpose) {
                let n = s.getKey()
                  , h = s.getVelocity()
                  , a = Math.max(0, Math.min(127, n + this.transpose));
                return 144 === i && h > 0 ? t.midiNoteOn(e, a, h) : t.midiNoteOff(e, a),
                !0
            }
            if (176 === i && 7 === s.getKey() && (this.channelVolumes[e] = s.getValue(),
            e === this.melodyChannel)) {
                const i = this.melodyLevel / 8;
                return t.midiControl(e, 7, Math.floor(this.channelVolumes[e] * i)),
                !0
            }
            return !1
        }
        ))
    }
    async play(t) {
        this.channelVolumes.fill(100),
        await this._createFreshSynth(),
        await this.synth.addSMFDataToPlayer(t),
        await this.synth.playPlayer()
    }
    async stop() {
        if (this.synth)
            try {
                await this.synth.stopPlayer()
            } catch (t) {}
    }
    async pause() {
        this.synth && (await this.synth.stopPlayer(),
        this.panic())
    }
    async resume() {
        this.synth && await this.synth.playPlayer()
    }
    async setTempo(t) {
        this.synth && await this.synth.setPlayerTempo(0, t)
    }
    setGain(t) {
        this.synth && this.synth.setGain(t)
    }
    panic() {
        if (this.synth)
            for (let t = 0; t < 16; t++)
                this.synth.midiControl(t, 123, 0),
                this.synth.midiControl(t, 121, 0)
    }
    updateMelodyVolume() {
        if (!this.synth)
            return;
        const t = this.channelVolumes[this.melodyChannel]
          , i = this.melodyLevel / 8;
        this.synth.midiControl(this.melodyChannel, 7, Math.floor(t * i))
    }
}
class SpessaJzzAdapter {
    constructor(t) {
        this.synth = t,
        this.forceDrumsOnCh11 = !1
    }
    info() {
        return {
            name: "SpessaSynth SoundFont"
        }
    }
    send(t) {
        if (!this.synth)
            return;
        const i = 240 & t[0];
        let s = 15 & t[0];
        const e = t[1]
          , n = t[2];
        if (240 !== t[0])
            switch (this.forceDrumsOnCh11 && 10 === s && (s = 9),
            i) {
            case 128:
                this.synth.noteOff(s, e, 0);
                break;
            case 144:
                n > 0 ? this.synth.noteOn(s, e, n) : this.synth.noteOff(s, e, 0);
                break;
            case 176:
                this.synth.controllerChange(s, e, n);
                break;
            case 192:
                console.log(`[Spessa] Instrument | Ch: ${16 & t[0]} -> ${s + 1} | Prog: ${e}`),
                this.synth.programChange(s, e);
                break;
            case 224:
                const i = n << 7 | e;
                this.synth.pitchWheel(s, i)
            }
        else {
            for (let i = 0; i < t.length - 7; i++)
                if (65 == t[i] && 64 == t[i + 4] && 26 == t[i + 5] && 2 == t[i + 7]) {
                    console.warn("[Spessa] Smart Detect: Ch 11 is Drums -> Rerouting to 10."),
                    this.forceDrumsOnCh11 = !0;
                    break
                }
            "function" == typeof this.synth.systemExclusive && this.synth.systemExclusive(t)
        }
    }
    allNotesOff(t) {
        this.synth.stopAll(!1)
    }
    allSoundOff(t) {
        this.synth.stopAll(!0)
    }
    resetAllControllers(t) {
        this.synth.resetControllers()
    }
    control(t, i, s) {
        this.synth.controllerChange(t, i, s)
    }
    async wait(t) {
        return new Promise((i=>setTimeout(i, t)))
    }
    close() {}
}
class SoundBank {
    constructor() {
        const t = window.AudioContext || window.webkitAudioContext;
        this.ctx = new t,
        this.digitBuffers = {},
        this.basePath = "assets/PLF/",
        this.loadDigits()
    }
    async loadDigits() {
        for (let t = 0; t <= 9; t++)
            this.loadDigitBuffer(`N ${t}.mp3`, String(t))
    }
    async loadDigitBuffer(t, i) {
        try {
            const s = await fetch(this.basePath + t);
            if (s.ok) {
                const t = await s.arrayBuffer();
                this.digitBuffers[i] = await this.ctx.decodeAudioData(t)
            }
        } catch (t) {}
    }
    playDigit(t) {
        if (this.digitBuffers[t]) {
            "suspended" === this.ctx.state && this.ctx.resume();
            const i = this.ctx.createBufferSource();
            i.buffer = this.digitBuffers[t],
            i.connect(this.ctx.destination),
            i.start(0)
        }
    }
}
export class AudioEngine {
    constructor() {
        this.midiPlayer = null,
        this.audioElement = document.getElementById("audio-player"),
        this.synth = null,
        this.spessaSynth = null,
        this.libFluid = null,
        this.soundBank = new SoundBank,
        this.isPlaying = !1,
        this.isPaused = !1,
        this.currentType = null,
        this.volume = 100,
        this.tempoRatio = 1,
        this.transpose = 0,
        this.melodyChannel = 0,
        this.melodyLevel = 8,
        this.activeMidiDevice = "None",
        this.sysExBlocked = !1,
        this.forceDrumsOnCh11 = !1,
        this.initMidi(DEFAULT_SETTINGS.midi_device || "Web Audio")
    }
    async initMidi(t) {
        if (this.synth) {
            try {
                this.synth.close()
            } catch (t) {}
            this.synth = null
        }
        this.spessaSynth && "SpessaSynth" !== t && (this.spessaSynth = null),
        this.sysExBlocked = !1;
        let i = t;
        if ("WebAudio" === i && (i = "Web Audio"),
        console.log(`[Audio] Init MIDI: ${i}`),
        "LibFluidSynth" === i)
            try {
                return this.libFluid || (this.libFluid = new LibFluidAdapter(this.soundBank.ctx),
                await this.libFluid.init()),
                this.activeMidiDevice = "LibFluidSynth",
                void console.log("[Audio] LibFluid Ready.")
            } catch (t) {
                console.error("LibFluid Init Failed", t),
                i = "Web Audio"
            }
        if ("SpessaSynth" === i)
            try {
                const t = this.soundBank.ctx;
                "suspended" === t.state && await t.resume();
                const i = new URL("./spessasynth_processor.min.js",import.meta.url);
                await t.audioWorklet.addModule(i),
                this.spessaSynth = new WorkletSynthesizer(t);
                const s = await fetch(SOUNDFONT_URL);
                return await this.spessaSynth.soundBankManager.addSoundBank(await s.arrayBuffer()),
                this.spessaSynth.connect(t.destination),
                this.synth = new SpessaJzzAdapter(this.spessaSynth),
                this.activeMidiDevice = "SpessaSynth",
                void this.updateVolume()
            } catch (t) {
                console.error("Spessa Fail", t),
                i = "Web Audio"
            }
        if (JZZ) {
            JZZ.synth && JZZ.synth.Tiny && JZZ.synth.Tiny.register("Web Audio");
            try {
                this.synth = JZZ({
                    sysex: !0
                }).openMidiOut(i),
                await this.synth.wait(100),
                this.activeMidiDevice = this.synth.info().name
            } catch (t) {
                console.warn("SysEx/MIDI Permission Denied. Falling back to Safe Mode (No SysEx)."),
                this.synth = JZZ().openMidiOut("Web Audio"),
                this.activeMidiDevice = "Web Audio (Safe Mode)",
                this.sysExBlocked = !0
            }
        }
    }
    async changeMidiDevice(t) {
        this.stop(),
        await this.initMidi(t)
    }
    async loadSoundFont(t) {
        let i;
        if (t) {
            console.log("[Audio] Loading Custom SoundFont...");
            try {
                i = await t.arrayBuffer()
            } catch (t) {
                return void console.error("[Audio] Invalid Blob", t)
            }
        } else {
            console.log("[Audio] Resetting to Default SoundFont...");
            try {
                const t = await fetch(SOUNDFONT_URL);
                if (!t.ok)
                    throw new Error("Default SF2 Fetch Failed");
                i = await t.arrayBuffer()
            } catch (t) {
                return void console.error("[Audio] Failed to load Default SF2", t)
            }
        }
        try {
            if (this.libFluid && (this.libFluid.sf2Data = i,
            console.log("[Audio] LibFluidSynth SF2 Updated (Will apply on next Play).")),
            this.spessaSynth) {
                console.log("[Audio] Rebuilding SpessaSynth..."),
                this.spessaSynth.stopAll(!0);
                try {
                    this.spessaSynth.disconnect()
                } catch (t) {}
                const t = this.soundBank.ctx;
                this.spessaSynth = new WorkletSynthesizer(t),
                await this.spessaSynth.soundBankManager.addSoundBank(i),
                this.spessaSynth.connect(t.destination),
                this.synth = new SpessaJzzAdapter(this.spessaSynth),
                this.updateVolume(),
                console.log("[Audio] SpessaSynth SF2 Reloaded Successfully.")
            }
        } catch (t) {
            console.error("[Audio] SF2 Injection Failed:", t)
        }
    }
    async play(t) {
        this.stop(),
        this.currentType = t.type,
        this.tempoRatio = 1,
        this.forceDrumsOnCh11 = !1,
        await this._resumeAudioContexts(),
        this.isPlaying = !0,
        this.isPaused = !1;
        try {
            "midi" === this.currentType ? await this.playMidi(t.buffer) : "mp3" === this.currentType && await this.playMp3(t.buffer)
        } catch (t) {
            console.error("Playback Failed:", t),
            this.stop()
        }
    }
    async _resumeAudioContexts() {
        if (this.soundBank && "suspended" === this.soundBank.ctx.state)
            try {
                await this.soundBank.ctx.resume()
            } catch (t) {}
        if (this.synth && !this.spessaSynth && !this.activeMidiDevice.includes("LibFluid"))
            try {
                const t = this.synth.impl || this.synth
                  , i = t.context || t._context;
                i && "suspended" === i.state && i.resume()
            } catch (t) {}
    }
    async playMidi(t) {
        if (!window.pako)
            throw new Error("Pako missing");
        const i = window.pako.inflateRaw(new Uint8Array(t));
        let s = "";
        for (let t = 0; t < i.length; t += 32768)
            s += String.fromCharCode.apply(null, i.subarray(t, Math.min(t + 32768, i.length)));
        const e = JZZ.MIDI.SMF(s);
        this.midiPlayer = e.player();
        let n = !1;
        for (let t = 0; t < i.length - 8; t++)
            if (65 === i[t] && 16 === i[t + 1] && 66 === i[t + 2] && 26 === i[t + 5] && 2 === i[t + 7]) {
                console.warn("[Audio] Smart Detect: Roland GS Rhythm on Ch 11 found. Rerouting..."),
                n = !0;
                break
            }
        if ("LibFluidSynth" === this.activeMidiDevice) {
            const t = i.buffer.slice(i.byteOffset, i.byteOffset + i.byteLength);
            this.libFluid.transpose = this.transpose,
            this.libFluid.melodyLevel = this.melodyLevel,
            this.libFluid.melodyChannel = this.melodyChannel,
            this.libFluid.setGain(this.volume / 100),
            this.libFluid.forceDrumsOnCh11 = n,
            await this.libFluid.play(t),
            this.midiPlayer.connect((()=>{}
            ))
        } else {
            if (!this.synth)
                throw new Error("Synth not init");
            this.midiPlayer.connect((t=>this._processMidiMessage(t)))
        }
        this.updateVolume(),
        this.midiPlayer.speed(this.tempoRatio),
        this.midiPlayer.onEnd = ()=>{
            this.isPlaying = !1,
            "LibFluidSynth" === this.activeMidiDevice && this.libFluid && this.libFluid.stop().catch((()=>{}
            ))
        }
        ,
        this.midiPlayer.play()
    }
    _processMidiMessage(t) {
        if (this.synth && t && t.length) {
            if (240 === t[0]) {
                for (let i = 0; i < t.length - 7; i++)
                    if (65 == t[i] && 64 == t[i + 4] && 26 == t[i + 5] && 2 == t[i + 7]) {
                        console.warn("[Hardware] Smart Detect: Ch 11 is Drums -> Rerouting."),
                        this.forceDrumsOnCh11 = !0;
                        break
                    }
                if (this.sysExBlocked)
                    return
            }
            try {
                const i = 240 & t[0];
                let s = 15 & t[0];
                if (this.forceDrumsOnCh11 && 10 === s && (s = 9),
                t[0] = i | s,
                192 === i && console.log(`[MIDI-Ext] Instrument Change | Ch: ${16 & t[0]} | Prog: ${t[1]}`),
                (144 === i || 128 === i) && 9 !== s && 10 !== s && 0 !== this.transpose && void 0 !== t[1]) {
                    let i = t[1] + this.transpose;
                    t[1] = Math.max(0, Math.min(127, i))
                }
                this.synth.send(t)
            } catch (t) {
                Math.random() < .01 && console.warn("MIDI Dropped:", t.message)
            }
        }
    }
    async playMp3(t) {
        const i = new Blob([t],{
            type: "audio/mpeg"
        });
        this.audioElement.src = URL.createObjectURL(i),
        this.audioElement.volume = this.volume / 100,
        await this.audioElement.play(),
        this.audioElement.onended = ()=>{
            this.isPlaying = !1
        }
    }
    async playScoreSound(t) {
        if (!(t < 1 || t > 6))
            try {
                const i = await fetch(`assets/PLF/score ${t}.mid`);
                if (!i.ok)
                    return;
                const s = await i.arrayBuffer()
                  , e = new Uint8Array(s);
                let n = "";
                const h = 32768;
                for (let t = 0; t < e.length; t += h)
                    n += String.fromCharCode.apply(null, e.subarray(t, Math.min(t + h, e.length)));
                const a = JZZ.MIDI.SMF(n).player();
                if ("LibFluidSynth" === this.activeMidiDevice) {
                    const t = new LibFluidAdapter(this.soundBank.ctx);
                    t.sf2Data = this.libFluid.sf2Data,
                    await t._createFreshSynth(),
                    t.transpose = this.transpose,
                    t.melodyLevel = this.melodyLevel,
                    t.melodyChannel = this.melodyChannel,
                    t.setGain(this.volume / 100),
                    await t.play(s),
                    a.connect((()=>{}
                    )),
                    a.onEnd = ()=>t.stop().catch((()=>{}
                    ))
                } else {
                    if (!this.synth)
                        return;
                    a.connect((t=>this._processMidiMessage(t)))
                }
                a.speed(this.tempoRatio),
                a.play()
            } catch (t) {
                console.error("Fanfare Error", t)
            }
    }
    stop() {
        if (this.isPlaying = !1,
        this.isPaused = !1,
        this.midiPlayer) {
            try {
                this.midiPlayer.stop()
            } catch (t) {}
            this.midiPlayer = null
        }
        if ("LibFluidSynth" === this.activeMidiDevice && this.libFluid && this.libFluid.stop(),
        this.audioElement && (this.audioElement.pause(),
        this.audioElement.removeAttribute("src")),
        this.synth)
            if (this.spessaSynth)
                this.spessaSynth.stopAll(!0);
            else
                for (let t = 0; t < 16; t++)
                    try {
                        this.synth.send([176 | t, 123, 0]),
                        this.synth.send([176 | t, 121, 0])
                    } catch (t) {}
    }
    pause() {
        if (this.isPlaying && !this.isPaused) {
            if (this.isPaused = !0,
            "midi" === this.currentType && this.midiPlayer && this.midiPlayer.pause(),
            "LibFluidSynth" === this.activeMidiDevice && this.libFluid && this.libFluid.pause(),
            this.synth && "midi" === this.currentType)
                for (let t = 0; t < 16; t++)
                    try {
                        this.synth.send([176 | t, 123, 0])
                    } catch (t) {}
            this.audioElement && this.audioElement.pause()
        }
    }
    resume() {
        if (this.isPlaying && this.isPaused)
            if (this._resumeAudioContexts(),
            this.isPaused = !1,
            "LibFluidSynth" === this.activeMidiDevice && this.libFluid && this.libFluid.resume(),
            "midi" === this.currentType && this.midiPlayer) {
                if (this.updateVolume(),
                this.synth && "LibFluidSynth" !== this.activeMidiDevice)
                    for (let t = 0; t < 16; t++)
                        try {
                            this.synth.send([176 | t, 11, 127])
                        } catch (t) {}
                this.midiPlayer.resume()
            } else
                this.audioElement && this.audioElement.play()
    }
    setVolume(t) {
        this.volume = t,
        this.updateVolume()
    }
    setTranspose(t) {
        if (this.transpose = Math.max(-12, Math.min(12, t)),
        "LibFluidSynth" === this.activeMidiDevice && this.libFluid)
            return this.libFluid.transpose = this.transpose,
            void this.libFluid.panic();
        if (this.synth && this.isPlaying)
            for (let t = 0; t < 16; t++)
                try {
                    this.synth.send([176 | t, 123, 0])
                } catch (t) {}
    }
    setMelodyLevel(t) {
        return this.melodyLevel = Math.max(0, Math.min(8, parseInt(t))),
        this.updateVolume(),
        this.melodyLevel
    }
    changeMelodyLevel(t) {
        return this.setMelodyLevel(this.melodyLevel + t)
    }
    toggleMelody() {
        return this.setMelodyLevel(this.melodyLevel > 0 ? 0 : 8)
    }
    updateVolume() {
        if (this.audioElement && (this.audioElement.volume = this.volume / 100),
        "LibFluidSynth" === this.activeMidiDevice && this.libFluid)
            return this.libFluid.setGain(this.volume / 100),
            this.libFluid.melodyLevel = this.melodyLevel,
            this.libFluid.melodyChannel = this.melodyChannel,
            void this.libFluid.updateMelodyVolume();
        if (this.spessaSynth && this.spessaSynth.setMasterParameter("masterGain", this.volume / 100),
        this.synth) {
            const t = Math.floor(this.volume / 100 * 127)
              , i = this.melodyLevel / 8
              , s = Math.floor(t * i);
            for (let i = 0; i < 16; i++) {
                const e = i === this.melodyChannel ? s : t;
                try {
                    this.synth.send([176 | i, 7, e])
                } catch (t) {}
            }
        }
    }
    setTempo(t) {
        this.tempoRatio = t,
        "LibFluidSynth" === this.activeMidiDevice && this.libFluid && this.libFluid.setTempo(t),
        "midi" === this.currentType && this.midiPlayer && this.midiPlayer.speed(t)
    }
    playDigitSound(t) {
        this.soundBank.playDigit(t)
    }
    getCurrentTime() {
        if (!this.isPlaying)
            return 0;
        if ("mp3" === this.currentType)
            return 1e3 * this.audioElement.currentTime;
        if ("midi" === this.currentType && this.midiPlayer)
            try {
                return this.midiPlayer.positionMS()
            } catch (t) {
                return 0
            }
        return 0
    }
}
