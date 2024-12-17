# Worker Sqlite3

Provides a worker wrapper for `better-sqlite3`, and also provides convenient APIs like `run`, `all`, `get` for default synchronous mode sqlite class.

Works both in electron and node environment.



## For electron usage?

You should rebuild `better-sqlite3` by running `electron-rebuild --version [version] -f -w better-sqlite3`.

Don't forget to set `nodeIntegrationInWorker: true` in `webPreferences`.



## License

MIT