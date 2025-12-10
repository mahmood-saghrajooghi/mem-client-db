/** Base Transaction */
const M3 = class M3 { // BaseTransaction
    constructor(e, n, r, s, i) {
        this.retries = 0,
        this.id = M3.nextId++,
        this.type = e,
        this.model = n,
        this.batchIndex = r,
        this.syncClient = s,
        this.graphQLClient = i,
        this.completionPromise = new Promise((a,o)=>{
            this.resolve = a,
            this.reject = o
        }
        ),
        this.completionPromise.catch(()=>{}
        )
    }
    async result() {
        return this.completionPromise
    }
    cancel() {
        this.syncClient.cancelTransaction(this),
        this.rollback()
    }
    independentOf(e) {
        // Two transactions modifies different models, and these two models should not have bidirectional references.
        return this.model.id === e.model.id ? !1 : !this.model.references(e.model) && !e.model.references(this.model)
    }
    static setNextId(e) {
        this.nextId = e
    }
    async transactionCompleted(e, n=0) { // Call this method to complete a transaction.
        // e for error, it could be undefined
        // n for lastSyncId
        this.syncIdNeededForCompletion = n,
        e ? (this.rollback(),
        // If there's an execution error, that means the server has rejected
        // this transaction, so LSE should undo it.
        this.reject(e)) : (await this.syncClient.waitUntilSyncId(n),
        // The transaction will resolve when the client has reached `lastSyncId` of n.
        this.resolve(0))
        // If there's no error, we should update the lastSyncId.
    }
    offlined() {
        this.resolve(1)
    }
    prepare(e) {
        const n = this.graphQLMutation(e); // Generate graphQL query mutation.
        if (!n)
            return;
        const r = this;
        return r.graphQLMutationPrepared = typeof n == "string" ? {
            mutationText: n
        } : n,
        r
    }
    static graphQLMutationSize(e) {
        if (e)
            return typeof e == "string" ? e.length : e.mutationText.length + JSON.stringify(e.variables || {}).length + JSON.stringify(e.variableTypes || {}).length
    }
}
;
M3.nextId = Math.floor(Math.random() * 1e6) + 1;
/** BaseTransaction */
let Zo = M3;
var Ro;
(function(t) {
    t[t.completed = 0] = "completed",
    t[t.offlined = 1] = "offlined"
}
)(Ro || (Ro = {}));
/** ArchiveTransaction */
class m3 extends Zo {
    static async fromSerializedData(e, n, r, s) {
        const i = Me.getModelClass(s.modelClass);
        if (!i) {
            F.info(`ArchiveTransaction: Unknown model class ${s.modelClass}`);
            return
        }
        const a = await n.hydrateModel(i, s.modelId);
        if (a && a instanceof si) {
            const o = new m3(a,s.batchIndex,n,r);
            return o.id = e,
            o
        } else
            F.info(`ArchiveTransaction: ${i} is not an ArchivableModel`, {
                model: a
            })
    }
    get graphQLOperationName() {
        return `${o5(this.model.modelName)}Archive`
    }
    graphQLMutation(e) {
        return this.model.archiveMutation()
    }
    constructor(e, n, r, s) {
        super("archive", e, n, r, s),
        this.syncClient.archiveModel(e)
    }
    transformError(e) {
        return e instanceof et ? e : new et({
            type: "internal error",
            message: "Archive transaction failed",
            userError: !0,
            userPresentableMessage: `Failed to update ${this.model.modelName}`
        })
    }
    serialize() {
        return {
            id: this.id,
            type: "archive",
            batchIndex: this.batchIndex,
            modelId: this.model.id,
            modelClass: this.model.modelName
        }
    }
    undoTransaction() {
        return this.syncClient.unarchive(this.model)
    }
    writeLocalTransactionToDatabase(e) {
        e.delete(this.model.modelName, this.model.id)
    }
    rollback() {
        this.model.archivedAt = void 0,
        this.syncClient.addModel(this.model),
        this.model.attachToReferencedProperties()
    }
}
/**
 * LocalTranscation
 */
class Tc { // LocalTransaction
    constructor(e) {
        this.model = e
    }
    result() {
        return Promise.resolve(Ro.completed)
    }
    cancel() {}
    undoTransaction() {
        return this
    }
}
/**
 * CreationTransaction
 */
class Hu extends Zo {
    static async fromSerializedData(e, n, r, s) {
        const i = Me.getModelClass(s.modelType);
        if (!i)
            throw Error(`Could not retrieve class for model type '${s.modelType}'`);
        const a = new i;
        a.updateFromData(s.model);
        const o = new Hu(a,s.batchIndex,n,r,s.additionalCreationArgs);
        return o.id = e,
        o
    }
    get graphQLOperationName() {
        return `${o5(this.model.modelName)}Create`
    }
    graphQLMutation(e) {
        return this.model.createMutation(e, this.additionalCreationArgs)
    }
    constructor(e, n, r, s, i) {
        super("create", e, n, r, s),
        this.additionalCreationArgs = i,
        this.syncClient.addModel(e) && e.attachToReferencedProperties(),
        e.clearSnapshot()
    }
    transformError(e) {
        return e instanceof et ? e : new et({
            type: "internal error",
            message: "Create transaction failed",
            userError: !0,
            userPresentableMessage: `Failed to save ${this.model.modelName}`
        })
    }
    serialize() {
        return {
            id: this.id,
            type: "create",
            batchIndex: this.batchIndex,
            modelType: this.model.modelName,
            model: this.model.serialize(),
            additionalCreationArgs: this.additionalCreationArgs
        }
    }
    undoTransaction() {
        return this.model instanceof It ? this.syncClient.delete(this.model) : this.model instanceof si ? this.syncClient.archive(this.model) : new Tc(this.model)
    }
    writeLocalTransactionToDatabase(e) {
        e.add(this.model.modelName, this.model.serialize())
    }
    rollback() {
        this.syncClient.deleteModelAndDependencies(this.model)
    }
}
/** DeleteTransaction */
class g3 extends Zo {
    static async fromSerializedData(e, n, r, s) {
        const i = Me.getModelClass(s.modelClass);
        if (!i)
            return;
        const a = await n.hydrateModel(i, s.modelId);
        if (a && (a instanceof It || a instanceof Xc)) {
            const o = new g3(a,s.batchIndex,n,r);
            return o.id = e,
            o
        }
    }
    get graphQLOperationName() {
        return `${o5(this.model.modelName)}Delete`
    }
    graphQLMutation(e) {
        return this.model.deleteMutation()
    }
    constructor(e, n, r, s) {
        super("delete", e, n, r, s),
        this.syncClient.archiveModel(e)
    }
    transformError(e) {
        return e instanceof et ? e : new et({
            type: "internal error",
            message: "Delete transaction failed",
            userError: !0,
            userPresentableMessage: `Failed to delete ${this.model.modelName}`
        })
    }
    serialize() {
        return {
            id: this.id,
            type: "delete",
            batchIndex: this.batchIndex,
            modelId: this.model.id,
            modelClass: this.model.modelName
        }
    }
    undoTransaction() {
        return this.model.archivedAt = void 0,
        this.model instanceof Xc ? this.syncClient.unarchive(this.model) : this.syncClient.add(this.model, this.model.supportsUndoCreatedAtArguments ? {
            additionalCreationArgs: {
                overrideCreatedAt: this.model.createdAt
            }
        } : void 0)
    }
    writeLocalTransactionToDatabase(e) {
        e.delete(this.model.modelName, this.model.id)
    }
    rollback() {
        this.model.archivedAt = void 0,
        this.syncClient.addModel(this.model),
        this.model.attachToReferencedProperties()
    }
}
const lce = 8;
/** TransactionExecutor */
class dce { // Transaction executor. Execute many transactions in a batch.
    constructor(e, n) {
        this.transactions = e,
        this.graphQLClient = n,
        this.completionPromise = new Promise((r,s)=>{
            this.resolve = r,
            this.reject = s
        }
        )
    }
    async execute() {
        var e;
        if (this.transactions.length === 0)
            return Ro.completed;
        try {
            const n = this.transactions.length === 1;
            let r = this.transactions[0].graphQLOperationName;
            if (!n) { // If there are 2 or more transactions in this batch.
                // Count different graphQLOperationName
                const d = this.transactions.reduce((u,h)=>{
                    const f = h.graphQLOperationName;
                    return u[f] ? u[f] += 1 : u[f] = 1,
                    u
                }
                , {});
                // And join graphQLOperationName in a string. For example:
                // IssueUpdates_UserUpdate
                r = Object.keys(d).map(u=>u + (d[u] > 1 ? "s" : "")).join("_")
            }
            // Combine graphQLMutationPrepared of every transaction.
            const s = this.transactions.flatMap(d=>Object.entries(d.graphQLMutationPrepared.variableTypes || {}).map(([u,h])=>`$${u}: ${h}!`)).join(", ")
              , i = this.transactions.reduce((d,u)=>({
                ...d,
                ...u.graphQLMutationPrepared.variables
            }), {})
              , a = `mutation ${r}${s ? `(${s})` : ""} { ${this.transactions.map((d,u)=>(n ? "" : `o${u + 1}:`) + (typeof d == "string" ? d : d.graphQLMutationPrepared.mutationText)).join(", ")} }`
            // And send the request to the server.
            // An example is shown in the article.
              , o = await this.graphQLClient.mutate(a, i, {
                logUserErrors: !0
            })
                // Get the max lastSyncId.
              , l = Object.keys(o).reduce((d,u)=>Math.max(d, o[u].lastSyncId), 0);
            for (const d of this.transactions) // Complete all transactions.
                d.transactionCompleted(void 0, l); // The lastSyncId will be syncIdNeededForCompletion property of that transaction.
            this.resolve()
        } catch (n) {
            const r = P1(n) ? n : void 0
              , s = this.transactions.reduce((i,a)=>Math.max(i, a.retries), 0);
            if ((r == null ? void 0 : r.type) === "lock timeout" && s < lce) {
                for (const i of this.transactions)
                    i.retries++;
                this.resolve(Ro.offlined)
            } else if ((r == null ? void 0 : r.type) === "network error" || (r == null ? void 0 : r.type) === Nf && ((e = r.metaData) == null ? void 0 : e.downtimeMode) === "offline") {
                this.resolve(Ro.offlined);
                for (const i of this.transactions)
                    i.offlined()
            } else {
                this.reject(n);
                for (const i of this.transactions)
                    i.transactionCompleted(i.transformError(n))
            }
        }
        return this.completionPromise
    }
}
/** UnarchiveTransaction */
class y3 extends Zo {
    static async fromSerializedData(e, n, r, s) {
        const i = Me.getModelClass(s.modelClass);
        if (!i)
            return;
        const a = await n.hydrateModel(i, s.modelId);
        if (a) {
            const o = new y3(a,s.batchIndex,n,r);
            return o.id = e,
            o
        }
    }
    get graphQLOperationName() {
        return `${o5(this.model.modelName)}Unarchive`
    }
    graphQLMutation(e) {
        return this.model.unarchiveMutation()
    }
    constructor(e, n, r, s) {
        super("unarchive", e, n, r, s),
        this.syncClient.addModel(e),
        e.attachToReferencedProperties()
    }
    transformError(e) {
        return e instanceof et ? e : new et({
            type: "internal error",
            message: "Unarchive transaction failed",
            userError: !0,
            userPresentableMessage: `Failed to un-archive ${this.model.modelName}`
        })
    }
    serialize() {
        return {
            id: this.id,
            type: "unarchive",
            batchIndex: this.batchIndex,
            modelId: this.model.id,
            modelClass: this.model.modelName
        }
    }
    undoTransaction() {
        return this.model instanceof Xc ? this.syncClient.delete(this.model) : this.model instanceof si ? this.syncClient.archive(this.model) : new Tc(this.model)
    }
    writeLocalTransactionToDatabase(e) {
        e.add(this.model.modelName, this.model.serialize())
    }
    rollback() {
        this.model.archivedAt = new Date,
        this.syncClient.archiveModel(this.model)
    }
}
/** Update Transaction */
class zu extends Zo { // UpdateTransaction
    static async fromSerializedData(e, n, r, s) {
        // This method actually replays a transaction.
        const i = Me.getModelClass(s.modelClass);
        if (!i)
            return;
        const a = await n.hydrateModel(i, s.modelId); // To replay a transaction, first we should hydrate the model
        // than the transaction modified.
        if (a) {
            const o = new zu(a,s.batchIndex,n,r,s.additionalUpdateArgs);
            o.id = e,
            o.changeSnapshot = s.changeSnapshot;
            // Here, the changes are updated to the model.
            for (const l in s.changeSnapshot.changes) {
                const d = s.changeSnapshot.changes[l].unoptimizedUpdated || s.changeSnapshot.changes[l].updated;
                a.setSerializedValue(l, d, a.properties[l])
            }
            return o
        }
    }
    get graphQLOperationName() {
        return `${o5(this.model.modelName)}Update`
    }
    graphQLMutation(e) {
        return this.model.updateMutation(e, this.changeSnapshot, this.additionalUpdateArgs)
    }
    constructor(e, n, r, s, i) {
        super("update", e, n, r, s),
        this.changeSnapshot = e.changeSnapshot(), // find out what has been changed
        this.additionalUpdateArgs = i || {}
    }
    transformError(e) {
        return e instanceof et ? e : new et({
            type: "internal error",
            message: "Update transaction failed",
            userError: !0,
            userPresentableMessage: `Failed to update ${this.model.modelName}`
        })
    }
    rebase() {
        if (this.changeSnapshot)
            for (const e in this.changeSnapshot.changes) {
                const n = this.changeSnapshot.changes[e].unoptimizedUpdated || this.changeSnapshot.changes[e].updated;
                // The model's value had been updated by the delta packet, so we need to update the original value
                // to the lastest value.
                this.changeSnapshot.changes[e].original = this.model.serializedValue(e, this.model[e]),
                // But eventually, the model's value should reflect what has been changed by this transaction - last writer wins,
                // so we need to update the value again!
                this.model.setSerializedValue(e, n, this.model.properties[e])
            }
    }
    serialize() { // Serialize a UpdateTransaction
        return {
            id: this.id,
            type: "update",
            batchIndex: this.batchIndex,
            modelId: this.model.id,
            modelClass: this.model.modelName,
            changeSnapshot: this.changeSnapshot,
            additionalUpdateArgs: this.additionalUpdateArgs
        }
    }
    undoTransaction() {
        if (this.changeSnapshot) {
            for (const e in this.changeSnapshot.changes)
                // Call `update` to create another `UpdateTransaction`.
                this.model.setSerializedValue(e, this.changeSnapshot.changes[e].updatedFrom, this.model.properties[e]);
            return this.syncClient.update(this.model) // Return a correspdoing redo mutation.
        }
        return new Tc(this.model) 
    }
    writeLocalTransactionToDatabase(e) {
        e.put(this.model.modelName, this.model.serialize())
    }
    rollback() {
        if (this.changeSnapshot) {
            const e = {};
            for (const n in this.changeSnapshot.changes)
                e[n] = this.changeSnapshot.changes[n].original; // get all original values
            lt(()=>{
                this.model.updateFromData(e) // dump old values into the model when rollback
            }
            )
        }
    }
}
