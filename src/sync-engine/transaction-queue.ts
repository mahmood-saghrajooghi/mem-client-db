import type { Model } from './model';
import type { SyncClient } from './sync-client';
import { BaseTransaction, CreationTransaction } from './transaction';

export class TransactionQueue {

  declare batchIndex: number;
  declare syncClient: SyncClient;
  declare graphQLClient: any;
  declare createdTransactions: BaseTransaction[];
  declare queuedTransactions: BaseTransaction[];
  declare executingTransactions: BaseTransaction[];
  declare completedButUnsyncedTransactions: BaseTransaction[];

  constructor(graphQLClient: any, syncClient: SyncClient) {
    this.createdTransactions = [];
    this.queuedTransactions = [];
    this.executingTransactions = [];
    this.completedButUnsyncedTransactions = [];
    this.batchIndex = 0;
    this.syncClient = syncClient;
    this.graphQLClient = graphQLClient;
  }

  create(model: Model, options: unknown = {}) {
   const transaction = new CreationTransaction(model, this.batchIndex, this.syncClient, this.graphQLClient);
   this.enqueueTransaction(transaction);
   return transaction;
  }

  async enqueueTransaction(transaction: BaseTransaction): Promise<void> {
    this.createdTransactions.push(transaction);
    // NOTE: in the original implementation, this part is a microtask scheduler, so transactions generated synchronously will be in the same batch.

    this.batchIndex++;
    const transactions = this.createdTransactions.concat();
    this.createdTransactions = [];
    // await this.syncClient.database.putTransactions(transactions);
    this.queuedTransactions.push(...transactions);
    // this.outstandingTransactionCountChanged();
    this.dequeueNextTransactions();
  }

  dequeueNextTransactions(): void {
    const batchIndex = this.queuedTransactions[0]?.batchIndex;
    const set = new Set();
    const transactions = [];

    // In the original implementation, this is a microtask scheduler, so transactions generated synchronously will be in the same batch.
    if(this.queuedTransactions.length > 0) {
      const transaction = this.queuedTransactions[0];

      if(!transaction) {
        return
      }

      let result;

      try {
        result = transaction.prepare(set);
      } catch (error) {
        console.error('Error preparing transaction', error);
      }

      if(!result) {
        // transaction.transactionCompleted(error);
        // this.database.deleteTransaction(transaction.id);
        this.queuedTransactions.shift();
        return;
      }

      // Do some graphQL mutation stuff
      this.queuedTransactions.shift();
      transactions.push(result);
    }

    if(transactions.length === 0) {
      // maybe dequeue next transactions
      return;
    }

    this.executeTransactionBatch(transactions);
    this.dequeueNextTransactions();
  }

  executeTransactionBatch(transactions: BaseTransaction[]): void {
    // TODO: implement this
  }
}
