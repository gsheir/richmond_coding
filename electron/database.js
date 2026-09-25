// SQLite database module for Richmond Hockey coding app
// Uses better-sqlite3 for synchronous, fast operations

import Database from 'better-sqlite3';

export class MatchDatabase {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    this.db.pragma('foreign_keys = ON'); // Enable foreign key constraints
    this.initializeSchema();
  }

  initializeSchema() {
    // Check if schema exists
    const schemaExists = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
      .get();

    if (!schemaExists) {
      this.createSchema();
    } else {
      // Check schema version and run migrations if needed
      const versionRow = this.db
        .prepare("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
        .get();
      
      const currentVersion = versionRow?.version || 0;
      
      if (currentVersion < 2) {
        console.log(`Migrating database schema from version ${currentVersion} to version 2...`);
        this.migrateToVersion2();
      }
      
      if (currentVersion < 3) {
        console.log(`Migrating database schema from version ${currentVersion} to version 3...`);
        this.migrateToVersion3();
      }
      
      if (currentVersion < 4) {
        console.log(`Migrating database schema from version ${currentVersion} to version 4...`);
        this.migrateToVersion4();
      }

      if (currentVersion < 5) {
        console.log(`Migrating database schema from version ${currentVersion} to version 5...`);
        this.migrateToVersion5();
      }

      if (currentVersion < 6) {
        console.log(`Migrating database schema from version ${currentVersion} to version 6...`);
        this.migrateToVersion6();
      }

      if (currentVersion < 7) {
        console.log(`Migrating database schema from version ${currentVersion} to version 7...`);
        this.migrateToVersion7();
      }
    }
  }

  createSchema() {
    this.db.exec(`
      -- Matches table
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        clock_time_ms INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        modified_at TEXT NOT NULL,
        coding_window_id INTEGER REFERENCES button_configs(id) ON DELETE SET NULL
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
        status TEXT NOT NULL CHECK(status IN ('undefined', 'classified', 'terminated', 'ended_undefined')),
        period TEXT NOT NULL,
        termination_event TEXT,
        termination_category TEXT CHECK(termination_category IN ('success', 'failure', 'hold', NULL)),
        lead_ms INTEGER NOT NULL,
        lag_ms INTEGER NOT NULL,
        needs_review INTEGER DEFAULT 0,
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

      -- Point events (single instantaneous timestamped events, distinct from phases)
      CREATE TABLE IF NOT EXISTS point_events (
        match_id TEXT NOT NULL,
        event_id INTEGER NOT NULL,
        time_ms INTEGER NOT NULL,
        code TEXT NOT NULL,
        label TEXT NOT NULL,
        period TEXT NOT NULL,
        lead_ms INTEGER NOT NULL,
        lag_ms INTEGER NOT NULL,
        PRIMARY KEY (match_id, event_id),
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_point_events_match ON point_events(match_id);

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

      -- Button configuration (legacy - kept for migration)
      CREATE TABLE IF NOT EXISTS button_config (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        config TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Button configurations (new normalized schema)
      CREATE TABLE IF NOT EXISTS button_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Individual buttons (expanded schema with all metadata)
      CREATE TABLE IF NOT EXISTS buttons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        label TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        colour TEXT NOT NULL,
        hotkey TEXT,
        sort_order INTEGER DEFAULT 0,
        -- Position metadata
        position_x INTEGER,
        position_y INTEGER,
        position_width INTEGER,
        position_height INTEGER,
        -- Style metadata
        style_opacity REAL,
        style_font_size INTEGER,
        style_font_weight TEXT,
        -- Phase metadata
        lead_ms INTEGER,
        lag_ms INTEGER,
        possession_state TEXT,
        hierarchy_level INTEGER,
        -- Termination metadata
        transition_type TEXT,
        for_possession_state TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (config_id) REFERENCES button_configs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_buttons_config ON buttons(config_id);
      CREATE INDEX IF NOT EXISTS idx_buttons_key ON buttons(config_id, key);

      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      -- Insert initial schema version
      INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (7, datetime('now'));
    `);

    console.log('Database schema initialized');
  }

  migrateToVersion2() {
    // Add new button_configs and buttons tables for normalized schema
    this.db.exec(`
      -- Button configurations (new normalized schema)
      CREATE TABLE IF NOT EXISTS button_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        is_active INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Individual buttons (expanded schema with all metadata)
      CREATE TABLE IF NOT EXISTS buttons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        label TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        colour TEXT NOT NULL,
        hotkey TEXT,
        sort_order INTEGER DEFAULT 0,
        -- Position metadata
        position_x INTEGER,
        position_y INTEGER,
        position_width INTEGER,
        position_height INTEGER,
        -- Style metadata
        style_opacity REAL,
        style_font_size INTEGER,
        style_font_weight TEXT,
        -- Phase metadata
        lead_ms INTEGER,
        lag_ms INTEGER,
        possession_state TEXT,
        hierarchy_level INTEGER,
        -- Termination metadata
        transition_type TEXT,
        for_possession_state TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (config_id) REFERENCES button_configs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_buttons_config ON buttons(config_id);
      CREATE INDEX IF NOT EXISTS idx_buttons_key ON buttons(config_id, key);

      -- Update schema version
      INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (2, datetime('now'));
    `);

    console.log('Database migrated to schema version 2');
  }

  migrateToVersion3() {
    // Expand buttons table to include all button metadata
    // Since SQLite doesn't support adding multiple columns at once easily,
    // we'll create a new table and copy data
    this.db.exec(`
      -- Create new buttons table with expanded schema
      CREATE TABLE IF NOT EXISTS buttons_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        label TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        colour TEXT NOT NULL,
        hotkey TEXT,
        sort_order INTEGER DEFAULT 0,
        -- Position metadata
        position_x INTEGER,
        position_y INTEGER,
        position_width INTEGER,
        position_height INTEGER,
        -- Style metadata
        style_opacity REAL,
        style_font_size INTEGER,
        style_font_weight TEXT,
        -- Phase metadata
        lead_ms INTEGER,
        lag_ms INTEGER,
        possession_state TEXT,
        hierarchy_level INTEGER,
        -- Termination metadata
        transition_type TEXT,
        for_possession_state TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (config_id) REFERENCES button_configs(id) ON DELETE CASCADE
      );

      -- Copy existing data (with default values for new columns)
      INSERT INTO buttons_new (
        id, config_id, key, label, code, type, category, colour, hotkey, sort_order, created_at
      )
      SELECT 
        id, config_id, key, label, code,
        COALESCE(category, 'phase') as type,
        category, colour, hotkey, sort_order, created_at
      FROM buttons;

      -- Drop old table and rename new one
      DROP TABLE buttons;
      ALTER TABLE buttons_new RENAME TO buttons;

      -- Recreate indexes
      CREATE INDEX IF NOT EXISTS idx_buttons_config ON buttons(config_id);
      CREATE INDEX IF NOT EXISTS idx_buttons_key ON buttons(config_id, key);

      -- Update schema version
      INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (3, datetime('now'));
    `);

    console.log('Database migrated to schema version 3');
  }

  migrateToVersion4() {
    // Add needs_review column to phases table
    this.db.exec(`
      -- Add needs_review column
      ALTER TABLE phases ADD COLUMN needs_review INTEGER DEFAULT 0;

      -- Update schema version
      INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (4, datetime('now'));
    `);

    console.log('Database migrated to schema version 4');
  }

  migrateToVersion5() {
    // Allow the 'ended_undefined' phase status. SQLite can't alter a CHECK
    // constraint in place, so the phases table has to be rebuilt.
    this.db.pragma('foreign_keys = OFF');
    this.db.exec(`
      CREATE TABLE phases_new (
        match_id TEXT NOT NULL,
        phase_id INTEGER NOT NULL,
        start_time_ms INTEGER NOT NULL,
        end_time_ms INTEGER,
        phase_code TEXT,
        phase_label TEXT,
        status TEXT NOT NULL CHECK(status IN ('undefined', 'classified', 'terminated', 'ended_undefined')),
        period TEXT NOT NULL,
        termination_event TEXT,
        termination_category TEXT CHECK(termination_category IN ('success', 'failure', 'hold', NULL)),
        lead_ms INTEGER NOT NULL,
        lag_ms INTEGER NOT NULL,
        needs_review INTEGER DEFAULT 0,
        PRIMARY KEY (match_id, phase_id),
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
      );

      INSERT INTO phases_new SELECT * FROM phases;

      DROP TABLE phases;
      ALTER TABLE phases_new RENAME TO phases;

      CREATE INDEX IF NOT EXISTS idx_phases_match ON phases(match_id);

      -- Update schema version
      INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (5, datetime('now'));
    `);
    this.db.pragma('foreign_keys = ON');

    console.log('Database migrated to schema version 5');
  }

  migrateToVersion6() {
    // Add point_events table for single instantaneous timestamped events
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS point_events (
        match_id TEXT NOT NULL,
        event_id INTEGER NOT NULL,
        time_ms INTEGER NOT NULL,
        code TEXT NOT NULL,
        label TEXT NOT NULL,
        period TEXT NOT NULL,
        lead_ms INTEGER NOT NULL,
        lag_ms INTEGER NOT NULL,
        PRIMARY KEY (match_id, event_id),
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_point_events_match ON point_events(match_id);

      -- Update schema version
      INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (6, datetime('now'));
    `);

    console.log('Database migrated to schema version 6');
  }

  migrateToVersion7() {
    // Multiple code windows: is_active now means "default for new matches",
    // and each match records the code window it is coded with.
    this.db.exec(`
      ALTER TABLE button_configs RENAME COLUMN is_active TO is_default;
      ALTER TABLE matches ADD COLUMN coding_window_id INTEGER REFERENCES button_configs(id) ON DELETE SET NULL;

      INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (7, datetime('now'));
    `);

    // Existing matches were coded with the single (default) window
    this.assignDefaultWindowToUnassignedMatches();

    console.log('Database migrated to schema version 7');
  }

  // ==================== Match Operations ====================

  saveMatch(match) {
    const transaction = this.db.transaction(() => {
      // Upsert match
      this.db
        .prepare(
          `INSERT OR REPLACE INTO matches 
           (id, date, home_team, away_team, clock_time_ms, created_at, modified_at, coding_window_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT id FROM button_configs WHERE id = ?))`
        )
        .run(
          match.id,
          match.date,
          match.homeTeam,
          match.awayTeam,
          match.clockTimeMs || 0,
          match.createdAt,
          match.modifiedAt,
          match.codingWindowId ?? null
        );

      // Delete existing phases for this match
      this.db.prepare('DELETE FROM phases WHERE match_id = ?').run(match.id);

      // Insert phases
      const insertPhase = this.db.prepare(
        `INSERT INTO phases 
         (match_id, phase_id, start_time_ms, end_time_ms, phase_code, phase_label, 
          status, period, termination_event, termination_category, lead_ms, lag_ms, needs_review)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
          phase.lagMs,
          phase.needsReview ? 1 : 0
        );

        // Insert context labels
        phase.contextLabels.forEach((label, index) => {
          insertContext.run(match.id, phase.id, label, index);
        });
      }

      // Delete existing point events for this match
      this.db.prepare('DELETE FROM point_events WHERE match_id = ?').run(match.id);

      // Insert point events
      const insertPointEvent = this.db.prepare(
        `INSERT INTO point_events
         (match_id, event_id, time_ms, code, label, period, lead_ms, lag_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const event of match.pointEvents || []) {
        insertPointEvent.run(
          match.id,
          event.id,
          event.timeMs,
          event.code,
          event.label,
          event.period,
          event.leadMs,
          event.lagMs
        );
      }
    });

    transaction();
  }

  loadMatch(matchId) {
    // Load match
    const matchRow = this.db
      .prepare(
        `SELECT id, date, home_team, away_team, clock_time_ms, created_at, modified_at, coding_window_id
         FROM matches WHERE id = ?`
      )
      .get(matchId);

    if (!matchRow) {
      return null;
    }

    // Load phases
    const phaseRows = this.db
      .prepare(
        `SELECT phase_id, start_time_ms, end_time_ms, phase_code, phase_label,
                status, period, termination_event, termination_category, lead_ms, lag_ms, needs_review
         FROM phases WHERE match_id = ? ORDER BY phase_id`
      )
      .all(matchId);

    const phases = phaseRows.map((row) => {
      // Load context labels for this phase
      const contextRows = this.db
        .prepare(
          `SELECT context_label FROM phase_contexts 
           WHERE match_id = ? AND phase_id = ? ORDER BY position`
        )
        .all(matchId, row.phase_id);

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
        needsReview: row.needs_review === 1,
      };
    });

    // Load point events
    const pointEventRows = this.db
      .prepare(
        `SELECT event_id, time_ms, code, label, period, lead_ms, lag_ms
         FROM point_events WHERE match_id = ? ORDER BY event_id`
      )
      .all(matchId);

    const pointEvents = pointEventRows.map((row) => ({
      id: row.event_id,
      timeMs: row.time_ms,
      code: row.code,
      label: row.label,
      period: row.period,
      leadMs: row.lead_ms,
      lagMs: row.lag_ms,
    }));

    return {
      id: matchRow.id,
      date: matchRow.date,
      homeTeam: matchRow.home_team,
      awayTeam: matchRow.away_team,
      phases,
      pointEvents,
      createdAt: matchRow.created_at,
      modifiedAt: matchRow.modified_at,
      clockTimeMs: matchRow.clock_time_ms,
      codingWindowId: matchRow.coding_window_id ?? undefined,
    };
  }

  listMatches() {
    const matchRows = this.db
      .prepare(
        `SELECT id, date, home_team, away_team, clock_time_ms, created_at, modified_at
         FROM matches ORDER BY date DESC, created_at DESC`
      )
      .all();

    return matchRows.map((row) => {
      const match = this.loadMatch(row.id);
      return match;
    });
  }

  deleteMatch(matchId) {
    // Phases and contexts will be deleted automatically due to CASCADE
    this.db.prepare('DELETE FROM matches WHERE id = ?').run(matchId);
  }

  // ==================== Autosave Operations ====================

  saveAutosave(tabId, match) {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO autosaves (tab_id, match_data, updated_at)
         VALUES (?, ?, datetime('now'))`
      )
      .run(tabId, JSON.stringify(match));
  }

  loadAutosave(tabId) {
    const row = this.db
      .prepare('SELECT match_data FROM autosaves WHERE tab_id = ?')
      .get(tabId);

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

  clearAutosave(tabId) {
    this.db.prepare('DELETE FROM autosaves WHERE tab_id = ?').run(tabId);
  }

  listAutosaves() {
    const rows = this.db
      .prepare('SELECT tab_id, updated_at FROM autosaves')
      .all();

    return rows.map((row) => ({
      tabId: row.tab_id,
      updatedAt: row.updated_at,
    }));
  }

  // ==================== Settings Operations ====================

  saveSettings(settings) {
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

  loadSettings() {
    const rows = this.db.prepare('SELECT key, value FROM settings').all();

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
      defaultHomeTeam: settingsMap.get('defaultHomeTeam'),
      autosaveDirectory: settingsMap.get('autosaveDirectory'),
      defaultLeadMs: parseInt(settingsMap.get('defaultLeadMs'), 10),
      defaultLagMs: parseInt(settingsMap.get('defaultLagMs'), 10),
    };
  }

  // ==================== Button Config Operations ====================

  // Legacy methods (kept for migration compatibility)
  saveButtonConfigLegacy(config) {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO button_config (id, config, updated_at)
         VALUES (1, ?, datetime('now'))`
      )
      .run(JSON.stringify(config));
  }

  loadButtonConfigLegacy() {
    try {
      const row = this.db
        .prepare('SELECT config FROM button_config WHERE id = 1')
        .get();

      if (!row) {
        return null;
      }

      return JSON.parse(row.config);
    } catch (error) {
      // Table might not exist or config parse error
      console.error('Failed to load legacy button config:', error.message);
      return null;
    }
  }

  // Code window (button configuration) methods

  /**
   * List all code windows with the number of matches using each
   */
  listCodingWindows() {
    return this.db
      .prepare(
        `SELECT bc.*, COUNT(m.id) AS match_count
         FROM button_configs bc
         LEFT JOIN matches m ON m.coding_window_id = bc.id
         GROUP BY bc.id
         ORDER BY bc.name COLLATE NOCASE`
      )
      .all();
  }

  /**
   * Get the code window new matches start with
   */
  getDefaultCodingWindow() {
    return this.db
      .prepare('SELECT * FROM button_configs WHERE is_default = 1')
      .get();
  }

  /**
   * Get a code window by ID
   */
  getCodingWindow(windowId) {
    return this.db
      .prepare('SELECT * FROM button_configs WHERE id = ?')
      .get(windowId);
  }

  /**
   * Throw if another code window already uses this name (case-insensitive)
   */
  assertWindowNameAvailable(name, excludeWindowId = null) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Code window name is required');
    }
    const clash = this.db
      .prepare('SELECT id FROM button_configs WHERE name = ? COLLATE NOCASE AND id IS NOT ?')
      .get(trimmed, excludeWindowId);
    if (clash) {
      throw new Error(`A code window named "${trimmed}" already exists`);
    }
    return trimmed;
  }

  /**
   * Generate an unused name such as "Name (copy)" or "Name (copy 2)"
   */
  getUniqueWindowName(baseName) {
    const exists = (name) =>
      !!this.db.prepare('SELECT id FROM button_configs WHERE name = ? COLLATE NOCASE').get(name);

    let candidate = `${baseName} (copy)`;
    let counter = 2;
    while (exists(candidate)) {
      candidate = `${baseName} (copy ${counter++})`;
    }
    return candidate;
  }

  /**
   * Create a new, empty code window
   */
  createCodingWindow(name, description = null) {
    const trimmed = this.assertWindowNameAvailable(name);
    const result = this.db
      .prepare(
        `INSERT INTO button_configs (name, description, is_default, created_at, updated_at)
         VALUES (?, ?, 0, datetime('now'), datetime('now'))`
      )
      .run(trimmed, description || null);

    return Number(result.lastInsertRowid);
  }

  /**
   * Rename a code window and/or update its description
   */
  renameCodingWindow(windowId, name, description = null) {
    const trimmed = this.assertWindowNameAvailable(name, windowId);
    this.db
      .prepare(
        `UPDATE button_configs SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .run(trimmed, description || null, windowId);
  }

  /**
   * Mark a code window as the default for new matches (clears the others)
   */
  setDefaultCodingWindow(windowId) {
    const tx = this.db.transaction(() => {
      this.db.prepare('UPDATE button_configs SET is_default = 0').run();
      this.db.prepare('UPDATE button_configs SET is_default = 1 WHERE id = ?').run(windowId);
    });

    tx();
  }

  /**
   * Count matches coded with a code window
   */
  countMatchesUsingWindow(windowId) {
    return this.db
      .prepare('SELECT COUNT(*) AS count FROM matches WHERE coding_window_id = ?')
      .get(windowId).count;
  }

  /**
   * Point any match without a (valid) code window at the default window
   */
  assignDefaultWindowToUnassignedMatches() {
    const defaultWindow = this.getDefaultCodingWindow();
    if (!defaultWindow) return 0;

    return this.db
      .prepare('UPDATE matches SET coding_window_id = ? WHERE coding_window_id IS NULL')
      .run(defaultWindow.id).changes;
  }

  /**
   * Delete a code window (and its buttons via cascade). Matches using it are
   * reassigned to the default window. Returns the number of matches reassigned.
   */
  deleteCodingWindow(windowId) {
    let reassigned = 0;

    const tx = this.db.transaction(() => {
      const count = this.db
        .prepare('SELECT COUNT(*) AS count FROM button_configs')
        .get().count;
      if (count <= 1) {
        throw new Error('Cannot delete the last code window');
      }

      const window = this.getCodingWindow(windowId);
      if (!window) {
        throw new Error('Code window not found');
      }

      if (window.is_default === 1) {
        const other = this.db
          .prepare('SELECT id FROM button_configs WHERE id != ? ORDER BY name COLLATE NOCASE LIMIT 1')
          .get(windowId);
        this.setDefaultCodingWindow(other.id);
      }

      const defaultWindow = this.getDefaultCodingWindow();
      reassigned = this.db
        .prepare('UPDATE matches SET coding_window_id = ? WHERE coding_window_id = ?')
        .run(defaultWindow.id, windowId).changes;

      this.db.prepare('DELETE FROM button_configs WHERE id = ?').run(windowId);
    });

    tx();
    return reassigned;
  }

  /**
   * Get all buttons for a configuration
   */
  getButtons(configId) {
    try {
      return this.db
        .prepare('SELECT * FROM buttons WHERE config_id = ? ORDER BY sort_order, id')
        .all(configId);
    } catch (error) {
      // Table might not exist yet (before migration)
      console.error('Error getting buttons:', error.message);
      return [];
    }
  }

  /**
   * Get a button by ID
   */
  getButton(buttonId) {
    return this.db
      .prepare('SELECT * FROM buttons WHERE id = ?')
      .get(buttonId);
  }

  /**
   * Add a button to a configuration
   */
  addButton(configId, buttonData) {
    const { key, label, code, category, colour, hotkey, sortOrder = 0 } = buttonData;
    
    const result = this.db
      .prepare(
        `INSERT INTO buttons (config_id, key, label, code, category, colour, hotkey, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(configId, key, label, code, category || null, colour, hotkey || null, sortOrder);
    
    // Update config modified time
    this.db
      .prepare('UPDATE button_configs SET updated_at = datetime(\'now\') WHERE id = ?')
      .run(configId);
    
    return result.lastInsertRowid;
  }

  /**
   * Update a button
   */
  updateButton(buttonId, buttonData) {
    const { key, label, code, category, colour, hotkey, sortOrder } = buttonData;
    
    const updates = [];
    const values = [];
    
    if (key !== undefined) { updates.push('key = ?'); values.push(key); }
    if (label !== undefined) { updates.push('label = ?'); values.push(label); }
    if (code !== undefined) { updates.push('code = ?'); values.push(code); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (colour !== undefined) { updates.push('colour = ?'); values.push(colour); }
    if (hotkey !== undefined) { updates.push('hotkey = ?'); values.push(hotkey); }
    if (sortOrder !== undefined) { updates.push('sort_order = ?'); values.push(sortOrder); }
    
    if (updates.length === 0) return;
    
    values.push(buttonId);
    
    this.db
      .prepare(`UPDATE buttons SET ${updates.join(', ')} WHERE id = ?`)
      .run(...values);
    
    // Update config modified time
    const button = this.getButton(buttonId);
    if (button) {
      this.db
        .prepare('UPDATE button_configs SET updated_at = datetime(\'now\') WHERE id = ?')
        .run(button.config_id);
    }
  }

  /**
   * Delete a button
   */
  deleteButton(buttonId) {
    const button = this.getButton(buttonId);
    
    this.db
      .prepare('DELETE FROM buttons WHERE id = ?')
      .run(buttonId);
    
    // Update config modified time
    if (button) {
      this.db
        .prepare('UPDATE button_configs SET updated_at = datetime(\'now\') WHERE id = ?')
        .run(button.config_id);
    }
  }

  /**
   * Save an entire button configuration (replaces all buttons)
   */
  saveButtonConfig(configId, buttons) {
    const tx = this.db.transaction(() => {
      // Delete existing buttons
      this.db
        .prepare('DELETE FROM buttons WHERE config_id = ?')
        .run(configId);
      
      // Insert new buttons with full metadata
      const insertStmt = this.db.prepare(
        `INSERT INTO buttons (
          config_id, key, label, code, type, category, colour, hotkey, sort_order,
          position_x, position_y, position_width, position_height,
          style_opacity, style_font_size, style_font_weight,
          lead_ms, lag_ms, possession_state, hierarchy_level,
          transition_type, for_possession_state, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      );
      
      // Numeric fields use ?? so legitimate zero values (e.g. x = 0) are kept
      buttons.forEach((button, index) => {
        insertStmt.run(
          configId,
          button.code || button.key || `button_${index}`,
          button.label || '',
          button.code || '',
          button.type || 'phase',
          button.category || null,
          button.style?.colour || button.colour || '#666666',
          button.hotkey || null,
          button.sortOrder !== undefined ? button.sortOrder : index,
          button.position?.x ?? null,
          button.position?.y ?? null,
          button.position?.width ?? null,
          button.position?.height ?? null,
          button.style?.opacity ?? null,
          button.style?.font_size ?? null,
          button.style?.font_weight || null,
          button.lead_ms ?? button.leadMs ?? null,
          button.lag_ms ?? button.lagMs ?? null,
          button.possession_state || button.possessionState || null,
          button.hierarchy_level ?? button.hierarchyLevel ?? null,
          button.transition_type || button.transitionType || null,
          button.for_possession_state || button.forPossessionState || null
        );
      });
      
      // Update config modified time
      this.db
        .prepare('UPDATE button_configs SET updated_at = datetime(\'now\') WHERE id = ?')
        .run(configId);
    });
    
    tx();
  }

  /**
   * Get a code window's buttons in the application's wire format
   * (flat array with nested position/style objects)
   */
  getButtonsForWindow(windowId) {
    return this.getButtons(windowId).map((btn) => ({
      code: btn.code,
      label: btn.label,
      type: btn.type,
      category: btn.category,
      hotkey: btn.hotkey,
      position: {
        x: btn.position_x,
        y: btn.position_y,
        width: btn.position_width,
        height: btn.position_height,
      },
      style: {
        colour: btn.colour,
        opacity: btn.style_opacity,
        font_size: btn.style_font_size,
        font_weight: btn.style_font_weight,
      },
      lead_ms: btn.lead_ms,
      lag_ms: btn.lag_ms,
      possession_state: btn.possession_state,
      hierarchy_level: btn.hierarchy_level,
      transition_type: btn.transition_type,
      for_possession_state: btn.for_possession_state,
    }));
  }

  /**
   * Load a code window's buttons (the default window if no ID is given).
   * Returns null if the window doesn't exist.
   */
  loadButtonConfig(windowId = null) {
    const window = windowId != null ? this.getCodingWindow(windowId) : this.getDefaultCodingWindow();
    if (!window) {
      return null;
    }
    return this.getButtonsForWindow(window.id);
  }

  /**
   * Flatten a { phase_buttons, context_buttons, termination_buttons } config object
   * (or a legacy { buttons } array) into a single flat button array for storage.
   */
  normalizeButtonArray(config) {
    const hasNewFormat = config.phase_buttons || config.context_buttons || config.termination_buttons || config.point_event_buttons;
    if (hasNewFormat) {
      return [
        ...(config.phase_buttons || []),
        ...(config.context_buttons || []),
        ...(config.termination_buttons || []),
        ...(config.point_event_buttons || []),
      ];
    }
    return config.buttons || [];
  }

  /**
   * Migrate from legacy button_config to new schema
   */
  migrateButtonConfig() {
    // Check if we need to migrate or re-migrate with full metadata
    const existingConfig = this.getDefaultCodingWindow();
    
    // Load legacy config
    const legacyConfig = this.loadButtonConfigLegacy();
    if (!legacyConfig) {
      console.log('No legacy button config found');
      return { migrated: false, reason: 'No legacy config' };
    }

    // If config exists, check if buttons have metadata (position, lead_ms, etc.)
    if (existingConfig) {
      const sampleButton = this.db
        .prepare('SELECT position_x, lead_ms, hierarchy_level FROM buttons WHERE config_id = ? LIMIT 1')
        .get(existingConfig.id);
      
      // If metadata is present (or the window is intentionally blank), no need to re-migrate
      if (!sampleButton || sampleButton.position_x !== null || sampleButton.lead_ms !== null) {
        console.log('Button config already migrated with full metadata');
        return { migrated: false, reason: 'Already migrated' };
      }
      
      // Metadata is missing, re-migrate with full data
      console.log('Re-migrating button config with full metadata...');
      
      // Delete existing buttons to re-insert with metadata
      this.db.prepare('DELETE FROM buttons WHERE config_id = ?').run(existingConfig.id);
    } else {
      console.log('Migrating button config...');
    }
    
    const tx = this.db.transaction(() => {
      // Get or create config
      let configId;
      if (existingConfig) {
        configId = existingConfig.id;
      } else {
        configId = this.createCodingWindow('Default', 'Migrated from legacy configuration');
        this.setDefaultCodingWindow(configId);
      }
      
      // Migrate buttons with full metadata
      const insertStmt = this.db.prepare(
        `INSERT INTO buttons (
          config_id, key, label, code, type, category, colour, hotkey, sort_order,
          position_x, position_y, position_width, position_height,
          style_opacity, style_font_size, style_font_weight,
          lead_ms, lag_ms, possession_state, hierarchy_level,
          transition_type, for_possession_state, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      );
      
      legacyConfig.forEach((button, index) => {
        insertStmt.run(
          configId,
          button.code || `button_${index}`,
          button.label || '',
          button.code || '',
          button.type || 'phase',
          button.category || null,
          button.style?.colour || button.colour || '#666666',
          button.hotkey || null,
          index,
          button.position?.x || null,
          button.position?.y || null,
          button.position?.width || null,
          button.position?.height || null,
          button.style?.opacity || null,
          button.style?.font_size || null,
          button.style?.font_weight || null,
          button.lead_ms || null,
          button.lag_ms || null,
          button.possession_state || null,
          button.hierarchy_level || null,
          button.transition_type || null,
          button.for_possession_state || null
        );
      });
    });
    
    tx();
    
    console.log('Button config migration complete');
    return { migrated: true, configId: this.getDefaultCodingWindow().id };
  }

  // ==================== Data Browser Operations ====================

  listTables() {
    const rows = this.db
      .prepare(
        `SELECT name FROM sqlite_master 
         WHERE type='table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`
      )
      .all();
    
    // Filter out legacy tables that shouldn't be shown in Data Browser
    const hiddenTables = ['button_config'];
    return rows.map((row) => row.name).filter(name => !hiddenTables.includes(name));
  }

  // Guards against SQL injection via renderer-supplied identifiers, which
  // can't be parameterised with placeholders in SQLite.
  _assertValidTable(tableName) {
    if (!this.listTables().includes(tableName)) {
      throw new Error(`Unknown table: ${tableName}`);
    }
  }

  _assertValidColumns(tableName, columnNames) {
    const schema = this.getTableSchema(tableName);
    const validColumns = new Set(schema.columns.map((col) => col.name));
    for (const column of columnNames) {
      if (!validColumns.has(column)) {
        throw new Error(`Unknown column '${column}' on table ${tableName}`);
      }
    }
  }

  getTableSchema(tableName) {
    this._assertValidTable(tableName);

    // Get column information
    const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
    
    // Get foreign key information
    const foreignKeys = this.db.prepare(`PRAGMA foreign_key_list(${tableName})`).all();
    
    return {
      columns: columns.map((col) => ({
        name: col.name,
        type: col.type,
        notNull: col.notnull === 1,
        defaultValue: col.dflt_value,
        isPrimaryKey: col.pk === 1,
      })),
      foreignKeys: foreignKeys.map((fk) => ({
        column: fk.from,
        referencedTable: fk.table,
        referencedColumn: fk.to,
      })),
    };
  }

  getTableData(tableName, options = {}) {
    this._assertValidTable(tableName);
    const { limit = 100, offset = 0, orderBy = null, orderDir = 'ASC', filters = {} } = options;

    this._assertValidColumns(tableName, Object.keys(filters));
    if (orderBy) {
      this._assertValidColumns(tableName, [orderBy]);
    }

    // Build WHERE clause from filters
    let whereClause = '';
    const filterParams = [];

    if (Object.keys(filters).length > 0) {
      const conditions = [];
      for (const [column, value] of Object.entries(filters)) {
        if (value !== null && value !== undefined && value !== '') {
          conditions.push(`${column} LIKE ?`);
          filterParams.push(`%${value}%`);
        }
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }

    // Build ORDER BY clause
    let orderClause = '';
    if (orderBy) {
      const direction = orderDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      orderClause = `ORDER BY ${orderBy} ${direction}`;
    }

    const query = `
      SELECT * FROM ${tableName}
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;
    
    const rows = this.db.prepare(query).all(...filterParams, limit, offset);
    return rows;
  }

  getRowCount(tableName, filters = {}) {
    this._assertValidTable(tableName);
    this._assertValidColumns(tableName, Object.keys(filters));

    let whereClause = '';
    const filterParams = [];
    
    if (Object.keys(filters).length > 0) {
      const conditions = [];
      for (const [column, value] of Object.entries(filters)) {
        if (value !== null && value !== undefined && value !== '') {
          conditions.push(`${column} LIKE ?`);
          filterParams.push(`%${value}%`);
        }
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }
    
    const query = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`;
    const result = this.db.prepare(query).get(...filterParams);
    return result.count;
  }

  getRelatedData(tableName, rowId) {
    this._assertValidTable(tableName);

    // Get the schema to find foreign keys
    const schema = this.getTableSchema(tableName);
    const related = {};
    
    // For each table, check if it has foreign keys pointing to this table
    const allTables = this.listTables();
    for (const otherTable of allTables) {
      if (otherTable === tableName) continue;
      
      const otherSchema = this.getTableSchema(otherTable);
      const fkToThisTable = otherSchema.foreignKeys.find(
        (fk) => fk.referencedTable === tableName
      );
      
      if (fkToThisTable) {
        // Find primary key of current table
        const pkColumn = schema.columns.find((col) => col.isPrimaryKey);
        if (pkColumn) {
          const rows = this.db
            .prepare(`SELECT * FROM ${otherTable} WHERE ${fkToThisTable.column} = ?`)
            .all(rowId);
          if (rows.length > 0) {
            related[otherTable] = rows;
          }
        }
      }
    }
    
    return related;
  }

  updateTableRow(tableName, rowId, columnUpdates) {
    this._assertValidTable(tableName);
    const schema = this.getTableSchema(tableName);
    const pkColumn = schema.columns.find((col) => col.isPrimaryKey);

    if (!pkColumn) {
      throw new Error(`Table ${tableName} has no primary key`);
    }

    this._assertValidColumns(tableName, Object.keys(columnUpdates));

    const setClause = Object.keys(columnUpdates)
      .map((col) => `${col} = ?`)
      .join(', ');
    const values = Object.values(columnUpdates);
    
    const query = `UPDATE ${tableName} SET ${setClause} WHERE ${pkColumn.name} = ?`;
    const result = this.db.prepare(query).run(...values, rowId);
    
    return result.changes > 0;
  }

  deleteTableRow(tableName, rowId) {
    this._assertValidTable(tableName);
    const schema = this.getTableSchema(tableName);
    const pkColumn = schema.columns.find((col) => col.isPrimaryKey);
    
    if (!pkColumn) {
      throw new Error(`Table ${tableName} has no primary key`);
    }
    
    const query = `DELETE FROM ${tableName} WHERE ${pkColumn.name} = ?`;
    const result = this.db.prepare(query).run(rowId);
    
    return result.changes > 0;
  }

  deleteTableRows(tableName, rowIds) {
    this._assertValidTable(tableName);
    const schema = this.getTableSchema(tableName);
    const pkColumn = schema.columns.find((col) => col.isPrimaryKey);
    
    if (!pkColumn) {
      throw new Error(`Table ${tableName} has no primary key`);
    }
    
    const placeholders = rowIds.map(() => '?').join(',');
    const query = `DELETE FROM ${tableName} WHERE ${pkColumn.name} IN (${placeholders})`;
    const result = this.db.prepare(query).run(...rowIds);
    
    return result.changes;
  }

  insertTableRow(tableName, rowData) {
    this._assertValidTable(tableName);
    this._assertValidColumns(tableName, Object.keys(rowData));

    const columns = Object.keys(rowData);
    const values = Object.values(rowData);
    const placeholders = columns.map(() => '?').join(',');
    
    const query = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;
    const result = this.db.prepare(query).run(...values);
    
    return result.lastInsertRowid;
  }

  // ==================== Utility ====================

  close() {
    this.db.close();
  }

  vacuum() {
    this.db.exec('VACUUM');
  }

  getStats() {
    const matchCount = this.db.prepare('SELECT COUNT(*) as count FROM matches').get().count;
    const phaseCount = this.db.prepare('SELECT COUNT(*) as count FROM phases').get().count;
    const autosaveCount = this.db.prepare('SELECT COUNT(*) as count FROM autosaves').get().count;

    return { matchCount, phaseCount, autosaveCount };
  }
}
