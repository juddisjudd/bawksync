import { SQL, toPullResult, type IncomingRecord, type PullResult, type PushResult, type Row, type Store, type Usage } from './store.ts'

interface D1Result<T = unknown> {
  results: T[]
  meta: { changes: number }
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  all<T = unknown>(): Promise<D1Result<T>>
  first<T = unknown>(): Promise<T | null>
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>
}

export class D1Store implements Store {
  private db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  async pull(space: string, since: number, limit: number): Promise<PullResult> {
    const { results } = await this.db.prepare(SQL.pull).bind(space, since, limit + 1).all<Row>()
    return toPullResult(results, since, limit)
  }

  async push(space: string, records: IncomingRecord[]): Promise<PushResult> {
    const statements = [this.db.prepare(SQL.ensureSpace).bind(space)]
    for (const r of records) {
      statements.push(
        this.db.prepare(SQL.bumpSeq).bind(space),
        this.db.prepare(SQL.upsert).bind(space, r.id, space, r.updatedAt, r.deleted ? 1 : 0, r.blob)
      )
    }
    statements.push(this.db.prepare(SQL.currentSeq).bind(space))
    const results = await this.db.batch(statements)
    const rejected = records.filter((_, i) => !results[2 + i * 2].meta.changes).map((r) => r.id)
    const seq = (results.at(-1)?.results[0] as { seq: number } | undefined)?.seq ?? 0
    return { seq: Number(seq), rejected }
  }

  async count(space: string): Promise<number> {
    const row = await this.db.prepare(SQL.count).bind(space).first<{ n: number }>()
    return Number(row?.n ?? 0)
  }

  async usage(space: string): Promise<Usage> {
    const row = await this.db.prepare(SQL.usage).bind(space).first<{ n: number; bytes: number }>()
    return { records: Number(row?.n ?? 0), bytes: Number(row?.bytes ?? 0) }
  }
}
