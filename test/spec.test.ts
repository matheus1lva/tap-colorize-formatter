import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { setColorEnabled, stripAnsi } from "../src/colors.js";
import { parse } from "../src/parser.js";
import { SpecFormatter } from "../src/spec.js";

describe("Spec Formatter", () => {
  const exampleFile = path.resolve(__dirname, "fixtures/example.txt");
  const exampleTap = fs.readFileSync(exampleFile, "utf-8");

  it("should format TAP results to spec output string", () => {
    setColorEnabled(false);
    const results = parse(exampleTap);
    const formatter = new SpecFormatter();
    const formatted = formatter.formatToString(results);
    const summary = formatter.summaryToString();

    expect(formatted).toContain("THIS IS A SUITE");
    expect(formatted).toContain("test 1");
    expect(formatted).toContain("✓ this test should pass");
    expect(formatted).toContain("test 2");
    expect(formatted).toContain("⨯ this test should fail");
    expect(formatted).toContain("operator: ok");
    expect(formatted).toContain("↷ skipped a test to ignore");
    expect(formatted).toContain("🗹TO DO: must do something");
    expect(formatted).toContain("⚠ Aborted: Somethings amiss");

    expect(summary).toContain("Failed Tests: There was 1 failure");
    expect(summary).toContain("total:     6");
    expect(summary).toContain("passing:   3");
    expect(summary).toContain("failing:   1");
    expect(summary).toContain("skipped:   1");
    expect(summary).toContain("tasks:     1");
    setColorEnabled(true);
  });

  it("should format multiple failures with correct pluralization", () => {
    setColorEnabled(false);
    const tap = `TAP version 13
1..2
not ok 1 first failure
not ok 2 second failure
`;
    const results = parse(tap);
    const formatter = new SpecFormatter();
    formatter.formatToString(results);
    const summary = formatter.summaryToString();

    expect(summary).toContain("Failed Tests: There were 2 failures");
    setColorEnabled(true);
  });

  it("should format no tests found", () => {
    setColorEnabled(false);
    const tap = `TAP version 13
1..0
`;
    const results = parse(tap);
    const formatter = new SpecFormatter();
    formatter.formatToString(results);
    const summary = formatter.summaryToString();

    expect(summary).toContain("No tests found");
    setColorEnabled(true);
  });
});
