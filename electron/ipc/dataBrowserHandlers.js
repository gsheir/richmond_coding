// IPC handlers backing the generic Data Browser (table/row CRUD).
export function registerDataBrowserHandlers({ registerHandler, getDatabase }) {
  registerHandler('db:list-tables', async () => {
    const tables = getDatabase().listTables();
    return { success: true, tables };
  }, { requireDatabase: true });

  registerHandler('db:get-table-schema', async (_event, tableName) => {
    const schema = getDatabase().getTableSchema(tableName);
    return { success: true, schema };
  }, { requireDatabase: true });

  registerHandler('db:get-table-data', async (_event, tableName, options) => {
    const database = getDatabase();
    const rows = database.getTableData(tableName, options);
    const totalCount = database.getRowCount(tableName, options.filters || {});
    return { success: true, rows, totalCount };
  }, { requireDatabase: true });

  registerHandler('db:get-row-count', async (_event, tableName, filters) => {
    const count = getDatabase().getRowCount(tableName, filters || {});
    return { success: true, count };
  }, { requireDatabase: true });

  registerHandler('db:get-related-data', async (_event, tableName, rowId) => {
    const related = getDatabase().getRelatedData(tableName, rowId);
    return { success: true, related };
  }, { requireDatabase: true });

  registerHandler('db:update-row', async (_event, tableName, rowId, columnUpdates) => {
    const updated = getDatabase().updateTableRow(tableName, rowId, columnUpdates);
    return { success: true, updated };
  }, { requireDatabase: true });

  registerHandler('db:delete-row', async (_event, tableName, rowId) => {
    const deleted = getDatabase().deleteTableRow(tableName, rowId);
    return { success: true, deleted };
  }, { requireDatabase: true });

  registerHandler('db:delete-rows', async (_event, tableName, rowIds) => {
    const deletedCount = getDatabase().deleteTableRows(tableName, rowIds);
    return { success: true, deletedCount };
  }, { requireDatabase: true });

  registerHandler('db:insert-row', async (_event, tableName, rowData) => {
    const insertedId = getDatabase().insertTableRow(tableName, rowData);
    return { success: true, insertedId };
  }, { requireDatabase: true });
}
