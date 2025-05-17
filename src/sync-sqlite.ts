import * as sqlite3 from 'better-sqlite3'


export class SyncSqlite extends sqlite3 {

	constructor(filename: string, options?: sqlite3.Options) {

		// Ugly polyfill, raw class interpolated returned result.
		let result = super(filename, options) as any
		result.__proto__ = SyncSqlite.prototype
	}

	all(sql: string, ...params: any[]): any[] {
		return this.prepare(sql).all(...params)
	}

	get(sql: string, ...params: any[]): any {
		return this.prepare(sql).get(...params)
	}

	run(sql: string, ...params: any[]): sqlite3.RunResult {
		return this.prepare(sql).run(...params)
	}

	runMulti(sql: string, multiParams: any[][]): sqlite3.RunResult[]  {
		let prepared = this.prepare(sql)
		let results: sqlite3.RunResult[] = []

		let runMulti = this.transaction((multiParams) => {
			for (const params of multiParams) {
				results.push(prepared!.run(params))
			}
		})

		runMulti(multiParams)

		return results
	}
}
