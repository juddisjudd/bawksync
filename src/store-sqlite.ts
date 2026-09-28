import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { SCHEMA, SQL, toPullResult, type IncomingRecord, type PullResult, type PushResult, type Row, type Store } from './store.ts'

export class SqliteStore implements Store {
  private db: DatabaseSync

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;')
    this.db.exec(SCHEMA)
  }

  async pull(space: string, since: number, limit: number): Promise<PullResult> {
    const rows = this.db.prepare(SQL.pull).all(space, since, limit + 1) as unknown as Row[]
    return toPullResult(rows, since, limit)
  }

  async push(space: string, records: IncomingRecord[]): Promise<PushResult> {
    const rejected: string[] = []
    const bump = this.db.prepare(SQL.bumpSeq)
    const upsert = this.db.prepare(SQL.upsert)
    this.db.exec('BEGIN IMMEDIATE')
    try {
      this.db.prepare(SQL.ensureSpace).run(space)
      for (const r of records) {
        bump.run(space)
        const { changes } = upsert.run(space, r.id, space, r.updatedAt, r.deleted ? 1 : 0, r.blob)
        if (!Number(changes)) rejected.push(r.id)
      }
      const row = this.db.prepare(SQL.currentSeq).get(space) as { seq: number }
      this.db.exec('COMMIT')
      return { seq: Number(row.seq), rejected }
    } catch (err) {
      this.db.exec('ROLLBACK')
      throw err
    }
  }

  async count(space: string): Promise<number> {
    const row = this.db.prepare(SQL.count).get(space) as { n: number }
    return Number(row.n)
  }

  close(): void {
    this.db.close()
  }
}
