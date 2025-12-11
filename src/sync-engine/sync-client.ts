import type { SyncedStore } from './synced-store';
import type { Client } from './client';
import type { Options } from './database';
import { Database } from './database';
import type { BatchModelLoader } from './batch-model-loader';
import { ModelRegistry } from './model-registry';
import type { Model } from './model';
import { ModelLookup } from './model-lookup';
import { TransactionQueue } from './transaction-queue';
import type { BaseTransaction } from './transaction';
export class SyncClient {
  // bootstrap() {
  //   const bootstrapType = this.database.requiredBootstrap();
  // }

  store: SyncedStore;
  database: Database;
  graphQLClient: any;
  socket: any;

  modelClassToModelLookup: Record<string, Set<Model>> = {};

  batchModelLoader: BatchModelLoader;
  modelLookup: ModelLookup; // Maps a model's id to the object! It is the "ObjectPool".
  transactionQueue: TransactionQueue;

  constructor(store: SyncedStore, client: Client, socket: any, options: Options) {
    this.store = store;
    this.database = new Database(client, options);
    this.socket = socket;
    this.batchModelLoader = options.batchModelLoader;
    // Stores models grouped by their model name, e.g. { User: new Map([[id1, user1], [id2, user2]]) }
    this.modelLookup = new ModelLookup();

    this.transactionQueue = new TransactionQueue(this.graphQLClient, this);

    for(const modelName of ModelRegistry.getModelNames()) {
      this.modelClassToModelLookup[modelName] = new Set();
    }
    this.batchModelLoader.setSyncClient(this, this.database);
  }

  // TODO: implement this
  async initializeDatabase({ userId, modelSchemaHash }: { userId: string, modelSchemaHash: string }) {
    await this.database.open({ userId, modelSchemaHash });
  }

  // TODO: implement this
  async bootstrap() {
    // await this.database.bootstrap();
    let bootstrapInfo = this.database.requiredBootstrap()

    for(const modelName of bootstrapInfo.modelsToLoad) {
      this.database.put('_meta', { persisted: false }, modelName)
    }
    // ... there is more to do here
  }

  addModel(modelObject: Model): boolean{
    // console.log(modelObject);
    if(this.modelLookup.has(modelObject.modelClass.modelName, modelObject.id)) {
      return false;
    }

    this.modelLookup.add(modelObject);
    return true;
  }

  findById(modelClass: ModelClassType, id: string, options?: unknown) {
    const modelName = modelClass.modelName;

    if(!modelName) {
      throw new Error(`Model name is undefined in findById, { id: ${id} }`);
    };

    const modelObject = this.modelLookup.get(modelName, id);

    // TODO: should observe property changes

    return modelObject;
  }

  update(model: Model, options: unknown = {}) {
    // TODO: implement this
  }

  add(model: Model, options: unknown = {}) {
    // TODO: implement this
    if(this.findById(model.modelClass, model.id)) {
      throw new Error(`Model ${model.id} already exists and cannot be added`);
    }

    model.createdAt = new Date();
    const transaction = this.transactionQueue.create(model, options);
  }

  delete(model: Model) {
    // TODO: implement this
  }

  cancelTransaction(transaction: BaseTransaction) {
    // transaction.cancel();
  }

  deleteModelAndDependencies(model: Model) {
    // TODO: implement this
  }
}

type ModelClassType = new (...args: any[]) => Model;
