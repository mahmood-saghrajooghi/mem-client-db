const as = class as { // Model class
    static get constructorName() {
        return this.modelName
    }
    get supportsUndoCreatedAtArguments() {
        return !1
    }
    static get isPartiallyLoaded() {
        switch (this.loadStrategy) {
        case dn.instant:
        case dn.lazy:
        case dn.explicitlyRequested:
        case dn.local:
            return !1;
        case dn.partial:
            return !0;
        default:
            throw this.loadStrategy,
            void 0
        }
    }
    static get modelName() {
        return this.prototype.modelName
    }
    get isArchived() {
        return this.archivedAt !== void 0
    }
    get onSave() {
        if (!this._onSave) {
            const e = new Tt;
            this._onSave = e
        }
        return this._onSave
    }
    get onUpdateFromData() {
        if (!this._onUpdateFromData) {
            const e = new Tt;
            this._onUpdateFromData = e
        }
        return this._onUpdateFromData
    }
    get onUpdate() {
        if (!this._onUpdate) {
            const e = new Tt;
            this._onUpdate = e
        }
        return this._onUpdate
    }
    get clonedFromModel() {
        return this._clonedFromModel
    }
    get isClone() {
        return this._clonedFromModel !== void 0
    }
    get modelClass() {
        return this.constructor
    }
    get mutationResultName() {
        return this.modelName[0].toLowerCase() + this.modelName.substring(1)
    }
    get properties() {
        return Me.propertiesOfModel(this.modelName)
    }
    get dataProperties() {
        return Me.dataPropertiesOfModel(this.modelName)
    }
    get applyingNetworkChanges() {
        return this.ignoreUpdates
    }
    constructor(e=!0) { // the constructor of all model
        if (this.dependenciesRequireLoading = !1,
        this.hydrated = !1,
        this.__mobx = {},
        this.modifiedProperties = {}, // store what property has been changed on this model
        this.madeObservable = !1,
        this.observingPropertyChanges = !1,
        this.ignoreUpdates = !1,
        this.hydratedRelationsPromises = new Map,
        !as.store)
            throw Error("Model.store not registered when instantiating Model.");
        this.store = as.store, // the store is assigned to the Model object here
        e && (this.id = Qc(),
        this.createdAt = new Date,
        this.updatedAt = new Date,
        this.hydrated = !0)
    }
    beforeSave(e) {}
    prepareForAdd() {}
    get isSingletonModel() {
        return !1
    }
    save(e=!1, n) { // Save a model to generate a transaction.
        return lt(()=>{ // `lt` is actually mobx's util function `runInAction`. It kicks MobX to do its job.
            var s;
            const r = this.store.save(this, e, n); // Call `save` of `SyncedStore`. ->
            return this.isInTransaction() || (this._clonedFromModel = void 0),
            (s = this._onSave) == null || s.fire(), // `fire` will notify its observers it has changed.
            r
        }
        )
    }
    createMutation(e, n={}) { // generate transcation operation for most Models
        var h;
        const r = `${this.modelName}CreateInput`
          , s = {}
          , i = Object.keys(this.properties).filter(f=>{
            const p = this.properties[f];
            return p.persistance === ee.createOnly || p.persistance === ee.createAndUpdate
        }
        );
        for (const f of i) {
            let p = this.serializedValue(f, this[f]);
            this.properties[f].optimizer && p && (p = (h = this.properties[f].optimizer) == null ? void 0 : h.optimizeCreate(p));
            const m = this.graphQLSerializedVariableValue(f, p, !1);
            m !== void 0 && (s[f] = m)
        }
        let a = "";
        n && Object.keys(n).length > 0 && (a = ", " + Object.keys(n).map(f=>`${f}:${JSON.stringify(n[f])}`).join(", "));
        const o = `${Zl(this.modelName)}Create`;
        let l = 1
          , d = `${o}Input`;
        for (; e.has(d); )
            d = `${o}Input_${++l}`;
        const u = `${o}(input: $${d}${a}) { lastSyncId }`;
        return this.observePropertyChanges(),
        {
            mutationText: u,
            variables: {
                [d]: s
            },
            variableTypes: {
                [d]: r
            }
        }
    }
    get changedProperties() {
        return Object.keys(this.modifiedProperties)
    }
    updateMutation(e, n, r={}) {
        // e is a Set
        // n for an array of change descriptors. e.g.
        // [{ 
        //   "assigneeId" {
        //     "original": null,
        //     "unoptimizedUpdated": undefined,
        //     "updatedFrom": null,
        //     "updated": "4e8622c7-0a24-412d-bf38-156e073ab384"
        //   }
        // }]
        const s = `${this.modelName}UpdateInput`
          , i = {};
        for (const f in n.changes) {
            const p = this.graphQLSerializedVariableValue(f, n.changes[f].updated, !0);
            p !== void 0 && (i[f] = p)
        }
        if (Object.keys(i).length === 0)
            return;
        const a = this.isSingletonModel ? "" : `id: "${this.id}", ` // id: "id-of-the-changed-model"
          , o = `${Zl(this.modelName)}Update`; // IssueUpdate
        let l = 1
          , d = `${o}Input`;
        for (; e.has(d); )
            d = `${o}Input_${++l}`;
        let u = "";
        return r && Object.keys(r).length > 0 && (u = ", " + Object.keys(r).map(f=>`${f}:${JSON.stringify(r[f])}`).join(", ")),
        {
            mutationText: `${o}(${a}input: $${d}${u}) { lastSyncId }`,
            variables: {
                [d]: i
            },
            variableTypes: {
                [d]: s
            }
        }
    }
    archiveMutation() {
        return `${Zl(this.modelName)}Archive(id: "${this.id}") { lastSyncId }`
    }
    unarchiveMutation() {
        return `${Zl(this.modelName)}Unarchive(id: "${this.id}") { lastSyncId }`
    }
    deleteMutation() {
        return `${Zl(this.modelName)}Delete(id: "${this.id}") { lastSyncId }`
    }
    markPropertyChanged(e, n) { 
        // e for the name of the changed property, 
        // n for the old value
        const r = this.properties[e];
        if ((r.persistance === ee.updateOnly || r.persistance === ee.createAndUpdate) && !(e in this.modifiedProperties) && !this.ignoreUpdates) {
            const s = this.serializedValue(e, n) // serilaized old value
              , i = this.serializedValue(e, this[e]); // seralized new value
            // Check if the value really changes by comparing the serialized values.
            // Add register the changed property's name and the old value to modifiedProperties
            s !== i && (this.modifiedProperties[e] = s)
        }
    }
    changeSnapshot() { // get the changes of the model, it seems to be universal for all models
        const e = {};
        for (const n in this.modifiedProperties) {
            const r = this.properties[n];
            let s, i = this.serializedValue(n, this[n]);
            r.optimizer && this.modifiedProperties[n] && i && (s = i,
            i = r.optimizer.optimizeUpdate(this.modifiedProperties[n], i)),
            e[n] = { // each modified property would have its own descriptor
                original: this.modifiedProperties[n],
                updatedFrom: this.modifiedProperties[n],
                updated: i,
                unoptimizedUpdated: s
            }
        }
        return this.clearSnapshot(),
        {
            changes: e
        }
    }
    clearSnapshot() { 
        this.modifiedProperties = {}
    }
    clone(e) {
        const n = Me.getModelClass(this.modelName);
        if (!n)
            throw Error(`Could not find class for model ${this.modelName}`);
        const r = new n(!0);
        return r.merge(this),
        r.markAsClonedFrom(this),
        e && (r.id = Qc()),
        r
    }
    serialize() {
        const e = {};
        for (const n of Object.keys(this.properties)) {
            const r = this.serializedValue(n, this[n]);
            r !== null && (e[n] = r)
        }
        return e
    }
    merge(e, n) {
        lt(()=>{
            const r = (n == null ? void 0 : n.onlyKeys) ?? Object.keys(this.properties);
            for (const s of r) {
                const i = this.properties[s];
                if (i.type === vn.referenceCollection || i.type === vn.referencedModel || i.type === vn.backReference)
                    continue;
                const a = e.serializedValue(s, e[s]);
                this.setSerializedValue(s, a === null ? void 0 : a, i)
            }
            this.hydrated = e.hydrated
        }
        )
    }
    differences(e) {
        return Object.keys(this.properties).filter(n=>{
            const r = this.serializedValue(n, this[n])
              , s = e.serializedValue(n, e[n]);
            return !F2(r, s)
        }
        )
    }
    /**
     * Dump values from a plain object to a model. This would be called when the client receives deltas from the server,
     * or the model is constructed when bootstrapping (and many other circustances).
     */
    updateFromData(e, n) {
        var s;
        this.ignoreUpdates = !0; // Mark we are catching remote changes, all updates from setters would be ignored!
        const r = Me.propertiesOfModel(this.modelName);
        for (const i in e)
            this.setSerializedValue(i, e[i], r[i]);
        if ((n == null ? void 0 : n.dataContainsAllProperties) === !0) {
            const i = this.dataProperties;
            for (const a in i)
                a in e || this.setSerializedValue(a, void 0, i[a])
        }
        (s = this._onUpdateFromData) == null || s.fire(e),
        this.ignoreUpdates = !1
    }
    didUpdate() {
        var e;
        (e = this._onUpdate) == null || e.fire(this)
    }
    attachToReferencedProperties() {
        this.updateReferencedModels(!0)
    }
    detachFromReferencedProperties() {
        this.updateReferencedModels(!1)
    }
    serializedValue(e, n) {
        const r = this.properties[e];
        return !r || r.type === vn.referenceCollection || r.type === vn.referencedModel || r.type === vn.backReference ? null : n !== void 0 && r.serializer !== void 0 ? r.serializer.serialize(n) : Array.isArray(n) ? [].concat(n) : n === void 0 ? null : n
    }
    setSerializedValue(e, n, r) {
        if (!r)
            return;
        let s = n === null ? void 0 : n;
        if (r.type === vn.reference || r.type === vn.backReference)
            this[e] = s;
        else {
            if (s !== void 0 && r.serializer !== void 0)
                if (this.modelName === "Template" && e === "templateData" && s === "" && (s = "{}"),
                this.madeObservable)
                    s = r.serializer.deserialize(s);
                else {
                    this.__mobx[e + "_d"] = r.serializer, // _d is set here?
                    this.__mobx[e + "_v"] = s;
                    return
                }
            (!this.madeObservable || !F2(this[e], s)) && (this[e] = s)
        }
    }
    references(e) {
        for (const n in this.properties)
            if (A1.unwrap(this[n]) === e)
                return !0;
        return !1
    }
    get persisted() {
        return as.store ? as.store.findById(as, this.id, {
            excludeTemporaryModels: !0
        }) !== void 0 : !1
    }
    get persistedOnBackend() {
        return this.persisted && this.store.transactionsForModel(this).filter(e=>e.type === "create").length === 0
    }
    get filterValue() {
        return this.id
    }
    get filterMatchValue() {
        return this.id
    }
    updateRelation(e, n, r=!0) { // r === true for build reference, r === false to remove reference
        var o, l;
        if (r && !this.isArchived && e.isArchived || !r && this.isArchived && e.isArchived || this.isInDifferentLocalTransaction(e))
            return;
        const s = this.properties[n]
          , a = (s == null ? void 0 : s.type) === vn.referenceCollection && this[n];
        if (a instanceof te) // Update ReferenceCollection
            r ? a.add(e) : a.remove(e);
        else if (r)
            this[n] = e; // Or simply change reference
        else {
            if (s || F.error("Trying to detach a non-existing property", void 0, {
                property: n,
                modelName: this.modelName,
                relatedModelName: e.modelName
            }),
            (s == null ? void 0 : s.referenceNullable) === !1)
                return;
            (s == null ? void 0 : s.lazy) === !0 ? (this[`${n}Id`] === e.id || ((o = this[`${n}Lazy`]) == null ? void 0 : o.value) === e || ((l = this[`${n}_l`]) == null ? void 0 : l.value) === e) && (this[n] = void 0) : this[`${n}Id`] === e.id && (this[n] = void 0)
        }
    }
    referencedPropertyChanged(e, n, r) {
        if (this.observingPropertyChanges)
            if (Array.isArray(r) && Array.isArray(n)) {
                for (const s of n)
                    r.includes(s) || this.updateReferencedModel(s, e, !1);
                for (const s of r)
                    n.includes(s) || this.updateReferencedModel(s, e, !0)
            } else
                n !== r && (this.updateReferencedModel(n, e, !1),
                this.updateReferencedModel(r, e, !0))
    }
    observePropertyChanges() {
        this.observingPropertyChanges || (this.observingPropertyChanges = !0,
        this.makeObservable())
    }
    hydrate(e) { // To hydrate a model.
        var a;
        if (this.hydrationPromise && (!this.isHydrationPromiseLocalOnly || e != null && e.onlyIfLocallyAvailable))
            return this.hydrationPromise;
        if (!this.persisted) // Temporary models will not be hydrated.
            return this.setHydrated(),
            new Jt(this); // Return self in a Promise.
        const n = []; // All micro tasks to hydrate properties.
        let r = !1;
        const s = Me.propertiesOfModel(this.modelName);
        for (const o of Me.lazyCollectionKeysOfModel(this.modelName)) {
            const l = this[o];
            if (l instanceof Et && !l.isHydrated()) { // LazyReferenceCollection
                const d = l.hydrate(e);
                n.push(d),
                l.modelClass.isPartiallyLoaded && (r = !0)
            }
        }
        for (const o of Me.lazyReferenceKeysOfModel(this.modelName)) {
            const l = s[o]
              , d = this[o];
            d instanceof A1 && !d.isHydrated() && (n.push(d.hydrate(e)), // Hydrate lazy references and lazy back referencies
            (a = l.referencedClassResolver) != null && a.call(l).isPartiallyLoaded ? r = !0 : l.referencedClassResolver || (r = !0))
        }
        const i = Me.cascadeHydrationKeysOfModel(this.modelName);
        if (i) // Some references may need to be hydrated cascadely as well.
            for (const o of i) {
                const l = this[o];
                if (l instanceof as && l.isHydrated() === !1) {
                    const d = l.hydrate(e); // Recursively hydrate another Model.
                    n.push(d)
                } else if (l instanceof te) { // ReferenceCollection.
                    const d = l.hydrateElements();
                    d.isPending && n.push(d)
                }
            }
        if (n.length) {
            this.isHydrationPromiseLocalOnly = r && (e == null ? void 0 : e.onlyIfLocallyAvailable);
            const o = new Jt((l,d)=>{
                Promise.all(n).then(()=>{
                    this.setHydrated(!r || !(e != null && e.onlyIfLocallyAvailable)),
                    l(this)
                }
                ).catch(async u=>{
                    this.invalidateRejectedWhenRequested(),
                    d(new Ed(this.modelClass,u))
                }
                )
            }
            );
            this.hydrationPromise = o
        } else
            this.setHydrated(),
            this.isHydrationPromiseLocalOnly = !1,
            this.hydrationPromise = new Jt(this);
        return this.hydrationPromise
    }
    hydrateRelations(e, n) {
        const r = [...e].sort().join("-")
          , s = this.hydratedRelationsPromises.get(r);
        if (s)
            return s;
        const i = new Jt(async(a,o)=>{
            if (!this.isHydrated())
                try {
                    await this.hydrate(n)
                } catch (d) {
                    return o(d)
                }
            if (e.length === 0)
                return a(this);
            const l = [];
            for (const d of e) {
                const u = this[d];
                u instanceof A1 && u.value && !u.value.isHydrated() && l.push(u.value.hydrate(n))
            }
            if (l.length)
                try {
                    await Promise.all(l)
                } catch (d) {
                    return this.invalidateRejectedWhenRequested(r),
                    o(new Ed(this.modelClass,d))
                }
            a(this)
        }
        );
        return this.hydratedRelationsPromises.set(r, i),
        i
    }
    setHydrated(e=!0) {
        this.hydrated = e
    }
    isHydrated() {
        if (this.hydrated)
            return !0;
        for (const n of Me.lazyCollectionKeysOfModel(this.modelName)) {
            const r = this[n];
            if (r instanceof Et && !r.isHydrated())
                return !1
        }
        for (const n of Me.lazyReferenceKeysOfModel(this.modelName))
            if (this[n + "Id"] !== void 0) {
                const r = this[n + "Lazy"];
                if (r && r.isPending || !as.store.findById(as, this[n + "Id"]))
                    return !1
            }
        const e = Me.cascadeHydrationKeysOfModel(this.modelName);
        if (e)
            for (const n of e) {
                const r = this[n];
                if (r instanceof as && !r.isHydrated())
                    return !1
            }
        return !0
    }
    hydrationFailed() {
        var e;
        return !!((e = this.hydrationPromise) != null && e.error)
    }
    static preloadFor(e, n) {
        return new ky(this,n).withRelation(e)
    }
    static preloadWithId(e) {
        return new ky(this).withId(e)
    }
    get shouldSetUpdatedAt() {
        const e = this.skipUpdatedAtKeys
          , n = Object.keys(this.modifiedProperties);
        return n.length === 0 ? !1 : e === void 0 || n.some(r=>!e.has(r))
    }
    isInstanceOf(e) {
        return this instanceof e
    }
    propertyChanged(e, n, r) { 
        // `e` for the changed property's name, 
        // `n` for the old value
        // `r` for the new value
        const s = this.properties[e];
        if (s) {
            // You can ignore this if branch
            if (s.type === vn.ephemeralProperty) {
                const i = r === void 0 ? null : r;
                this.ignoreUpdates || (this.ephemeralUpdates ? this.ephemeralUpdates[e] = i : (this.ephemeralUpdates = {
                    [e]: i
                },
                window.setTimeout(()=>{
                    this.store.sendEphemeralUpdate(this, this.ephemeralUpdates || {}),
                    this.ephemeralUpdates = void 0
                }
                , 5)))
            } else
                this.markPropertyChanged(e, n);
            // Also, if the property is a reference, update the referenced model.
            s.referencedProperty && this.referencedPropertyChanged(s.referencedProperty, n, r)
        }
    }
    static createEmpty() {
        return new this
    }
    makeObservable() {
        this.madeObservable || (this.madeObservable = !0,
        // Make these properties observable.
        Ln(this, {
            // actions & computed
            ...Me.observableAnnotationsOfModel(this.modelName),
            hydrated: ut,
            setHydrated: Le
        }))
    }
    graphQLSerializedVariableValue(e, n, r) {
        const s = this.properties[e];
        if (!(n === null && !r)) {
            if (s.enum)
                if (typeof n == "string" || typeof n == "number") {
                    for (const i of Object.keys(s.enum))
                        if (s.enum[i] === n)
                            return i;
                    return n
                } else
                    return n === null ? null : void 0;
            return s.serializer === Yi && typeof n == "string" ? Yi.deserialize(n) : n
        }
    }
    updateReferencedModels(e) { // Update references of a model.
        const n = Me.referencedPropertiesOfModel(this.modelName); 
        for (const r in n) {
            const s = n[r];
            if (!s)
                continue;
            const i = this[r]
              , a = i instanceof as ? i.id : i;
            if (!(!a || !s.referencedProperty)) // if (a && s.referencedProperty)
                if (Array.isArray(a))
                    for (const o of a)
                        this.updateReferencedModel(o, s.referencedProperty, e);
                else
                    this.updateReferencedModel(a, s.referencedProperty, e)
        }
    }
    updateReferencedModel(e, n, r) {
        const s = this.store.syncClient.getModel(e); // s is for the referenced model, this for the referencing model
        s ? s.updateRelation(this, n, r) : r && this.store.delayedRelationManager.addDelayedRelation(this, e)
    }
    isInDifferentLocalTransaction(e) {
        const n = this.store.localTransactionsForModel(this)
          , r = this.store.localTransactionsForModel(e)
          , s = n.some(o=>r.includes(o))
          , i = !!n.length && !!r.length
          , a = !n.length && !!r.length;
        return !s && i || a
    }
    markAsClonedFrom(e) {
        this._clonedFromModel = e
    }
    isInTransaction() {
        return this.store.modelIsInTransaction(this)
    }
    invalidateRejectedWhenRequested(e) {
        e && (this._invalidateRejectedWhenRequestedKeys || (this._invalidateRejectedWhenRequestedKeys = new Set),
        this._invalidateRejectedWhenRequestedKeys.add(e)),
        this._invalidateRejectedWhenRequestedSubscribed || (this.store.onInvalidateRejectedHydrations.subscribeOnce(()=>this.invalidateRejectedHydrationPromises()),
        this._invalidateRejectedWhenRequestedSubscribed = !0)
    }
    invalidateRejectedHydrationPromises() {
        var e;
        if ((e = this.hydrationPromise) != null && e.error && (this.hydrationPromise = void 0,
        this.isHydrationPromiseLocalOnly = !1),
        this._invalidateRejectedWhenRequestedKeys) {
            for (const n of this._invalidateRejectedWhenRequestedKeys.keys())
                this.hydratedRelationsPromises.delete(n);
            this._invalidateRejectedWhenRequestedKeys = void 0
        }
        this._invalidateRejectedWhenRequestedSubscribed = !1
    }
}
;
as.usedForPartialIndexes = !1,
as.loadStrategy = dn.instant,
as.partialLoadMode = ki.regular;
let at = as;
class si extends at { // archiveable model
    archive() {
        return this.archivedAt = new Date,
        this.store.archive(this)
    }
    unarchive() {
        return this.store.unarchive(this)
    }
}
class It extends si { // deletable-model, some model could only be archvied
    delete(e) {
        return lt(()=>{
            var n;
            return (n = this._onDelete) == null || n.fire(this),
            this.store.delete(this, e)
        }
        )
    }
    get onDelete() {
        if (!this._onDelete) {
            const e = new Tt;
            this._onDelete = e
        }
        return this._onDelete
    }
}
class Xc extends si { // trash-able model
    trash() {
        return lt(()=>this.store.trash(this))
    }
}
