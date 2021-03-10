import { Store, CommitOptions } from 'vuex';
import { StorageOptions, CommitData, Options } from './types';
import { set, get, del, clear, createStore, keys } from 'idb-keyval';
import dot from 'dot-object';
import merge from 'deepmerge';

const DEFAULT_DATABASE_NAME = 'vuex-async-persist';

const CREATE_DEFAULT_STORAGE = (): StorageOptions => {
  const idbStore = createStore(DEFAULT_DATABASE_NAME, DEFAULT_DATABASE_NAME);
  return {
    get: (key) => get(key, idbStore),
    set: (key, value) => set(key, value, idbStore),
    delete: (key) => del(key, idbStore),
    clear: () => clear(idbStore),
    keys: () => keys(idbStore),
  };
};

const CREATE_DEFAULT_OPTIONS = (): Options => ({
  idbDatabaseName: DEFAULT_DATABASE_NAME,
  idbStoreName: DEFAULT_DATABASE_NAME,
  storage: CREATE_DEFAULT_STORAGE(),
  localStoragePrefix: 'vuex-persist-localStorage',
  key: 'async-persist',
  mutationsToIgnore: [],
  updateInterval: 10,
  overwrite: true,
});

let pluginOptions: Options = CREATE_DEFAULT_OPTIONS();
let _onKeyChange: Function;

function _setOptions(options: Options, dynamic?: boolean, fetchFirst?: boolean) {
  if (dynamic && options.key) {
    if (pluginOptions.key !== options.key) {
      pluginOptions.key = options.key;
      _onKeyChange(fetchFirst);
    }
    if (options.onStateReplacement) {
      pluginOptions.onStateReplacement = options.onStateReplacement;
    }
  } else {
    Object.keys(options).forEach((key) => (pluginOptions[key] = options[key]));
  }
}

function localStorageKey(): string {
  return `${pluginOptions.localStoragePrefix}-${pluginOptions.key}`;
}

function createVuexAsyncPersist<State>(options?: Options): (store: Store<State>) => void {
  if (options) _setOptions(options);

  const localStorage: Storage = window.localStorage;
  const commitQueue: CommitData[] = [];
  const storeIsUpdating = [];
  let vuexStore: Store<State> = null;

  function mergeStates(state) {
    return merge(vuexStore.state, state, {
      arrayMerge: function (stored, saved) {
        return saved;
      },
    });
  }

  function replaceCurrentState(state) {
    if (pluginOptions.overwrite && Array.isArray(pluginOptions.paths)) {
      const copiedState = { ...vuexStore.state };
      pluginOptions.paths.forEach((path) => {
        if (state[path]) copiedState[path] = state[path];
      });
      state = copiedState;
    }
    vuexStore.replaceState(pluginOptions.overwrite ? state : mergeStates(state));
    if (typeof pluginOptions.onStateReplacement == 'function') pluginOptions.onStateReplacement();
  }

  function handleStoreUpdate(state: State) {
    const stateToPersist = Array.isArray(pluginOptions.paths)
      ? {
          ...pluginOptions.paths.reduce((acc, path) => {
            dot.copy(path, path, state, acc);
            return acc;
          }, {}),
        }
      : { ...state };

    // Notify other tabs, that there will be changes
    const lSKey = localStorageKey();
    localStorage.setItem(lSKey, 'false');
    pluginOptions.storage.set(pluginOptions.key, stateToPersist).finally(() => {
      //Notify other tabs that update finished
      localStorage.setItem(lSKey, 'true');
    });
  }

  function handleLocalStorageChange(event?: StorageEvent) {
    // Only to verify notification. True if update finished, false if updating
    const localStorageValue = localStorage.getItem(localStorageKey());
    if (
      !event ||
      (typeof localStorageValue !== undefined && event.key === localStorageKey() && vuexStore)
    ) {
      if (localStorageValue == 'true' || !event) {
        pluginOptions.storage
          .get(pluginOptions.key)
          .then((res: State) => {
            if (res !== undefined) replaceCurrentState(res);
            applyQueuedCommits();
          })
          .finally(() => {
            storeIsUpdating.pop();
          });
      } else storeIsUpdating.push(true);
    }
  }

  function addLocalStorageListener(callback): Function {
    window.addEventListener('storage', callback);
    const removeListener: Function = () => {
      window.removeEventListener('storage', callback);
    };
    window.addEventListener('beforeunload', () => {
      removeListener();
    });

    return removeListener;
  }

  function applyQueuedCommits() {
    if (vuexStore) {
      commitQueue.splice(0).forEach((ele) => {
        vuexStore.commit(ele);
      });
    }
  }

  return (store: Store<State>) => {
    const oldCommit = store.commit;
    vuexStore = store;

    // Fetch data initially
    handleLocalStorageChange();

    _onKeyChange = (fetchFirst) => {
      if (localStorage.getItem(localStorageKey()) === undefined || !fetchFirst)
        handleStoreUpdate(store.state);
      else handleLocalStorageChange();
    };

    addLocalStorageListener(handleLocalStorageChange);

    //overwrite old vuex's default commit
    store.commit = (type: string, payload?: any, options?: CommitOptions): void => {
      if (storeIsUpdating.length > 0) commitQueue.push({ type, payload, options });
      else return oldCommit(type, payload, options);
    };

    let timeout;
    store.subscribe((mutation, state) => {
      const ignoreMutation =
        pluginOptions.mutationsToIgnore.findIndex((val) =>
          mutation.type.toLowerCase().includes(val.toLowerCase())
        ) !== -1;

      if (!ignoreMutation) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          handleStoreUpdate(state);
        }, pluginOptions.updateInterval);
      }
    });
  };
}

export function setOptions(options: Options, fetchFirst?: boolean) {
  _setOptions(options, true, fetchFirst);
}

export function deleteStorageEntries(keysToPersist?: IDBValidKey[]) {
  return pluginOptions.storage.keys();
}

export function deleteStorageEntriesByKeys(keysToDelete: IDBValidKey[]): Promise<void[]> {
  return Promise.all(keysToDelete.map((key) => pluginOptions.storage.delete(key)));
}

export function clearStorage(): Promise<void> {
  return pluginOptions.storage.clear();
}

export default createVuexAsyncPersist;
