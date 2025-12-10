import type { Client } from './client';
import type { Options } from './database';
import { SyncClient } from './sync-client';
import { UndoQueue } from './undo-queue';
import type { BatchModelLoader } from './batch-model-loader';


export const SyncProgress = {
  none: 0,
  initial: 1,
} as const;

type SyncProgress = typeof SyncProgress[keyof typeof SyncProgress];

export class SyncedStore {
  syncProgress: SyncProgress;
  syncError: string | null;
  connectionError: string | null;
  client: Client;
  options: Options;
  socket: any;
  undoQueue: UndoQueue;

  syncClient: SyncClient;

  batchModelLoader: BatchModelLoader;

  setSyncProgress(syncProgress: SyncProgress) {
    this.syncProgress = syncProgress
  }

  setSyncError(syncError: string | null) {
    this.syncError = syncError;
  }

  setConnectionError(connectionError: string) {
    this.connectionError = connectionError;
  }

  constructor(client: Client, options: Options) {
    this.syncProgress = SyncProgress.none;
    this.syncError = null;
    this.connectionError = null;
    this.client = client;
    this.options = options;
    // FIXME
    this.socket = null;
    this.undoQueue = new UndoQueue();
    this.syncClient = new SyncClient(this, this.client, this.socket, this.options);
    this.undoQueue = [];
    this.batchModelLoader = options.batchModelLoader;
  }

  async bootstrap({ userId } : {userId: string}) {
    await this.syncClient.initializeDatabase({ userId, modelSchemaHash: 'xxxx' })
    await this.syncClient.bootstrap();
  }

  findById(modelConstructor: { new(...args: any[]): {} }, id: string) {
    return this.syncClient.findById(modelConstructor, id);
  }
}
