import { describe, expect, it } from "vitest";
import { isPassing, parse, resultsToString } from "../src/parser.js";

describe("TAP 13 Parser", () => {
  it("should parse TAP version and basic passing tests", () => {
    const tap = `TAP version 13
1..2
ok 1 first test
ok 2 second test
`;
    const results = parse(tap);
    expect(results.tapVersion).toBe(13);
    expect(results.foundTapData).toBe(true);
    expect(results.expectedTests).toBe(2);
    expect(results.totalTests).toBe(2);
    expect(results.passedTests).toBe(2);
    expect(results.failedTests).toBe(0);
    expect(results.tests).toHaveLength(2);
    expect(results.tests[0].testNumber).toBe(1);
    expect(results.tests[0].description).toBe("first test");
    expect(results.tests[0].passed).toBe(true);
    expect(results.isPassing()).toBe(true);
  });

  it("should parse failing tests and diagnostics", () => {
    const tap = `TAP version 13
1..2
ok 1 first test
not ok 2 second test
`;
    const results = parse(tap);
    expect(results.totalTests).toBe(2);
    expect(results.passedTests).toBe(1);
    expect(results.failedTests).toBe(1);
    expect(results.tests[1].passed).toBe(false);
    expect(results.tests[1].failed).toBe(true);
    expect(results.isPassing()).toBe(false);
  });

  it("should parse skip and todo directives", () => {
    const tap = `TAP version 13
1..3
ok 1 regular pass
not ok 2 # skip not ready yet
ok 3 # todo implement feature
`;
    const results = parse(tap);
    expect(results.totalTests).toBe(3);
    expect(results.passedTests).toBe(1);
    expect(results.skippedTests).toBe(1);
    expect(results.todoTests).toBe(1);
    expect(results.failedTests).toBe(0);

    expect(results.tests[1].skipped).toBe(true);
    expect(results.tests[1].directiveText).toBe("skip not ready yet");

    expect(results.tests[2].todo).toBe(true);
    expect(results.tests[2].directiveText).toBe("todo implement feature");
    expect(results.isPassing()).toBe(true);
  });

  it("should parse YAML diagnostic blocks", () => {
    const tap = `TAP version 13
1..1
not ok 1 test with yaml
  ---
  message: "Failed"
  severity: fail
  ...
`;
    const results = parse(tap);
    expect(results.totalTests).toBe(1);
    expect(results.tests[0].yamlBytes).toBe('  message: "Failed"\n  severity: fail\n');
  });

  it("should parse explanations and diagnostics", () => {
    const tap = `TAP version 13
# Suite Name
# Group Name
ok 1 test 1
# Next Group
ok 2 test 2
1..2
`;
    const results = parse(tap);
    expect(results.explanation).toEqual(["Suite Name", "Group Name"]);
    expect(results.tests[0].diagnostics).toEqual(["Next Group"]);
  });

  it("should parse bailout lines", () => {
    const tap = `TAP version 13
Bail out! Database connection failed
`;
    const results = parse(tap);
    expect(results.bailOut).toBe(true);
    expect(results.bailOutReason).toBe("Database connection failed");
    expect(results.isPassing()).toBe(false);
  });

  it("should generate results string representation", () => {
    const tap = `TAP version 13
1..3
ok 1 test 1
not ok 2 test 2
ok 3 # skip test 3
`;
    const results = parse(tap);
    const str = resultsToString(results);
    expect(str).toContain("Overall result: FAIL");
    expect(str).toContain("Total tests run: 3");
    expect(str).toContain("Passed tests: 1");
    expect(str).toContain("Failed tests: 1");
    expect(str).toContain("Skipped tests: 1");
  });
});
