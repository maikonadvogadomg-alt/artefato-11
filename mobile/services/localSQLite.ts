import { Platform } from "react-native";

let db: any = null;
let currentDbName = "devmobile_local";

async function getDB(): Promise<any> {
  if (Platform.OS === "web") {
    throw new Error("SQLite não disponível na web");
  }
  if (!db) {
    const SQLite = await import("expo-sqlite");
    db = await SQLite.openDatabaseAsync(currentDbName);
  }
  return db;
}

export function getCurrentDbName(): string {
  return currentDbName;
}

export async function switchDatabase(name: string): Promise<void> {
  if (Platform.OS === "web") return;
  if (db) {
    await db.closeAsync();
    db = null;
  }
  currentDbName = name.endsWith(".db") ? name : `${name}.db`;
  const SQLite = await import("expo-sqlite");
  db = await SQLite.openDatabaseAsync(currentDbName);
}

export async function listTables(): Promise<string[]> {
  if (Platform.OS === "web") return [];
  const database = await getDB();
  const rows = await database.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ) as { name: string }[];
  return rows.map((r: { name: string }) => r.name);
}

export async function runSQL(query: string): Promise<{ rows: Record<string, unknown>[]; changes?: number; lastInsertRowId?: number; isSelect: boolean }> {
  if (Platform.OS === "web") {
    throw new Error("SQLite não disponível na web. Teste no celular.");
  }
  const database = await getDB();
  const trimmed = query.trim();
  const upperCmd = trimmed.toUpperCase().replace(/\s+/g, " ");

  const isSelect =
    upperCmd.startsWith("SELECT") ||
    upperCmd.startsWith("PRAGMA") ||
    upperCmd.startsWith("EXPLAIN") ||
    upperCmd.startsWith("WITH");

  if (isSelect) {
    const rows = await database.getAllAsync(trimmed) as Record<string, unknown>[];
    return { rows, isSelect: true };
  } else {
    const result = await database.runAsync(trimmed);
    return {
      rows: [],
      changes: result.changes,
      lastInsertRowId: result.lastInsertRowId ?? undefined,
      isSelect: false,
    };
  }
}

export async function formatSQLResult(
  query: string
): Promise<string> {
  if (Platform.OS === "web") {
    return "⚠️ SQLite não disponível na web. Use o app no celular.";
  }
  try {
    const result = await runSQL(query);
    if (result.isSelect) {
      if (result.rows.length === 0) return "(0 linhas)";
      const cols = Object.keys(result.rows[0]);
      const widths = cols.map((c) => Math.max(c.length, ...result.rows.map((r) => String(r[c] ?? "").length)));
      const header = cols.map((c, i) => c.padEnd(widths[i])).join(" │ ");
      const sep = widths.map((w) => "─".repeat(w)).join("─┼─");
      const rowLines = result.rows.map((r) =>
        cols.map((c, i) => String(r[c] ?? "NULL").padEnd(widths[i])).join(" │ ")
      );
      return [header, sep, ...rowLines, `\n(${result.rows.length} linha${result.rows.length !== 1 ? "s" : ""})`].join("\n");
    } else {
      return `✅ OK — ${result.changes ?? 0} linha(s) afetada(s)${result.lastInsertRowId ? ` · ROWID=${result.lastInsertRowId}` : ""}`;
    }
  } catch (e: unknown) {
    throw new Error(e instanceof Error ? e.message : String(e));
  }
}
