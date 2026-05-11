export class ByteStream {
    constructor(t) {
        this.buffer = t,
        this.dataView = new DataView(this.buffer),
        this.uint8View = new Uint8Array(this.buffer),
        this.pos = 0,
        this.len = this.buffer.byteLength
    }
    getPos() {
        return this.pos
    }
    seekTo(t) {
        this.pos = t
    }
    isOver() {
        return this.pos >= this.len
    }
    getByte(t=0) {
        return this.pos + t >= this.len ? 0 : this.uint8View[this.pos + t]
    }
    readU8() {
        return this.pos >= this.len ? 0 : this.uint8View[this.pos++]
    }
    readLEU16() {
        if (this.pos + 2 > this.len)
            return this.pos += 2,
            0;
        const t = this.dataView.getUint16(this.pos, !0);
        return this.pos += 2,
        t
    }
    readLEU32() {
        if (this.pos + 4 > this.len)
            return this.pos += 4,
            0;
        const t = this.dataView.getUint32(this.pos, !0);
        return this.pos += 4,
        t
    }
    readArray(t) {
        this.pos + t > this.len && (t = this.len - this.pos),
        t < 0 && (t = 0);
        const e = this.uint8View.slice(this.pos, this.pos + t);
        return this.pos += t,
        e
    }
    readVLQ() {
        let t = 0;
        for (; !(this.pos >= this.len); ) {
            const e = this.uint8View[this.pos++];
            if (t = t << 7 | 127 & e,
            !(128 & e))
                break
        }
        return t
    }
}
const textDecoders = {
    gbk: new TextDecoder("gbk"),
    "iso-8859-1": new TextDecoder("iso-8859-1"),
    big5: new TextDecoder("big5"),
    "shift-jis": new TextDecoder("shift-jis"),
    "euc-kr": new TextDecoder("euc-kr"),
    "windows-1251": new TextDecoder("windows-1251"),
    "iso-8859-6": new TextDecoder("iso-8859-6"),
    "iso-8859-9": new TextDecoder("iso-8859-9"),
    cp874: new TextDecoder("windows-874"),
    "utf-8": new TextDecoder("utf-8")
};
function safeDecode(t, e) {
    const s = e.toLowerCase()
      , i = textDecoders[s] || textDecoders["iso-8859-1"];
    try {
        return i.decode(t)
    } catch (e) {
        return textDecoders["iso-8859-1"].decode(t)
    }
}
class VietnamCode {
    constructor() {
        this.CHARSET_VNIWIN = 1,
        this.CHARSET_UNICODE = 6,
        this.SINGLE_BYTE_TABLES = [null, new Uint8Array([65, 97, 193, 225, 128, 224, 129, 228, 130, 227, 229, 229, 194, 226, 131, 195, 132, 192, 133, 196, 197, 197, 198, 198, 136, 230, 141, 161, 142, 162, 143, 163, 240, 164, 165, 165, 66, 98, 67, 99, 68, 100, 241, 199, 69, 101, 201, 233, 215, 232, 222, 200, 254, 235, 203, 203, 202, 234, 144, 137, 147, 138, 148, 139, 149, 205, 140, 140, 70, 102, 71, 103, 72, 104, 73, 105, 180, 237, 181, 236, 183, 204, 184, 239, 206, 206, 74, 106, 75, 107, 76, 108, 77, 109, 78, 110, 79, 111, 185, 243, 188, 242, 189, 211, 190, 245, 134, 134, 212, 244, 150, 213, 151, 214, 152, 176, 153, 135, 182, 182, 247, 216, 157, 167, 158, 169, 159, 170, 166, 171, 174, 174, 80, 112, 81, 113, 82, 114, 83, 115, 84, 116, 85, 117, 218, 250, 172, 249, 209, 251, 177, 219, 248, 248, 208, 220, 179, 217, 178, 221, 175, 186, 187, 187, 191, 191, 86, 118, 87, 119, 88, 120, 89, 121, 221, 154, 178, 255, 253, 155, 179, 207, 156, 156, 90, 122, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 142, 145, 146, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 158, 0])],
        this.DOUBLE_BYTE_TABLES = [null, new Uint16Array([193, 225, 192, 224, 7842, 7843, 195, 227, 7840, 7841, 194, 226, 7844, 7845, 7846, 7847, 7848, 7849, 7850, 7851, 7852, 7853, 258, 259, 7854, 7855, 7856, 7857, 7858, 7859, 7860, 7861, 7862, 7863, 66, 98, 67, 99, 68, 100, 272, 273, 69, 101, 201, 233, 200, 232, 7866, 7867, 7868, 7869, 7864, 7865, 202, 234, 7870, 7871, 7872, 7873, 7874, 7875, 7876, 7877, 7878, 7879, 70, 102, 71, 103, 72, 104, 73, 105, 205, 237, 204, 236, 7880, 7881, 296, 297, 7882, 7883, 74, 106, 75, 107, 76, 108, 77, 109, 78, 110, 79, 111, 211, 243, 210, 242, 7886, 7887, 213, 245, 7884, 7885, 212, 244, 7888, 7889, 7890, 7891, 7892, 7893, 7894, 7895, 7896, 7897, 416, 417, 7898, 7899, 7900, 7901, 7902, 7903, 7904, 7905, 7906, 7907, 80, 112, 81, 113, 82, 114, 83, 115, 84, 116, 85, 117, 218, 250, 217, 249, 7910, 7911, 360, 361, 7908, 7909, 431, 432, 7912, 7913, 7914, 7915, 7916, 7917, 7918, 7919, 7920, 7921, 86, 118, 87, 119, 88, 120, 89, 121, 221, 253, 7922, 7923, 7926, 7927, 7928, 7929, 7924, 7925, 90, 122, 8364, 8353, 402, 8222, 8230, 8224, 8225, 710, 8240, 352, 8249, 338, 381, 8216, 8217, 8220, 8221, 8226, 8211, 8212, 732, 8482, 353, 8250, 339, 382, 376])],
        this.lookup_tables = {},
        this.initTables()
    }
    initTables() {
        const t = [null, this.SINGLE_BYTE_TABLES[1], null, null, null, null, this.DOUBLE_BYTE_TABLES[1]];
        this.all_tables = t;
        for (let e = 0; e < t.length; e++) {
            if (!t[e])
                continue;
            const s = t[e]
              , i = {};
            for (let t = 0; t < s.length; t++) {
                const o = s[t];
                if (0 !== o) {
                    i[1 === e ? 255 & o : 65535 & o] = t
                }
            }
            this.lookup_tables[e] = i
        }
    }
    toString(t) {
        const e = this.lookup_tables[1]
          , s = this.all_tables[6]
          , i = [];
        for (let o = 0; o < t.length; o++) {
            const n = 255 & t[o]
              , r = e[n];
            if (void 0 !== r) {
                const t = r < s.length ? 65535 & s[r] : 0;
                i.push(0 !== t ? t : n)
            } else
                i.push(n)
        }
        return String.fromCharCode(...i).replace(/\x00+$/, "")
    }
}
const vietnamConverter = new VietnamCode;
export const LANGUAGE_TO_CHARSET = {
    OTHER: "GBK",
    CHINESE: "GBK",
    TAIWAN: "BIG5",
    HONGKONG: "BIG5",
    KOREAN: "EUC-KR",
    JAPAN: "SHIFT-JIS",
    VIETNAM: "VNI-WIN",
    REMIX: "VNI-WIN",
    PHILIPPINE: "ISO-8859-1",
    TAGALOG: "ISO-8859-1",
    VESAYA: "ISO-8859-1",
    VISAYA: "ISO-8859-1",
    THAI: "CP874",
    RUSSIAN: "windows-1251",
    UZBEK: "windows-1251",
    ARABIC: "ISO-8859-6",
    UIGHUR: "ISO-8859-6",
    TURKEY: "ISO-8859-9",
    ENGLISH: "ISO-8859-1",
    ENGLAND: "ISO-8859-1",
    UK: "ISO-8859-1"
};
export function translateText(t, e) {
    if (!t || 0 === t.length)
        return "";
    let s = t.length;
    for (; s > 0 && 0 === t[s - 1]; )
        s--;
    const i = t.slice(0, s)
      , o = LANGUAGE_TO_CHARSET[(e || "OTHER").toUpperCase()] || "GBK";
    return "VNI-WIN" === o ? vietnamConverter.toString(i) : safeDecode(i, o)
}
