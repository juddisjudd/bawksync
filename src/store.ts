export interface IncomingRecord {
  id: string
  updatedAt: number
  deleted: boolean
  blob: string
}

export interface StoredRecord extends IncomingRecord {
  seq: number
}

export interface PullResult {
  records: StoredRecord[]
  seq: number
  more: boolean
}

export interface PushResult {
  seq: number
  rejected: string[]
}

export interface Store {
  pull(space: string, since: number, limit: number): Promise<PullResult>
  push(space: string, records: IncomingRecord[]): Promise<PushResult>
  count(space: string): Promise<number>
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS spaces (
  space TEXT PRIMARY KEY,
  seq INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS records (
  space TEXT NOT NULL,
  id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  blob TEXT NOT NULL,
  PRIMARY KEY (space, id)
);
CREATE INDEX IF NOT EXISTS records_by_seq ON records (space, seq);
`

export const SQL = {
  ensureSpace: 'INSERT INTO spaces (space, seq) VALUES (?, 0) ON CONFLICT (space) DO NOTHING',
  bumpSeq: 'UPDATE spaces SET seq = seq + 1 WHERE space = ?',
  // last write wins: an older updatedAt never replaces a newer one
  upsert: `INSERT INTO records (space, id, seq, updated_at, deleted, blob)
    VALUES (?, ?, (SELECT seq FROM spaces WHERE space = ?), ?, ?, ?)
    ON CONFLICT (space, id) DO UPDATE SET
      seq = excluded.seq, updated_at = excluded.updated_at, deleted = excluded.deleted, blob = excluded.blob
    WHERE excluded.updated_at > records.updated_at`,
  currentSeq: 'SELECT seq FROM spaces WHERE space = ?',
  pull: 'SELECT id, seq, updated_at, deleted, blob FROM records WHERE space = ? AND seq > ? ORDER BY seq LIMIT ?',
  count: 'SELECT COUNT(*) AS n FROM records WHERE space = ? AND deleted = 0'
}

export interface Row {
  id: string
  seq: number
  updated_at: number
  deleted: number
  blob: string
}

export function toPullResult(rows: Row[], since: number, limit: number): PullResult {
  const more = rows.length > limit
  const records = rows.slice(0, limit).map((r) => ({
    id: r.id,
    seq: Number(r.seq),
    updatedAt: Number(r.updated_at),
    deleted: Boolean(r.deleted),
    blob: r.blob
  }))
  return { records, seq: records.at(-1)?.seq ?? since, more }
}
