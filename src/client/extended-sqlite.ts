import * as sqlite3 from 'better-sqlite3'


export class ExtendedSqlite extends sqlite3 {

	constructor(filename: string, options?: sqlite3.Options) {
		// Ugly polyfill, raw class interpolated returned result.
		let result = super(filename, options) as any
		result.__proto__ = ExtendedSqlite.prototype
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
}
