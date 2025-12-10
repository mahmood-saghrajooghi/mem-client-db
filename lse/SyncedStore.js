const sg = class sg { // class SyncedStore
    get socketStatus() {
        return this.socket.status
    }
    get onSocketConnect() {
        return this.socket.onConnect
    }
    get onSocketDisconnect() {
        return this.socket.onDisconnect
    }
    get onMessage() {
        return this.socket.onMessage
    }
    get onDatabaseVersionChange() {
        return this.syncClient.onDatabaseVersionChange
    }
    get onArchive() {
        return this.syncClient.onArchive
    }
    get onUnarchive() {
        return this.syncClient.onUnarchive
    }
    get onArchiveUpdate() {
        return this.syncClient.onArchiveUpdate
    }
    get onTransactionQueued() {
        return this.syncClient.onTransactionQueued
    }
    get onDatabaseUnavailable() {
        return this.syncClient.onDatabaseUnavailable
    }
    get onInvalidateRejectedHydrations() {
        return this.syncClient.onInvalidateRejectedHydrations
    }
    invalidateRejectedHydrations() {
        this.syncClient.invalidateRejectedHydrations()
    }
    constructor(e, n) {
        this.outstandingTransactionCount = 0,
        this.savingStoreCount = 0,
        this.syncProgress = 0,
        this.syncError = void 0,
        this.connectionError = void 0,
        this.setSyncProgress = Le(r=>{
            this.syncProgress = r
        }
        ),
        this.setSyncError = Le(r=>{
            this.syncError = r
        }
        ),
        this.setConnectionError = Le(r=>{
            this.connectionError = r
        }
        ),
        this.localTransactions = [],
        this.handleTransactionCountChange = Le(r=>{
            this.outstandingTransactionCount = r
        }
        ),
        this.handleSavingStoreCountChange = Le(r=>{
            this.savingStoreCount = r
        }
        ),
        this._developerOptions = ke.get("StoreDeveloperOptions"),
        this.graphQLClient = e,
        this.options = n,
        this.socket = new uf(Xt.isElectron ? Rc.desktop : Rc.web),
        this.delayedRelationManager = new Ace(this),
        this.syncClient = new Wd(this,this.graphQLClient,this.socket,this.options),
        this.undoQueue = new jce(this.onTransactionQueued),
        this.batchModelLoader = n.batchModelLoader,
        this.socket.onDisconnect.subscribe(async r=>{
            switch (r) {
            case xo.rebootstrapRequired:
                await this.resetLocalDatabase(),
                window.location.reload();
                break;
            case xo.unknownAbbreviation:
                F.error("Client sent an unknown abbreviation");
                break;
            case xo.notPartOfCollabDocument:
                F.error("Client sent a message to a collab document that they're not part of");
                break
            }
        }
        ),
        Ln(this, {
            syncProgress: ut,
            syncError: ut,
            connectionError: ut,
            outstandingTransactionCount: ut,
            savingStoreCount: ut,
            bootstrap: Le,
            disconnectFromBackend: Le,
            disconnectFromBackendWithBootstrapError: Le
        })
    }
    async mutate(e, n, r) {
        const s = r ? Object.keys(r).map(u=>`${u}: ${JSON.stringify(r[u])}`).join(", ") : void 0
          , i = Zl(e.modelName)
          , a = `mutation { ${n}${s ? `( ${s} )` : ""} { ${i} { id } lastSyncId }}`
          , o = await this.graphQLClient.mutate(a)
          , {id: l} = o[n][i]
          , d = o[n].lastSyncId;
        return await this.syncClient.waitUntilSyncId(d),
        this.findById(e, l)
    }
    findById(e, n, r) {
        return this.syncClient.findById(e, n, r)
    }
    async findArchivedById(e, n) {
        return this.syncClient.findArchivedById(e, n)
    }
    applyArchiveResponse(e) {
        return this.syncClient.applyArchiveResponse(e)
    }
    applyModelData(e) {
        return this.syncClient.applyModelData(e)
    }
    async findByIdAsync(e, n) {
        const r = this.syncClient.findById(e, n);
        return r || (await this.waitForSync(),
        this.syncClient.findById(e, n))
    }
    allModelsOfType(e, n=lr.noArchivedModels) {
        return this.syncClient.allModelsOfType(e, n)
    }
    countModelsOfType(e) {
        return this.syncClient.countModelsOfType(e)
    }
    localStoreReady(e) {
        return this.syncClient.localStoreReady(e)
    }
    hydrateModel(e, n, r) {
        return this.syncClient.hydrateModel(e, n, r)
    }
    hydrateModels(e, n, r) {
        return this.syncClient.hydrateModelsByIndexedKey(e, n, r)
    }
    hydrateLocalModelsByIds(e, n) {
        return this.syncClient.hydrateLocalModelsByIds(e, n)
    }
    async resetLocalDatabase() {
        return this.syncClient.resetLocalDatabase()
    }
    async deleteLocalDatabase() {
        return this.syncClient.deleteLocalDatabase()
    }
    async bootstrap({userId: e, userAccountId: n, organizationId: r}) {
        this.graphQLClient.setUser({
            userId: e,
            userAccountId: n,
            organizationId: r
        }),
        await vm.init(this.socket, this.graphQLClient, e);
        const s = {
            userId: e,
            userAccountId: n,
            organizationId: r,
            modelSchemaHash: Me.schemaHash // The schema hash would be used here to detect if there is a database migration
        };
        this.syncClient.onTransactionCountChange.subscribe(this.handleTransactionCountChange),
        // In this line StoreManager will be constructed.
        // So the ObjectStores are created before database get intialized.
        this.syncClient.onSavingStoreCountChange.subscribe(this.handleSavingStoreCountChange);
        try {
            return await this.syncClient.initializeDatabase(s), // <- Create object stores and databases.
            await this.syncClient.bootstrap(s) // <- Boostrap!
        } catch (i) {
            return {
                success: !1,
                type: Ra.local,
                error: i
            }
        }
    }
    disconnectFromBackend() {
        this.setSyncProgress(2),
        this.syncClient.disconnect()
    }
    disconnectFromBackendWithBootstrapError(e) {
        const n = hd(e);
        this.setSyncProgress(n ? 3 : 4),
        this.setSyncError(e),
        this.syncClient.disconnect()
    }
    async waitForSync() {
        return await this.syncClient.waitForSync()
    }
    save(e, n=!1, r) { // Determined what kind of transaction need to generate.
        // e for the model that changed
        return this.saveForLocalTransaction(e, r) 
            ? new Tc(e)  // If it should be a local transaction. It would return from here.
            : (e.shouldSetUpdatedAt && (e.updatedAt = new Date),
        // How to determine what kind of transaction need to generate here:
        // checking if the model live in Object Pool.
        // If it exists, `UpdateTransaction`.
        // If not, `InsertTransaction`.
        this.syncClient.findById(at, e.id, {
            excludeTemporaryModels: !0
        }) ? (e.beforeSave(!1), // `beforeSave` only works for "Document" at the moment so I will not dive in.
        this.syncClient.update(e, r)) // generete an UpdateTransaction by calling `SyncClient.update`.
        : (e.beforeSave(!0), 
        this.removeTemporarily(e),
        n ? (e.createdAt = new Date,
        e.prepareForAdd(),
        e.observePropertyChanges(),
        this.syncClient.add(e, r)) : new Tc(e))) // generate an InsertionTransaction by calling `SyncClient.add`.
    }
    addTemporarily(e) {
        return this.syncClient.temporarilyAdd(e)
    }
    removeTemporarily(e) {
        this.syncClient.temporarilyRemove(e)
    }
    archive(e, n) {
        return this.syncClient.archive(e, n)
    }
    unarchive(e, n) {
        return this.syncClient.unarchive(e, n)
    }
    delete(e, n) {
        return this.deleteForLocalTransaction(e) ? new Tc(e) : this.syncClient.delete(e, n)
    }
    trash(e) {
        return e.trashed = !0,
        this.deleteForLocalTransaction(e) ? new Tc(e) : e.isArchived ? e.save() : this.syncClient.delete(e)
    }
    sendEphemeralUpdate(e, n) {
        if (this.syncClient.findById(at, e.id))
            return this.syncClient.sendEphemeral(e, n)
    }
    registerLocalTransaction(e) {
        this.localTransactions.push(e)
    }
    localTransactionsForModel(e) {
        return this.localTransactions.filter(n=>n.hasModel(e))
    }
    unregisterLocalTransaction(e) {
        this.localTransactions = this.localTransactions.filter(n=>n !== e)
    }
    sendCommand(e, n) {
        this.socket.send(e, n)
    }
    sendStatefulCommand(e) {
        return this.socket.sendStateful(e)
    }
    set developerOptions(e) {
        e ? ke.set("StoreDeveloperOptions", e) : ke.remove("StoreDeveloperOptions"),
        this._developerOptions = e
    }
    get developerOptions() {
        return this._developerOptions
    }
    get hasDeveloperOptions() {
        return this._developerOptions ? Object.values(this._developerOptions).some(e=>!!e) : !1
    }
    getUserOrganization(e) {}
    async requireDeltaSyncAtStartup() {
        return !1
    }
    getLastSyncId() {
        return this.syncClient.getLastSyncId()
    }
    transactionsForModel(e) {
        return this.syncClient.transactionsForModel(e)
    }
    isModelTemporarilyPersisted(e) {
        return this.syncClient.isModelTemporarilyPersisted(e)
    }
    modelIsInTransaction(e) {
        return this.localTransactions.some(n=>n.hasModel(e))
    }
    deleteForLocalTransaction(e) {
        let n = !1;
        return this.localTransactions.forEach(r=>{
            (r.hasModel(e) || r.hasReferenceToModel(e)) && (r.deleteLocally(e),
            n = !0)
        }
        ),
        n
    }
    saveForLocalTransaction(e, n) {
        var s;
        if (this.modelIsInTransaction(e))
            return n && this.localTransactions.filter(a=>a.hasModel(e)).forEach(a=>a.modelSavedLocally(e, n)),
            !0;
        const r = this.localTransactions.filter(i=>i.hasReferenceToModel(e));
        return r.length ? ((s = r.pop()) == null || s.addReferenceModel(e, n),
        !0) : !1
    }
}
;
sg.constructorName = "SyncedStore";
let hf = sg;
