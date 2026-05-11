const DB_NAME = "MegaOke_Assets_DB"
  , DB_VERSION = 1
  , STORE_BGV = "bgv_store"
  , STORE_SF2 = "sf2_store";
export class StorageManager {
    constructor() {
        this.db = null,
        this.isReady = !1,
        this.initAttempts = 0
    }
    async init(t=!0) {
        if (this.db)
            try {
                return this.db.transaction([STORE_BGV], "readonly").abort(),
                !0
            } catch (t) {
                console.warn("[Storage] Existing connection stale. Re-opening."),
                this.db = null
            }
        return new Promise(((e,r)=>{
            const o = indexedDB.open(DB_NAME, 1);
            o.onupgradeneeded = t=>{
                const e = t.target.result;
                e.objectStoreNames.contains(STORE_BGV) || e.createObjectStore(STORE_BGV, {
                    keyPath: "name"
                }),
                e.objectStoreNames.contains(STORE_SF2) || e.createObjectStore(STORE_SF2)
            }
            ,
            o.onsuccess = t=>{
                this.db = t.target.result,
                this.isReady = !0,
                this.initAttempts = 0,
                this.db.onclose = ()=>{
                    console.warn("[Storage] DB Connection Closed unexpectedly."),
                    this.db = null,
                    this.isReady = !1
                }
                ,
                this.db.onversionchange = ()=>{
                    console.warn("[Storage] DB Version Change detected. Closing."),
                    this.db && (this.db.close(),
                    this.db = null,
                    this.isReady = !1)
                }
                ,
                console.log("[Storage] IndexedDB Ready."),
                e(!0)
            }
            ,
            o.onerror = async r=>{
                const o = r.target.error;
                if (console.error("[Storage] DB Error:", o),
                t && ("UnknownError" === o.name || "InvalidStateError" === o.name || "VersionError" === o.name)) {
                    console.warn("[Storage] Corruption detected. Attempting to reset database...");
                    try {
                        await this.deleteDatabase();
                        const t = await this.init(!1);
                        return void e(t)
                    } catch (t) {
                        console.error("[Storage] Reset failed:", t)
                    }
                }
                e(!1)
            }
        }
        ))
    }
    async deleteDatabase() {
        return new Promise(((t,e)=>{
            this.db && (this.db.close(),
            this.db = null);
            const r = indexedDB.deleteDatabase(DB_NAME);
            r.onsuccess = ()=>{
                console.log("[Storage] Database successfully reset."),
                t()
            }
            ,
            r.onerror = ()=>{
                console.error("[Storage] Failed to delete database:", r.error),
                e(r.error)
            }
            ,
            r.onblocked = ()=>{
                console.warn("[Storage] Delete blocked. Waiting for connections to close...")
            }
        }
        ))
    }
    async _getDb() {
        if (this.db || await this.init(),
        !this.db)
            throw new Error("Storage unavailable: Could not open Database.");
        return this.db
    }
    async saveCustomSF2(t) {
        try {
            const e = await this._getDb()
              , r = t.slice(0, t.size, t.type);
            return new Promise(((t,o)=>{
                const s = e.transaction([STORE_SF2], "readwrite").objectStore(STORE_SF2).put(r, "custom_sf2");
                s.onsuccess = ()=>t(!0),
                s.onerror = ()=>o(s.error)
            }
            ))
        } catch (t) {
            return console.error("[Storage] SF2 Save Error:", t),
            !1
        }
    }
    async getCustomSF2() {
        try {
            const t = await this._getDb();
            return new Promise((e=>{
                const r = t.transaction([STORE_SF2], "readonly").objectStore(STORE_SF2).get("custom_sf2");
                r.onsuccess = ()=>e(r.result || null),
                r.onerror = ()=>e(null)
            }
            ))
        } catch (t) {
            return null
        }
    }
    async checkSF2Exists() {
        try {
            const t = await this._getDb();
            return new Promise((e=>{
                const r = t.transaction([STORE_SF2], "readonly").objectStore(STORE_SF2).count("custom_sf2");
                r.onsuccess = ()=>e(r.result > 0),
                r.onerror = ()=>e(!1)
            }
            ))
        } catch (t) {
            return !1
        }
    }
    async clearCustomSF2() {
        try {
            const t = await this._getDb();
            return new Promise((e=>{
                const r = t.transaction([STORE_SF2], "readwrite");
                r.objectStore(STORE_SF2).delete("custom_sf2"),
                r.oncomplete = ()=>e()
            }
            ))
        } catch (t) {}
    }
    async saveCustomBGVs(t) {
        let e = 0;
        const r = Array.from(t);
        for (const t of r)
            try {
                if (!t.type.startsWith("video/") && !t.type.startsWith("image/"))
                    continue;
                const r = t.slice(0, t.size, t.type)
                  , o = {
                    name: t.name,
                    data: r,
                    type: t.type
                };
                await this._saveSingleBGV(o),
                e++
            } catch (e) {
                console.error(`[Storage] Failed to save ${t.name}:`, e)
            }
        return e
    }
    async _saveSingleBGV(t) {
        const e = await this._getDb();
        return new Promise(((r,o)=>{
            const s = e.transaction([STORE_BGV], "readwrite")
              , n = s.objectStore(STORE_BGV).put(t);
            s.oncomplete = ()=>r(),
            s.onerror = ()=>o(s.error),
            n.onerror = ()=>o(n.error)
        }
        ))
    }
    async getBGVKeys() {
        try {
            const t = await this._getDb();
            return new Promise((e=>{
                const r = t.transaction([STORE_BGV], "readonly").objectStore(STORE_BGV).getAllKeys();
                r.onsuccess = ()=>e(r.result || []),
                r.onerror = ()=>e([])
            }
            ))
        } catch (t) {
            return []
        }
    }
    async getBGVFile(t) {
        try {
            const e = await this._getDb();
            return new Promise(((r,o)=>{
                const s = e.transaction([STORE_BGV], "readonly").objectStore(STORE_BGV).get(t);
                s.onsuccess = ()=>{
                    const t = s.result;
                    r(t ? t.data : null)
                }
                ,
                s.onerror = t=>{
                    r(null)
                }
            }
            ))
        } catch (t) {
            throw console.error("[Storage] Critical Read Error:", t),
            t
        }
    }
    async getBGVCount() {
        try {
            const t = await this._getDb();
            return new Promise((e=>{
                const r = t.transaction([STORE_BGV], "readonly").objectStore(STORE_BGV).count();
                r.onsuccess = ()=>e(r.result),
                r.onerror = ()=>e(0)
            }
            ))
        } catch (t) {
            return 0
        }
    }
    async clearCustomBGVs() {
        try {
            const t = await this._getDb();
            return new Promise((e=>{
                const r = t.transaction([STORE_BGV], "readwrite");
                r.objectStore(STORE_BGV).clear(),
                r.oncomplete = ()=>e()
            }
            ))
        } catch (t) {}
    }
}
