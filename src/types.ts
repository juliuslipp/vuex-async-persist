import { Store, CommitOptions } from 'vuex';

export interface StorageOptions {
  get: <Type>(key: IDBValidKey) => Promise<Type>;
  set: (key: IDBValidKey, value: any) => Promise<void>;
  delete: (key: IDBValidKey) => Promise<void>;
  clear: () => Promise<void>;
  keys: () => Promise<IDBValidKey[]>;
}
export interface CommitData {
  payload?: any;
  type: string;
  options?: CommitOptions;
}

export interface Options {
  key?: string; // Key used to store in Database
  localStoragePrefix?: string;
  paths?: string[];
  storage?: StorageOptions;
  idbStoreName?: string;
  idbDatabaseName?: string;
  mutationsToIgnore?: string[];
  updateInterval?: number;
  overwrite?: boolean;
  onStateReplacement?: Function;
}

export declare function setOptions(options: Options, fetchFirst: Boolean): void;

export declare function createVuexAsyncPersist<State>(
  options?: Options
): (store: Store<State>) => void;

export declare function clearStorage(): void;

export declare function deleteStorageEntries(keysToPersist: IDBValidKey[]): Promise<void[]>;

export declare function deleteStorageEntriesByKeys(keysToDelete: IDBValidKey[]): Promise<void[]>;
