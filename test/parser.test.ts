import test from "brittle";
import { parse, resultsToString } from "../src/parser.js";

test("TAP 13 Parser", function (t) {
  t.test("parse TAP version and basic passing tests", function (t) {
    const tap = `TAP version 13
1..2
ok 1 first test
ok 2 second test
`;
    const results = parse(tap);
    t.is(results.tapVersion, 13);
    t.ok(results.foundTapData);
    t.is(results.expectedTests, 2);
    t.is(results.totalTests, 2);
    t.is(results.passedTests, 2);
    t.is(results.failedTests, 0);
    t.is(results.tests.length, 2);
    t.is(results.tests[0].testNumber, 1);
    t.is(results.tests[0].description, "first test");
    t.ok(results.tests[0].passed);
    t.ok(results.isPassing());
  });

  t.test("parse failing tests and diagnostics", function (t) {
    const tap = `TAP version 13
1..2
ok 1 first test
not ok 2 second test
`;
    const results = parse(tap);
    t.is(results.totalTests, 2);
    t.is(results.passedTests, 1);
    t.is(results.failedTests, 1);
    t.absent(results.tests[1].passed);
    t.ok(results.tests[1].failed);
    t.absent(results.isPassing());
  });

  t.test("parse skip and todo directives", function (t) {
    const tap = `TAP version 13
1..3
ok 1 regular pass
not ok 2 # skip not ready yet
ok 3 # todo implement feature
`;
    const results = parse(tap);
    t.is(results.totalTests, 3);
    t.is(results.passedTests, 1);
    t.is(results.skippedTests, 1);
    t.is(results.todoTests, 1);
    t.is(results.failedTests, 0);

    t.ok(results.tests[1].skipped);
    t.is(results.tests[1].directiveText, "skip not ready yet");

    t.ok(results.tests[2].todo);
    t.is(results.tests[2].directiveText, "todo implement feature");
    t.ok(results.isPassing());
  });

  t.test("parse YAML diagnostic blocks", function (t) {
    const tap = `TAP version 13
1..1
not ok 1 test with yaml
  ---
  message: "Failed"
  severity: fail
  ...
`;
    const results = parse(tap);
    t.is(results.totalTests, 1);
    t.is(results.tests[0].yamlBytes, '  message: "Failed"\n  severity: fail\n');
  });

  t.test("parse explanations and diagnostics", function (t) {
    const tap = `TAP version 13
# Suite Name
# Group Name
ok 1 test 1
# Next Group
ok 2 test 2
1..2
`;
    const results = parse(tap);
    t.alike(results.explanation, ["Suite Name", "Group Name"]);
    t.alike(results.tests[0].diagnostics, ["Next Group"]);
  });

  t.test("parse bailout lines", function (t) {
    const tap = `TAP version 13
Bail out! Database connection failed
`;
    const results = parse(tap);
    t.ok(results.bailOut);
    t.is(results.bailOutReason, "Database connection failed");
    t.absent(results.isPassing());
  });

  t.test("generate results string representation", function (t) {
    const tap = `TAP version 13
1..3
ok 1 test 1
not ok 2 test 2
ok 3 # skip test 3
`;
    const results = parse(tap);
    const str = resultsToString(results);
    t.ok(str.includes("Overall result: FAIL"));
    t.ok(str.includes("Total tests run: 3"));
    t.ok(str.includes("Passed tests: 1"));
    t.ok(str.includes("Failed tests: 1"));
    t.ok(str.includes("Skipped tests: 1"));
  });
});
