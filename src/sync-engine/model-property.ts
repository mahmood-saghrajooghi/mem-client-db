import { Model } from './model';
import { ModelRegistry } from './model-registry';

export const PropertyType = {
  Property : 0, // for a self-owned property, e.g. issue.title
  EphemeralProperty : 1,
  Reference : 2, // for reference target's id, e.g. issue.documentContentId
  ReferencedModel : 3, //  for reference target, e.g. issue.documentContent
  ReferenceCollection : 4,
  BackReference : 5, // for back reference, e.g. documentContent.issue
  ReferenceArray : 6 // like reference, but in an array
} as const;

export type PropertyType = typeof PropertyType[keyof typeof PropertyType];

export type ModelProperty = {
  type: PropertyType;
  serializer?: {
    serialize: (value: any) => any;
    deserialize: (value: any) => any;
  };
}

export type PersistenceStrategy = typeof PersistenceStrategy[keyof typeof PersistenceStrategy];
export function makePropertyObservable(
  modelPrototype: any,
  propertyName: string,
  deepObservation?: boolean,
  deserializer?: ModelProperty['serializer']
) {
  Object.defineProperty(modelPrototype, propertyName, {
    get() {
      return this.__data[propertyName];
    },
    set(value) {
      const oldValue = this.__data[propertyName];
      this.__data[propertyName] = value;
      this.propertyChanged(propertyName, oldValue, value);
    },
    enumerable: true,
    configurable: true,
  })
}

type ReferencedModel = {
  new(...args: any[]): {};
  store: {
    findById(modelConstructor: any, id: string): any;
  }
};

export function Reference<T extends ReferencedModel>(getReferencedModel: () => T, referencedProperty: string, metaData: { nullable: boolean, optional?: boolean}) {
  return function <P extends { constructor: { name: string } }>(target: P, propertyKey: string) {
    registerReference(target, propertyKey, metaData, referencedProperty, getReferencedModel);
  }
}

function registerReference(target: any, referenceName: string, metaData: { nullable: boolean, optional?: boolean }, referencedProperty: string, referencedClassResolver: () => ReferencedModel) {
  const isReferenceNullable = metaData.nullable;
  const isReferenceOptional = isReferenceNullable ? true : metaData.optional;
  const referenceIdentifierKey = `${referencedProperty}Id`;

  Object.defineProperty(target, referenceName, {
    get: function () {
      console.log('get', this[referenceIdentifierKey]);

      const referenceId = this[referenceIdentifierKey];
      if(!referenceId) {
        if(!isReferenceOptional) {
          throw new Error(`Reference property ${referenceName} is not optional and has no id`);
        }
        return null;
      }
      const referencedModelClass = referencedClassResolver();

      return referencedModelClass.store.findById(referencedModelClass, referenceId);
    },
    set: function (value: { id: string } | string) {
      this[referenceIdentifierKey] = typeof value === 'string' ? value : value.id;
    },
    enumerable: true,
    configurable: true,
  })

  console.log(target);
  console.log(referenceName);
  console.log(Object.getOwnPropertyDescriptor(target, referenceName));

  type ReferencedModelPropertyMetaData = {
    type: PropertyType;
    referenceOptional: boolean;
    referenceNullable: boolean;
    referencedClassResolver?: () => ReferencedModel;
    referencedProperty?: string;
  }

  const referencedModelPropertyMetaData: ReferencedModelPropertyMetaData = {
    type: PropertyType.ReferencedModel,
    referenceOptional: !!isReferenceOptional,
    referenceNullable: !!isReferenceNullable,
  }
  if(referencedClassResolver) {
    referencedModelPropertyMetaData.referencedClassResolver = referencedClassResolver;
  }
  ModelRegistry.registerProperty(referenceName, target.constructor.name, referencedModelPropertyMetaData);

  const referencedPropertyMetaData: ReferencedModelPropertyMetaData = {
    type: PropertyType.Reference,
    referenceOptional: !!isReferenceOptional,
    referenceNullable: !!isReferenceNullable,
  }
  if(referencedProperty) {
    referencedPropertyMetaData.referencedProperty = referencedProperty;
  }
  ModelRegistry.registerProperty(referenceIdentifierKey, target.constructor.name, referencedPropertyMetaData);
}
