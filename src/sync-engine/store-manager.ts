import { ModelRegistry, LoadStrategy } from './model-registry';

export interface Store {
  findById(ModelClass: { new(...args: any[]): {} }, id: string ): Store;
}

class FullStore implements Store {

  constructor({ required }: { required: boolean}) {
  }
  // todo: fix me
  findById(ModelClass: { new(...args: any[]): {}; }) {
    return new FullStore({ required: false });
  }
}

export class StoreManager {
  objectStoreLookup: Record<string, Store>

  readyStores: Store[] = [];

  objectStores: Store[];

  constructor(
    graphQLClient: any,
    // todo: fix the type
    applicationStore: { requiredModels: { new(...args: any[]): {} }[] }
  ) {
    this.objectStoreLookup = {};
    this.objectStores = [];

    const requiredModelClassNames = applicationStore.requiredModels.map(model => ModelRegistry.getClassName(model));

    for (const modelName of ModelRegistry.getModelNames()) {
       const store = new FullStore({ required: requiredModelClassNames.includes(modelName) });

       this.objectStoreLookup[modelName] = store;
       this.objectStores.push(store);
    }
  }

  objectStore(modelName: string) {
    return this.objectStoreLookup[modelName]
  }

  createStores(IDBDatabaseProxy: any, IDBTransactionProxy: any) {
    // const
  }
}
