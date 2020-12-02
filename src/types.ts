import { CommitOptions } from 'vuex';

export interface StorageOption {
  get: <Type>(key: string) => Promise<Type>;
  set: (key: string, value: any) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: (key: string) => Promise<void>;
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
  storage?: StorageOption;
  idbStoreName?: string;
  idbDatabaseName?: string;
  mutationsToIgnore?: string[];
  updateInterval?: number;
  overwrite?: boolean;
  onStateReplacement?: Function;
}
