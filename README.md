# vuex-async-persist

Persist [Vuex](https://github.com/vuejs/vuex) state between page reloads. Uses IndexDB to store the state and localStorage to notify other tabs. Can be used for large vuex stores.

## Installation

```bash
npm install --save vuex-async-persist
```

## Usage

```js
import Vuex from 'vuex';
import createVuexAsyncPersist from 'vuex-persistedstate';

const store = new Vuex.Store({
  plugins: [
    createVuexAsyncPersist({
      // options...
    }),
  ],
  //...
});
```

## API

### `createVuexAsyncPersist(options)`

Creates new plugin with given options.
Allowed options are:

- `key <string>`: The key to store the state in the database. Also defines the scope of the persistance. Can be changed later on (See [setOptions](#setOptions(options))). Default value: `'async-persist'`
- `paths <Array>`: Array of paths that should be persisted (can be with dot notation).
- `mutationsToIgnore <Array>`; Array of (part of) mutations that should not trigger an persisted state update.
- `overwrite <Boolean>`: Overwrite or merge updated State. Default value: `true`
- `updateInterval <Number>`: How fast/often the Store should be updated. Especially useful for large stores, to keep up performance. Defaults value: `10`.
- `idbStoreName <String>`: Name of table in IndexDB. Default value: `vuex-async-persist`
- `idbDatabaseName <String>`: Name of database in IndexDB.Default value: `vuex-async-persist`
- `localStoragePrefix <String>`: Prefix of the key used in localStorage. The actual localStorage key is part `localStoragPrefix` and part `key`. Default value: `vuex-persist-localStorage`
- `onStateReplacement <Function>`: Function which will be triggered, when the state is updated from IndexDB.


### `setOptions(options)`

Dynamically sets options of the plugin.
Currently only `key` and `onStateReplacement` are supported.
## License

MIT © Julius Lipp
