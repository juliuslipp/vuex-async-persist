import { Store, CommitOptions, Commit, MutationPayload } from "vuex";
import {set, get, del, clear, Store as IdbStore} from 'idb-keyval'

interface StorageOption {
    get: <Type>(key: string) => Promise<Type>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: (key: string) => Promise<void>;
}

interface Test {
    string,
    number,
    StorageOption,
}

interface Options {
    key?: string;
    localStorageKey?: string;
    paths?: string[];
    storage?: StorageOption;
    idbStoreName?: string;
    idbDatabaseName?: string;
    mutationsToIgnore?: string[];
    updateInterval?: number;
}


function createVuexAsyncPersist<State>(
    options?: Options
  ): (store: Store<State>) => void {
    options = options || {};

    let storage: StorageOption;

    if (options.storage) storage = options.storage;
    else {
        const idbStoreName: string = options.idbStoreName || 'vuex-async-persist';
        const idbDatabaseName: string = options.idbDatabaseName || 'vuex-async-persist';
        const idbStore = new IdbStore(idbStoreName, idbDatabaseName);

        storage = {
            get: (key) => get(key, idbStore),
            set: (key, value) => set(key, value, idbStore),
            delete: (key) => del(key, idbStore),
            clear: (key) => clear(idbStore)
        }
    }
    
    // consistant 
    const localStorageKey: string = options.localStorageKey || 'vuex-localStorage';
    //will be changeable
    const key: string = options.key || 'async-persist';
    
    const mutationsToIgnore = options.mutationsToIgnore || [];
    const localStorage: Storage = window.localStorage;



    function handleStoreUpdate() {
        //handleSet
        localStorage.setItem(`${localStorageKey}-${key}`, new Date().getTime().toString());
    }

    function handleLocalStorageUpdate(event) {
        localStorage.getItem(`${localStorageKey}-${key}`);
        if (event.key === `${localStorageKey}-${key}`) {
            console.log("update!!!");
        }
    }

    function addLocalStorageListener(callback): Function {
        window.addEventListener('storage', callback)
        window.addEventListener('beforeunload', () => {
          window.removeEventListener('storage', callback);
        });

        return () => {
            window.removeEventListener('storage', callback);
        }
    }

    return (store: Store<State>) => {
        const oldCommit = store.commit;

        //overwrite old vuex's default commit
        store.commit =  (type: string, payload?: any, options?: CommitOptions): void => {
            return oldCommit(type, payload, options)
        }

        addLocalStorageListener(handleLocalStorageUpdate);

        let timeout: number;
        store.subscribe((mutation, state)=> {
            if (mutationsToIgnore.every((val) => mutation.type.indexOf(val) === -1)) {
                clearTimeout(timeout)
                timeout = setTimeout(handleStoreUpdate, options.updateInterval || 100)
            }
        });
    };
}

export default createVuexAsyncPersist;
  