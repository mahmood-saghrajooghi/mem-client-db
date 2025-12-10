, jn = class jn { // DatabaseManager
    static async databaseInfo(e) { // Get databaseInfo of the current workspace.
        const {userId: n, modelSchemaHash: r, minVersion: s} = e; // modelSchemaHash is from ModelRegistry
        // Search: modelSchemaHash: Me.schemaHash
        let i = s;
        // `linear_databases` will be created by calling `jn.databases`.
        const o = (await jn.databases()).filter(p=>p.userId === n && p.version > i).orderBy(["version"], ["desc"]);
        o.length > 0 && (i = o[0].version);
        // The following code calculates the schemaHash of the workspace's database.
        const l = await this.userVersion(n)
          , d = "linear_" + $1(`${n}_fake_token__${i}${l ? `_${l}` : ""}`) // Name of the database is determined by user identity.
          , u = $1(`
      ${r}_${Bc.indexVersion}_${Bc.partialObjectStoreSchemaVersion}_${Bc.syncActionStoreVersion}`)
          , h = (await this.databases()).find(p=>p.name === d); // Check if there is a database with the same name from IndexedDB.
        let f = h && Number(h == null ? void 0 : h.schemaVersion) || 1; // schemaVersion starts with 1
        return h && h.schemaHash !== u && f++, // If the schema mismatches, we increment the schemaVersion, and use it to trigger a migration.
        {
            name: d,
            createdAt: Date.now(),
            userId: n,
            schemaHash: u,
            schemaVersion: f,
            version: i,
            userVersion: l
        }
    }
    static async registerDatabase(e) {
        return await (await jn.database()).transaction("databases", "readwrite").store.put(e)
    }
    static async unregisterDatabase(e) {
        const n = await jn.database();
        F.network(`Unregistering database ${e}`, {
            name: e
        });
        const r = n.transaction("databases", "readwrite");
        r.store.delete(e),
        await r.done.catch(()=>{}
        )
    }
    static async deleteDatabaseForUserId(e) {
        const n = await this.databases();
        for (const r of n.filter(s=>s.userId === e))
            await jn.deleteDatabase(r.name)
    }
    static async deleteOutdatedDemoDatabases() {
        const r = (await this.databases()).filter(s=>s.userId === ft.DEMO_USER_ID).filter(s=>s.createdAt < Date.now() - be.DAY);
        for (const s of r)
            await jn.deleteDatabase(s.name)
    }
    static async deleteDatabase(e) {
        F.network("Deleting database", {
            database: e
        }),
        this.deletingDatabase = !0;
        const n = await jn.database()
          , r = await n.transaction("databases", "readonly").store.get(e).catch(()=>{}
        );
        if (r) {
            const s = n.transaction("databases", "readwrite");
            s.store.put({
                ...r,
                deleting: !0
            }),
            await s.done.catch(()=>{}
            )
        }
        return new Promise(async s=>{
            try {
                await vb(e, {
                    blocked: ()=>{
                        F.info("Database deletion blocked", {
                            name: e
                        }),
                        this.deletingDatabase = !1,
                        s()
                    }
                }),
                await this.unregisterDatabase(e)
            } catch (i) {
                F.error("Error deleting database", i)
            }
            this.deletingDatabase = !1,
            s()
        }
        )
    }
    static async deleteAllDatabases() {
        this.deletingDatabase = !0;
        const e = await jn.databases();
        if (e.length > 0 && F.network(`Deleting ${e.length} databases`, {
            dbs: e
        }),
        await Promise.all(e.map(n=>jn.deleteDatabase(n.name))),
        typeof indexedDB.databases == "function")
            for (const n of await indexedDB.databases())
                n.name && await jn.deleteDatabase(n.name);
        this.deletingDatabase = !1
    }
    static async cleanOutdatedDatabases(e, n, r) {
        const s = await jn.outdatedDatabases(e, n, r);
        s.length > 0 && F.network(`Cleaning up ${s.length} stale databases`, {
            dbs: s
        }),
        s.map(i=>jn.deleteDatabase(i.name))
    }
    static async incrementUserVersion(e) {
        const n = (await this.userVersion(e) || 1) + 1;
        F.info(`Incrementing user version to ${n}`),
        await (await jn.database()).put("userVersion", {
            userId: e,
            version: n
        })
    }
    static async database() { // This method creates `linear_databases` table and return a connection to it.
        return jn.databaseInstance || (jn.databaseInstance = await E4.executeWithRetries({
            maxRetries: 2,
            backoff: 0,
            beforeRetry: async()=>{
                F.info("Retrying opening database after error. Deleting existing database."),
                await vb(kb)
            }
        }, async()=>await p_(kb, 2, { // Linking to linear_databases database here.
            upgrade: e=>{
                F.network("Initializing Database Manager database"),
                e.objectStoreNames.contains("databases") || e.createObjectStore("databases", {
                    keyPath: "name"
                }),
                e.objectStoreNames.contains("userVersion") || e.createObjectStore("userVersion", {
                    keyPath: "userId"
                })
            }
            ,
            blocking: ()=>{
                var e;
                F.info("DatabaseManager database is blocking."),
                (e = jn.databaseInstance) == null || e.close(),
                jn.databaseInstance = void 0
            }
            ,
            blocked: ()=>{
                F.info("DatabaseManager database is blocked.")
            }
            ,
            terminated: ()=>{
                F.info("DatabaseManager database is terminated."),
                jn.databaseInstance = void 0
            }
        }))),
        jn.databaseInstance
    }
    static async databases() {
        return (await jn.database()).transaction("databases").store.getAll()
    }
    static async outdatedDatabases(e, n, r) {
        return (await jn.databases()).filter(i=>i.userId === e && (i.version !== n || (i.userVersion || 0) !== (r || 0))).orderBy(["createdAt"], ["desc"])
    }
    static async userVersion(e) {
        var r;
        return (r = await (await jn.database()).transaction("userVersion").store.get(e)) == null ? void 0 : r.version
    }
}
;
jn.constructorName = "DatabaseManager",
