import type { Formatter, JsonResults, Results, ResultSummary, TestResult } from "./types.js";

export class JsonFormatter implements Formatter {
  public results: Results | null = null;

  public toJson(results: Results): JsonResults {
    this.results = results;

    const summary: ResultSummary = {
      total: results.totalTests,
      passed: results.passedTests,
      failed: results.failedTests,
      skipped: results.skippedTests,
      todo: results.todoTests,
      expected: results.expectedTests,
    };

    if (results.bailOut) {
      summary.bailout = true;
      if (results.bailOutReason.trim().length > 0) {
        summary.bailout_reason = results.bailOutReason;
      }
    }

    let suite: string | undefined;
    let group: string | undefined;

    if (results.explanation.length > 1 && suite !== results.explanation[0]) {
      suite = results.explanation[0];
      group = results.explanation[results.explanation.length - 1];
    } else if (results.explanation.length === 1) {
      group = results.explanation[0];
    }

    const testResults: TestResult[] = [];
    const failures: TestResult[] = [];

    for (const test of results.tests) {
      const t: Partial<TestResult> = {};

      if (suite) {
        t.suite = suite;
      }
      if (group) {
        t.group = group;
      }

      t.test_number = test.testNumber;
      t.passed = test.passed;

      let description = test.description;
      let directive: string | undefined;

      if (description.length === 0 && test.directiveText.length > 0) {
        const items = test.directiveText.split(" ");
        directive = items[0];
        description = items.slice(1).join(" ");
      } else if (test.directiveText.length > 0) {
        const items = test.directiveText.split(" ");
        directive = items[0];
      }

      if (directive) {
        t.directive = directive;
      }

      t.description = description;

      if (test.yamlBytes.length > 0) {
        t.info = test.yamlBytes.trim();
      }

      const finalizedTest = t as TestResult;
      testResults.push(finalizedTest);

      if (!finalizedTest.passed && !finalizedTest.directive) {
        failures.push(finalizedTest);
      }

      if (test.diagnostics.length > 0 && test.testNumber < results.totalTests) {
        group = test.diagnostics[0];
      }
    }

    if (failures.length > 0) {
      summary.failures = failures;
    }

    return {
      version: results.tapVersion,
      summary,
      results: testResults,
    };
  }

  public formatToString(results: Results): string {
    const data = this.toJson(results);
    return JSON.stringify(data, null, 2);
  }

  public format(results: Results): void {
    const output = this.formatToString(results);
    console.log(output);
  }

  public summary(): void {
    // JSON formatter outputs everything in format()
  }
}

export function formatJson(results: Results): JsonResults {
  const formatter = new JsonFormatter();
  formatter.format(results);
  return formatter.toJson(results);
}
