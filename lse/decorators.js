/**
 * Action decorator
 */
function rt(t, e) { 
    Me.registerAction(t.constructor.name, e)
}
/**
 * Computed decorator
 */
function O(t, e) {
    Me.registerComputed(t.constructor.name, e)
}
function m_(t) {
    return (e,n)=>{
        M1(e, n, (t == null ? void 0 : t.shallowObservation) !== !0)
    }
}
/**
 * Property decorator
 */
function w(t={}) { // t for metadata options.
    return (e,n)=>{ // e for the model prototype, n for the properties name
        M1(e, n, t.serializer !== void 0 && t.shallowObservation !== !0); 
        const r = t.persistance !== void 0 ? t.persistance : ee.createAndUpdate
          , s = {
            type: vn.property,
            persistance: r
        };
        t.serializer && (s.serializer = t.serializer),
        t.optimizer && (s.optimizer = t.optimizer),
        t.enum && (s.enum = t.enum),
        t.indexed && (s.indexed = t.indexed),
        t.multiEntry && (s.multiEntry = t.multiEntry),
        t.shallowObservation && (s.shallowObservation = t.shallowObservation),
        Me.registerProperty(e.constructor.name, n, s) // Register the property's metadata. 
        // Note that the constructor's name is used here instead of model name.
    }
}
/**
 * EphemeralProperty decorator
 */
function g_(t={}) {
    return (e,n)=>{
        M1(e, n, t.serializer !== void 0 && t.shallowObservation !== !0);
        const r = {
            type: vn.ephemeralProperty,
            persistance: ee.none
        };
        t.serializer && (r.serializer = t.serializer),
        t.optimizer && (r.optimizer = t.optimizer),
        t.enum && (r.enum = t.enum),
        Me.registerProperty(e.constructor.name, n, r)
    }
}
/**
 * ReferenceCollection decorator
 */
function xe() {
    return (t,e)=>{
        Me.registerProperty(t.constructor.name, e, {
            type: vn.referenceCollection,
            persistance: ee.createAndUpdate
        })
    }
}
/**
 * LazyReferenceCollection decorator
 * \@OneToMany
 */
function Nt(t) {
    return (e,n)=>{
        Me.registerProperty(e.constructor.name, n, {
            type: vn.referenceCollection,
            persistance: ee.createAndUpdate,
            ...t != null && t.cascadeHydration ? {
                cascadeHydration: !0
            } : {},
            lazy: !0
        })
    }
}

/**
 * Reference decorator
 */
function pe(t, e, n) {
    return (r,s)=>{
        A4(r, s, n, e, t)
    }
}

/**
 * LazyReference decorator
 * 
 * \@ManyToOne
 */
function Hr(t, e, n) {
    return (r,s)=>{
        j4(r, s, n, e, t)
    }
}

/**
 * Reference decorator, with no back references 
 */
function Ue(t, e) {
    return (n,r)=>{
        A4(n, r, e, void 0, t)
    }
}

/**
 * LazyReference with no back references decorator
 */
function g5(t, e) {
    return (n,r)=>{
        j4(n, r, e, void 0, t)
    }
}

/**
 * Reference or BackReference decorator.
 * If the first prameter is a function, then it is used to declare a Reference. Otherwise,
 * it is used to declare a BackReference.
 */
function Dt(t, e, n) {
    return (r,s)=>{
        typeof t == "function" ? A4(r, s, n, e, t) : A4(r, s, {
            persistance: ee.none,
            nullable: !0,
            ...t
        })
    }
}

/**
 * Lazy Reference decorator
 * 
 * \@OneToOne?
 */
function kl(t, e, n) {
    // t is config or the back reference target model
    // e is the back reference property name
    // n is the configuration if t is a back reference
    return (r,s)=>{
        // r is the model's prototype object
        // s is the property name
        typeof t == "function" ? j4(r, s, n, e, t) : j4(r, s, {
            persistance: ee.none,
            nullable: !0,
            ...t
        })
    }
}

/**
 * ReferenceArray decorator
 */
function ii(t, e, n) {
    return (r,s)=>{
        const i = {
            type: vn.referenceCollection,
            persistance: ee.none
        };
        n != null && n.lazy && (i.lazy = n.lazy),
        Me.registerProperty(r.constructor.name, s, i);
        const a = NA.singular(s) + "Ids"
          , o = "__" + s;
        Object.defineProperty(r, s, {
            get: function() {
                return this[o]
            },
            set: function(d) {
                n != null && n.updateOnSyncGroupChange && d.updateOnSyncGroupChanges(),
                this[o] = d,
                d.onChange.subscribe(u=>{
                    const h = u[0].slice(0);
                    this.markPropertyChanged(a, h),
                    e && this.referencedPropertyChanged(e, h, u[1].slice(0))
                }
                )
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(r, a, {
            get: function() {
                return this[s].getElementIds()
            },
            set: function(d) {
                this[s].setElementIds(d || [])
            },
            enumerable: !1
        });
        const l = {
            type: vn.referenceArray,
            persistance: (n == null ? void 0 : n.persistance) ?? ee.createAndUpdate,
            referencedClassResolver: t
        };
        e && (l.referencedProperty = e),
        n != null && n.indexed && (l.indexed = !0,
        l.multiEntry = !0),
        n != null && n.onDelete && (l.onDelete = n.onDelete === "REMOVE" ? "SET NULL" : n.onDelete === "REMOVE AND CASCADE WHEN EMPTY" ? "CASCADE" : n.onDelete === "NO ACTION" ? "NO ACTION" : Gc(n.onDelete)),
        Me.registerProperty(r.constructor.name, a, l)
    }
}

/**
 * ClientModel decorator
 */
function We(t) { // t is the name of the model
    return e=>{ // e if the constructor function of the model
        M1(e.prototype, "createdAt", !1), // Each model has these 3 default fields. There are responsive.
        M1(e.prototype, "updatedAt", !1),
        M1(e.prototype, "archivedAt", !1),
        e.prototype.modelName = t; // Name is bound to the prototype object.
        let n = `${t}_43_${Bc.models[t]}`; // Schema version is added to hash, e.g. "Issue_43_3".
        if (Me.getModelClass(t))
            return;  // The model has been registered before.
        e.loadStrategy === dn.partial && (n += "_partial"); // "Issue_43_3_partial"
        const r = Me.propertiesOfModel(e.name); // Because of how tsc compiles, properties decorators will execute before model's decorators.
        // Se here we can get call properties of that model.
        for (const s of Object.keys(r)) {
            const i = eY[`${t}_${Bc.models[t] || 0}_${s}`] ? "1" : "0"; // Seems that some properties are special.
            n += "_" + s + "_" + i // Schema hash also include all its properties, e.g. "Issue_43_3_partial_propertyName_1_propertyName_0...".
        }
        n = $1(n), // The model's hash generated.
        Me.registerModel(t, e, n) // Register the model's name, constructor and its hash to ModelRegistry.
    }
}

/**
 * registerReference function
 * The helper function to register Reference or BackReference.
 */
function A4(t, e, n, r, s) {
    // `t` for the model. For example, Issue.
    // `e` for the name of the Reference to `s`. For example, assignee.
    // `n` for metadata options.
    // `r` for the name of the BackReference property. For example, assignedIssues.
    // `s` for a closure that returns the referenced model's constructor. For example, () => User.
    const i = e + "Id" // such as `assigneeId` of `Issue`
      , a = n.nullable
      , o = n.nullable ? !0 : n.optional;
    // Define property of type ReferenceModel, e.g. `assignee` of `Issue`
    Object.defineProperty(t, e, {
        get: function() {
            const u = this[i]; // e.g. this['assigneeId']
            if (u)
                return this.store.findById(at, u) // Find the referenced model for the store with given ID.
        },
        set: function(u) {
            // Set `assigneeId` instead.
            this[i] = u ? typeof u == "string" ? u : u.id : void 0
        },
        enumerable: !0,
        configurable: !0
    });
    const l = {
        type: vn.referencedModel,
        persistance: ee.none,
        referenceOptional: o,
        referenceNullable: a
    };
    s && (l.referencedClassResolver = s),
    Me.registerProperty(t.constructor.name, e, l), // Register `assignee` metadata.
    // Define property of type Reference, e.g. `assigneeId` of `Issue`.
    M1(t, i, !1); // And also make the property observable.
    const d = {
        type: s ? vn.reference : vn.backReference, // If we pass `s` then its a Reference.
        referenceOptional: o,
        referenceNullable: a,
        // Only id will be persisted into the database.
        persistance: n !== void 0 && n.persistance !== void 0 ? n.persistance : ee.createAndUpdate // The default strategy.
    };
    s && (d.referencedClassResolver = s), // This metadata will be used to load and get the referenced model.
    r && (d.referencedProperty = r),
    n != null && n.indexed && (d.indexed = n.indexed),
    n != null && n.onDelete && (d.onDelete = n.onDelete),
    n != null && n.onArchive && (d.onArchive = n.onArchive),
    Me.registerProperty(t.constructor.name, i, d) // Register `assigneeId` metadata.
}

/**
 * Register lazy reference
 * The helper function to register lazy Reference and BackReference.
 */
function j4(t, e, n, r, s) { 
    // t the model's prototype
    // e the property's name
    // n configuration
    // r the back reference property name, undefined when it's reference
    // s a wrapper around the back reference model's constructor

    // if s is not defined, it's a reference property
    // if s is defined, it's a back reference property

    const i = e + "Id"
      , a = `${e}_l`
      , o = n.nullable
      , l = n.nullable ? !0 : n.optional;
    Object.defineProperty(t, e, {
        get: function() {
            if (s) {
                const h = this[i];
                if (!h)
                    return;
                // this['issue_l'] = new Qn(<issue_id>, Issue);
                this[a] || (this[a] = new Qn(h,s())) // BackReferenceValue
            } else
                t[r],
                this[a] || (this[a] = new Lu(this,e)); // LazyBackReference
            return this[a]
        },
        set: function(h) {
            var f;
            h instanceof Qn || h instanceof Lu ? h.isHydrated() ? (this[i] = (f = h.value) == null ? void 0 : f.id,
            this[e].value = h.value) : (h instanceof Lu || (this[i] = h.id),
            this[a] = h) : h ? this[e].value = h : (this[i] = void 0,
            this[a] = void 0)
        },
        enumerable: !0,
        configurable: !0
    });
    const d = {
        type: vn.referencedModel,
        persistance: ee.none,
        referenceOptional: l,
        referenceNullable: o,
        lazy: !0
    };
    s && (d.referencedClassResolver = s),
    n != null && n.cascadeHydration && (d.cascadeHydration = n.cascadeHydration),
    // register id property
    Me.registerProperty(t.constructor.name, e, d),
    M1(t, i, !1, a); // make id value observable
    const u = {
        type: s ? vn.reference : vn.backReference,
        referenceOptional: l,
        referenceNullable: o,
        persistance: s ? n !== void 0 && n.persistance !== void 0 ? n.persistance : ee.createAndUpdate : ee.none
    };
    s && (u.referencedClassResolver = s),
    r && (u.referencedProperty = r),
    n != null && n.indexed && (u.indexed = n.indexed),
    n != null && n.onDelete && (u.onDelete = n.onDelete),
    n != null && n.onArchive && (u.onArchive = n.onArchive),
    // register lazy reference property
    Me.registerProperty(t.constructor.name, i, u)
}
/**
 * The helper function to make a property observable. And it also plays
 * an important role when properties of a model get updated.
 */
function M1(t, e, n, r) { // function observability helper
    // `t` for the model's prorotype object.
    // `e` for the property's name. 
    // `n` for deep observation. 
    // `r` for deseralizer.
    const s = e + "_o" // key for observable value, 
      , i = e + "_v" // key for the plain value
      , a = e + "_d"; // key for the deserializer
    Object.defineProperty(t, e, {
        get: function() {
            return this.__mobx[a] && (this.__mobx[i] !== void 0 && (this.__mobx[i] = this.__mobx[a].deserialize(this.__mobx[i])),
            delete this[a]),
            // The minified code seems difficult to understand. But you only need to
            // pay attention to ut.box here. If the model is observable, M1 would create 
            // a MobX box on the property, e.g. `assigneedId`, to make the property observable.
            this.madeObservable ? (this.__mobx[s] || (this.__mobx[s] = ut.box(this.__mobx[i], {
                deep: n
            }),
            delete this.__mobx[i]),
            this.__mobx[s].get()) : this.__mobx[i]
        },
        set: function(o) {
            // The similar logic applied to the setter.
            if (delete this.__mobx[a],
            !this.madeObservable)
                r && this.__mobx[i] !== o && delete this[r],
                this.__mobx[i] = o;
            else if (!this.__mobx[s]) 
                r && this.__mobx[i] !== o && delete this[r],
                this.__mobx[s] = ut.box(o, {
                    deep: n
                }), 
                // ### Figuring out what has been changed
                // propertyChanged method is called to bookkeepping what property has been changed, what the old value is.
                // This is critical to construct an UpdateTransaction.
                this.propertyChanged(e, this.__mobx[i], o),
                delete this.__mobx[i]; 
            else {
                const l = this.__mobx[s].get();
                this.__mobx[s].set(o),
                l !== o && (this.propertyChanged(e, l, o),
                r && delete this[r])
            }
        },
        enumerable: !0,
        configurable: !0
    })
}
