import { LoadStrategy, ModelRegistry } from './model-registry';
import { StoreManager } from './store-manager';

export type Options = {
  batchModelLoader: any;
  requiredModels: any[]
}

type OpenOptions = {
  userId: string;
  modelSchemaHash: string;
}

class DatabaseManager {
  // Get databaseInfo for the current workspace
  static async databaseInfo(options: any) {
    const { userId, modelSchemaHash, minVersion } = options;
    return {
      // The database's name. It is derived from the userId, version, and userVersion. As a result, different user identities lead to multiple databases.
      name: 'main-database',
      // schemaHash: Used for database migration. This corresponds to the _schemaHash property in ModelRegistry
      schemaHash: 'xxxx',
      // An incremental counter that determines if a database migration is necessary. If the new schemaHash differs from the one stored in IndexedDB, the counter increments. The updated version is then passed as the second parameter to IndexedDB.open to check if migration is needed.
      schemaVersion: 1
    };
  }
}

const idbDatabases = new WeakMap();

function makePromise(idbRequest: IDBRequest) {
  const promise = new Promise((resolve, reject) => {
    const handleSuccess = () => {
      resolve(idbRequest.result)
    }

    const handleError = () => {
      reject(idbRequest.error)
    }

    idbRequest.addEventListener('success', handleSuccess)
    idbRequest.addEventListener('error', handleError)
  })

  return promise.then((result: any) => {
    result instanceof IDBCursor && idbDatabases.set(result, result)
    return result;
  })
}

function resolveRequest(idbRequest: IDBRequest | IDBDatabase) {
  if(idbRequest instanceof IDBRequest) {
    return makePromise(idbRequest)
  }
  if(idbDatabases.has(idbRequest)) {
    idbDatabases.get(idbDatabases)
  }

}

function openDatabase(
  id: string,
  version: number,
  { blocked, upgrade, blocking, terminated }: any) {
  const db = indexedDB.open(id, version);
  const result = resolveRequest(db);
  if (upgrade) {
    db.addEventListener('upgradeneeded', (e) => {
      upgrade(resolveRequest(db.result), e.oldVersion, e.newVersion, db.transaction)
    })
  }

  if(blocked) {
    db.addEventListener(`blocked`, (e: any) => blocked(e.oldVersion, e.newVersion, e));
  }

  result?.then((event: any) => {
      if(terminated) {
        event.addEventListener(`close`, () => terminated());
      }
      if(blocking) {
        event.addEventListener(`versionchange`, (e: any) => blocking(e.oldVersion, e.newVersion, e))
      }
  }).catch(e => {
    console.log(e);
  })

  return result;
}

export class Database {
  _storeManager: StoreManager | undefined;

  name: string | undefined;

  database: any;
  options: Options;
  graphQLClient: any

  get storeManager() {
    if (!this._storeManager) {
      this._storeManager = new StoreManager({}, { requiredModels: [] });
    }
    return this._storeManager;
  }

  // identifies the appropriate bootstrapping type and supplies the necessary parameters for its execution
  requiredBootstrap() {
    const modelsToLoadFromLocalDatabase = ModelRegistry.getModelNamesByLoadStrategy(LoadStrategy.instant);
    const modelsWithReadyStore = new Set(this.storeManager.readyStores.map((store: any) => store.modelName));

    const modelsToLoad = modelsToLoadFromLocalDatabase.filter(modelName => !modelsWithReadyStore.has(modelName));

    // no models have loaded into local database
    return modelsWithReadyStore.size === 0? {
      type: 'full' as const,
      modelsToLoad,
    } :
    // all models have loaded into local database
    modelsToLoad.length === 0 ? {
      type: 'local' as const,
      modelsToLoad,
    } :
    // some models have loaded into local database
    {
      type: 'partial' as const,
      modelsToLoad,
    }
  }

  // todo: figure out what is that something
  constructor(graphQLClient: any, options: Options) {
    this.graphQLClient = graphQLClient;
    this.options = options
  }


  async open(openOptions: OpenOptions) {
    try {
      const databaseInfo = await DatabaseManager.databaseInfo({});
      this.name = databaseInfo.name;
      this.database = await openDatabase(this.name, databaseInfo.schemaVersion, {
        upgrade: (databaseProxy: any, oldVersion, newVersion, transaction: IDBTransaction) => {
          this.storeManager.createStores(databaseProxy, transaction)
        }
      })
    } catch (err: any) {
      console.log(err);
    }
  }

  put(table: string, data: any, id: string) {
    // todo: implement this
    this.database.put(table, data, id)
  }

  add(table: string, data: any) {
    // todo: implement this
  }
}
