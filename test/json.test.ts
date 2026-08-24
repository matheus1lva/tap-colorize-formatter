import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JsonFormatter } from "../src/json.js";
import { parse } from "../src/parser.js";

describe("JSON Formatter", () => {
  const exampleFile = path.resolve(__dirname, "fixtures/example.txt");
  const exampleTap = fs.readFileSync(exampleFile, "utf-8");

  it("should match expected JSON structure on example.txt", () => {
    const results = parse(exampleTap);
    const formatter = new JsonFormatter();
    const json = formatter.toJson(results);

    expect(json.version).toBe(13);
    expect(json.summary).toEqual({
      total: 6,
      passed: 3,
      failed: 1,
      skipped: 1,
      todo: 1,
      expected: 6,
      bailout: true,
      bailout_reason: "Somethings amiss",
      failures: [
        {
          suite: "THIS IS A SUITE",
          group: "test 2",
          test_number: 2,
          passed: false,
          description: "this test should fail",
          info: "operator: ok\n    expected: true\n    actual:   false\n    at: Test.<anonymous> (/Users/khanh.nguyen/tap-spec/test.js:13:15)",
        },
      ],
    });

    expect(json.results).toHaveLength(6);
    expect(json.results[0]).toEqual({
      suite: "THIS IS A SUITE",
      group: "test 1",
      test_number: 1,
      passed: true,
      description: "this test should pass",
    });

    expect(json.results[3]).toEqual({
      suite: "THIS IS A SUITE",
      group: "test 2",
      test_number: 4,
      passed: false,
      directive: "skip",
      description: "a test to ignore",
    });

    expect(json.results[4]).toEqual({
      suite: "THIS IS A SUITE",
      group: "test 2",
      test_number: 5,
      passed: false,
      directive: "todo",
      description: "must do something",
    });
  });

  it("should handle formatting to JSON string", () => {
    const results = parse(exampleTap);
    const formatter = new JsonFormatter();
    const str = formatter.formatToString(results);
    const parsed = JSON.parse(str);
    expect(parsed.version).toBe(13);
    expect(parsed.summary.total).toBe(6);
  });
});
