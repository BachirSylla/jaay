// Runs the pgTAP files of supabase/tests against the linked DEV project, without Docker.
//
// `supabase test db --linked` needs Docker (pg_prove image). Instead, each file goes through
// `supabase db query --linked`, which only returns the rows of the LAST row-returning
// statement. So each file is rewritten on the fly: every top-level pgTAP call
// (`select plan(`, `select ok(`, `select * from finish(`…) inserts its TAP lines into a temp
// table, and a final select returns the whole TAP output just before the file's `rollback;`.
// The test files themselves stay plain pgTAP.
//
// A file fails when: the query errors, a line starts with "not ok", finish() prints a
// diagnostic ("# Looks like…"), or the number of results differs from the plan.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Never run against production: the linked project must be the dev project.
const DEV_PROJECT_REF = "bixrtirfupirfbljsszu";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const linkedRef = existsSync("supabase/.temp/project-ref")
  ? readFileSync("supabase/.temp/project-ref", "utf8").trim()
  : "";
if (linkedRef !== DEV_PROJECT_REF) {
  console.error(
    `Refusing to run: linked project is "${linkedRef}", expected dev "${DEV_PROJECT_REF}".`,
  );
  process.exit(1);
}

const TAP_CALL = /^select\s+(\*\s+from\s+)?([a-z_]+)\s*\(/i;
const SETUP = [
  "create temp table _tap (id integer generated always as identity, line text);",
  "grant all on _tap to public;",
].join("\n");

function instrument(sql) {
  const lines = sql.split(/\r?\n/);
  const out = [];
  let setupDone = false;
  let rollbackFound = false;

  for (const line of lines) {
    if (/^rollback;\s*$/i.test(line)) {
      out.push("select line from _tap order by id;");
      out.push(line);
      rollbackFound = true;
      continue;
    }
    const match = TAP_CALL.exec(line);
    if (match) {
      if (!setupDone) {
        out.push(SETUP);
        setupDone = true;
      }
      // Each pgTAP call returns one or more TAP lines: store them instead of returning them.
      out.push(line.replace(/^select\s+/i, "insert into _tap (line) select "));
      continue;
    }
    out.push(line);
  }

  if (!rollbackFound) throw new Error("test file must end with `rollback;`");
  return out.join("\n");
}

function runQuery(file) {
  const result = spawnSync(
    "supabase",
    ["db", "query", "--linked", "--output-format", "json", "-f", file],
    { encoding: "utf8", shell: process.platform === "win32", cwd: process.cwd() },
  );
  return result;
}

function parseRows(stdout) {
  const start = stdout.indexOf("{");
  if (start === -1) return null;
  try {
    return JSON.parse(stdout.slice(start)).rows ?? [];
  } catch {
    return null;
  }
}

const testDir = "supabase/tests";
const files = readdirSync(testDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const only = process.argv.slice(2);
const selected = only.length ? files.filter((f) => only.some((o) => f.includes(o))) : files;

const workDir = mkdtempSync(join(tmpdir(), "jaay-pgtap-"));
let failedFiles = 0;
let totalTests = 0;

try {
  for (const name of selected) {
    const source = readFileSync(join(testDir, name), "utf8");
    const instrumented = join(workDir, name);
    writeFileSync(instrumented, instrument(source));

    const result = runQuery(instrumented);
    const rows = result.status === 0 ? parseRows(result.stdout) : null;
    const problems = [];
    let planned = null;
    let ran = 0;

    if (rows === null) {
      problems.push((result.stdout + result.stderr).trim().split("\n").slice(-3).join("\n"));
    } else {
      for (const { line } of rows) {
        if (line == null) continue;
        const plan = /^1\.\.(\d+)/.exec(line);
        if (plan) planned = Number(plan[1]);
        else if (/^not ok/.test(line)) {
          ran += 1;
          problems.push(line);
        } else if (/^ok \d+/.test(line)) ran += 1;
        else if (/^#/.test(line) && !/^#\s*$/.test(line)) problems.push(line);
      }
      if (planned === null) problems.push("no plan() found");
      else if (planned !== ran) problems.push(`planned ${planned} tests but ran ${ran}`);
    }

    if (problems.length) {
      failedFiles += 1;
      console.error(`✗ ${name}`);
      for (const problem of problems) console.error(`    ${problem}`);
    } else {
      totalTests += ran;
      console.log(`✓ ${name} (${ran} tests)`);
    }
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

if (failedFiles) {
  console.error(`\n${failedFiles} file(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${totalTests} tests passed in ${selected.length} file(s).`);
