import { Collection } from './collection';

export class Model {
  constructor(values?: Partial<Model>) {
    if (values) {
      Object.assign(this, values);
    }
  }
}

export function BaseModel(modelName: string) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    return class M extends constructor {
      constructor(...args: any[]) {
        super(...args);
        this.id = Math.random().toString(36).substring(2, 11);
        M.instances.set(this.id, this);
      }

      public id: string;

      public static instances : Map<string, M> = new Map();


      public static find(id: string): M | undefined {
        return this.instances.get(id);
      }
    }
  }
}

export function ManyToOne<T extends Model = { new(...args: any[]): {} }>(getModel : () => T, destinationCollectionName: string) {
  return function (target: Model, propertyKey: string) {
    const getter = function () {
      const model = getModel();

      // @ts-ignore
      const foreignKey = this[`${propertyKey}_id`];

      const result = (model as any).find(foreignKey);

      // @ts-ignore
      result[destinationCollectionName].add(this);

      return result;
    };

    if (delete (target as any)[propertyKey]) {
      Object.defineProperty(target, propertyKey, {
        get: getter,
        enumerable: true,
        configurable: true
      });
    }
  }
}

export function OneToMany<T extends typeof Model>(getModel: () => T) {
  return function (target: Model, propertyKey: string) {
    let value: Collection;

    const getter = function () {
      const model = getModel();
      for(let instance of (model as any).instances.values()) {
        // @ts-ignore
        if (instance.user_id === this.id) {
          value.add(instance);
        }
      }

      return value;
    };

    const setter = function (newValue: Collection) {
      value = newValue;
    };

    if (delete (target as any)[propertyKey]) {
      Object.defineProperty(target, propertyKey, {
        get: getter,
        set: setter,
        enumerable: true,
        configurable: true
      });
    }
  }
}
