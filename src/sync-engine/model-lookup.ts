import type { Model } from './model';

export class ModelLookup {
  modelTypeToIdMap: Record<string, Map<string, Model>> = {};

  constructor() {
    this.modelTypeToIdMap = {};
  }

  add(modelObject: Model): void {
    if(!modelObject.modelName) {
      throw new Error('Model object must have a model name');
    }

    if(modelObject.id) {
      throw new Error('Model object must have an id');
    }

    this.getOrCreateMapForType(modelObject.modelName).set(modelObject.id, modelObject);
  }

  has(modelName: string, id: string): boolean {
    return (this.getOrCreateMapForType(modelName).has(id) ?? false);
  }

  get(modelName: string, id: string): Model | undefined {
    return this.getOrCreateMapForType(modelName).get(id);
  }

  getOrCreateMapForType(modelName: string) : Map<string, Model> {
    if(!this.modelTypeToIdMap[modelName]) {
      this.modelTypeToIdMap[modelName] = new Map();
    }

    return this.modelTypeToIdMap[modelName];
  }
}
