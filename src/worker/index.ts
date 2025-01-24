import * as sqlite3 from 'better-sqlite3'
import {SqliteMessage, SqliteMessageType} from '../types'
import {parentPort} from 'worker_threads'


let db: sqlite3.Database
let preparedMap: Map<number, sqlite3.Statement> = new Map()


function handleMessage({id, type, data}: SqliteMessage) {
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

		case SqliteMessageType.Prepare:
			preparedMap.set(id, db.prepare(data.sql))
			break

		case SqliteMessageType.PrepareAll:
			var prepared = preparedMap.get(data.id)
			if (prepared) {
				result = prepared.all(...data.params)
			}
			break

		case SqliteMessageType.PrepareGet:
			var prepared = preparedMap.get(data.id)
			if (prepared) {
				result = prepared.get(...data.params)
			}
			break

		case SqliteMessageType.PrepareRun:
			var prepared = preparedMap.get(data.id)
			if (prepared) {
				result = prepared.run(...data.params)
			}
			break

		case SqliteMessageType.PrepareRunMulti:
			var prepared = preparedMap.get(data.id)
			if (prepared) {
				let runMulti = db.transaction((multiParams) => {
					for (const params of multiParams) {
						prepared!.run(params)
					}
				})

				runMulti(data.multiParams)
			}
			break

		case SqliteMessageType.PrepareDelete:
			preparedMap.delete(data.id)
			break

		case SqliteMessageType.Exec:
			db.exec(data.sql)
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

