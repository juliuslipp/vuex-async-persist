import { Store, CommitOptions } from 'vuex';
import { StorageOption, CommitData, Options } from './types';
import { set, get, del, clear, Store as IdbStore } from 'idb-keyval';
import dot from 'dot-object';
import merge from 'deepmerge';

const DEFAULT_DATABASE_NAME = 'vuex-async-persist';

const CREATE_DEFAULT_STORAGE = (): StorageOption => {
  const idbStore = new IdbStore(DEFAULT_DATABASE_NAME, DEFAULT_DATABASE_NAME);
  return {
    get: (key) => get(key, idbStore),
    set: (key, value) => set(key, value, idbStore),
    delete: (key) => del(key, idbStore),
    clear: (key) => clear(idbStore),
  };
};

const CREATE_DEFAULT_OPTIONS = (): Options => ({
  idbDatabaseName: DEFAULT_DATABASE_NAME,
  idbStoreName: DEFAULT_DATABASE_NAME,
  storage: CREATE_DEFAULT_STORAGE(),
  localStorageKey: 'vuex-persist-localStorage',
  key: 'async-persist',
  mutationsToIgnore: [],
  updateInterval: 50,
  overwriteOnKeyChange: true,
});

let pluginOptions: Options = CREATE_DEFAULT_OPTIONS();
let onKeyChange: Function;

function _setOptions(options: Options, dynamic?: boolean) {
  if (dynamic && options.key) {
    pluginOptions.key = options.key;
    if (typeof onKeyChange === 'function') onKeyChange();
  } else {
    Object.keys(options).forEach((key) => (pluginOptions[key] = options[key]));
  }
}

function createVuexAsyncPersist<State>(options?: Options): (store: Store<State>) => void {
  if (options) _setOptions(options);

  const localStorage: Storage = window.localStorage;
  const commitQueue: CommitData[] = [];
  const storeIsUpdating = [];
  let vuexStore: Store<State> = null;

  function mergeStates(state) {
    return merge(vuexStore.state, state, {
      arrayMerge:
        pluginOptions.arrayMerge ||
        function (stored, saved) {
          return saved;
        },
    });
  }

  function localStorageKey(): string {
    return `${pluginOptions.localStorageKey}-${pluginOptions.key}`;
  }

  function replaceCurrentState(state) {
    vuexStore.replaceState(pluginOptions.overwrite ? state : mergeStates(state));
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

    onKeyChange = () => {
      if (
        localStorage.getItem(localStorageKey()) === undefined ||
        pluginOptions.overwriteOnKeyChange
      )
        handleStoreUpdate(store.state);
      else handleLocalStorageChange();
    };

    addLocalStorageListener(handleLocalStorageChange);

    //overwrite old vuex's default commit
    store.commit = (type: string, payload?: any, options?: CommitOptions): void => {
      if (storeIsUpdating.length > 0) commitQueue.push({ type, payload, options });
      else return oldCommit(type, payload, options);
    };

    let timeout: number;
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

export function setOptions(options: Options) {
  _setOptions(options, true);
}

export default createVuexAsyncPersist;
