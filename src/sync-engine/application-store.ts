import { ApplicationSyncedStore } from './application-synced-store';
import { Model } from './model';
import type { Client } from './client';

const getApplicationStore = () => {
  return ApplicationStore.instance.store;
}

export class ApplicationStore {
  currentUserId: string | null = null;
  clientInstance: Client | null = null;

  static privateInstance: ApplicationStore | undefined;

  static get instance() {
    if (!ApplicationStore.privateInstance) {
      ApplicationStore.privateInstance = new ApplicationStore();
    }

    return ApplicationStore.privateInstance;
  }

  store!: ApplicationSyncedStore;

  constructor() {
    this.currentUserId = null;
    this.clientInstance = null;

    // TODO: initialize clientInstance

    this.store = new ApplicationSyncedStore(this.clientInstance!, this);

    // Initialize from persisted data
    const isLoggedIn = this.tryLogin();
    if(!isLoggedIn) {
      this.refreshState();
    }
  }

  async refreshState() {
    const userId = 'xxxx-xxxx-xxxx-xxxx';
    this.currentUserId = userId;
    this.persistData();
  }

  tryLogin() {
    const persistedData = this.loadPersistedData();

    if (!persistedData) {
      return false;
    }

    this.currentUserId = persistedData.currentUserId;
    this.login(persistedData.currentUserId);

    return true;
  }

  async login(userId: string) {
    this.currentUserId = userId;

    // some login logic

    this.store.login({
      userId,
    });

    return true;
  }

  async logout() {
    this.currentUserId = null;
    this.clearPersistedData();
  }

  persistData() {
    const data = {
      currentUserId: this.currentUserId,
    };

    try {
      localStorage.setItem('app_store', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist application data:', error);
    }
  }

  loadPersistedData() {
    try {
      const data = localStorage.getItem('app_store');
      if (data) {
        const parsed = JSON.parse(data);

        return parsed as { currentUserId: string };
      }
    } catch (error) {
      console.error('Failed to load persisted data:', error);
      this.clearPersistedData();
    }
  }

  clearPersistedData() {
    try {
      localStorage.removeItem('app_store');
    } catch (error) {
      console.error('Failed to clear persisted data:', error);
    }
  }
}

Model.store = getApplicationStore();
