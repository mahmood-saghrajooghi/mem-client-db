/** Database */
const eg = class eg { // class: Database
    get onDatabaseUnavailable() {
        return this._onDatabaseUnavailable
    }
    get onSavingStoreCountChange() {
        return this.storeManager.onSavingStoreCountChange
    }
    requiredBootstrap() {
        var o;
        const e = this.metadata.lastSyncId
          , n = Me.getModelNamesByMaxLoadStrategy(dn.lazy) // Get models whose load strategy is instant or lazy.
          , r = new Set(this.storeManager.readyStores.map(l=>l.modelName)) // Get all ready models.
          , s = n.filter(l=>!r.has(l)) // Check if there are models not ready.
          , i = ft.LINEAR_DEMO_ORGANIZATION_ID && ((o = this.openOptions) == null ? void 0 : o.organizationId) === ft.LINEAR_DEMO_ORGANIZATION_ID
          , a = hs || i ? !1 : this.hasTimelyData(s.length === 0); // Or data is too outdated.
        return r.size === 0 || !e || navigator.onLine === !0 && a === !1 ? {
            type: "full",
            untimelyLocalData: !a,
            modelsToLoad: n,
            partialModels: Me.getModelNames(dn.partial),
            lastSyncId: 0
        } : s.length === 0 ? { // If models whose load strategy is instant or lazy are ready, do
            // a local boostrapping, otherwise a partial boostrapping.
            type: "local",
            modelsToLoad: s,
            partialModels: [],
            lastSyncId: e
        } : {
            type: "partial",
            modelsToLoad: s,
            partialModels: [],
            lastSyncId: e
        }
    }
    constructor(e, n) {
        this.options = n,
        this._onDatabaseUnavailable = new Tt,
        this.handleReadError = r=>{
            const {error: s, method: i, modelName: a} = r;
            throw F.remote(`Database read error for ${i}`, {
                error: s.message,
                modelName: a
            }),
            F.warning(`Database read error for ${i}. ${s.message}`, {
                error: s.name,
                stack: s.stack,
                modelName: a
            }),
            Jn.increment("error.database.read"),
            s
        }
        ,
        this.handleWriteError = r=>{
            F.remote("Database write error detected", {
                error: r.message
            }),
            F.warning(`Database write error detected. ${r.message}`, {
                error: r.name,
                stack: r.stack
            }),
            this.deleteDatabase().catch(s=>{
                F.warning("Error deleting database", {
                    error: s,
                    name: this.name
                })
            }
            ),
            Jn.increment("error.database.write"),
            r.name === "QuotaExceededError" && (F.warning("Database quota exceeded. Deleting local database."),
            Jn.increment("error.database.quota_exceeded"),
            this._onDatabaseUnavailable.fire(0),
            Xn.deleteAllDatabases().catch(s=>{
                F.warning("Error deleting all databases", {
                    error: s
                })
            }
            ))
        }
        ,
        this.graphQLClient = e
    }
    async open(e) {
        this.openOptions = e;
        const n = mn.getValue(mn.clientDatabaseMinVersion, 50)
        // When calling this method, linear_databases would be created.
        // Get the database info of the current workspace's database.
          , r = await Xn.databaseInfo({
            ...e,
            minVersion: n
        });
        Xn.registerDatabase(r), // Save the database's meta into "linear_databases" database.
        this.name = r.name, // Name of database for the current workspace.
        F.network(`Using database ${this.name} schema version ${r.schemaVersion}`);
        let s = !1;
        try {
            // Connect to the database and see if should create or migrate the database.
            this.database = await p_(this.name, r.schemaVersion, { // Use schemaVersion to check if a migration is required.
                // When the schemaVersion changes, or there's no database with name `this.name`, the upgrade callback
                // would be called to creat the database.
                upgrade: (i,a,o,l)=>{
                    // i for the DatabaseProxy
                    // l for the Transaction
                    F.info("Upgrading database.", {
                        name: this.name
                    }),
                    F.network(`Upgrading database ${this.name}`),
                    s = !0,
                    // When creating the database, all ObjectStore will be used to
                    // create corresponding tables.
                    this.storeManager.createStores(i, l)
                }
                ,
                blocked: (i,a)=>{
                    F.info("Database connection blocked by older database version.", {
                        currentVersion: i,
                        blockedVersion: a
                    })
                }
                ,
                blocking: ()=>{
                    this.close("blocking"),
                    Xn.deletingDatabase || this._onDatabaseUnavailable.fire(1)
                }
                ,
                terminated: ()=>{
                    F.info("Database connection abnormally terminated."),
                    this.handleWriteError(new Error("Database connection terminated"))
                }
            })
        } catch (i) {
            if (/The requested version .+ is less than the existing version/.test((i == null ? void 0 : i.message) || ""))
                try {
                    F.warning(`Increasing database ${r.name} version because of schema version mismatch.`, {
                        errorMessage: i.message
                    }),
                    await Xn.incrementUserVersion(e.userId),
                    window.location.replace(window.location.href),
                    await new Promise(pa)
                } catch {
                    throw i
                }
            throw i
        }
        // Get metadata of the database.
        this.metadata = await this.getMetadata(s),
        // On first bootstrapping, all models are not ready. So a full bootstrapping will be performed.
        await this.storeManager.checkReadinessOfStores(this.database), 
        Xn.cleanOutdatedDatabases(e.userId, r.version, r.userVersion),
        hs || Xn.deleteOutdatedDemoDatabases()
    }
    close(e) {
        F.network(`Closing database due to ${e}`, {
            database: {
                name: this.name,
                metadata: this.metadata
            }
        }),
        this.database && this.database.close(),
        this.database = void 0
    }
    async writeTransaction(e, n) {
        const r = this.storeManager.createTransaction(this.database, e);
        if (!r)
            return await n({
                get: async()=>{}
                ,
                put: pa,
                add: pa,
                delete: pa,
                iterate: pa,
                addSyncPacket: pa,
                setLastSyncId: pa,
                setFirstSyncId: pa,
                setSubscribedSyncGroups: pa,
                commit: pa
            }),
            {
                writeComplete: Promise.resolve()
            };
        const {objectStores: s, transaction: i} = r
          , a = this.storeManager.syncActionStore;
        let o = !1, l = 0, d = 0, u;
        const h = {}
          , f = ()=>{
            if (o)
                throw new Error("Commit operation invoked after transaction has been closed");
            o = !0,
            d && (this.metadata.firstSyncId = d),
            l && (this.metadata.lastSyncId = l,
            this.metadata.firstSyncId || (this.metadata.firstSyncId = l)),
            u && (this.metadata.subscribedSyncGroups = u),
            this.metadata.updatedAt = new Date,
            (l || d || u) && s[dr].put(this.metadata, "meta")
        }
        ;
        if (await n({
            get: (p,m)=>new Promise((g,C)=>{
                const b = s[p].get(m);
                b.onsuccess = ()=>{
                    g(b.result)
                }
                ,
                b.onerror = ()=>{
                    C(b.error)
                }
            }
            ),
            put: (p,m)=>{
                s[p] && s[p].put(m)
            }
            ,
            add: (p,m)=>{
                if (s[p]) {
                    const g = s[p].get(IDBKeyRange.only(m.id));
                    g.onsuccess = ()=>{
                        g.result === void 0 && s[p].put(m)
                    }
                }
            }
            ,
            delete: (p,m)=>{
                s[p] && (s[p].delete(m),
                (h[p] = h[p] || []).push(m))
            }
            ,
            iterate: async(p,m,g)=>{
                const C = Eo(i).objectStore(this.storeManager.objectStore(p).storeName);
                if (m && C.indexNames.contains(m.key))
                    await Promise.all(m.values.map(b=>{
                        const k = ta()
                          , S = C.index(m.key).openCursor(IDBKeyRange.only(b));
                        return S.onsuccess = function() {
                            const D = S.result;
                            D ? (g(D),
                            D.continue()) : k.resolve()
                        }
                        ,
                        k
                    }
                    ));
                else {
                    const b = m ? new Set(m.values) : void 0
                      , k = ta()
                      , S = C.openCursor();
                    S.onsuccess = function() {
                        const D = S.result;
                        if (D) {
                            if (m) {
                                const R = D.value[m.key];
                                Array.isArray(R) ? R.find(T=>b.has(T)) && g(D) : b.has(R) && g(D)
                            } else
                                g(D);
                            D.continue()
                        } else
                            k.resolve()
                    }
                    ,
                    await k
                }
            }
            ,
            addSyncPacket(p) {
                a.addSyncPacket(s[a.storeName], p)
            },
            setLastSyncId: p=>{
                l = Math.max(p, l)
            }
            ,
            setFirstSyncId: p=>{
                d = Math.max(p, d)
            }
            ,
            setSubscribedSyncGroups(p) {
                u = p
            },
            commit: f
        }),
        o || f(),
        Object.keys(h).length !== 0) {
            const p = this.storeManager.createPartialIndexTransaction(this.database);
            if (p) {
                const m = this.storeManager.partialObjectStores.map(g=>g.modelName);
                for (const [g,C] of Object.entries(h)) {
                    const b = p.objectStores[g];
                    if (b && m.includes(g))
                        for (const S of C)
                            b.delete(S);
                    const k = this.storeManager.partialObjectStores;
                    for (const S of k) {
                        const D = p.objectStores[S.modelName];
                        for (const R of Zn.partialIndexInfoForModel(S.modelName, g))
                            for (const T of C) {
                                const B = Zn.createPartialIndexValue(R.path, T);
                                D.delete(B)
                            }
                    }
                }
            }
        }
        return {
            writeComplete: i.done
        }
    }
    async getAllInitialHydratedModelData() {
        const e = this.database;
        if (!e)
            throw new Error("Trying to access closed database");
        const n = Me.getModelNames(dn.instant)
          // Read models that should be load instantly from ObjectStore.
          // During a full boostrapping, models are cached in the ObjectStore
          // so them do not retrieve from IndexedDB.
          , r = n.map(o=>this.storeManager.objectStore(o).getAll(e))
          , s = await Promise.all(r).catch(o=>this.handleReadError({
            error: o,
            method: "getAllInitialHydratedModelData"
        }));
        let i = 0;
        const a = {};
        for (const o of n)
            a[o] = s[i++];
        return a
    }
    objectStoreReady(e) {
        return this.storeManager.objectStore(e).isReady
    }
    async getModelDataById(e, n, r) {
        if (this.database) // e for class name, n for the id, r for options
            return this.storeManager.objectStore(e).getById(this.database, n, r).catch(s=>this.handleReadError({
                error: s,
                method: "getModelDataById",
                modelName: e
            }))
    }
    async getModelDataByIndexedKey(e, n, r) {
        const s = Me.getClassName(e)
          , i = this.storeManager.objectStore(s);
        try {
            return await i.getAllForIndexedKey(this.database, n, r)
        } catch (a) {
            return F.info("Failed fetching data for index", {
                indexedKey: n,
                error: a
            }),
            []
        }
    }
    async getModelDataByIds(e, n) {
        const r = this.database;
        return r ? this.storeManager.objectStore(e).getByIds(r, n).catch(s=>this.handleReadError({
            error: s,
            method: "getModelDataByIds",
            modelName: e
        })) : []
    }
    async getAllModelData(e) {
        const n = this.database;
        return n ? this.storeManager.objectStore(e).getAll(n).catch(r=>this.handleReadError({
            error: r,
            method: "getAllModelData",
            modelName: e
        })) : []
    }
    setBackendDatabaseVersion(e) {
        var n;
        this.metadata.backendDatabaseVersion = e,
        (n = this.database) == null || n.put(dr, this.metadata, "meta").catch(this.handleWriteError)
    }
    setSubscribedSyncGroups(e) {
        var n;
        this.metadata.subscribedSyncGroups = e,
        (n = this.database) == null || n.put(dr, this.metadata, "meta").catch(this.handleWriteError)
    }
    async getMetadata(e=!1) {
        if (!this.database)
            throw new Error("Trying to access closed database");
        const n = await this.database.get(dr, "meta");
        return {
            backendDatabaseVersion: (n == null ? void 0 : n.backendDatabaseVersion) ?? 0,
            firstSyncId: e || n == null ? void 0 : n.firstSyncId,
            lastSyncId: (n == null ? void 0 : n.lastSyncId) ?? 0,
            updatedAt: (n == null ? void 0 : n.updatedAt)instanceof Date ? n == null ? void 0 : n.updatedAt : new Date,
            subscribedSyncGroups: n == null ? void 0 : n.subscribedSyncGroups
        }
    }
    async getAllTransactions() {
        return this.database ? await this.database.transaction(Mc).store.getAll() : []
    }
    async putTransactions(e) {
        if (this.database)
            try {
                const n = this.database.transaction(Mc, "readwrite", {
                    durability: "relaxed"
                })
                  , r = n.objectStore(Mc);
                for (const s of e) {
                    const i = s.serialize(); // Serialize a transaction to an object.
                    await r.put(i)
                }
                await n.done
            } catch {
                navigator.onLine === !1 && this._onDatabaseUnavailable.fire(2)
            }
    }
    async deleteTransaction(e) {
        if (this.database) {
            if (e)
                return this.database.delete(Mc, e).catch(this.handleWriteError);
            F.error("Tried to delete a transaction without an id")
        }
    }
    async resetDatabase(e) {
        if (!this.database) {
            F.error("Trying to reset closed database", void 0, {
                name: this.name
            });
            return
        }
        F.remote("Resetting database", {
            idb: {
                name: this.name
            }
        });
        try {
            e != null && e.dangerouslyIncrementUserVersion && this.openOptions ? (await Xn.incrementUserVersion(this.openOptions.userId),
            this.close("reset"),
            await this.open(this.openOptions),
            this.metadata = await this.getMetadata()) : (await this.storeManager.clearStores(this.database),
            await this.database.clear(dr),
            this.metadata = await this.getMetadata())
        } catch (n) {
            F.error("Error resetting database", n)
        }
    }
    async deleteDatabase() {
        var e;
        if ((e = this.database) == null || e.close(),
        this.database = void 0,
        F.remote("Delete local database", {
            idb: {
                name: this.name
            }
        }),
        this.name)
            return Xn.deleteDatabase(this.name)
    }
    async statistics() {
        return this.database ? this.storeManager.statistics(this.database) : {}
    }
    async bootstrap() { // bootstrapping of the database
        var s, i;
        const e = this.database;
        if (!e)
            throw new Error("Cannot bootstrap without a database");
        const n = this.requiredBootstrap();
        Hi.addStartupSpanTag("bootstrap.type", n.type),
        n.untimelyLocalData && (Hi.addStartupSpanTag("bootstrap.noTimelyData", !0),
        await this.resetDatabase({
            dangerouslyIncrementUserVersion: !0
        }));
        for (const a of n.modelsToLoad) // here Linear bootstrap all database from each Model
            e.put(dr, {
                persisted: !1 // first make all models as not persisted
            }, a).catch(()=>{}
            );
        let r;
        if (n.type !== "local") {
            // If Linear bootstraps for the first time, it could call `fullBootstrap`.
            // This would trigger a HTTP request and get models and metadata in the response.
            const o = await (n.type === "full" ? Oo.fullBootstrap(this.graphQLClient, n.modelsToLoad, n.partialModels) : Oo.partialBootstrap(this.graphQLClient, n.modelsToLoad)).catch(d=>{
                throw d.userError || F.error("Sync bootstrap query error", d, {
                    type: n.type,
                    lastSyncId: this.metadata.lastSyncId,
                    backendDatabaseVersion: this.metadata.backendDatabaseVersion
                }),
                P1(d) && d.userError ? d : new et({
                    type: "bootstrap error",
                    message: "could not load bootstrap",
                    userError: d.userError ?? !1,
                    userPresentableMessage: d.userPresentableMessage ?? "Could not reach Linear servers in order to load workspace data. Please check your internet connection and try again."
                })
            }
            );
            Hi.addStartupSpanTag("bootstrap.networkModelCount", o.data.length),
            Hi.addStartupSpanTag("bootstrap.syncPacketCount", ((s = o.syncDeltaPackets) == null ? void 0 : s.length) || 0);
            const l = o.data.reduce((d,u)=>{
                const h = u.__class;
                return delete u.__class,
                h && (d[h] = d[h] || [],
                d[h].push(u)),
                d
            }
            , {});
            for (const d of n.modelsToLoad)
                l[d] || (l[d] = []);
            r = o.syncDeltaPackets;
            // Each type of model will be set into ObjectStore.
            for (const d in l)
                this.storeManager.setModelData(d, l[d] ?? []);
            // Update database's metadata.
            this.metadata.backendDatabaseVersion = o.databaseVersion,
            this.metadata.subscribedSyncGroups = o.subscribedSyncGroups,
            n.type === "full" && (this.metadata.lastSyncId = o.lastSyncId,
            this.metadata.firstSyncId = o.lastSyncId),
            // Metadata is also written to IndexedDB.
            (i = this.database) == null || i.put(dr, this.metadata, "meta").catch(this.handleWriteError)
        }
        return {
            lastSyncId: this.metadata.lastSyncId,
            subscribedSyncGroups: this.metadata.subscribedSyncGroups,
            type: n.type,
            backendDatabaseVersion: this.metadata.backendDatabaseVersion,
            syncDeltaPackets: r
        }
    }
    async loadPartialModels(e, n) { // Database.loadPartialModels
        if (e.length === 0)
            return [];
        const r = await Oo.partialBootstrap(this.graphQLClient, e, n, {
            firstSyncId: this.metadata.firstSyncId
        });
        let s;
        return this.database && (s = await this.getRemovedModelIds(e, r.lastSyncId)), // Check if the partial model
        // is removed by sync actions. If so, it should not load those.
        r.data.filter(i=>!(s != null && s.has(i.id || "")))
    }
    async hasModelsForPartialIndexValues(e, n, r) {
        return this.database !== void 0 && this.storeManager.objectStore(e).hasModelsForPartialIndexValues(this.database, n, r)
    }
    async removeLoadedPartialIndexValues(e, n) {
        return this.database === void 0 ? n : this.storeManager.objectStore(e).removeLoadedPartialIndexValues(this.database, n)
    }
    async setPartialIndexValueForModel(e, n) {
        if (!this.database)
            return;
        const r = this.storeManager.objectStore(e);
        n === Zn.FULLY_LOADED_INDEX_NAME 
            ? await r.setIsReady(this.database) // If the models is fully loaded, change model in _metadata as persisted
            : await r.setPartialIndexValue(this.database, n)
    }
    async flush() {
        if (!(!this.database || !this.storeManager.requiresFlushing))
            try {
                (await this.storeManager.flush(this.database)).updatesFlushed.catch(this.handleWriteError)
            } catch (e) {
                this.handleWriteError(e)
            }
    }
    async cleanupSyncActionStore(e) {
        const n = this.database ? this.database.transaction([this.storeManager.syncActionStore.storeName], "readwrite", {
            durability: "relaxed"
        }) : void 0;
        n && await this.storeManager.syncActionStore.cleanupStore(n, e)
    }
    async getRemovedModelIds(e, n) {
        if (!this.database)
            return;
        const r = []
          , s = this.storeManager.syncActionStore.storeName
          , i = this.database.transaction([s], "readwrite", {
            durability: "relaxed"
        });
        for (const a of e) // e for modelNames
            r.push(...await this.storeManager.syncActionStore.getRemovedModelIds(i, a, n));
        return await i.done,
        new Set(r)
    }
    get storeManager() {
        // The store manager is lazily created in this getter.
        return this._storeManager || (this._storeManager = new cce(this.graphQLClient,this.options)),
        this._storeManager
    }
    hasTimelyData(e) {
        const n = mn.getValue(mn.timeBeforeFullBootstrap, {
            allModelsReady: "28d",
            hasNotReadyModels: "14d"
        })
          , r = e === !0 ? n.allModelsReady : n.hasNotReadyModels
          , s = qL(r) ? WL(r) : be.DAY * 28;
        return Date.now() - this.metadata.updatedAt.getTime() < s
    }
}
;
eg.constructorName = "Database";
/** Database */
let xn = eg;
