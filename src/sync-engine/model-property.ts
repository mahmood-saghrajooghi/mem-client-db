import { Model } from './model';
import type { Store } from './store-manager';

export const PropertyType = {
  Property: 0,
} as const;

export type PropertyType = typeof PropertyType[keyof typeof PropertyType];

export type ModelProperty = {
  type: PropertyType;
  serializer?: {
    serialize: (value: any) => any;
    deserialize: (value: any) => any;
  };
}

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

type ReferencedModel = { new(...args: any[]): {}, store: Store };

export function Reference<T extends ReferencedModel>(getReferencedModel: () => T, referencedPropertyName: string, metaData: { nullable: boolean, optional?: boolean}) {
  return function <P extends { constructor: { name: string } }>(target: P, propertyKey: string) {
    registerReference(target, propertyKey, metaData, referencedPropertyName, getReferencedModel);
  }
}

function registerReference(target: any, referenceName: string, metaData: { nullable: boolean, optional?: boolean}, referencedPropertyName: string, getReferencedModel: () => ReferencedModel) {
  const isReferenceNullable = metaData.nullable;
  const isReferenceOptional = metaData.nullable ? true : metaData.optional;
  const referenceIdentifierKey = `${referenceName}Id`;
  Object.defineProperty(target, referenceName, {
    get: function () {
      const referenceId = this[referenceIdentifierKey];
      if(!referenceId) {
        if(!isReferenceOptional) {
          throw new Error(`Reference property ${referenceName} is not optional and has no id`);
        }
        return null;
      }
      if (referenceId) {
        return getReferencedModel().store.findById(Model, referenceId);
      }
    },
    set: function (value: { id: string } | string) {
      this[referenceIdentifierKey] = typeof value === 'string' ? value : value.id;
    },
    enumerable: true,
    configurable: true,
  })
}
