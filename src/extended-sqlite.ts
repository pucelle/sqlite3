import * as sqlite3 from 'better-sqlite3'


export class ExtendedSqlite extends sqlite3 {

	all(sql: string, ...params: any[]): any {
		return this.prepare(sql).all(...params)
	}

	get(sql: string, ...params: any[]): any {
		return this.prepare(sql).get(...params)
	}

	run(sql: string, ...params: any[]): sqlite3.RunResult {
		return this.prepare(sql).run(...params)
	}
}
