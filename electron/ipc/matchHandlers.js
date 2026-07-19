// IPC handlers for match save/load/list/delete and autosave.
export function registerMatchHandlers({ registerHandler, getDatabase }) {
  registerHandler('save-match', async (_event, _matchId, matchData) => {
    const match = JSON.parse(matchData);

    if (!match.id || !match.date || !match.homeTeam || !match.awayTeam) {
      throw new Error('Invalid match: missing required fields');
    }

    getDatabase().saveMatch(match);
    return { success: true };
  }, { requireDatabase: true });

  registerHandler('load-match', async (_event, matchId) => {
    const match = getDatabase().loadMatch(matchId);
    if (!match) {
      throw new Error('Match not found');
    }
    return { success: true, data: JSON.stringify(match) };
  }, { requireDatabase: true });

  registerHandler('list-matches', async () => {
    const matches = getDatabase().listMatches();
    const data = matches.map((match) => JSON.stringify(match));
    return { success: true, data };
  }, { requireDatabase: true });

  registerHandler('delete-match', async (_event, matchId) => {
    getDatabase().deleteMatch(matchId);
    return { success: true };
  }, { requireDatabase: true });

  registerHandler('autosave-match', async (_event, matchData) => {
    const match = JSON.parse(matchData);
    getDatabase().saveAutosave('autosave', match);
    return { success: true };
  }, { requireDatabase: true });

  registerHandler('load-autosave', async () => {
    const match = getDatabase().loadAutosave('autosave');
    return { success: true, data: match ? JSON.stringify(match) : null };
  }, { requireDatabase: true });
}
