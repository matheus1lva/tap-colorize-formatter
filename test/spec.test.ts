import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "brittle";
import { setColorEnabled } from "../src/colors.js";
import { parse } from "../src/parser.js";
import { SpecFormatter } from "../src/spec.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const exampleTap = fs.readFileSync(path.join(dir, "fixtures/example.txt"), "utf-8");

test("Spec Formatter", function (t) {
  t.test("format TAP results to spec output string", function (t) {
    setColorEnabled(false);
    t.teardown(() => setColorEnabled(true));

    const results = parse(exampleTap);
    const formatter = new SpecFormatter();
    const formatted = formatter.formatToString(results);
    const summary = formatter.summaryToString();

    t.ok(formatted.includes("THIS IS A SUITE"));
    t.ok(formatted.includes("test 1"));
    t.ok(formatted.includes("✓ this test should pass"));
    t.ok(formatted.includes("test 2"));
    t.ok(formatted.includes("⨯ this test should fail"));
    t.ok(formatted.includes("operator: ok"));
    t.ok(formatted.includes("↷ skipped a test to ignore"));
    t.ok(formatted.includes("🗹TO DO: must do something"));
    t.ok(formatted.includes("⚠ Aborted: Somethings amiss"));

    t.ok(summary.includes("Failed Tests: There was 1 failure"));
    t.ok(summary.includes("total:     6"));
    t.ok(summary.includes("passing:   3"));
    t.ok(summary.includes("failing:   1"));
    t.ok(summary.includes("skipped:   1"));
    t.ok(summary.includes("tasks:     1"));
  });

  t.test("format multiple failures with correct pluralization", function (t) {
    setColorEnabled(false);
    t.teardown(() => setColorEnabled(true));

    const tap = `TAP version 13
1..2
not ok 1 first failure
not ok 2 second failure
`;
    const results = parse(tap);
    const formatter = new SpecFormatter();
    formatter.formatToString(results);
    const summary = formatter.summaryToString();

    t.ok(summary.includes("Failed Tests: There were 2 failures"));
  });

  t.test("format no tests found", function (t) {
    setColorEnabled(false);
    t.teardown(() => setColorEnabled(true));

    const tap = `TAP version 13
1..0
`;
    const results = parse(tap);
    const formatter = new SpecFormatter();
    formatter.formatToString(results);
    const summary = formatter.summaryToString();

    t.ok(summary.includes("No tests found"));
  });
});
