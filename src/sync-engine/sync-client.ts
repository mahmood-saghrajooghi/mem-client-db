import type { SyncedStore } from './synced-store';
import type { Client } from './client';
import type { Options } from './database';
import { Database } from './database';
import type { BatchModelLoader } from './batch-model-loader';
import { ModelRegistry } from './model-registry';
import type { Model } from './model';

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

  constructor(store: SyncedStore, client: Client, socket: any, options: Options) {
    this.store = store;
    this.database = new Database(client, options);
    this.socket = socket;
    this.batchModelLoader = options.batchModelLoader;

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
}
