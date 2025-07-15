import type { Client } from './client';
import type { SyncClient } from './sync-client';
import type { Database } from './database';

export class BatchModelLoader {
  client: Client;
  syncClient: SyncClient | undefined;
  database: Database | undefined;

  constructor(client: Client) {
    this.client = client;
  }

  setSyncClient(syncClient: SyncClient, database: Database) {
    this.syncClient = syncClient;
    this.database = database;
  }
}
