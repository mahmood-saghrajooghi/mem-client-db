
  class SyncClient { // class SyncClient
    get onInitialModelsLoaded() {
        return this._onInitialModelsLoaded
    }
    get onDatabaseVersionChange() {
        return this._onDatabaseVersionChange
    }
    get onBootstrap() {
        return this._onBootstrap
    }
    get onTransactionCountChange() {
        return this.transactionQueue.onTransactionCountChange
    }
    get onTransactionQueued() {
        return this.transactionQueue.onTransactionQueued
    }
    get onArchive() {
        return this._onArchive
    }
    get onArchiveUpdate() {
        return this._onArchiveUpdate
    }
    get onUnarchive() {
        return this._onUnarchive
    }
    get onSyncGroupsChanged() {
        return this._onSyncGroupsChanged
    }
    get onDatabaseUnavailable() {
        return this.database.onDatabaseUnavailable
    }
    get onInvalidateRejectedHydrations() {
        return this._onInvalidateRejectedHydrations
    }
    invalidateRejectedHydrations() {
        this._onInvalidateRejectedHydrations.fire()
    }
    get onSavingStoreCountChange() {
        return this.database.onSavingStoreCountChange
    }
    get shouldResetOnError() {
        return this._shouldResetOnError
    }
    constructor(e, n, r, s) {
        // Each model maps to a set.
        this.modelClassToModelLookup = {},
        this._onInitialModelsLoaded = new Tt,
        this._onDatabaseVersionChange = new Tt,
        this._onBootstrap = new Tt,
        this._onArchive = new Tt,
        this._onArchiveUpdate = new Tt,
        this._onUnarchive = new Tt,
        this._onSyncGroupsChanged = new Tt({
            maxObservers: 0
        }),
        this._onInvalidateRejectedHydrations = new Tt({
            maxObservers: 0
        }),
        this._shouldResetOnError = !1,
        this.lastSyncId = 0,
        this.backendDatabaseVersion = 0,
        this.modelLookup = {}, // Maps a model's id to the object! It is the "ObjectPool".
        this.temporaryModelLookup = {},
        this.archivedModelLookup = {},
        this.modelClassToArchivedModelLookup = {},
        this.modelClassToTemporaryModelLookup = {},
        this.syncWaitQueue = new OE,
        this.subscribedSyncGroups = new Set,
        this.deltaSyncFailures = 0,
        this.hydrationBatch = new pce(200),
        this.addModelToArchiveCollections = Le(i=>{
            const a = this.modelLookup[i.id] !== void 0;
            this.removeModelFromLiveCollections(i),
            this.archivedModelLookup[i.id] || (this.archivedModelLookup[i.id] = i,
            this.modelClassToArchivedModelLookup[i.modelName].add(i),
            a && this._onArchive.fire(i))
        }
        ),
        this.removeModelFromArchiveCollections = Le(i=>{
            this.archivedModelLookup[i.id] && (delete this.archivedModelLookup[i.id],
            this.modelClassToArchivedModelLookup[i.modelName].delete(i),
            this._onUnarchive.fire(i))
        }
        ),
        this.updateLock = new qf,
        this.addNewSyncGroupsToDatabase = (i,a,o)=>{
            if (i.length !== 0) {
                F.network(`Adding sync groups ${i.join(", ")} to database`);
                for (const l of a) {
                    if (!l.id)
                        continue;
                    const {__class: d, ...u} = l;
                    if (!Me.getModelClass(d)) {
                        F.info(`Could not find model class for model type ${d}`);
                        continue
                    }
                    o.put(d, u)
                }
                for (const l of i)
                    this.subscribedSyncGroups.add(l);
                this.persistSubscribedSyncGroups(o)
            }
        }
        ,
        this.addNewSyncGroupsToClient = (i,a,o,l)=>{
            if (i.length === 0)
                return;
            F.network(`Adding sync groups ${i.join(", ")}`);
            const d = [];
            for (const u of a) {
                if (!u.id)
                    continue;
                const h = u.__class;
                let f = this.getModel(u.id);
                if (f && f.isArchived && (this.removeModelFromArchiveCollections(f),
                f = void 0),
                f) {
                    f.updateFromData(u, {
                        dataContainsAllProperties: !0
                    });
                    continue
                }
                const p = Me.getModelClass(h);
                if (!p) {
                    F.info(`Could not find model class for model type ${h}`);
                    continue
                }
                const m = new p(!1);
                m.id = u.id,
                this.addModelToLiveCollections(m),
                d.push([m, u]),
                l.set(m, o)
            }
            for (const u of d)
                u[0].updateFromData(u[1])
        }
        ,
        this.applyEphemeralUpdate = Le(i=>{
            for (const a of i) {
                const {id: o, ...l} = a
                  , d = this.getModel(o);
                d && d.updateFromData(l)
            }
        }
        ),
        this.startObservability = Le(()=>{
            Ln(this, {
                modelClassToModelLookup: ut,
                modelClassToArchivedModelLookup: ut,
                modelClassToTemporaryModelLookup: ut,
                waitForSync: Le,
                temporarilyAdd: Le,
                temporarilyRemove: Le,
                startSyncing: Le,
                addModel: Le,
                archiveModel: Le,
                deleteModel: Le,
                deleteModelAndDependencies: Le
            })
        }
        ),
        this.store = e,
        this.graphQLClient = n,
        this.database = new xn(this.graphQLClient,s),
        this.socket = r,
        this.batchModelLoader = s.batchModelLoader,
        this.transactionQueue = new uce(this.graphQLClient,this),
        this.deltaSyncReceivedPromise = new Jt(i=>{
            this.deltaSyncReceivedResolver = i
        }
        );
        for (const i of Me.getModelNames())
            this.modelClassToModelLookup[i] = new Set,
            this.modelClassToArchivedModelLookup[i] = new Set,
            this.modelClassToTemporaryModelLookup[i] = new Set;

        // Subscribe to web socket message channel.
        this.socket.onSyncMessage.subscribe(async i=>{
            try {
                await this.applyDelta(i.sync, i.lastSyncId)
            } catch {
                this.socket.restart()
            }
        }
        ),
        this.socket.onEphemeralUpdate.subscribe(i=>{
            this.applyEphemeralUpdate(i)
        }
        ),
        this.socket.onMessage.subscribe(async i=>{
            if (i.cmd === "refresh") {
                F.remote("Refresh issued");
                const a = Number(ke.get("lastRefreshCmdExec")) || 0;
                Date.now() - a > be.HOUR && (ke.set("lastRefreshCmdExec", Date.now().toString()),
                i.resetDatabase && (await this.resetLocalDatabase(),
                window.location.reload()),
                i.reloadClient && setTimeout(()=>{
                    P9.refresh({
                        delayIfDisabled: be.MINUTE
                    })
                }
                , i.reloadDelay || 0))
            } else
                i.cmd === "cacheSyncId" && this.database.cleanupSyncActionStore(i.syncId)
        }
        ),
        this.batchModelLoader.setSyncClient(this, this.database)
    }
    // CRUD methods here to create different transactions for a model.
    add(e, n) {
        if (this.findById(at, e.id, {
            excludeTemporaryModels: !0
        }))
            throw new Error(`Model ${e.id} already exists and cannot be added`);
        e.createdAt || (e.createdAt = new Date);
        const r = this.transactionQueue.create(e, n);
        return this.handleTransactionOffline(r, n == null ? void 0 : n.offlineError),
        r.result().catch(s=>{
            this.handleTransactionError(e, "Creation failed", s, "An unknown error occurred creating your data and changes have been rolled back.")
        }
        ),
        r
    }
    temporarilyAdd(e) {
        this.temporaryModelLookup[e.id] = e,
        this.modelClassToTemporaryModelLookup[e.modelName].add(e)
    }
    isModelTemporarilyPersisted(e) {
        return this.temporaryModelLookup[e.id] !== void 0
    }
    temporarilyRemove(e) {
        delete this.temporaryModelLookup[e.id],
        this.modelClassToTemporaryModelLookup[e.modelName].delete(e)
    }
    update(e, n) {
        // Call the transcation queue to generate a transaction
        const r = this.transactionQueue.update(e, n);
        return e.isArchived && this._onArchiveUpdate.fire(e),
        this.handleTransactionOffline(r, n == null ? void 0 : n.offlineError),
        r.result().catch(s=>{
            this.handleTransactionError(e, "Update failed", s, "An unknown error occurred updating your data and changes have been rolled back.")
        }
        ),
        r
    }
    archive(e, n) {
        e.archivedAt || (e.archivedAt = new Date);
        const r = this.transactionQueue.archive(e);
        return this.handleTransactionOffline(r, n == null ? void 0 : n.offlineError),
        r.result().catch(s=>{
            this.handleTransactionError(e, "Archiving failed", s, "An unknown error occurred archiving your data and changes have been rolled back.")
        }
        ),
        r
    }
    unarchive(e, n) {
        e.archivedAt && (e.archivedAt = void 0);
        const r = this.transactionQueue.unarchive(e);
        return this.handleTransactionOffline(r, n == null ? void 0 : n.offlineError),
        r.result().catch(s=>{
            this.handleTransactionError(e, "Restoring failed", s, "An unknown error occurred restoring your data and changes have been rolled back.")
        }
        ),
        r
    }
    delete(e, n) {
        this.temporarilyRemove(e),
        e.archivedAt || (e.archivedAt = new Date);
        const r = this.transactionQueue.delete(e);
        return this.handleTransactionOffline(r, n == null ? void 0 : n.offlineError),
        r.result().catch(s=>{
            new kd(Lo.error,"Deleting failed",sy(s, "An unknown error occurred deleting your data and changes have been rolled back.")).show()
        }
        ),
        r
    }
    sendEphemeral(e, n) {
        const r = {
            ...n,
            id: e.id
        }
          , s = {
            cmd: "eu",
            updates: [r]
        };
        F.network("Sending ephemeral update", r),
        this.socket.send(s)
    }
    findById(e, n, r) { // `e` for the Model's constructor function, `n` for id, `r` for options
        let s = this.modelLookup[n] || this.archivedModelLookup[n];
        if (!s && !(r != null && r.excludeTemporaryModels) && (s = this.temporaryModelLookup[n]),
        s !== void 0 && s instanceof e)
            return s.observePropertyChanges(),
            s
    }
    async findArchivedById(e, n) {
        const r = this.findById(e, n);
        if (r && r.dependenciesRequireLoading === !1)
            return r;
        const s = await this.graphQLClient.query(hce(e, n));
        return this.applyArchiveResponse(s.archivedModelSync).find(a=>a instanceof e)
    }
    allModelsOfType(e, n) {
        const r = ()=>Array.from(this.modelClassToArchivedModelLookup[e.modelName]) || []
          , s = ()=>Array.from(this.modelClassToModelLookup[e.modelName]) || []
          , i = ()=>Array.from(this.modelClassToTemporaryModelLookup[e.modelName]) || [];
        switch (n) {
        case lr.noTempModels:
            return [...s(), ...r()];
        case lr.noArchivedModels:
            return [...s(), ...i()];
        case lr.onlyArchivedModels:
            return r();
        case lr.onlyRegularModels:
            return s();
        case lr.allModels:
            return [...s(), ...i(), ...r()];
        default:
            new zt(n)
        }
        return []
    }
    *allModelsOfTypeGen(e, n) {
        if (n !== lr.onlyArchivedModels && this.modelClassToModelLookup[e.modelName])
            for (const r of this.modelClassToModelLookup[e.modelName])
                yield r;
        if ((n === lr.allModels || n === lr.noArchivedModels) && this.modelClassToTemporaryModelLookup[e.modelName])
            for (const r of this.modelClassToTemporaryModelLookup[e.modelName])
                yield r;
        if ((n === lr.allModels || n === lr.noTempModels || n === lr.onlyArchivedModels) && this.modelClassToArchivedModelLookup[e.modelName])
            for (const r of this.modelClassToArchivedModelLookup[e.modelName])
                yield r
    }
    loadAllModelData(e) {
        return this.database.getAllModelData(Me.getClassName(e))
    }
    localStoreReady(e) {
        return this.database.objectStoreReady(Me.getClassName(e))
    }
    async hydrateModel(e, n, r) { // Hydrate a model.
        var l, d; // e for the model's class, n is an object which contains the id of the model that is going to be hydrated,
        // or indexes, r for a option object
        const s = typeof n == "string" ? n : n.id
          , i = typeof n == "string" ? void 0 : n.partialIndexValues
          , a = this.findById(e, s); // First it will check if the model is already hydrated and lives in the ObjectPool.
        if (a)
            return a;
        const o = await this.database.getModelDataById(Me.getClassName(e), s, r); // If not, it will try to load the model from IndexedDB.
        if (o !== void 0) {
            if (o === "needs_network_hydration") {
                if (r != null && r.onlyIfLocallyAvailable) // If there is an option to let LSE only load from local IndexedDB, it will not trigger a network request.
                    return;
                if (this.store.developerOptions && await this.applyNetworkDeveloperOptions(),
                this.partialModelLoadedInFull(e)) {
                    // Load models in full (load all of this model).
                    if ((l = r == null ? void 0 : r.customNetworkHydration) != null && l.call(r))
                        throw new Error("Custom network hydration is not supported for models loaded in full");
                    // First, load the specific model.
                    await this.batchModelLoader.addRequest({
                        modelClass: e,
                        id: s,
                        coveringPartialIndexValues: i
                    }),
                    // Na is a setTimeout wrapper in Promise
                    // Second, load all instances of that model.
                    Na(1).then(()=>this.batchModelLoader.addRequest({
                        modelClass: e,
                        skipCreatingModelsInMemory: !0
                    }))
                } else {
                    const u = [{
                        modelClass: e,
                        id: s,
                        coveringPartialIndexValues: i
                    }]
                        // A hook for use customNetworHypdration instead of the default one.
                      , h = ((d = r == null ? void 0 : r.customNetworkHydration) == null ? void 0 : d.call(r)) || u;
                    await Promise.all(h.map(f=>this.batchModelLoader.addRequest(f)))
                }
                return this.findById(e, s)
            }

            // If LSE can load the model from the local database, LSE will hydrate these model and return the first one's hydration promise.
            return this.hydrationBatch.addOperation(o, u=>this.createHydratedModels(e, [u])[0])
        }
    }
    async hydrateModelsByIndexedKey(e, n, r) {
        // e for hydrated model's class
        // s for indexes
        // r for options
        var i, a;
        // The first step is to check if we need to perform a network hydration.
        const s = await this.database.getModelDataByIndexedKey(e, n, r);
        if (s === "needs_network_hydration") {
            if (r != null && r.onlyIfLocallyAvailable)
                return !1;
            if (this.store.developerOptions && await this.applyNetworkDeveloperOptions(),
            this.partialModelLoadedInFull(e)) { // If the lazy loaded model should be loaded in full.
                if ((i = r == null ? void 0 : r.customNetworkHydration) != null && i.call(r))
                    throw new Error("Custom network hydration is not supported for models loaded in full");
                const d = {
                    modelClass: e,
                    skipCreatingModelsInMemory: !0
                };
                await this.batchModelLoader.addRequest(d);

                // After these models are fetched, LSE will hydrate these models.
                const u = await this.database.getModelDataByIndexedKey(e, n, r);
                if (u === "needs_network_hydration")
                    throw new Error("Failed to load models after network full load");
                return this.hydrationBatch.addOperation(u, h=>this.createHydratedModels(e, h))
            }

            // Request object
            const o = [{
                modelClass: e,
                indexedKey: n.key,
                keyValue: n.value.toString(),
                coveringPartialIndexValues: n.coveringPartialIndexValues
            }]
              , l = ((a = r == null ? void 0 : r.customNetworkHydration) == null ? void 0 : a.call(r)) || o;

            // Add request to batchModelLoader.
            return await Promise.all(l.map(d=>this.batchModelLoader.addRequest(d))),
            !0
        }
        // If the result if not network hydration, LSE will hydrate these models from the local database.
        return this.hydrationBatch.addOperation(s, o=>this.createHydratedModels(e, o))
    }
    async hydrateLocalModelsByIds(e, n) {
        const r = this.database.getModelDataByIds(Me.getClassName(e), n);
        return await this.hydrationBatch.addOperation(r, s=>this.createHydratedModels(e, s))
    }
    countModelsOfType(e) {
        return this.modelClassToModelLookup[e.modelName].size
    }
    async initializeDatabase(e) {
        const n = this.logStorageEstimates();
        try {
            await this.database.open(e) // <- Real stuff.
        } catch (r) {
            const s = await n;
            F.withEnabledLogging(()=>{
                F.warning("Error opening database", {
                    error: r,
                    storage: s
                })
            }
            );
            const i = typeof (r == null ? void 0 : r.message) == "string" ? r.message.includes("bucket data directory") : !1
              , a = lL && typeof (r == null ? void 0 : r.message) == "string" && r.message.includes("Internal error opening backing store");
            throw new et({
                type: "bootstrap error",
                message: "error opening database",
                userError: !0,
                userPresentableMessage: `Could not save data to local database${(s == null ? void 0 : s.isStorageProblem) === !0 ? " since it looks like you've run out of disk space" : i || a ? " since you've unfortunately run into a known Chromium bug" : ""}. If you have remaining space on your system and are not browsing in private mode, this error will usually resolve after quitting and restarting your browser. If you continue to see this error after a browser restart, please ${a ? "try installing our desktop app or" : ""} contact us at support@linear.app.`
            })
        }
    }
    async bootstrap(e) {
        var o, l, d;
        const {userId: n, userAccountId: r} = e;
        this.userId = n,
        this.userAccountId = r;
        const s = this.database.requiredBootstrap(); // Determine the bootstrapping type.
        ((o = this.store.developerOptions) == null ? void 0 : o.forceNotLoadPartialModelsOnBootstrap) === !0 && s.type === "full" && (s.partialModels = []);
        // Fetch delta request. We only do delta request with a partial bootstrapping.
        const i = s.type === Ra.partial && this.fetchDelta(s.lastSyncId).catch(()=>{}
        );
        this._onBootstrap.fire(s.type);
        const a = await this.database.bootstrap(); // Bootstrap the database from here.
        this.firstSyncId = this.lastSyncId = a.lastSyncId,
        this.backendDatabaseVersion = a.backendDatabaseVersion,
        this.subscribedSyncGroups = new Set(a.subscribedSyncGroups);
        try {
            F.network(`Bootstrapping. Last sync id is ${this.lastSyncId}. Backend DB version is ${this.backendDatabaseVersion}`);
            // Get all models that should be hydrated when the application bootstraps.
            const u = await this.database.getAllInitialHydratedModelData()
              , h = [] // To store the model objects.
              , f = []; // To store raw model properties.
            // Construct the models from the fetched data.
            if (xt.trace("startup", "SyncClient.bootstrap.constructModels", ()=>{
                for (const C of Object.keys(u))
                    for (const b of u[C]) {
                        const k = Me.getModelClass(C); // Get the model's constructor for ModelRegistry.
                        if (!k) {
                            F.info(`Could not find model class for model type '${b.__modelName}'.`);
                            continue
                        }
                        const S = new k(!1); // Call the model's constructor to hydrate the model.
                        S.id = b.id, // Change the model's id, the model's properties and references would be set later.
                        h.push(S),
                        f.push(b)
                    }
            }
            ),
            h.length === 0)
                return {
                    success: !1,
                    type: a.type
                };
            Hi.addStartupSpanTag("models.count", h.length),
            xt.trace("startup", "SyncClient.bootstrap.updateModels", ()=>{
                for (const b of h)
                    // The newly constructed models will be saved into the "ObjectPool".
                    this.addModelToLiveCollections(b);
                let C = 0;
                lt(()=>{ // Do it in MobX's context.
                    for (const b of h)
                        b.updateFromData(f[C++]); // Dump model properties into that model object.
                    for (const b of h) // Hydrate references.
                        b.attachToReferencedProperties()
                }
                )
            }
            ),
            this._onInitialModelsLoaded.fire();
            const p = a.type === Ra.partial ? Oo.validateDependencies(s.modelsToLoad) : !0;
            if (F.network(`Got ${h.length} stored models.`),
            this.startObservability(),
            // Load cached transactions and replay them.
            await this.transactionQueue.loadPersistedTransactions(this.database).catch(C=>{
                F.error("Error loading persisted transactions", C)
            }
            ),
            (l = a.syncDeltaPackets) != null && l.length) {
                await this.database.flush();
                const C = a.syncDeltaPackets.filter(b=>b.action !== "S");
                await this.applyDelta(C, a.lastSyncId, !0)
            }
            // Demo logic.
            if (hs)
                return {
                    success: !0,
                    type: a.type
                };
            const m = i && !p ? await i : void 0;
            m && (await this.database.flush(),
            await this.applyDelta(m, a.lastSyncId, !0));
            const g = !p || await this.store.requireDeltaSyncAtStartup();
            return (g || (d = a.syncDeltaPackets) != null && d.length) && (Hi.addStartupSpanTag("waitingForDelta", !0),
            Jn.increment("bootstrap.waiting.delta")),
            !m && g ? (await this.database.flush(),
            // Start syncing incremental updates with the server.
            await this.startSyncing(a.type),
            this.transactionQueue.confirmPersistedTransactions()) : (this._shouldResetOnError = a.type === Ra.partial,
            X0.onLoadingDone.subscribeOnce(async()=>{
                // For a full bootstrapping, only flush the database when onLoadingDone is triggered.
                await this.database.flush(),
                // Start syncing.
                await this.startSyncing(a.type),
                this.transactionQueue.confirmPersistedTransactions(),
                this._shouldResetOnError = !1
            }
            )),
            {
                success: !0,
                type: a.type
            }
        } catch (u) {
            return F.error("Error bootstrapping from local db", u),
            await (this.userId ? Xn.deleteDatabaseForUserId(this.userId) : Xn.deleteAllDatabases()),
            {
                success: !1,
                type: a.type,
                error: u
            }
        }
    }
    disconnect() {
        F.network("Disconnecting from the sync server."),
        this.socket && this.socket.disconnect(),
        this.database.close("disconnected")
    }
    reconnectWebSocket() {
        this.socket.restart()
    }
    async waitForSync() {
        await this.socket.ping()
    }
    startSyncing(e) {
        let n = !1;
        return new Promise(r=>{
            this.socket.connect({
                url: ft.SOCKET_SERVER_URL || "ws://localhost:8090",
                userId: this.userId || "",
                userAccountId: this.userAccountId || "",
                handshakeCallback: async s=>{
                    var h;
                    const i = this.socket.connectionId;
                    let a = this.lastSyncId;
                    try {
                        const f = await this.database.getMetadata();
                        a = f.lastSyncId,
                        this.setFirstSyncId(f.firstSyncId || f.lastSyncId)
                    } catch {}
                    const o = s.sync;
                    if (!o)
                        return F.error("No sync data in handshake message"),
                        !1;
                    const l = Math.min(this.lastSyncId, a)
                      , d = o.lastSyncId
                      , u = o.lastSequentialSyncId ?? o.lastSyncId;
                    // Compare the local lastSyncId with the server's.
                    if (l < d) {
                        F.network("Client is not up to date, replaying...", {
                            fromSyncId: l,
                            toSyncId: d
                        });
                        try {
                            // When the web socket connection is established,
                            // the client will check if there are some delta packets missing from the server.
                            F.network("Requesting delta packets", {
                                fromSyncId: l,
                                toSyncId: d
                            });
                            // Since applyDelta use updateLock, so catching up deltas would be applied first?
                            // Is fetchDelta always that fast?
                            const f = await this.fetchDelta(l, d, e === Ra.full && !n);
                            await this.applyDelta(f, u, !0),
                            this.deltaSyncFailures = 0,
                            n = !0
                        } catch (f) {
                            return f instanceof et && ((h = f.flags) == null ? void 0 : h.reSyncRequired) === !0 ? (this.userId ? await Xn.deleteDatabaseForUserId(this.userId) : await Xn.deleteAllDatabases(),
                            window.location.reload()) : hd(f) ? (F.error("Continuosly failed to apply delta sync because of ratelimits", f),
                            this.store.disconnectFromBackendWithBootstrapError(f)) : z3(f) ? (this.userId ? await Xn.deleteDatabaseForUserId(this.userId) : await Xn.deleteAllDatabases(),
                            window.location.reload()) : (this.deltaSyncFailures++,
                            p8(f) || F.error("Failed to apply delta sync", f, {
                                deltaSyncFailures: this.deltaSyncFailures
                            }),
                            this.deltaSyncFailures > 3 && (p8(f) ? this.store.disconnectFromBackendWithBootstrapError(new et({
                                ...f,
                                userPresentableMessage: "It looks like Linear servers are not reachable. Please check your internet connection and try again."
                            })) : (F.error("Continuously failing to apply delta sync", f),
                            this.userId ? await Xn.deleteDatabaseForUserId(this.userId) : await Xn.deleteAllDatabases(),
                            window.location.reload()))),
                            !1
                        }
                    }
                    return this.socket.connectionId !== i ? !1 : (Yo(Array.from(this.subscribedSyncGroups), o.subscribedSyncGroups) || (this.subscribedSyncGroups = new Set(o.subscribedSyncGroups),
                    this.persistSubscribedSyncGroups()),
                    this.checkDatabaseVersionChange(o.databaseVersion),
                    this.deltaSyncReceivedResolver(),
                    r(),
                    !0)
                }
            })
        }
        )
    }
    async resetLocalDatabase() {
        return this.database.resetDatabase()
    }
    async deleteLocalDatabase() {
        return this.database.deleteDatabase()
    }
    addModel(e) {
        return e.isArchived || this.modelLookup[e.id] !== void 0 ? !1 : (this.addModelToLiveCollections(e),
        !0)
    }
    archiveModel(e) {
        e.detachFromReferencedProperties(),
        this.addModelToArchiveCollections(e)
    }
    deleteModel(e) {
        e.detachFromReferencedProperties(),
        this.removeModelFromArchiveCollections(e),
        this.removeModelFromLiveCollections(e)
    }
    async deleteModelAndDependencies(e, n, r) {
        const s = new qd(this);
        n ? (s.scheduleModelRemoval("deletion", e.modelName, e.id, this.lastSyncId, r),
        await s.applyRemovalsToDatabase(n)) : await this.database.writeTransaction({
            metaStore: !1,
            syncActionStore: !0
        }, async i=>{
            s.scheduleModelRemoval("deletion", e.modelName, e.id, this.lastSyncId, r),
            await s.applyRemovalsToDatabase(i)
        }
        ),
        lt(()=>{
            s.scheduleModelRemoval("deletion", e.modelName, e.id, this.lastSyncId, r),
            s.applyRemovalsToSyncClient(this.lastSyncId)
        }
        )
    }
    getModel(e) {
        return this.modelLookup[e] || this.archivedModelLookup[e] || this.temporaryModelLookup[e]
    }
    cancelTransaction(e) {
        this.transactionQueue.cancelTransaction(e)
    }
    transactionsForModel(e) {
        return this.transactionQueue.transactionsForModel(e)
    }
    async waitUntilSyncId(e) { // Wait for the client reaching at `lastSyncId` of e
        // e for the `lastSyncId` to wait for.
        // hs is related to demo
        hs || this.lastSyncId >= e || await this.syncWaitQueue.wait(e)
    }
    applyArchiveResponse(e) {
        const n = JSON.parse(e.archive);
        return this.checkDatabaseVersionChange(e.databaseVersion),
        this.createModelsFromData(n, {
            dependenciesRequireLoading: !e.includesDependencies
        })
    }
    applyModelData(e) {
        return this.createModelsFromData(e)
    }
    async reSyncModel(e, n) {
        Me.getModelClass(e) && await this.updateLock.runExclusive(async()=>{
            const r = new Zu(this.graphQLClient,!0,2)
              , s = r.allProcessedResult();
            r.addRequest({
                modelName: e,
                identifier: n
            }).catch(()=>{}
            );
            const i = (await s).flatMap(a=>a).filter(a=>Me.getModelClass(a.__class));
            this.createModelsFromData(i),
            await this.database.writeTransaction({
                metaStore: !1,
                syncActionStore: !1
            }, Le(a=>{
                for (const o of i) {
                    const {__class: l, ...d} = o;
                    a.put(l, d)
                }
            }
            ))
        }
        )
    }
    async loadPartialModels(e, n, r) {
        const s = Array.isArray(e) ? e : [e]
          , i = Array.isArray(n) ? n : [n];
        if (s.length === 0 || i.length === 0)
            return;
        const a = [];
        for (const o of s)
            for (const l of i)
                await this.database.hasModelsForPartialIndexValues(o.modelName, [Zn.createPartialIndexValue({
                    modelClass: o,
                    syncGroup: l
                })]) || a.push({
                    modelClass: o,
                    syncGroup: l,
                    skipCreatingModelsInMemory: r == null ? void 0 : r.skipAddingToMemory
                });
        a.length !== 0 && await Promise.all(a.map(o=>this.batchModelLoader.addRequest(o)))
    }
    async hasModelsForPartialIndexValues(e, n, r) {
        return this.database.hasModelsForPartialIndexValues(e, n, r)
    }
    async removeLoadedPartialIndexValues(e, n) {
        return this.database.removeLoadedPartialIndexValues(e, n)
    }
    async statistics() {
        var s, i;
        const e = await fce(this.graphQLClient)
          , n = await this.database.statistics()
          , r = {};
        for (const a in n)
            r[a] = {
                inMemory: 0,
                inLocalDatabase: ((s = n[a]) == null ? void 0 : s.count) || 0,
                inRemoteDatabase: e[a] || 0,
                partialIndexValues: (i = n[a]) == null ? void 0 : i.partialIndexValues
            };
        return Object.values(this.modelLookup).forEach(a=>{
            a && (r[a.modelName].inMemory += 1)
        }
        ),
        r
    }
    async localStatistics() {
        var r, s;
        const e = await this.database.statistics()
          , n = {};
        for (const i in e)
            n[i] = {
                inMemory: 0,
                inLocalDatabase: ((r = e[i]) == null ? void 0 : r.count) || 0,
                partialIndexValues: (s = e[i]) == null ? void 0 : s.partialIndexValues
            };
        return Object.values(this.modelLookup).forEach(i=>{
            i && (n[i.modelName].inMemory += 1)
        }
        ),
        n
    }
    getLastSyncId() {
        return this.lastSyncId
    }
    getFirstSyncId() {
        return this.firstSyncId
    }
    loadModelDataForDebug(e, n) {
        return typeof n == "string" ? this.database.getModelDataById(Me.getClassName(e), n, {
            onlyIfLocallyAvailable: !0
        }) : this.database.getModelDataByIndexedKey(e, n)
    }
    createModelsFromData(e, n) {
        // This is similar to the last phase of the bootstrapping process.
        return lt(()=>{
            const r = [] // All constructed models.
              , s = e.map(i=>{ // All constructed or updated models.
                const a = Me.getModelClass(i.__class);
                if (a) {
                    const o = this.findById(a, i.id);
                    if (o)
                        // Before creating the model, check if there's already a model with given ID.
                        // If dontUpdateExistingModels is not false, it will update that model.
                        // Otherwise, it will just return the existing object.
                        return (n == null ? void 0 : n.dontUpdateExistingModels) !== !0 && o.updateFromData(i, {
                            dataContainsAllProperties: !0
                        }),
                        o;
                    const l = this.createModel(a, i);
                    return r.push(l),
                    l
                } else {
                    F.info(`Could not find model class for ${i.__class}`);
                    return
                }
            }
            ).concrete();
            // Build references for all models.
            for (const i of s)
                n != null && n.dependenciesRequireLoading && (i.dependenciesRequireLoading = !0),
                i.attachToReferencedProperties();
            for (const i of r)
                // Some models may be waiting for their reference.
                this.store.delayedRelationManager.resolveDelayedRelation(i);
            return s
        }
        )
    }
    setFirstSyncId(e) {
        this.firstSyncId = e,
        this.graphQLClient.setFirstSyncId(e)
    }
    handleTransactionOffline(e, n) {
        n && e.result().then(r=>{
            r === Ro.offlined && (e.cancel(),
            new kd(Lo.error,"You are offline",n).show())
        }
        )
    }
    async fetchDelta(e, n, r) {
        let s = `/sync/delta?lastSyncId=${e}`;
        n && (s += `&toSyncId=${n}`);
        let a = (await this.graphQLClient.restModelsJsonStream(s)).syncActions || [];
        return r && (a = a.filter(o=>o.action !== "S")),
        a.reverse(),
        F.network(`Received ${a.length} delta packets`, {
            fromSyncId: e,
            toSyncId: n,
            length: a.length
        }),
        a
    }
    createModel(e, n) {
        const r = this.findById(e, n.id)
          , s = r || new e(!1);
        return s.store = this.store, // the model's store property are assigned here
        s.updateFromData(n, {
            dataContainsAllProperties: !!r
        }),
        s.isArchived ? this.addModelToArchiveCollections(s) : this.addModelToLiveCollections(s),
        s
    }
    addModelToLiveCollections(e) { // Add a model object to the "ObjectPool".
        this.removeModelFromArchiveCollections(e),
        this.modelLookup[e.id] || (this.modelLookup[e.id] = e,
        this.modelClassToModelLookup[e.modelName].add(e))
    }
    removeModelFromLiveCollections(e) {
        this.modelLookup[e.id] && (delete this.modelLookup[e.id],
        this.modelClassToModelLookup[e.modelName].delete(e))
    }
    checkDatabaseVersionChange(e) {
        this.backendDatabaseVersion !== e && (this.backendDatabaseVersion < e && setTimeout(()=>{
            this._onDatabaseVersionChange.fire()
        }
        , vce + Math.random() * wce),
        this.backendDatabaseVersion = e,
        this.database.setBackendDatabaseVersion(this.backendDatabaseVersion))
    }
    async applyDelta(e, n, r) { // The method to handle delta packets
        // e for the delta packets
        // receive delta from the remote server
        // e for the update events
        // n for the lastSyncId

        // Delta packets have to be processed in a synchronous way, so there is an update lock.
        e.length !== 0 && await this.updateLock.runExclusive(async()=>{
            e.length && F.network(`Processing ${e.length} sync packets. Last sync is ${n}`, {
                updates: e.slice(0, 200)
            });

            // Step 1. This handles situations when the user's SyncGroup changes, for example, joinning a new team.
            // The LSE will firstly load all models in that SyncGroup, because actions can only be applied to
            // already loaded models.
            const {
                syncGroupsChanged: s,
                addedSyncGroups: i,
                removedSyncGroups: a,
                loadedSyncGroupsModels: o,
                syncId: l // lastSyncId
            } = await this.loadDeltaNewSyncGroupsModels(e);

            // Step 2. For some sync actions, LSE will load their dependency models immediately.
            let d = []; // dependents models
            const u = await Zu.supportedPacket(this.database, e); // u is an array of sync action that should load its dependencies
            if (u.length > 0) {
                const f = new Zu(this.graphQLClient,!1,3) // Not include dependent and max retry for 3 times.
                  , p = f.allProcessedResult();
                for (const m of u)
                    F.network(`Loading dependencies for ${m.modelName} with id ${m.data.id}`),
                    f.addRequest({
                        modelName: m.modelName,
                        identifier: m.data.id
                    }).catch(()=>{}
                    );
                // LSE will await all models are loaded into the database before continue to processing models.
                d = (await p).flatMap(m=>m).filter(m=>Me.getModelClass(m.__class))
            }

            // Write to the database
            await this.database.writeTransaction({
                metaStore: !0,
                syncActionStore: !0
            }, async f=>{
                // Step 3, write new models into the database.
                i.size > 0 && this.addNewSyncGroupsToDatabase([...i], o, f); // Write models of new sync groups into database.
                for (const m of d) {
                    const {__class: g, ...C} = m;
                    f.put(g, C) // Write dependents into database.
                }

                // Step 4, loop through all sync actions and resolve them to update the local database.
                const p = new qd(this,r); // Create a TransientModelRemoval helper class to schedule removing of models.
                for (const m of e) // Loop through all actions.
                    switch (f.addSyncPacket(m),
                    // Continuous removal actions should be performed in a batched way.
                    p.shouldApplyRemoval(m) === !0 && await p.applyRemovalsToDatabase(f),
                    m.action) {
                    case "I": // Insertion
                    case "V": // Unarchive
                    case "U": // Updation
                        f.put(m.modelName, m.data), // Write model data into database.
                        // If the client is going to create a model that is already
                        // inserted, unarhived, updated, the InsertionTransaction should be cancelled.
                        this.transactionQueue.modelUpserted(m.modelId);
                        break;
                    case "C": // Partially cover a model
                        const g = await f.get(m.modelName, m.modelId);
                        g ? (Object.assign(g, m.data),
                        // Write the covered model data into database.
                        f.put(m.modelName, g)) : F.error("Did not have model for C packet", void 0, {
                            id: m.modelId,
                            modelName: m.modelName
                        });
                        break;
                    case "A": // Archival
                        p.scheduleModelRemoval("archival", m.modelName, m.modelId, m.id);
                        break;
                    case "D": // Deletion
                        p.scheduleModelRemoval("deletion", m.modelName, m.modelId, m.id);
                        break;
                    case "G":
                    case "S": // Change SyncGroups
                        const b = this.changedSyncGroups(m.data.syncGroups, this.subscribedSyncGroups).removedGroups.filter(k=>a.has(k));
                        b.length && await this.removeSyncGroups(b, f, p, m.id); // Delete model of the SyncGroups the user left from.
                        break
                    }
                await p.applyRemovalsToDatabase(f), // Finish the loop above.

                // Step 4. Loop actions to update in-memory model.
                lt(()=>{
                    var C;
                    const m = new Map;
                    // New models created by this delta packet.
                    // It maps the model object with the sync action's id
                    // that creates the object.
                    i.size > 0 && this.addNewSyncGroupsToClient([...i], o, l, m);

                    for (const b of e)
                        switch (b.action) {
                        case "I":
                        case "V":
                        case "U":
                            const k = Me.getModelClass(b.modelName);
                            if (k) {
                                let D = this.findById(k, b.data.id);
                                // For inserting, unarchiving and updating actions,
                                // should move the model from archive collections
                                // or create the model.
                                if (D && D.isArchived && (b.action === "I" || r === !0) && (this.removeModelFromArchiveCollections(D),
                                D = void 0),
                                !D) {
                                    let R;
                                    try {
                                        R = this.createModel(k, b.data)
                                    } catch (T) {
                                        throw F.error("Error creating model from sync packet", T, {
                                            packetId: b.id,
                                            modelId: b.modelId,
                                            modelName: b.modelName
                                        }),
                                        T
                                    }
                                    m.set(R, b.id)
                                }
                            }
                            break;
                        case "A":
                            // If the archived model lives in the object pool,
                            // update all its properties first.
                            const S = this.findById(at, b.modelId);
                            S && b.data && S.updateFromData(b.data, {
                                dataContainsAllProperties: !0
                            });
                            break
                        }
                    const g = p.removedModelIds;
                    for (const [b,k] of m) {
                        const S = g.get(b.id);
                        S !== void 0 && S >= k && m.delete(b) // If models created by actions
                        // in this delta packet get removed by later actions in the same
                        // delta packet, it will be removed from here.
                    }

                    // After that we can ensure that models in m will be alive after this delta
                    // packet, so we are of two create instances for these models.
                    for (const [b] of m)
                        b.attachToReferencedProperties(),
                        this.store.delayedRelationManager.resolveDelayedRelation(b);
                    d.length && this.createModelsFromData(d);

                    // Change in-memory models.
                    for (const b of e)
                        // Similar to the above code.
                        switch (p.shouldApplyRemoval(b) === !0 && p.applyRemovalsToSyncClient(b.id),
                        b.action) {
                        case "I":
                        case "V":
                        case "U":
                        case "C":
                            // If the model is in Object Pool, update its properties.
                            // Instead of sending the changed property, LSE send the whole data to the clients!
                            const k = this.findById(at, b.modelId);
                            k && (k.updateFromData(b.data, {
                                dataContainsAllProperties: b.action !== "C" // The action will contains all properties if it is not
                                // a Partial Covering action.
                            }),
                            // Rebase the model on `lastSyncId`.
                            this.transactionQueue.rebaseTransactions(k, n));
                            break;
                        case "A":
                            p.scheduleModelRemoval("archival", b.modelName, b.modelId, b.id);
                            break;
                        case "D":
                            p.scheduleModelRemoval("deletion", b.modelName, b.modelId, b.id);
                            break
                        }
                    p.applyRemovalsToSyncClient(((C = e.at(-1)) == null ? void 0 : C.id) || Number.MAX_SAFE_INTEGER),
                    p.reportPerformance(),

                    // Step 5. Update medata and complete transactions withing for this `lastSyncId`.
                    this.lastSyncId = Math.max(this.lastSyncId, n), // Update lastSyncId to the latest received.
                    f.setLastSyncId(this.lastSyncId), // Write `lastSyncId` into database.
                    i.size && (this.setFirstSyncId(this.lastSyncId), // If there's newly added SyncGroups, update `firstSyncId` as well.
                    f.setFirstSyncId(this.lastSyncId)),
                    this.syncWaitQueue.progressQueue(this.lastSyncId), // If some transactions are waiting for a lastSyncId to complete, complete them.
                    s && this._onSyncGroupsChanged.fire(),
                    f.commit() // Commit changes into database.
                }
                )
            }
            ).catch(f=>{
                F.error("Error applying sync response", f),
                this.socket.restart()
            }
            )
        }
        )
    }
    async loadDeltaNewSyncGroupsModels(e) {
        const n = new Set // AddedSyncGroups
          , r = new Set // for removedSyncGroups
          , s = new Set  // loadedSyncGroups
          , i = new Set;
        let a = 0; // firstSyncId to partially bootstrapping models
        const o = new Set(this.subscribedSyncGroups);
        for (const h of e)
            // Only deal with actions whose type is G or S.
            if (h.action === "G" || h.action === "S") {
                a = Math.max(a, h.id); // Find the largest mutation id.
                const f = this.changedSyncGroups(h.data.syncGroups, o);
                for (const p of f.addedGroups)
                    o.add(p),
                    n.add(p),
                    r.delete(p),
                    (h.action !== "G" || h.data.newSyncGroup !== !0 && !i.has(p)) && s.add(p),
                    h.action === "G" && h.data.newSyncGroup === !0 && i.add(p);
                for (const p of f.removedGroups)
                    o.delete(p),
                    n.delete(p),
                    s.delete(p),
                    r.add(p)
            }
        let l = []
          , d = 0;
        if (s.size > 0) {
            const h = Me.getModelNames();
            [l,d] = await E4.executeWithRetries({
                maxRetries: mn.getValue(mn.bootstrapRatelimitedInSyncDeltaRetryCount, 3),
                backoff: f=>{
                    var p, m;
                    return hd(f) && ((m = (p = f.metaData) == null ? void 0 : p.rateLimitResult) == null ? void 0 : m.duration) || 1e3
                }
                ,
                shouldRetry: f=>hd(f)
            }, ()=>Oo.partialBootstrap(this.graphQLClient, h, [...s], {
                // It actually call partialBootstrap to fetch missing instances of all models of that sync group.
                firstSyncId: a
            })).then(f=>[f.data, f.lastSyncId])
        }
        return {
            syncGroupsChanged: n.size > 0 || r.size > 0,
            addedSyncGroups: n,
            removedSyncGroups: r,
            loadedSyncGroups: s,
            loadedSyncGroupsModels: l,
            syncId: d
        }
    }
    changedSyncGroups(e, n) {
        const r = e.filter(i=>!n.has(i))
          , s = n ? Array.from(n).filter(i=>!e.includes(i)) : [];
        return {
            addedGroups: r,
            removedGroups: s
        }
    }
    async removeSyncGroups(e, n, r, s) { // If a user is removed from a SyncGroup, e.g a team, LSE will remove all models in that syncGroup.
        if (e.length === 0)
            return;
        F.network(`Removing sync groups ${e.join(", ")}`);
        const i = "AD619ACC-AAAA-4D84-AD23-61DDCA8319A0"
          , a = "CDA201A7-AAAA-45C5-888B-3CE8B747D26B";
        for (const o of e) {
            const l = this.subscribedSyncGroups.has(o);
            this.subscribedSyncGroups.delete(o),
            this.persistSubscribedSyncGroups(n);
            const d = this.getModel(o);
            (d == null ? void 0 : d.modelName) === "Team" && this.subscribedSyncGroups.has(i) ? r.scheduleModelRemoval("deletion", d.modelName, d.id, s, {
                only: ["Attachment", "Comment", "Cycle", "CustomView", "DocumentContent", "Facet", "Favorite", "Issue", "IssueProgressSnapshot", "IssueHistory", "Project", "ViewPreferences", "TriageResponsibility", "ViewPreferences"]
            }) : r.scheduleModelRemoval("deletion", (d == null ? void 0 : d.modelName) || "Team", o, s),
            // Resetting the whole database in some cases.
            // It basically clears the entire database and rebootstraps!
            (o === i || o === a) && (l ? (F.remote("Resetting due to admin/fullMember access group change"),
            await this.resetLocalDatabase().finally(async()=>{
                window.location.replace(window.location.href),
                await new Promise(Df)
            }
            )) : F.warning("Removed from sync admin/fullMember sync group even though user wasn't a member"))
        }
    }
    handleTransactionError(e, n, r, s) {
        var i, a;
        r instanceof et && ((i = r.flags) != null && i.reSyncRequired) ? Jn.increment("sync.error.re_sync_needed", {
            error: r.message
        }) : r instanceof et && ((a = r.flags) != null && a.entityDeleted) ? (F.error("Client modified an deleted entity", r),
        this.deleteModelAndDependencies(e)) : new kd(Lo.error,n,sy(r, s),{
            link: r instanceof et && r.userError ? void 0 : {
                url: Vz,
                label: "Check if Linear is having issues",
                external: !0
            }
        }).show()
    }
    createHydratedModels(e, n) {
        return lt(()=>{
            const r = n.map(s=>this.createModel(e, s));
            for (const s of r)
                s.observePropertyChanges(),
                s.attachToReferencedProperties(),
                this.store.delayedRelationManager.resolveDelayedRelation(s);
            return r
        }
        )
    }
    persistSubscribedSyncGroups(e) {
        this.subscribedSyncGroups && (e ? e.setSubscribedSyncGroups(Array.from(this.subscribedSyncGroups)) : this.database.setSubscribedSyncGroups(Array.from(this.subscribedSyncGroups)))
    }
    async logStorageEstimates() {
        if (!navigator.storage || !navigator.storage.estimate) {
            F.info("Storage estimate not supported");
            return
        }
        try {
            const e = await navigator.storage.estimate()
              , n = e.quota ? (e.usage ?? 0) / e.quota * 100 : 100
              , r = ((e.quota ?? 0) - (e.usage ?? 0)) / 1024 / 1024
              , s = e.usage === 18446744073709552e3;
            return F.info("Storage estimate in MB", {
                storage: {
                    quota: (e.quota ?? 0) / 1024 / 1024,
                    remaining: r,
                    percentageUsed: n,
                    isStorageProblem: s
                }
            }),
            {
                ...e,
                isStorageProblem: s
            }
        } catch (e) {
            F.info("Storage estimate error", e);
            return
        }
    }
    partialModelLoadedInFull(e) {
        return e.loadStrategy !== dn.partial || e.partialLoadMode === ki.full
    }
    async applyNetworkDeveloperOptions() {
        var e, n;
        if ((e = this.store.developerOptions) != null && e.pingTime && await Na(this.store.developerOptions.pingTime),
        (n = this.store.developerOptions) != null && n.failPercentage && Math.random() * 100 < this.store.developerOptions.failPercentage)
            throw new Error("Failed hydration because of developer option failure settings")
    }
}


// #region ModelRegistry
const rr = class rr {
    static get schemaHash() {
        return rr._schemaHash
    }
    static getModelNames(e) {
        return e ? Object.keys(this.modelLookup).filter(n=>this.modelLookup[n].loadStrategy === e) : Object.keys(this.modelLookup)
    }
    static getModelNamesByMaxLoadStrategy(e) {
        return Object.keys(this.modelLookup).filter(n=>this.modelLookup[n].loadStrategy <= e)
    }
    static getModelClasses(e) {
        return e ? Object.values(this.modelLookup).filter(n=>n.loadStrategy === e) : Object.values(this.modelLookup)
    }
    static getModelClass(e) {
        return this.modelLookup[e]
    }
    static getClassName(e) {
        return e.prototype.modelName
    }
    static registerModel(e, n, r) { // e for model name, n for the constructor, r for the hash.
        this.modelLookup[e] = n, // Map model's name to the constructor.
        n.prototype.modelName = e, // Hey, this line has been set before! Do we find a duplication here?

        // When the properties are registered, they may are bound to the constructor's name. The name may get minified in production
        // code, we we need to move the property metadata.
        n.name !== e && (this.modelPropertyLookup[e] = this.modelPropertyLookup[n.name],
        delete this.modelPropertyLookup[n.name],
        this.modelActionLookup[e] = this.modelActionLookup[n.name],
        delete this.modelActionLookup[n.name],
        this.modelComputedLookup[e] = this.modelComputedLookup[n.name],
        delete this.modelComputedLookup[n.name],
        this.modelDataPropertyLookup[e] = this.modelDataPropertyLookup[n.name],
        delete this.modelDataPropertyLookup[n.name],
        this.modelReferencedPropertyLookup[e] = this.modelReferencedPropertyLookup[n.name],
        delete this.modelReferencedPropertyLookup[n.name],
        this.modelLazyCollectionKeys[e] = this.modelLazyCollectionKeys[n.name],
        delete this.modelLazyCollectionKeys[n.name],
        this.modelLazyReferenceKeys[e] = this.modelLazyReferenceKeys[n.name],
        delete this.modelLazyReferenceKeys[n.name],
        this.modelCascadeHydrationKeys[e] = this.modelCascadeHydrationKeys[n.name],
        delete this.modelCascadeHydrationKeys[n.name]),

        this.modelPropertyHashLookup[e] = r, // Map model properties' hash to the model's name.
        rr._schemaHash = $1(rr._schemaHash + r) // The model's hash is added to the schema hash.
    }
    static registerProperty(e, n, r) {
        // e for model name
        // n for property name
        // r for configuration
        const s = this.modelPropertyLookup[e];
        if (s ? s[n] = r : (this.modelPropertyLookup[e] = {
            // the following properties exist in every model
            id: {
                persistance: 1
            },
            createdAt: {
                serializer: bt,
                persistance: 0
            },
            updatedAt: {
                serializer: bt,
                persistance: 0
            },
            archivedAt: {
                serializer: bt,
                persistance: 0
            }
        },
        this.modelPropertyLookup[e][n] = r), // bind to the dictionary

        // reference or referenceArray are registered
        r.referencedProperty || r.type === 2 || r.type === 6) {
            const i = this.modelReferencedPropertyLookup[e];
            i ? i[n] = r : (this.modelReferencedPropertyLookup[e] = {},
            this.modelReferencedPropertyLookup[e][n] = r)
            // For reference properties, the configuration registered here
            // would be used to get reference values.
        }

        if (r.lazy) // If a reference is lazy, it would be loaded when it is accessed.
            if (r.type === 4) { // reference collection
                const i = this.modelLazyCollectionKeys[e];
                i ? i.push(n) : this.modelLazyCollectionKeys[e] = [n]
            } else {
                const i = this.modelLazyReferenceKeys[e];
                i ? i.push(n) : this.modelLazyReferenceKeys[e] = [n]
            }
        if (r.cascadeHydration) { // If should cascade hydration.
            const i = this.modelCascadeHydrationKeys[e];
            i ? i.push(n) : this.modelCascadeHydrationKeys[e] = [n]
        }
    }
    static registerAction(e, n) {
        const r = this.modelActionLookup[e];
        r ? r.push(n) : this.modelActionLookup[e] = [n]
    }
    static registerComputed(e, n) {
        const r = this.modelComputedLookup[e];
        r ? r.push(n) : this.modelComputedLookup[e] = [n]
    }
    static propertiesOfModel(e) {
        return this.modelPropertyLookup[e] || {}
    }
    static dataPropertiesOfModel(e) {
        if (!this.modelDataPropertyLookup[e]) {
            this.modelDataPropertyLookup[e] = {};
            for (const n in this.modelPropertyLookup[e]) {
                const r = this.modelPropertyLookup[e][n];
    // t[t.property = 0] = "property", // for a self-owned property, e.g. issue.title
    // t[t.ephemeralProperty = 1] = "ephemeralProperty",
    // t[t.reference = 2] = "reference", // for reference target's id, e.g. issue.documentContentId
    // t[t.referencedModel = 3] = "referencedModel", //  for reference target, e.g. issue.documentContent
    // t[t.referenceCollection = 4] = "referenceCollection",
    // t[t.backReference = 5] = "backReference", // for back reference, e.g. documentContent.issue
    // t[t.referenceArray = 6] = "referenceArray"
                // filtered all non-reference properties
                (r.type === void 0 || r.type === 0 || r.type === 1 || r.type === 2 || r.type === 6) && (this.modelDataPropertyLookup[e][n] = r)
            }
        }
        return this.modelDataPropertyLookup[e]
    }
    static referencedPropertiesOfModel(e) {
        return this.modelReferencedPropertyLookup[e] || {}
    }
    static lazyCollectionKeysOfModel(e) {
        return this.modelLazyCollectionKeys[e] || []
    }
    static lazyReferenceKeysOfModel(e) {
        return this.modelLazyReferenceKeys[e] || []
    }
    static cascadeHydrationKeysOfModel(e) {
        return this.modelCascadeHydrationKeys[e] || []
    }
    static propertyHashOfModel(e) {
        return this.modelPropertyHashLookup[e] || ""
    }
    static observableAnnotationsOfModel(e) {
        if (this.observableAnnotationsLookup[e] === void 0) {
            const n = {};
            for (const r of this.modelActionLookup[e] || [])
                n[r] = Le;
            for (const r of this.modelComputedLookup[e] || [])
                n[r] = ms;
            this.observableAnnotationsLookup[e] = n
        }
        return this.observableAnnotationsLookup[e]
    }
    static dependenciesOfModel(e) { // The method will return models that references e.
        // for name of the model
        var n;
        // model dependencies are gathered the first time this function get called.
        if (!this.modelDependencyLookup[e]) {
            const r = this.getModelClass(e);
            if (!r)
                return [];
            const s = [];
            // loop all models
            for (const i of this.getModelNames())
                for (const [a,o] of Object.entries(this.propertiesOfModel(i)))
                    // loop all reference and referenceArray properties
                    if ((o.type === 2 || o.type === 6) && ((n = o.referencedClassResolver) == null ? void 0 : n.call(o)) === r && (o.onDelete !== "NO ACTION" || o.onArchive !== "NO ACTION")) {
                        const l = this.getModelClass(i);
                        if (!l)
                            break;
                        const d = o.onDelete ?? (o.referenceNullable || o.type === 6 ? "SET NULL" : "CASCADE")
                          , u = {
                            model: l,
                            property: a,
                            backReference: o.referencedProperty,
                            deleteType: d,
                            archiveType: o.onArchive ?? d,
                            isOptional: o.referenceOptional ?? !1
                        };
                        (u.deleteType !== "NO ACTION" || u.archiveType !== "NO ACTION") && s.push(u)
                        // e.g. documentContent depends on issue
                    }
            this.modelDependencyLookup[e] = s
        }
        return this.modelDependencyLookup[e]
    }
    static dependencyOrder() {
        if (!this.dependencyOrderCache) {
            const e = rr.getModelClasses()
              , n = new Map
              , r = (l,d)=>rr.dependenciesOfModel(l.modelName).map(h=>{
                if (d.includes(h.model.modelName))
                    return;
                const f = {
                    modelName: h.model.modelName,
                    path: d,
                    children: r(h.model, [...d, h.model.modelName])
                };
                return n.set(f.modelName, f),
                f
            }
            ).concrete()
              , s = e.filter(l=>!e.some(d=>d !== l && rr.dependenciesOfModel(d.modelName).some(u=>u.model === l)));
            for (const l of s) {
                const d = {
                    modelName: l.modelName,
                    path: [],
                    children: []
                };
                n.set(d.modelName, d),
                d.children = r(l, [d.modelName])
            }
            const i = {
                roots: [...n.values()].filter(l=>l.path.length === 0)
            }
              , a = [];
            let o = i.roots;
            for (; o.length; ) {
                for (const l of o)
                    a.includes(l.modelName) || a.push(l.modelName);
                o = o.flatMap(l=>l.children).sortBy(l=>`${(999 - l.children.length).toString().padStart(3, "0")}-${l.modelName}`)
            }
            this.dependencyOrderCache = Object.freeze(a)
        }
        return this.dependencyOrderCache
    }
}
