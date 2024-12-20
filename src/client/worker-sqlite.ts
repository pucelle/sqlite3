import {Options, PragmaOptions} from 'better-sqlite3'
import {SqliteMessage, SqliteMessageType, SqliteResult} from '../types'
import type {Worker as NodeWorker} from 'worker_threads'

// Reference to: https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md


const WebOrNodeWorker = typeof Worker !== 'undefined' ? Worker : require('worker_threads').Worker


export class WorkerSqlite {

	private worker: Worker | NodeWorker
	private seed: number = 0
	private enqueuedMessages: SqliteMessage[] = []
	private workerOnline: boolean = false
	private resolves: Map<number, {resolve: (result: any) => void, reject: (reason: any) => void}> = new Map()

	/**
	 * Creates a new database connection.
	 * If the database file does not exist, it is created.
	 * This happens synchronously, which means you can start executing queries right away.
	 * You can create an in-memory database by passing ":memory:" as the first argument.
     *
	 * Various options are accepted:
	 *  - options.readonly: open the database connection in readonly mode (default: false).
	 *  - options.fileMustExist: if the database does not exist, an Error will be thrown instead of creating a new file. This option does not affect in-memory or readonly database connections (default: false).
	 *  - options.timeout: the number of milliseconds to wait when executing queries on a locked database, before throwing a SQLITE_BUSY error (default: 5000).
	 *  - options.verbose: provide a function that gets called with every SQL string executed by the database connection (default: null).
	 */
	constructor(filename: string, options: Options = {}) {
		this.worker = new WebOrNodeWorker(__dirname + '/../worker/index.js')
		this.queue(SqliteMessageType.Open, {filename, options})

		if (typeof Worker !== 'undefined' && this.worker instanceof Worker) {
			this.worker.onmessage = (event: any) => this.onWorkerMessage(event.data)
			this.worker.onerror = this.onWorkerError.bind(this)
			this.onWorkerOnline()
		}
		else {
			(this.worker as NodeWorker)
				.on('online', this.onWorkerOnline.bind(this))
				.on('message', this.onWorkerMessage.bind(this))
				.on('error', this.onWorkerError.bind(this))
				.on('exit', this.onWorkerExit.bind(this))
		}
	}

	private onWorkerOnline() {
		for (let message of this.enqueuedMessages) {
			this.send(message)
		}

		this.enqueuedMessages = []
		this.workerOnline = true
	}

	private send(message: SqliteMessage) {
		this.worker.postMessage(message)
	}

	private onWorkerMessage(result: SqliteResult) {
		this.resolves.get(result.id)!.resolve(result.data)
		this.resolves.delete(result.id)
	}

	private onWorkerError(err: any) {
		for (let {reject} of this.resolves.values()) {
			reject(err)
		}

		this.resolves = new Map()
	}

	private onWorkerExit(code: number) {
		if (code !== 0) {
			for (let {reject} of this.resolves.values()) {
				reject(code)
			}
		}

		this.resolves = new Map()
	}

	private queue(type: SqliteMessageType, data: any): Promise<any> {
		let id = ++this.seed

		let message: SqliteMessage = {
			id,
			type,
			data,
		}

		if (this.workerOnline) {
			this.send(message)
		}
		else {
			this.enqueuedMessages.push(message)
		}

		return new Promise((resolve, reject) => {
			this.resolves.set(id, {resolve, reject})
		})
	}

	pragma(pragma: string, options: PragmaOptions = {}): Promise<any> {
		return this.queue(SqliteMessageType.Pragma, {pragma, options})
	}

	all(sql: string, ...params: any[]): Promise<any> {
		return this.queue(SqliteMessageType.All, {sql, params})
	}

	get(sql: string, ...params: any[]): Promise<any> {
		return this.queue(SqliteMessageType.Get, {sql, params})
	}

	run(sql: string, ...params: any[]): Promise<any> {
		return this.queue(SqliteMessageType.Run, {sql, params})
	}

	exec(content: string): Promise<void> {
		return this.queue(SqliteMessageType.Exec, content)
	}

	format(sql: string, ...params: any[]): string {
		let index = 0

		return sql.replace(/'(?:(?:\\'|.)+?)'|\?/g, (m0) => {
			if (m0 === '?') {
				if (index > params.length) {
					throw new Error(`More than ${params.length} placeholders specified.`)
				}
				
				let param = params[index]
				index++

				if (typeof param === 'string') {
					return `'${param.replace(/'/g, "\\'")}'`
				}
				else {
					return String(param)
				}
			}
			else {
				return m0
			}
		})
	}

	async close(): Promise<void> {
		await this.queue(SqliteMessageType.Close, null)

		if (typeof Worker !== 'undefined') {
			(this.worker as Worker).terminate()
		}
		else {
			await (this.worker as NodeWorker).terminate()
		}
	}
}
