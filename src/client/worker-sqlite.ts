import {Options, PragmaOptions} from 'better-sqlite3'
import {SqliteMessage, SqliteMessageType, SqliteResult} from '../types'
import type {Worker as NodeWorker} from 'worker_threads'


// Reference to: https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md


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
		if (typeof Worker !== 'undefined') {
			this.worker = new Worker(__dirname + '/../worker/index.js')
		}
		else {
			this.worker = new (require('worker_threads').Worker)(__dirname + '/../worker/index.js')
		}

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

	queue(type: SqliteMessageType, data: any, id = ++this.seed): Promise<any> {
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

	runMulti(sql: string, multiParams: any[][]): Promise<any> {
		return this.queue(SqliteMessageType.RunMulti, {sql, multiParams})
	}

	/** 
	 * Note, must delete after not use it any more.
	 * Or prepared statement can't be GC in worker.
	 */
	prepare(sql: string) {
		let id = ++this.seed
		this.queue(SqliteMessageType.Prepare, {sql}, id)

		return new WorkerSqlitePrepared(id, this)
	}

	exec(sql: string): Promise<void> {
		return this.queue(SqliteMessageType.Exec, {sql})
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


export class WorkerSqlitePrepared<PS extends any[]> {

	readonly id: number
	readonly db: WorkerSqlite
	private deleted: boolean = false

	constructor(id: number, db: WorkerSqlite) {
		this.id = id
		this.db = db
	}

	all(...params: PS): Promise<any> {
		if (this.deleted) {
			throw new Error(`Prepared statement has been deleted!`)
		}

		return this.db.queue(SqliteMessageType.PrepareAll, {id: this.id, params})
	}

	get(...params: PS): Promise<any> {
		if (this.deleted) {
			throw new Error(`Prepared statement has been deleted!`)
		}

		return this.db.queue(SqliteMessageType.PrepareGet, {id: this.id, params})
	}

	run(...params: PS): Promise<any> {
		if (this.deleted) {
			throw new Error(`Prepared statement has been deleted!`)
		}

		return this.db.queue(SqliteMessageType.PrepareRun, {id: this.id, params})
	}

	delete() {
		this.db.queue(SqliteMessageType.PrepareDelete, {id: this.id})
		this.deleted = true
	}
}