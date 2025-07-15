import { makePropertyObservable, PropertyType } from './model-property';
import type { ModelProperty } from './model-property';

type ModelClassType = any;

type ModelName = string;

export const LoadStrategy = {
  instant: 'instant',
} as const;

type LoadStrategy = typeof LoadStrategy[keyof typeof LoadStrategy];

/**
 * Registry for client models and their properties
 */
export class ModelRegistry {
  private static modelLookup: Record<ModelName, ModelClassType> = {};

  public static registerModel<T extends ModelClassType>(name: ModelName, constructor: T) {
    if (this.modelLookup[name]) {
      throw new Error(`Model ${name} already registered`);
    }

    this.modelLookup[name] = constructor;
  }

  public static getModelClass(name: ModelName): ModelClassType | undefined {
    return this.modelLookup[name];
  }

  public static getClassName(model: ModelClassType) {
    return model.prototype.modelName
  }

  public static getModelNames() {
    return Object.keys(this.modelLookup);
  }

  static getModelNamesByLoadStrategy(loadStrategy: LoadStrategy) {
    return Object.keys(this.modelLookup).filter(modelName => this.modelLookup[modelName].loadStrategy === loadStrategy)
  }


  // Model properties
  private static modelPropertyLookup: Record<ModelName, Record<string, ModelProperty>> = {};

  public static registerProperty(propertyName: string, modelName: ModelName, config: { type: PropertyType; }) {
    const properties = this.modelPropertyLookup[modelName] || {};

    properties[propertyName] = { type: config.type };

    this.modelPropertyLookup[modelName] = properties;
  }

  public static propertiesOfModel(modelName: ModelName): Record<string, ModelProperty> | undefined {
    return this.modelPropertyLookup[modelName];
  }

}



/**
 * @description Decorator to register a model class with the model registry
*/
export function ClientModel(name: string) {
  return function (constructor: ModelClassType) {
    if (name !== constructor.name) {
      throw new Error(`Model name passed ot the ClientModel decorator must match the class name`);
    }

    constructor.prototype.modelName = name;

    if (ModelRegistry.getModelClass(name)) {
      throw new Error(`Model ${name} already registered`);
    }

    let hash = `${name}`;
    const properties = ModelRegistry.propertiesOfModel(name);

    if (properties) {
      for (const key in properties) {
        hash += `_${key}`;
      }
    }

    ModelRegistry.registerModel(hash, constructor);
  }
}

export function Property() {
  return function <T extends { constructor: { name: string } }>(target: T, propertyKey: string) {
    makePropertyObservable(target, propertyKey);
    ModelRegistry.registerProperty(propertyKey, target.constructor.name, { type: PropertyType.Property })
  }
}
