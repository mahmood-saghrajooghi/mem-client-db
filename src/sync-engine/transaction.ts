import type { Database } from './database';
import type { Model } from './model';
import type { SyncClient } from './sync-client';

export class BaseTransaction {
  declare type: string;
  declare model: Model;
  declare batchIndex: number;
  declare syncClient: SyncClient;
  declare graphQLClient: undefined;
  declare completionPromise: Promise<void>;
  declare resolve: (value: void | PromiseLike<void>) => void;
  declare reject: (reason?: any) => void;
  declare graphQLMutationPrepared: string;

  graphQLMutation(set: Set<any>): string {
    return 'soem mutation';
  }
  declare id: number;
  static nextId = 0;
  rollback(): void {}

  constructor(type: string, model: Model, batchIndex: number, syncClient: SyncClient, graphQLClient: undefined) {
    this.id = BaseTransaction.nextId++;
    this.type = type;
    this.model = model;
    this.batchIndex = batchIndex;
    this.syncClient = syncClient;
    this.graphQLClient = graphQLClient;
    this.completionPromise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  cancel() {
    this.syncClient.cancelTransaction(this);
    this.rollback();
  }

  prepare(set: Set<any>) {
    const graphQLMutation = this.graphQLMutation(set);
    if(!graphQLMutation) {
      return;
    }
    this.graphQLMutationPrepared = graphQLMutation
    return this;
  }


  async result() {
    return this.completionPromise;
  }
}

export class CreationTransaction extends BaseTransaction {
  constructor(model: Model, batchIndex: number, syncClient: SyncClient, graphQLClient: undefined) {
    super("create", model, batchIndex, syncClient, graphQLClient);
    const modelAdded = this.syncClient.addModel(model)
    if(modelAdded) {
      model.attachToReferencedProperties();
    }
    model.clearSnapshot();
  }

  rollback() {
    this.syncClient.deleteModelAndDependencies(this.model);
  }

  undoTransaction(): void {
    this.syncClient.delete(this.model);
  }

  serialize(): string {
    return JSON.stringify({
      id: this.id,
      type: this.type,
      model: this.model.serialize(),
      modelType: this.model.modelName,
      batchIndex: this.batchIndex,
    });
  }

  writeLocalTransactionToDatabase(database: Database) {
    database.add(this.model.modelName, this.model.serialize());
  }
}
