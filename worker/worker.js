const sqlite3 = require('better-sqlite3')
const {SqliteMessage, SqliteMessageType} = require('../out/types')


const useWebWorker = typeof onmessage !== 'undefined'
const parentPort = useWebWorker ? null : require('worker_threads').parentPort
let db


function handleMessage({id, type, data}) {
	let result = null

	switch (type) {
		case SqliteMessageType.Open:
			db = sqlite3(data.filename, data.options)
			break

		case SqliteMessageType.Pragma:
			result = db.pragma(data.pragma, data.options)
			break

		case SqliteMessageType.All:
			result = db.prepare(data.sql).all(...data.params)
			break

		case SqliteMessageType.Get:
			result = db.prepare(data.sql).get(...data.params)
			break

		case SqliteMessageType.Run:
			result = db.prepare(data.sql).run(...data.params)
			break

		case SqliteMessageType.Exec:
			db.exec(data)
			break

		case SqliteMessageType.Close:
			db.close()
			break
	}

	if (parentPort) {
		parentPort?.postMessage({id, data: result})
	}
	else {
		postMessage({id, data: result})
	}
}

if (parentPort) {
	parentPort.on('message', handleMessage)
}
else {
	onmessage = (event) => handleMessage(event.data)
}

