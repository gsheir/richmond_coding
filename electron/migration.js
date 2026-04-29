// Migration script to import existing JSON files into SQLite database
import * as fs from 'fs';
import * as path from 'path';

export class DatabaseMigration {
  constructor(database, matchesDir) {
    this.database = database;
    this.matchesDir = matchesDir;
  }

  // Migrate all JSON match files to database
  migrateMatches() {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      skipped: 0,
    };

    try {
      if (!fs.existsSync(this.matchesDir)) {
        console.log('Matches directory does not exist, nothing to migrate');
        return results;
      }

      const files = fs.readdirSync(this.matchesDir);
      const matchFiles = files.filter(
        (file) =>
          file.endsWith('.json') &&
          !file.startsWith('.') &&
          file !== '.autosave.json'
      );

      console.log(`Found ${matchFiles.length} match files to migrate`);

      for (const file of matchFiles) {
        try {
          const filePath = path.join(this.matchesDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const match = JSON.parse(content);

          // Validate required fields
          if (!match.id || !match.date || !match.homeTeam || !match.awayTeam) {
            console.warn(`Skipping invalid match file: ${file}`);
            results.skipped++;
            continue;
          }

          // Check if already exists in database
          const existing = this.database.loadMatch(match.id);
          if (existing) {
            console.log(`Match ${match.id} already exists in database, skipping`);
            results.skipped++;
            continue;
          }

          // Save to database
          this.database.saveMatch(match);
          results.success++;
          console.log(`Migrated match: ${match.id}`);
        } catch (error) {
          console.error(`Failed to migrate ${file}:`, error);
          results.failed++;
          results.errors.push({ file, error: String(error) });
        }
      }

      console.log(
        `Migration complete: ${results.success} successful, ${results.failed} failed, ${results.skipped} skipped`
      );
    } catch (error) {
      console.error('Migration failed:', error);
      results.errors.push({ error: String(error) });
    }

    return results;
  }

  // Migrate settings from JSON to database
  migrateSettings(settingsPath) {
    try {
      if (!fs.existsSync(settingsPath)) {
        console.log('No settings file to migrate');
        return { success: false, message: 'No settings file found' };
      }

      const content = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(content);

      // Check if already exists
      const existing = this.database.loadSettings();
      if (existing) {
        console.log('Settings already exist in database, skipping');
        return { success: false, message: 'Settings already exist' };
      }

      // Validate settings
      if (
        !settings.defaultHomeTeam ||
        !settings.autosaveDirectory ||
        settings.defaultLeadMs === undefined ||
        settings.defaultLagMs === undefined
      ) {
        throw new Error('Invalid settings file');
      }

      // Save to database
      this.database.saveSettings(settings);
      console.log('Settings migrated successfully');
      return { success: true };
    } catch (error) {
      console.error('Failed to migrate settings:', error);
      return { success: false, error: String(error) };
    }
  }

  // Migrate autosave files from JSON to database
  migrateAutosaves(autosaveDir = null) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      skipped: 0,
    };

    try {
      // Use provided directory or check common locations
      const autosaveDirs = autosaveDir 
        ? [autosaveDir]
        : [
            this.matchesDir, // Default matches directory
            path.join(this.matchesDir, '..', '.autosave'), // Parent .autosave
            path.join(process.cwd(), '.autosave'), // Project .autosave
          ];

      for (const dir of autosaveDirs) {
        if (!fs.existsSync(dir)) continue;

        const files = fs.readdirSync(dir);
        const autosaveFiles = files.filter((file) => 
          file.endsWith('.json') && (file === '.autosave.json' || file.includes('autosave'))
        );

        console.log(`Checking ${dir} for autosave files...`);
        
        for (const file of autosaveFiles) {
          try {
            const filePath = path.join(dir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const match = JSON.parse(content);

            // Validate required fields
            if (!match.id || !match.date || !match.homeTeam || !match.awayTeam) {
              console.warn(`Skipping invalid autosave file: ${file}`);
              results.skipped++;
              continue;
            }

            // Determine tab ID from filename
            let tabId = 'autosave'; // Default for .autosave.json
            if (file !== '.autosave.json') {
              // Extract match ID from filename for other autosaves
              tabId = `autosave-${match.id}`;
            }

            // Save to database
            this.database.saveAutosave(tabId, match);
            results.success++;
            console.log(`Migrated autosave: ${file} (tabId: ${tabId})`);
          } catch (error) {
            console.error(`Failed to migrate autosave ${file}:`, error);
            results.failed++;
            results.errors.push({ file, error: String(error) });
          }
        }
      }

      console.log(
        `Autosave migration complete: ${results.success} successful, ${results.failed} failed, ${results.skipped} skipped`
      );
    } catch (error) {
      console.error('Autosave migration failed:', error);
      results.errors.push({ error: String(error) });
    }

    return results;
  }

  // Create backup of JSON files before migration
  createBackup(backupDir) {
    try {
      if (!fs.existsSync(this.matchesDir)) {
        return { success: false, message: 'No matches directory to backup' };
      }

      // Create backup directory with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupPath = path.join(backupDir, `json_backup_${timestamp}`);
      
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }

      // Copy all JSON files
      const files = fs.readdirSync(this.matchesDir);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      let copied = 0;
      for (const file of jsonFiles) {
        const srcPath = path.join(this.matchesDir, file);
        const destPath = path.join(backupPath, file);
        fs.copyFileSync(srcPath, destPath);
        copied++;
      }

      console.log(`Backed up ${copied} files to ${backupPath}`);
      return { success: true, backupPath, fileCount: copied };
    } catch (error) {
      console.error('Backup failed:', error);
      return { success: false, error: String(error) };
    }
  }

  // Verify database matches JSON files
  verifyMigration() {
    const results = {
      verified: 0,
      mismatched: 0,
      errors: [],
    };

    try {
      if (!fs.existsSync(this.matchesDir)) {
        return results;
      }

      const files = fs.readdirSync(this.matchesDir);
      const matchFiles = files.filter(
        (file) =>
          file.endsWith('.json') &&
          !file.startsWith('.') &&
          file !== '.autosave.json'
      );

      for (const file of matchFiles) {
        try {
          const filePath = path.join(this.matchesDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const jsonMatch = JSON.parse(content);

          const dbMatch = this.database.loadMatch(jsonMatch.id);

          if (!dbMatch) {
            results.mismatched++;
            results.errors.push({
              file,
              error: 'Match not found in database',
            });
            continue;
          }

          // Basic verification - check key fields match
          if (
            dbMatch.date !== jsonMatch.date ||
            dbMatch.homeTeam !== jsonMatch.homeTeam ||
            dbMatch.awayTeam !== jsonMatch.awayTeam ||
            dbMatch.phases.length !== jsonMatch.phases.length
          ) {
            results.mismatched++;
            results.errors.push({
              file,
              error: 'Match data mismatch between JSON and database',
            });
            continue;
          }

          results.verified++;
        } catch (error) {
          results.mismatched++;
          results.errors.push({ file, error: String(error) });
        }
      }

      console.log(
        `Verification complete: ${results.verified} verified, ${results.mismatched} mismatched`
      );
    } catch (error) {
      console.error('Verification failed:', error);
      results.errors.push({ error: String(error) });
    }

    return results;
  }
}
