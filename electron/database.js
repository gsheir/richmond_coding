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

      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      -- Insert initial schema version
      INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (3, datetime('now'));
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

  // ==================== Match Operations ====================

  saveMatch(match) {
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

  loadMatch(matchId) {
    // Load match
    const matchRow = this.db
      .prepare(
        `SELECT id, date, home_team, away_team, clock_time_ms, created_at, modified_at
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
                status, period, termination_event, termination_category, lead_ms, lag_ms
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

  // New normalized schema methods
  
  /**
   * Get all button configurations
   */
  listButtonConfigs() {
    try {
      return this.db
        .prepare('SELECT * FROM button_configs ORDER BY name')
        .all();
    } catch (error) {
      // Table might not exist yet (before migration)
      console.error('Error listing button configs:', error.message);
      return [];
    }
  }

  /**
   * Get the active button configuration
   */
  getActiveButtonConfig() {
    try {
      return this.db
        .prepare('SELECT * FROM button_configs WHERE is_active = 1')
        .get();
    } catch (error) {
      // Table might not exist yet (before migration)
      console.error('Error getting active button config:', error.message);
      return null;
    }
  }

  /**
   * Get a button configuration by ID
   */
  getButtonConfig(configId) {
    return this.db
      .prepare('SELECT * FROM button_configs WHERE id = ?')
      .get(configId);
  }

  /**
   * Create a new button configuration
   */
  createButtonConfig(name, description = null) {
    const result = this.db
      .prepare(
        `INSERT INTO button_configs (name, description, is_active, created_at, updated_at)
         VALUES (?, ?, 0, datetime('now'), datetime('now'))`
      )
      .run(name, description);
    
    return result.lastInsertRowid;
  }

  /**
   * Set a configuration as active (deactivates others)
   */
  setActiveButtonConfig(configId) {
    const tx = this.db.transaction(() => {
      // Deactivate all configs
      this.db.prepare('UPDATE button_configs SET is_active = 0').run();
      
      // Activate the specified config
      this.db
        .prepare('UPDATE button_configs SET is_active = 1, updated_at = datetime(\'now\') WHERE id = ?')
        .run(configId);
    });
    
    tx();
  }

  /**
   * Delete a button configuration (and all its buttons via cascade)
   */
  deleteButtonConfig(configId) {
    // Don't allow deleting the last config
    const count = this.db
      .prepare('SELECT COUNT(*) as count FROM button_configs')
      .get().count;
    
    if (count <= 1) {
      throw new Error('Cannot delete the last button configuration');
    }

    // If deleting the active config, activate another one first
    const config = this.db
      .prepare('SELECT is_active FROM button_configs WHERE id = ?')
      .get(configId);
    
    if (config && config.is_active === 1) {
      const otherConfig = this.db
        .prepare('SELECT id FROM button_configs WHERE id != ? LIMIT 1')
        .get(configId);
      
      if (otherConfig) {
        this.setActiveButtonConfig(otherConfig.id);
      }
    }

    this.db
      .prepare('DELETE FROM button_configs WHERE id = ?')
      .run(configId);
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
          button.position?.x || null,
          button.position?.y || null,
          button.position?.width || null,
          button.position?.height || null,
          button.style?.opacity || null,
          button.style?.font_size || null,
          button.style?.font_weight || null,
          button.lead_ms || button.leadMs || null,
          button.lag_ms || button.lagMs || null,
          button.possession_state || button.possessionState || null,
          button.hierarchy_level || button.hierarchyLevel || null,
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
   * Load the active button configuration
   */
  loadButtonConfig() {
    const config = this.getActiveButtonConfig();
    
    if (!config) {
      return null;
    }
    
    const buttons = this.getButtons(config.id);
    
    // Convert to application format (flat array of buttons with full metadata)
    return buttons.map((btn) => ({
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
   * Migrate from legacy button_config to new schema
   */
  migrateButtonConfig() {
    // Check if we need to migrate or re-migrate with full metadata
    const existingConfig = this.getActiveButtonConfig();
    
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
      
      // If metadata is present, no need to re-migrate
      if (sampleButton && (sampleButton.position_x !== null || sampleButton.lead_ms !== null)) {
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
        configId = this.createButtonConfig('Default', 'Migrated from legacy configuration');
        this.setActiveButtonConfig(configId);
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
    return { migrated: true, configId: this.getActiveButtonConfig().id };
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

  getTableSchema(tableName) {
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
    const { limit = 100, offset = 0, orderBy = null, orderDir = 'ASC', filters = {} } = options;
    
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
    const schema = this.getTableSchema(tableName);
    const pkColumn = schema.columns.find((col) => col.isPrimaryKey);
    
    if (!pkColumn) {
      throw new Error(`Table ${tableName} has no primary key`);
    }
    
    const setClause = Object.keys(columnUpdates)
      .map((col) => `${col} = ?`)
      .join(', ');
    const values = Object.values(columnUpdates);
    
    const query = `UPDATE ${tableName} SET ${setClause} WHERE ${pkColumn.name} = ?`;
    const result = this.db.prepare(query).run(...values, rowId);
    
    return result.changes > 0;
  }

  deleteTableRow(tableName, rowId) {
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
