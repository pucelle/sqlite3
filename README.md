# Worker Sqlite

Have a worker wrapper for better-sqlite3, and also provide convenient APIs like `run`, `all`, `get`.

Works both in electron and node environment.



## For electron usage?

For electron usage, you should rebuild `better-sqlite3` by running `electron-rebuild --version [version] -f -w better-sqlite3`.

Don't forget to set `nodeIntegrationInWorker: true` in browser `webPreferences`.



## License

MIT