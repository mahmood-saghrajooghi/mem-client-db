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
;
rr._schemaHash = "",
rr.modelLookup = {},
rr.modelPropertyLookup = {},
rr.modelActionLookup = {},
rr.modelComputedLookup = {},
rr.modelDataPropertyLookup = {},
// store referenced model ids
rr.modelReferencedPropertyLookup = {},
rr.modelLazyReferenceKeys = {},
rr.modelLazyCollectionKeys = {},
rr.modelCascadeHydrationKeys = {},
rr.modelPropertyHashLookup = {},
rr.modelDependencyLookup = {},
rr.observableAnnotationsLookup = {};
let Me = rr;
var ee;
(function(t) {
    t[t.none = 0] = "none",
    t[t.createOnly = 1] = "createOnly",
    t[t.updateOnly = 2] = "updateOnly",
    t[t.createAndUpdate = 3] = "createAndUpdate"
}
)(ee || (ee = {}));
var vn; // different types of properties
(function(t) {
    t[t.property = 0] = "property", // for a self-owned property, e.g. issue.title
    t[t.ephemeralProperty = 1] = "ephemeralProperty",
    t[t.reference = 2] = "reference", // for reference target's id, e.g. issue.documentContentId
    t[t.referencedModel = 3] = "referencedModel", //  for reference target, e.g. issue.documentContent
    t[t.referenceCollection = 4] = "referenceCollection",
    t[t.backReference = 5] = "backReference", // for back reference, e.g. documentContent.issue
    t[t.referenceArray = 6] = "referenceArray" // like reference, but in an array
}
)(vn || (vn = {}));
var dn; // load strategies
(function(t) { 
    t[t.instant = 1] = "instant",
    t[t.lazy = 2] = "lazy",
    t[t.partial = 3] = "partial",
    t[t.explicitlyRequested = 4] = "explicitlyRequested",
    t[t.local = 5] = "local"
}
)(dn || (dn = {}));
var ki; // `partialLoadMode` bootstrap strategies
(function(t) {
    t[t.full = 1] = "full",
    t[t.regular = 2] = "regular",
    t[t.lowPriority = 3] = "lowPriority"
}
)(ki || (ki = {}));
