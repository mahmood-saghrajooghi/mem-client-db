const kw = 40
  , xw = 9e6;
class uce { // class TranscactionQueue
    get onTransactionCountChange() {
        return this._onTransactionCountChange
    }
    get onTransactionQueued() {
        return this._onTransactionQueued
    }
    constructor(e, n) {
        this.createdTransactions = [], // Contains newly created transactions.
        this.queuedTransactions = [], // Contains transactions that will be sent to the server in the next tick.
        this.executingTransactions = [], // Contains transcations that have been sent to the server and waiting for a response.
        this.completedButUnsyncedTransactions = [], // Contains transactions that have been accepted by the server but can not be treated as synced.
        this._onTransactionCountChange = new Tt,
        this._onTransactionQueued = new Tt,
        this.dequeueTransaction = new ww,
        this.batchIndex = 0, // LSE may send several transactions in a batch.
        this.commitCreatedTransactions = new ww, // The scheduler group several transactions in a batch.
        this.handleTimedRecheck = ()=>{
            this.dequeueNextTransactions()
        }
        ,
        this.graphQLClient = e,
        this.syncClient = n
    }
    // CRUD methods to create different kinds of transaction objects.
    create(e, n) {
        const r = new Hu(e,this.batchIndex,this.syncClient,this.graphQLClient,n == null ? void 0 : n.additionalCreationArgs);
        return n != null && n.sendSynchronously ? this.immediatelyExecuteTransaction(r) : this.enqueueTransaction(r),
        r
    }
    update(e, n) {
        // e for the updated client model object
        // Each Transaction has a batch index. So if some synchoronous change
        const r = new zu(e,this.batchIndex,this.syncClient,this.graphQLClient,n == null ? void 0 : n.additionalUpdateArgs);
        return n != null && n.sendSynchronously && this.transactionIsIndependentOfRunningTransactions(r) ? this.immediatelyExecuteTransaction(r) : this.enqueueTransaction(r),
        e.didUpdate(),
        r
    }
    archive(e) {
        const n = new m3(e,this.batchIndex,this.syncClient,this.graphQLClient);
        return this.enqueueTransaction(n),
        n
    }
    unarchive(e) {
        const n = new y3(e,this.batchIndex,this.syncClient,this.graphQLClient);
        return this.enqueueTransaction(n),
        n
    }
    delete(e) {
        const n = new g3(e,this.batchIndex,this.syncClient,this.graphQLClient);
        return this.enqueueTransaction(n),
        n
    }
    modelUpserted(e) {
        var n;
        if ((n = this.persistedTransactionsEnqueue) != null && n.length) {
            let r;
            for (const s of this.persistedTransactionsEnqueue)
                s instanceof Hu && s.model.id === e && (this.cancelTransaction(s).catch(i=>{
                    F.error("Error canceling transaction", i, {
                        transaction: {
                            id: s.id,
                            modelId: s.model.id
                        }
                    })
                }
                ),
                F.info(`Canceling persisted create transaction for model ${e} as we received an I packet for it`),
                r ?? (r = []),
                r.push(s));
            r != null && r.length && (this.persistedTransactionsEnqueue = this.persistedTransactionsEnqueue.filter(s=>!r.includes(s)))
        }
    }
    // Transactions that will 
    rebaseTransactions(e, n) { 
        // `e` for the model to rebase
        // `n` for the lastsyncid to be rebased on
        var r;
        if (this.lastSyncId = n, // Update lastSyncId of TransactionQueue 
            // Filter transcations in completedButUnsyncedTransactions. Whose `syncIdNeededForCompletion` is less or equal to the current lastSyncId will be filtered out.
        this.completedButUnsyncedTransactions.length && (this.completedButUnsyncedTransactions = this.completedButUnsyncedTransactions.filter(s=>(s.syncIdNeededForCompletion || 0) > n)),
        (r = this.persistedTransactionsEnqueue) != null && r.length || this.queuedTransactions.length || this.executingTransactions.length || this.completedButUnsyncedTransactions.length) {
            // If there are transactions in any of these array, they should be rebase on the transactions.
            // This line below actually show the time-sequence of these arrays.
            const s = this.completedButUnsyncedTransactions.concat(this.executingTransactions, this.queuedTransactions, this.persistedTransactionsEnqueue ?? []);
            for (const i of s)
                i instanceof zu && i.model === e && i.rebase() // Only UpdateTransactions should rebase.
        }
    }
    async loadPersistedTransactions(e) {
        this.database = e;
        const n = await this.database.getAllTransactions(); // load cached transactions from local database.
        F.network(`Loaded ${n.length} persisted transactions`),
        // The only place to assign `persistedTransactionsEnqueue`
        this.persistedTransactionsEnqueue = (await Promise.all(n.map(async s=>{
            const i = await this.deserialize(s.id, s); // Deserialize this transaction.
            if (i != null && i.id)
                return i;
            i ? F.error("Invalid deserialized transaction", void 0, {
                transaction: i,
                serializedTransaction: s
            }) : F.info("Could not deserialize transaction", {
                transaction: i,
                serializedTransaction: s
            }),
            this.database.deleteTransaction(s.id) // The transaction are removed from the database.
            // Because they will be saved into the databases again when they are moved to `queuedTransacctions`.
        }
        ))).concrete();
        const r = this.persistedTransactionsEnqueue.reduce((s,i)=>Math.max(s, i.id), 0);
        Zo.setNextId(r + 1), 
        // Hydrate models of that transaction, so user can see the changes they made last time.
        await Promise.all(this.persistedTransactionsEnqueue.map(s=>this.syncClient.hydrateModel(s.model.modelClass, s.model.id, {
            onlyIfLocallyAvailable: !0
        })))
    }
    confirmPersistedTransactions() {
        if (this.persistedTransactionsEnqueue) {
            for (const e of this.persistedTransactionsEnqueue)
                this.enqueueTransaction(e).catch(n=>{
                    F.error("Error enqueueing persisted transaction", n, {
                        transaction: {
                            id: e.id,
                            modelId: e.model.id
                        }
                    })
                }
                );
            this.persistedTransactionsEnqueue = void 0
        }
    }
    async cancelTransaction(e) {
        await this.database.deleteTransaction(e.id);
        const n = this.queuedTransactions.indexOf(e);
        n !== -1 && this.queuedTransactions.splice(n, 1),
        this.outstandingTransactionCountChanged()
    }
    transactionsForModel(e) {
        return this.queuedTransactions.concat(this.executingTransactions).concat(this.createdTransactions).filter(n=>n.model === e)
    }
    async deserialize(e, n) {
        switch (n.type) {
        case "create":
            return await Hu.fromSerializedData(e, this.syncClient, this.graphQLClient, n);
        case "update":
            return await zu.fromSerializedData(e, this.syncClient, this.graphQLClient, n);
        case "archive":
            return await m3.fromSerializedData(e, this.syncClient, this.graphQLClient, n);
        case "unarchive":
            return await y3.fromSerializedData(e, this.syncClient, this.graphQLClient, n);
        case "delete":
            return await g3.fromSerializedData(e, this.syncClient, this.graphQLClient, n);
        default:
            F.error("Unknown transaction type", void 0, {
                serializedData: n
            });
            return
        }
    }
    async immediatelyExecuteTransaction(e) {
        const n = new Set;
        this._onTransactionQueued.fire(e);
        let r, s;
        try {
            r = e.prepare(n)
        } catch (i) {
            F.error("Error preparing transaction", i, {
                transaction: {
                    id: e.id,
                    modelId: e.model.id,
                    modelName: e.model.modelName
                }
            }),
            s = new et({
                type: "other",
                message: "error preparing transaction",
                userError: !1
            })
        }
        if (!r) {
            e.transactionCompleted(s),
            this.outstandingTransactionCountChanged();
            return
        }
        this.database.putTransactions([e]),
        this.executeTransactionBatch([r]),
        this.outstandingTransactionCountChanged()
    }
    async enqueueTransaction(e) {
        // e is transaction object
        if (e.model.modelClass.loadStrategy === dn.local) {
            // If this a transaction of a model whose loadStrategy is local, we should immediately change database and complete the transaction
            this.database.writeTransaction({
                metaStore: !1,
                syncActionStore: !1
            }, n=>{
                e.writeLocalTransactionToDatabase(n)
            }
            ),
            e.transactionCompleted();
            return
        }
        this.createdTransactions.push(e),
        this._onTransactionQueued.fire(e),
        this.commitCreatedTransactions.schedule(async()=>{ // This is a simple microtask scheduler, so 
            // transactions generated synchrounously will be in the same batch.
            this.batchIndex++;
            const n = this.createdTransactions.concat();
            this.createdTransactions = [], // Empty created transactions.
            await this.database.putTransactions(n), // Save all queue transactions into database (offline cache).
            this.queuedTransactions.push(...n), // Push createdTransactions to queuedTransactions
            this.outstandingTransactionCountChanged(),
            this.dequeueNextTransactions() // Schedule the next query.
        }
        )
    }
    dequeueNextTransactions() {
        this.dequeueTransaction.schedule(()=>{
            // If there are no queued transacation or more than 40 transcations are executing,
            // skip this scheduling.
            if (this.queuedTransactions.length === 0 || this.executingTransactions.length >= kw) // kw === 40
                return;
            let e = 0; // Limit a batch's size.
            const n = this.queuedTransactions[0].batchIndex
              , r = []
              , s = new Set;
            
            // This loop moves transactions from queuedTransactions to executingTransactions
            for (; e < xw 
                && this.queuedTransactions.length > 0 
                && r.length < kw // 40. 
                && this.queuedTransactions[0].batchIndex === n // Transactions that have the same batchIndex.
                && this.transactionIsIndependentOfRunningTransactions(this.queuedTransactions[0]); 
            ) {
                const i = this.queuedTransactions[0];
                if (!i)
                    break;
                let a, o;
                try {
                    a = i.prepare(s) // Prepare that transaction, generating GraphQL query.
                } catch (d) {
                    F.error("Error preparing transaction", d, {
                        transaction: {
                            id: i.id,
                            modelId: i.model.id,
                            modelName: i.model.modelName
                        }
                    }),
                    o = new et({
                        type: "other",
                        message: "error preparing transaction",
                        userError: !1
                    })
                }
                if (!a) {
                    // If after preparation, these is no need to execute this transaction,
                    // immeidately complete this transaction.
                    i.transactionCompleted(o),
                    this.database.deleteTransaction(i.id),
                    this.queuedTransactions.shift();
                    continue
                }
                const l = Zo.graphQLMutationSize(a.graphQLMutationPrepared) ?? 0; // Get size of the graph mutation for this transaction.
                if (e > 0 && e + l > xw) // If the graph mutation's size exceeds the limit, do not add this transaction to next batch.
                    // xw === 9e6
                    break;
                for (const d of Object.keys(a.graphQLMutationPrepared.variables || {}))
                    s.add(d); // Add key to the Set. For example "issueUpdateInput"
                this.queuedTransactions.shift(),
                r.push(a),
                e += l
            }
            if (r.length === 0) {
                this.outstandingTransactionCountChanged(),
                this.queuedTransactions.length > 0 && this.executingTransactions.length === 0 && this.dequeueNextTransactions();
                return
            }
            this.executeTransactionBatch(r),
            this.dequeueNextTransactions()
        }
        )
    }
    transactionIsIndependentOfRunningTransactions(e) {
        for (const n of this.executingTransactions)
            if (e.independentOf(n) === !1)
                return !1;
        return !0
    }
    async executeTransactionBatch(e) {
        // Send transactions to the backend.
        if (e.length !== 0) {
            this.executingTransactions = this.executingTransactions.concat(e);
            try {
                if (await new dce(e,this.graphQLClient).execute() === Ro.offlined) { // new TransactionExecutor
                    // If the execution is offline, we should try to execute the previously executing
                    // transaction again and move the newly added transaction back to queuedTransactions.
                    this.executingTransactions = this.executingTransactions.filter(s=>!e.includes(s)),
                    this.queuedTransactions.unshift(...e),
                    this.outstandingTransactionCountChanged(); 
                    return
                }
            } catch {}
            // If the transactions success to execute.
            for (const n of e)
                // Remove the transaction from exectuting transactions.
                this.executingTransactions.splice(this.executingTransactions.indexOf(n), 1), 
                // Once the transaction is completed, LSE delete it from the database because we won't send it again.
                await this.database.deleteTransaction(n.id), 
                // Pay attention here. Each transaction has a syncIdNeededForCompletion, and if it is larger than
                // the client's lastSyncId, LSE will not complete this transaction but until
                // the corresponding delta packets arrived. TODO: Why?
                (!this.lastSyncId || (n.syncIdNeededForCompletion ?? 0) > this.lastSyncId) && this.completedButUnsyncedTransactions.push(n);
            this.outstandingTransactionCountChanged(),
            this.dequeueNextTransactions()
        }
    }
    outstandingTransactionCountChanged() {
        this._onTransactionCountChange.fire(this.queuedTransactions.length + this.executingTransactions.length),
        this.queuedTransactions.length || this.executingTransactions.length ? this.checkInterval || (this.checkInterval = window.setInterval(this.handleTimedRecheck, 2e3)) : this.checkInterval && window.clearTimeout(this.checkInterval)
    }
}
