/**
 * Regenerates docs/schema-overview.md from lib/db/schema.ts (Drizzle runtime introspection).
 *
 * Usage:
 *   npm run docs:schema
 *   npm run docs:schema -- --config scripts/schema-overview.config.json
 *
 * Config (default: scripts/schema-overview.config.json):
 *   - relationshipLines: optional string[] — mermaid ER edges (one line each, no leading spaces).
 *     If omitted or empty, edges are auto-derived from FK metadata (labels = column name without _id).
 *   - columnQuotes: optional Record<"table.column", "annotation"> — extra quoted text on columns
 *     (schema code cannot carry these human notes).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "../lib/db/schema";
import { getTableName, isTable, type Table } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs/schema-overview.md");
const DEFAULT_CONFIG = path.join(__dirname, "schema-overview.config.json");

/** Drizzle stores these on PgTable; not on the public `Table` type. */
function pgColumns(table: Table): Record<string, unknown> {
   return (table as unknown as Record<symbol, unknown>)[
      Symbol.for("drizzle:Columns")
   ] as Record<string, unknown>;
}

function pgInlineForeignKeys(table: Table): unknown[] | undefined {
   return (table as unknown as Record<symbol, unknown>)[
      Symbol.for("drizzle:PgInlineForeignKeys")
   ] as unknown[] | undefined;
}

type OverviewConfig = {
   relationshipLines?: string[];
   columnQuotes?: Record<string, string>;
};

function parseArgs(): { configPath: string } {
   const args = process.argv.slice(2);
   let configPath = DEFAULT_CONFIG;
   for (let i = 0; i < args.length; i++) {
      if (args[i] === "--config" && args[i + 1]) {
         configPath = path.resolve(ROOT, args[i + 1]!);
         i++;
      }
      if (args[i] === "--help" || args[i] === "-h") {
         console.log(`Usage: tsx scripts/generate-schema-overview.ts [--config path/to/config.json]`);
         process.exit(0);
      }
   }
   return { configPath };
}

function loadConfig(configPath: string): OverviewConfig {
   if (!fs.existsSync(configPath)) {
      console.warn(`generate-schema-overview: no config at ${configPath}, using FK auto-lines only.`);
      return {};
   }
   const raw = fs.readFileSync(configPath, "utf8");
   return JSON.parse(raw) as OverviewConfig;
}

function collectTables(): Table[] {
   const tables: Table[] = [];
   for (const v of Object.values(schema)) {
      if (isTable(v)) tables.push(v);
   }
   tables.sort((a, b) => getTableName(a).localeCompare(getTableName(b)));
   return tables;
}

function mapMermaidType(col: {
   name: string;
   columnType: string;
   enum?: { enumName: string };
}): string {
   if (col.columnType === "PgEnumColumn" && col.enum?.enumName) {
      return `${col.enum.enumName} ${col.name}`;
   }
   const map: Record<string, string> = {
      PgUUID: "uuid",
      PgText: "text",
      PgTimestamp: "timestamp",
      PgInteger: "int",
      PgBoolean: "boolean",
      PgJsonb: "jsonb",
   };
   const t = map[col.columnType] ?? col.columnType.replace(/^Pg/, "").toLowerCase();
   return `${t} ${col.name}`;
}

function collectFkColumns(tables: Table[]): Set<string> {
   const keys = new Set<string>();
   for (const table of tables) {
      const childName = getTableName(table);
      const fks = pgInlineForeignKeys(table) as
         | { reference: () => { columns: { name: string }[] } }[]
         | undefined;
      if (!fks?.length) continue;
      for (const fk of fks) {
         const ref = fk.reference();
         for (const c of ref.columns) {
            keys.add(`${childName}.${c.name}`);
         }
      }
   }
   return keys;
}

function fkLabel(columnName: string): string {
   return columnName.replace(/_id$/, "") || columnName;
}

function autoRelationshipLines(tables: Table[]): string[] {
   const lines: string[] = [];
   for (const table of tables) {
      const childName = getTableName(table);
      const fks = pgInlineForeignKeys(table) as
         | {
              reference: () => {
                 columns: { name: string; isUnique: boolean }[];
                 foreignTable: Table;
              };
              table: Table;
           }[]
         | undefined;
      if (!fks?.length) continue;
      for (const fk of fks) {
         const ref = fk.reference();
         const parentName = getTableName(ref.foreignTable);
         const col = ref.columns[0]!;
         const label = fkLabel(col.name);
         const conn = col.isUnique ? "||--o|" : "||--o{";
         lines.push(`    ${parentName} ${conn} ${childName} : "${label}"`);
      }
   }
   lines.sort((a, b) => a.localeCompare(b));
   return lines;
}

function buildEntityBlock(
   table: Table,
   fkCols: Set<string>,
   columnQuotes: Record<string, string>,
): string {
   const sqlName = getTableName(table);
   const cols = pgColumns(table);
   const lines: string[] = [`    ${sqlName} {`];
   for (const col of Object.values(cols)) {
      const c = col as {
         name: string;
         primary: boolean;
         columnType: string;
         enum?: { enumName: string };
      };
      const key = `${sqlName}.${c.name}`;
      const base = mapMermaidType(c);
      let field = `        ${base}`;
      if (c.primary) field += " PK";
      else if (fkCols.has(key)) field += " FK";
      const q = columnQuotes[key];
      if (q) field += ` "${q}"`;
      lines.push(field);
   }
   lines.push("    }");
   return lines.join("\n");
}

function collectEnums(): { name: string; values: string[] }[] {
   const out: { name: string; values: string[] }[] = [];
   for (const v of Object.values(schema)) {
      if (
         typeof v === "function" &&
         "enumName" in v &&
         Array.isArray((v as { enumValues?: string[] }).enumValues)
      ) {
         const fn = v as { enumName: string; enumValues: string[] };
         out.push({ name: fn.enumName, values: [...fn.enumValues] });
      }
   }
   out.sort((a, b) => a.name.localeCompare(b.name));
   return out;
}

function normalizeRelationshipLine(line: string): string {
   const t = line.trim();
   return t.endsWith("\n") ? t.slice(0, -1) : t;
}

function main() {
   const { configPath } = parseArgs();
   const config = loadConfig(configPath);
   const tables = collectTables();
   const fkCols = collectFkColumns(tables);
   const columnQuotes = config.columnQuotes ?? {};

   const entityBlocks = tables.map((t) =>
      buildEntityBlock(t, fkCols, columnQuotes),
   );

   let relLines =
      config.relationshipLines?.length && config.relationshipLines.length > 0
         ? config.relationshipLines!.map((l) =>
              `    ${normalizeRelationshipLine(l)}`,
           )
         : autoRelationshipLines(tables);

   const enums = collectEnums();
   const enumTable =
      "| Enum | Values |\n|---|---|\n" +
      enums
         .map(
            (e) =>
               `| \`${e.name}\` | ${e.values.map((v) => `\`${v}\``).join(", ")} |`,
         )
         .join("\n");

   const mermaid = [
      "erDiagram",
      ...entityBlocks,
      "",
      ...relLines,
   ].join("\n");

   const md = `# MCLD Platform — Full Schema Overview

<!-- Generated by scripts/generate-schema-overview.ts — do not edit by hand; run npm run docs:schema -->

\`\`\`mermaid
${mermaid}
\`\`\`

## Enums

${enumTable}
`;

   fs.writeFileSync(OUT, md, "utf8");
   console.log(`Wrote ${path.relative(ROOT, OUT)}`);
}

main();
