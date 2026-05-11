export const SECTOR_SIZE = 2048;
export const VIDEO_EXTENSIONS = [".mp4", ".avi", ".mkv", ".plf", ".mpeg", ".mpg", ".mpeg2", ".wmv", ".mov", ".flv", ".webm", ".vob", ".dat"];
export const RESOLUTION_PRESETS = {
    Original: 0,
    "4K (2160p)": 2160,
    "1080p": 1080,
    "720p": 720,
    "480p": 480
};
export const SOUNDFONT_URL = "assets/PLF/soundfont.sf2";
export const DEFAULT_SETTINGS = {
    score_mode: !0,
    score_settings: "Mid",
    score_time_display: "4s",
    ranking_table: !0,
    ranking_duration: "5s",
    fanfare_mode: !0,
    bgv_mode: "Mixed",
    bgv_source: "Default",
    lyrics_color: "Auto",
    lyrics_paint: "Default",
    lyrics_alignment: "Centered",
    lyrics_shadow: !1,
    digit_key_sound: !0,
    midi_device: "LibFluidSynth",
    midi_soundfont: "Default",
    bg_video_random: !0,
    interlude_hiding_enabled: !0,
    bg_video_continuous_play: !0,
    video_resolution: "1080p",
    aspect_ratio: "Fit to Screen",
    font_family: "Arial",
    font_size: 60,
    colors: {
        base: "#ffffff",
        highlight: "#0000ff",
        speaker_m: "#42a5f5",
        speaker_w: "#ef5350",
        speaker_c: "#66bb6a",
        background: "#000000",
        idle_text: "#ffffff",
        idle_code: "#ffffff",
        idle_title: "#ffffff",
        queue_text: "#ffff00",
        meta_title: "#ffffff",
        meta_singer: "#ffff00",
        meta_info: "#ffffff"
    }
};
export const KEY_MAP = {
    setup: "F1",
    first_reserve: "F2",
    melody: "F3",
    play_pause: "F4",
    stop: "F5",
    next: "F6",
    pitch_down: "F7",
    pitch_up: "F8",
    cancel: "F8",
    volume_down: "F9",
    volume_up: "F10",
    fullscreen: "F11",
    search: "*",
    reserve: "F12",
    tempo_slow: "-",
    tempo_fast: "=",
    enter: "Enter",
    backspace: "Backspace",
    escape: "Escape",
    arrow_up: "ArrowUp",
    arrow_down: "ArrowDown",
    arrow_left: "ArrowLeft",
    arrow_right: "ArrowRight"
};
export const SETUP_MENU_STRUCTURE = {
    categories: [["score_mode", "Score"], ["score_settings", "Score Settings"], ["score_time_display", "Score Time"], ["ranking_table", "Ranking Table"], ["ranking_duration", "Ranking Duration"], ["fanfare_mode", "Fanfare"], ["bgv_mode", "Bgv Mode"], ["bgv_custom_settings", "Custom Bgv"], ["lyrics_color", "Lyrics Color"], ["lyrics_paint", "Lyric Paint Color"], ["lyrics_alignment", "Lyrics Align"], ["lyrics_shadow", "Lyrics Shadow"], ["midi_device", "MIDI Device"], ["sf2_custom_settings", "Custom SoundFont"], ["digit_key_sound", "Digit Sound"], ["video_resolution", "Max Resolution"], ["aspect_ratio", "Aspect Ratio"], ["default", "Default"], ["exit", "Exit"], ["exit_save", "Exit & Save"]],
    options_map: {
        score_mode: [!0, !1],
        score_settings: ["High", "Mid", "Low"],
        score_time_display: ["2s", "4s", "5s"],
        ranking_table: [!0, !1],
        ranking_duration: ["2s", "4s", "5s"],
        fanfare_mode: [!0, !1],
        bgv_mode: ["Mixed", "Picture", "Video"],
        bgv_custom_settings: ["Off (Default)", "On (Custom)", "Import New...", "Delete All"],
        lyrics_color: ["Auto", "Blue", "Red", "Green", "Violet", "Pink", "Orange"],
        lyrics_paint: ["Default", "Blue", "Red", "Green", "Violet", "Pink", "Orange"],
        lyrics_alignment: ["Left/Right Split", "Centered"],
        lyrics_shadow: [!0, !1],
        digit_key_sound: [!0, !1],
        video_resolution: ["Original", "1080p", "720p", "480p"],
        aspect_ratio: ["16:9", "4:3", "Fit to Screen"],
        midi_device: ["Web Audio", "SpessaSynth", "LibFluidSynth"],
        sf2_custom_settings: ["Off (Default)", "On (Custom)", "Import New...", "Delete All"],
        default: ["Yes"],
        exit: ["Yes"],
        exit_save: ["Yes"]
    }
};
