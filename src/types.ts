export interface SqliteMessage {
	id: number
	type: SqliteMessageType
	data: any
}

export enum SqliteMessageType {
	Pragma,
	Open,
	All,
	Get,
	Run,
	Exec,
	Prepare,
	PrepareAll,
	PrepareGet,
	PrepareRun,
	PrepareDelete,
	Close,
}

export interface SqliteResult {
	id: number
	data: any
}