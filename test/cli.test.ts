import { execFileSync, spawn } from "node:child_process";
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

async function waitUntil(check: () => boolean, ms = 1000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  throw new Error("timed out waiting for streamed output");
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

  t.test("stream spec output before stdin ends", async function (t) {
    const child = spawn(process.execPath, [cli], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });

    child.stdin.write("TAP version 13\nok 1 first\n");
    await waitUntil(() => out.includes("first"));
    t.ok(out.includes("first"));
    t.absent(out.includes("total:"));

    child.stdin.write("ok 2 second\n1..2\n");
    child.stdin.end();
    await new Promise((resolve) => child.once("close", resolve));
    t.ok(out.includes("second"));
    t.ok(out.includes("total:"));
  });

  t.test("wait for a slow first TAP line instead of exiting", async function (t) {
    const child = spawn(process.execPath, [cli], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));
    t.absent(out.includes("No input stream to format."));

    child.stdin.write("TAP version 13\nok 1 late\n1..1\n");
    child.stdin.end();
    await new Promise((resolve) => child.once("close", resolve));
    t.ok(out.includes("late"));
    t.ok(out.includes("total:"));
  });

  t.test("warn and use spec formatter when unknown format is passed", function (t) {
    const out = runCli(["-f", "unknown"], exampleTap);
    t.ok(out.includes("Warning: unrecognized formatter"));
    t.ok(out.includes("using default formatter instead"));
    t.ok(out.includes("THIS IS A SUITE"));
  });
});
