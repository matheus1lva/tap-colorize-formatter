import type { Results, Test } from "./types.js";

const versionLine = /^TAP version (\d+)/;
const bailOutLine = /^Bail out!\s*(\S.*)?$/;
const testLine = /^\s*(not )?ok\b(.*)/;
const optionalTestLine = /^\s*(\d+)?\s*([^#]*?)(?:#\s*((\w*)\s*(.*)))?$/;
const testPlanDeclaration = /^\d+\.\.(\d+)$/;
const diagnostic = /^\s*#(.*)$/;
const runnerComment = /^(ok|not ok)$|^(tests|asserts|time)\s*=/i;
const yamlStart = /^\s*---$/;
const yamlStop = /^\s*\.\.\.$/;

enum ParserState {
  FindVersionString = 0,
  StoreTestMetadata = 1,
  StoreYaml = 2,
}

export function parse(input: string | string[]): Results {
  const lines: string[] = Array.isArray(input) ? input : input.split(/\r?\n/);

  let currentTest: Test | null = null;
  let state = ParserState.FindVersionString;
  let foundTestPlan = false;
  let foundAllTests = false;

  const results: Results = {
    expectedTests: -1,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    todoTests: 0,
    tapVersion: -1,
    bailOut: false,
    bailOutReason: "",
    foundTapData: false,
    tests: [],
    lines,
    explanation: [],
    isPassing() {
      return isPassing(this);
    },
    toString() {
      return resultsToString(this);
    },
  };

  for (const line of lines) {
    switch (state) {
      case ParserState.FindVersionString: {
        const versionMatch = line.match(versionLine);
        if (versionMatch) {
          const v = parseInt(versionMatch[1], 10);
          if (!isNaN(v)) {
            results.tapVersion = v;
            results.foundTapData = true;
            state = ParserState.StoreTestMetadata;
          }
        }
        break;
      }
      case ParserState.StoreTestMetadata: {
        const bailOutMatch = line.match(bailOutLine);
        if (bailOutMatch) {
          results.bailOut = true;
          results.bailOutReason = bailOutMatch[1] ?? "";
          break;
        }

        if (!foundTestPlan) {
          const testPlan = line.match(testPlanDeclaration);
          if (testPlan) {
            const exp = parseInt(testPlan[1], 10);
            if (!isNaN(exp)) {
              results.expectedTests = exp;
              foundTestPlan = true;
            }
          }
        }

        const testLineMatch = line.match(testLine);
        if (testLineMatch) {
          if (currentTest !== null) {
            results.tests.push(currentTest);
          }

          currentTest = {
            testNumber: -1,
            passed: false,
            failed: false,
            skipped: false,
            todo: false,
            description: "",
            directiveText: "",
            diagnostics: [],
            yamlBytes: "",
          };

          if (foundAllTests) {
            continue;
          }

          const optionalContent = testLineMatch[2] ?? "";
          const optionalMatch = optionalContent.match(optionalTestLine);

          if (optionalMatch) {
            const testNumString = optionalMatch[1];
            if (testNumString) {
              const num = parseInt(testNumString, 10);
              currentTest.testNumber = isNaN(num) ? -1 : num;
            }

            const description = (optionalMatch[2] ?? "").trim();
            currentTest.description = description;

            const directive = optionalMatch[4] ?? "";
            const directiveText = optionalMatch[3] ?? "";
            const isFailed = testLineMatch[1] === "not ";

            results.totalTests++;

            if (directive !== "") {
              currentTest.directiveText = directiveText.trim();
            }

            const lowerDirective = directive.toLowerCase();
            if (lowerDirective === "skip") {
              results.skippedTests++;
              currentTest.skipped = true;
            } else if (lowerDirective === "todo") {
              results.todoTests++;
              currentTest.todo = true;
            } else if (isFailed) {
              results.failedTests++;
              currentTest.failed = true;
            } else {
              results.passedTests++;
              currentTest.passed = true;
            }

            if (results.totalTests === results.expectedTests) {
              foundAllTests = true;
            }
          }
        } else if (yamlStart.test(line)) {
          state = ParserState.StoreYaml;
          continue;
        } else {
          const diagMatch = line.match(diagnostic);
          if (diagMatch) {
            const diagnosticLine = (diagMatch[1] ?? "").trim();
            if (diagnosticLine !== "" && !runnerComment.test(diagnosticLine)) {
              if (currentTest !== null) {
                currentTest.diagnostics.push(diagnosticLine);
              } else {
                results.explanation.push(diagnosticLine);
              }
            }
          }
        }
        break;
      }
      case ParserState.StoreYaml: {
        if (yamlStop.test(line)) {
          state = ParserState.StoreTestMetadata;
          continue;
        } else {
          if (currentTest !== null) {
            currentTest.yamlBytes += line + "\n";
          }
        }
        break;
      }
    }
  }

  if (currentTest !== null) {
    results.tests.push(currentTest);
  }

  return results;
}

export function isPassing(r: Results): boolean {
  if (r.tapVersion < 0) {
    return false;
  }
  if (r.bailOut) {
    return false;
  }
  const testCount = r.expectedTests >= 0 ? r.expectedTests : r.totalTests;
  return r.todoTests + r.skippedTests + r.passedTests === testCount;
}

export function resultsToString(r: Results): string {
  let result = "";
  if (isPassing(r)) {
    result += " Overall result: PASS\n";
  } else {
    result += " Overall result: FAIL\n";
  }
  if (r.totalTests === 0 || r.passedTests !== r.totalTests) {
    result += `Total tests run: ${r.totalTests}\n`;
  }
  if (r.expectedTests > 0 && r.expectedTests !== r.totalTests) {
    result += ` Expected tests: ${r.expectedTests}\n`;
  }
  if (r.expectedTests > 0 && r.totalTests < r.expectedTests) {
    result += `  Missing tests: ${r.expectedTests - r.totalTests}\n`;
  }
  if (r.passedTests > 0) {
    result += `   Passed tests: ${r.passedTests}\n`;
  }
  if (r.failedTests > 0) {
    result += `   Failed tests: ${r.failedTests}\n`;
  }
  if (r.skippedTests > 0) {
    result += `  Skipped tests: ${r.skippedTests}\n`;
  }
  if (r.todoTests > 0) {
    result += `     TODO tests: ${r.todoTests}\n`;
  }
  if (r.bailOut) {
    const reason = r.bailOutReason !== "" ? r.bailOutReason : "(no reason given)";
    result += `     Bailed out: ${reason}\n`;
  }
  return result;
}
