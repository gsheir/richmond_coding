// SQLite database module for Richmond Hockey coding app
// Uses better-sqlite3 for synchronous, fast operations

import Database from 'better-sqlite3';
import { Match, Phase, ButtonConfig } from './types';

export interface Settings {
  defaultHomeTeam: string;
  autosaveDirectory: string;
  defaultLeadMs: number;
  defaultLagMs: number;
}

export class MatchDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    this.db.pragma('foreign_keys = ON'); // Enable foreign key constraints
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Check if schema exists
    const schemaExists = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
      .get();

    if (!schemaExists) {
      this.createSchema();
    }
  }

  private createSchema(): void {
    this.db.exec(`
      -- Matches table
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        clock_time_ms INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        modified_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);
      CREATE INDEX IF NOT EXISTS idx_matches_teams ON matches(home_team, away_team);

      -- Phases table
      CREATE TABLE IF NOT EXISTS phases (
        match_id TEXT NOT NULL,
        phase_id INTEGER NOT NULL,
        start_time_ms INTEGER NOT NULL,
        end_time_ms INTEGER,
        phase_code TEXT,
        phase_label TEXT,
        status TEXT NOT NULL CHECK(status IN ('undefined', 'classified', 'terminated')),
        period TEXT NOT NULL,
        termination_event TEXT,
        termination_category TEXT CHECK(termination_category IN ('success', 'failure', 'hold', NULL)),
        lead_ms INTEGER NOT NULL,
        lag_ms INTEGER NOT NULL,
        PRIMARY KEY (match_id, phase_id),
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_phases_match ON phases(match_id);

      -- Phase context labels
      CREATE TABLE IF NOT EXISTS phase_contexts (
        match_id TEXT NOT NULL,
        phase_id INTEGER NOT NULL,
        context_label TEXT NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY (match_id, phase_id, context_label),
        FOREIGN KEY (match_id, phase_id) REFERENCES phases(match_id, phase_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_phase_contexts ON phase_contexts(match_id, phase_id);

      -- Settings table (key-value store)
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Autosaves table (per-tab autosave)
      CREATE TABLE IF NOT EXISTS autosaves (
        tab_id TEXT PRIMARY KEY,
        match_data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Button configuration
      CREATE TABLE IF NOT EXISTS button_config (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        config TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      -- Insert initial schema version
      INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (1, datetime('now'));
    `);
  }

  // ==================== Match Operations ====================

  saveMatch(match: Match): void {
    const transaction = this.db.transaction(() => {
      // Upsert match
      this.db
        .prepare(
          `INSERT OR REPLACE INTO matches 
           (id, date, home_team, away_team, clock_time_ms, created_at, modified_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          match.id,
          match.date,
          match.homeTeam,
          match.awayTeam,
          match.clockTimeMs || 0,
          match.createdAt,
          match.modifiedAt
        );

      // Delete existing phases for this match
      this.db.prepare('DELETE FROM phases WHERE match_id = ?').run(match.id);

      // Insert phases
      const insertPhase = this.db.prepare(
        `INSERT INTO phases 
         (match_id, phase_id, start_time_ms, end_time_ms, phase_code, phase_label, 
          status, period, termination_event, termination_category, lead_ms, lag_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const insertContext = this.db.prepare(
        `INSERT INTO phase_contexts (match_id, phase_id, context_label, position)
         VALUES (?, ?, ?, ?)`
      );

      for (const phase of match.phases) {
        insertPhase.run(
          match.id,
          phase.id,
          phase.startTimeMs,
          phase.endTimeMs,
          phase.phaseCode,
          phase.phaseLabel,
          phase.status,
          phase.period,
          phase.terminationEvent,
          phase.terminationCategory,
          phase.leadMs,
          phase.lagMs
        );

        // Insert context labels
        phase.contextLabels.forEach((label, index) => {
          insertContext.run(match.id, phase.id, label, index);
        });
      }
    });

    transaction();
  }

  loadMatch(matchId: string): Match | null {
    // Load match
    const matchRow = this.db
      .prepare(
        `SELECT id, date, home_team, away_team, clock_time_ms, created_at, modified_at
         FROM matches WHERE id = ?`
      )
      .get(matchId) as any;

    if (!matchRow) {
      return null;
    }

    // Load phases
    const phaseRows = this.db
      .prepare(
        `SELECT phase_id, start_time_ms, end_time_ms, phase_code, phase_label,
                status, period, termination_event, termination_category, lead_ms, lag_ms
         FROM phases WHERE match_id = ? ORDER BY phase_id`
      )
      .all(matchId) as any[];

    const phases: Phase[] = phaseRows.map((row) => {
      // Load context labels for this phase
      const contextRows = this.db
        .prepare(
          `SELECT context_label FROM phase_contexts 
           WHERE match_id = ? AND phase_id = ? ORDER BY position`
        )
        .all(matchId, row.phase_id) as any[];

      return {
        id: row.phase_id,
        startTimeMs: row.start_time_ms,
        endTimeMs: row.end_time_ms,
        phaseCode: row.phase_code,
        phaseLabel: row.phase_label,
        status: row.status,
        period: row.period,
        contextLabels: contextRows.map((c) => c.context_label),
        terminationEvent: row.termination_event,
        terminationCategory: row.termination_category,
        leadMs: row.lead_ms,
        lagMs: row.lag_ms,
      };
    });

    return {
      id: matchRow.id,
      date: matchRow.date,
      homeTeam: matchRow.home_team,
      awayTeam: matchRow.away_team,
      phases,
      createdAt: matchRow.created_at,
      modifiedAt: matchRow.modified_at,
      clockTimeMs: matchRow.clock_time_ms,
    };
  }

  listMatches(): Match[] {
    const matchRows = this.db
      .prepare(
        `SELECT id, date, home_team, away_team, clock_time_ms, created_at, modified_at
         FROM matches ORDER BY date DESC, created_at DESC`
      )
      .all() as any[];

    return matchRows.map((row) => {
      const match = this.loadMatch(row.id);
      return match!;
    });
  }

  deleteMatch(matchId: string): void {
    // Phases and contexts will be deleted automatically due to CASCADE
    this.db.prepare('DELETE FROM matches WHERE id = ?').run(matchId);
  }

  // ==================== Autosave Operations ====================

  saveAutosave(tabId: string, match: Match): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO autosaves (tab_id, match_data, updated_at)
         VALUES (?, ?, datetime('now'))`
      )
      .run(tabId, JSON.stringify(match));
  }

  loadAutosave(tabId: string): Match | null {
    const row = this.db
      .prepare('SELECT match_data FROM autosaves WHERE tab_id = ?')
      .get(tabId) as any;

    if (!row) {
      return null;
    }

    try {
      return JSON.parse(row.match_data);
    } catch (error) {
      console.error('Failed to parse autosave data:', error);
      return null;
    }
  }

  clearAutosave(tabId: string): void {
    this.db.prepare('DELETE FROM autosaves WHERE tab_id = ?').run(tabId);
  }

  listAutosaves(): { tabId: string; updatedAt: string }[] {
    const rows = this.db
      .prepare('SELECT tab_id, updated_at FROM autosaves')
      .all() as any[];

    return rows.map((row) => ({
      tabId: row.tab_id,
      updatedAt: row.updated_at,
    }));
  }

  // ==================== Settings Operations ====================

  saveSettings(settings: Settings): void {
    const transaction = this.db.transaction(() => {
      const upsert = this.db.prepare(
        `INSERT OR REPLACE INTO settings (key, value, updated_at)
         VALUES (?, ?, datetime('now'))`
      );

      upsert.run('defaultHomeTeam', settings.defaultHomeTeam);
      upsert.run('autosaveDirectory', settings.autosaveDirectory);
      upsert.run('defaultLeadMs', settings.defaultLeadMs.toString());
      upsert.run('defaultLagMs', settings.defaultLagMs.toString());
    });

    transaction();
  }

  loadSettings(): Settings | null {
    const rows = this.db
      .prepare('SELECT key, value FROM settings')
      .all() as any[];

    if (rows.length === 0) {
      return null;
    }

    const settingsMap = new Map(rows.map((row) => [row.key, row.value]));

    if (
      !settingsMap.has('defaultHomeTeam') ||
      !settingsMap.has('autosaveDirectory') ||
      !settingsMap.has('defaultLeadMs') ||
      !settingsMap.has('defaultLagMs')
    ) {
      return null;
    }

    return {
      defaultHomeTeam: settingsMap.get('defaultHomeTeam')!,
      autosaveDirectory: settingsMap.get('autosaveDirectory')!,
      defaultLeadMs: parseInt(settingsMap.get('defaultLeadMs')!, 10),
      defaultLagMs: parseInt(settingsMap.get('defaultLagMs')!, 10),
    };
  }

  // ==================== Button Config Operations ====================

  saveButtonConfig(config: ButtonConfig[]): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO button_config (id, config, updated_at)
         VALUES (1, ?, datetime('now'))`
      )
      .run(JSON.stringify(config));
  }

  loadButtonConfig(): ButtonConfig[] | null {
    const row = this.db
      .prepare('SELECT config FROM button_config WHERE id = 1')
      .get() as any;

    if (!row) {
      return null;
    }

    try {
      return JSON.parse(row.config);
    } catch (error) {
      console.error('Failed to parse button config:', error);
      return null;
    }
  }

  // ==================== Utility ====================

  close(): void {
    this.db.close();
  }

  vacuum(): void {
    this.db.exec('VACUUM');
  }

  getStats(): {
    matchCount: number;
    phaseCount: number;
    autosaveCount: number;
    dbSize: number;
  } {
    const matchCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM matches').get() as any
    ).count;
    const phaseCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM phases').get() as any
    ).count;
    const autosaveCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM autosaves').get() as any
    ).count;

    // Get database file size (requires filesystem access)
    const dbSize = 0; // Will be set from main process

    return { matchCount, phaseCount, autosaveCount, dbSize };
  }
}
