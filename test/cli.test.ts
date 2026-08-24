import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "brittle";

const dir = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(dir, "../src/cli.ts");
const examplePath = path.resolve(dir, "fixtures/example.txt");
const exampleTap = fs.readFileSync(examplePath, "utf-8");

function runCli(args: string[] = [], input?: string): string {
  return execFileSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    input,
  });
}

test("CLI integration", function (t) {
  t.test("output help with --help", function (t) {
    const out = runCli(["--help"]);
    t.ok(out.includes("tapfmt - Pretty-print TAP results"));
    t.ok(out.includes("Options:"));
  });

  t.test("output version with --version", function (t) {
    const out = runCli(["--version"]).trim();
    const pkg = JSON.parse(fs.readFileSync(path.resolve(dir, "../package.json"), "utf8"));
    t.is(out, pkg.version);
  });

  t.test("format piped input with default spec formatter", function (t) {
    const out = runCli([], exampleTap);
    t.ok(out.includes("THIS IS A SUITE"));
    t.ok(out.includes("✓ this test should pass"));
    t.ok(out.includes("total:     6"));
  });

  t.test("format piped input with -f json", function (t) {
    const out = runCli(["-f", "json"], exampleTap);
    const json = JSON.parse(out);
    t.is(json.version, 13);
    t.is(json.summary.total, 6);
    t.is(json.results.length, 6);
  });

  t.test("warn and use spec formatter when unknown format is passed", function (t) {
    const out = runCli(["-f", "unknown"], exampleTap);
    t.ok(out.includes("Warning: unrecognized formatter"));
    t.ok(out.includes("using default formatter instead"));
    t.ok(out.includes("THIS IS A SUITE"));
  });
});
