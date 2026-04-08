// Writes docs/schema-overview.md from lib/db/schema.ts.
// Optional JSON: scripts/schema-overview.config.json — relationshipLines, columnQuotes.
// npm run docs:schema  |  npm run docs:schema -- --config path/to.json

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "../lib/db/schema";
import { getTableName, isTable, type Table } from "drizzle-orm";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFile = path.join(root, "docs/schema-overview.md");
const defaultConfig = path.join(root, "scripts/schema-overview.config.json");

const symCols = Symbol.for("drizzle:Columns");
const symFks = Symbol.for("drizzle:PgInlineForeignKeys");

type Config = {
   relationshipLines?: string[];
   columnQuotes?: Record<string, string>;
};

type Col = {
   name: string;
   primary: boolean;
   columnType: string;
   enum?: { enumName: string };
};

function readConfig(p: string): Config {
   if (!fs.existsSync(p)) {
      console.warn(`no config at ${p}, using auto FK lines only`);
      return {};
   }
   return JSON.parse(fs.readFileSync(p, "utf8")) as Config;
}

function tables(): Table[] {
   const t: Table[] = [];
   for (const x of Object.values(schema)) {
      if (isTable(x)) t.push(x);
   }
   return t.sort((a, b) => getTableName(a).localeCompare(getTableName(b)));
}

function mermaidType(c: Col): string {
   if (c.columnType === "PgEnumColumn" && c.enum?.enumName) {
      return `${c.enum.enumName} ${c.name}`;
   }
   const pg: Record<string, string> = {
      PgUUID: "uuid",
      PgText: "text",
      PgTimestamp: "timestamp",
      PgInteger: "int",
      PgBoolean: "boolean",
      PgJsonb: "jsonb",
   };
   const t =
      pg[c.columnType] ?? c.columnType.replace(/^Pg/, "").toLowerCase();
   return `${t} ${c.name}`;
}

function fkColumnKeys(ts: Table[]): Set<string> {
   const s = new Set<string>();
   for (const tbl of ts) {
      const child = getTableName(tbl);
      const fks = (tbl as unknown as Record<symbol, unknown>)[symFks] as
         | { reference: () => { columns: { name: string }[] } }[]
         | undefined;
      if (!fks) continue;
      for (const fk of fks) {
         for (const c of fk.reference().columns) {
            s.add(`${child}.${c.name}`);
         }
      }
   }
   return s;
}

function edgesFromFks(ts: Table[]): string[] {
   const out: string[] = [];
   for (const tbl of ts) {
      const child = getTableName(tbl);
      const fks = (tbl as unknown as Record<symbol, unknown>)[symFks] as
         | {
              reference: () => {
                 columns: { name: string; isUnique: boolean }[];
                 foreignTable: Table;
              };
           }[]
         | undefined;
      if (!fks) continue;
      for (const fk of fks) {
         const r = fk.reference();
         const col = r.columns[0]!;
         const parent = getTableName(r.foreignTable);
         const label = col.name.replace(/_id$/, "") || col.name;
         const mid = col.isUnique ? "||--o|" : "||--o{";
         out.push(`    ${parent} ${mid} ${child} : "${label}"`);
      }
   }
   return out.sort((a, b) => a.localeCompare(b));
}

function entity(
   tbl: Table,
   fkCols: Set<string>,
   quotes: Record<string, string>,
): string {
   const name = getTableName(tbl);
   const cols = (tbl as unknown as Record<symbol, unknown>)[symCols] as Record<
      string,
      Col
   >;
   const lines = [`    ${name} {`];
   for (const c of Object.values(cols)) {
      const k = `${name}.${c.name}`;
      let row = `        ${mermaidType(c)}`;
      if (c.primary) row += " PK";
      else if (fkCols.has(k)) row += " FK";
      const q = quotes[k];
      if (q) row += ` "${q}"`;
      lines.push(row);
   }
   lines.push("    }");
   return lines.join("\n");
}

function pgEnums(): { name: string; values: string[] }[] {
   const rows: { name: string; values: string[] }[] = [];
   for (const x of Object.values(schema)) {
      if (
         typeof x === "function" &&
         "enumName" in x &&
         Array.isArray((x as { enumValues?: string[] }).enumValues)
      ) {
         const e = x as { enumName: string; enumValues: string[] };
         rows.push({ name: e.enumName, values: [...e.enumValues] });
      }
   }
   return rows.sort((a, b) => a.name.localeCompare(b.name));
}

let configPath = defaultConfig;
for (let i = 2; i < process.argv.length; i++) {
   if (process.argv[i] === "--config" && process.argv[i + 1]) {
      configPath = path.resolve(root, process.argv[++i]!);
   }
}

const cfg = readConfig(configPath);
const ts = tables();
const fkCols = fkColumnKeys(ts);
const quotes = cfg.columnQuotes ?? {};

const blocks = ts.map((t) => entity(t, fkCols, quotes));
const rel =
   cfg.relationshipLines?.length
      ? cfg.relationshipLines.map((l) => `    ${l.trim()}`)
      : edgesFromFks(ts);

const enumMd =
   "| Enum | Values |\n|---|---|\n" +
   pgEnums()
      .map(
         (e) =>
            `| \`${e.name}\` | ${e.values.map((v) => `\`${v}\``).join(", ")} |`,
      )
      .join("\n");

const body = ["erDiagram", ...blocks, "", ...rel].join("\n");

fs.writeFileSync(
   outFile,
   `# MCLD Platform — Full Schema Overview

<!-- Generated — edit lib/db/schema + config, then npm run docs:schema -->

\`\`\`mermaid
${body}
\`\`\`

## Enums

${enumMd}
`,
   "utf8",
);

console.log(path.relative(process.cwd(), outFile));
