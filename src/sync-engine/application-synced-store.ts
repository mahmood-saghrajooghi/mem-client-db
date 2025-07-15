import type { Client } from './client';
import { SyncedStore, SyncProgress } from './synced-store';
import { Task } from './models/task';
import { User } from './models/user';
import { BatchModelLoader } from './batch-model-loader';
import type { ApplicationStore } from './application-store';

export class ApplicationSyncedStore extends SyncedStore {
  applicationStore: ApplicationStore;

  userId: string | null = null;

  constructor(client: Client, applicationStore: ApplicationStore) {
    const batchModelLoader = new BatchModelLoader(client);
    super(client, {
      requiredModels: [Task, User],
      batchModelLoader,
    });

    this.applicationStore = applicationStore;
  }

  login({ userId }: { userId: string }) {
    this.userId = userId;

    this.startBootstrap();
  }

  async startBootstrap() {
    if(!this.userId) {
      throw new Error('User ID is not set');
    }

    this.setSyncProgress(SyncProgress.initial);
    this.setSyncError(null);

    const result = await this.bootstrap({
      userId: this.userId,
    });
  }
}
