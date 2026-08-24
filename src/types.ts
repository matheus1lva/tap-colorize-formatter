export interface Test {
  testNumber: number;
  passed: boolean;
  failed: boolean;
  skipped: boolean;
  todo: boolean;
  description: string;
  directiveText: string;
  diagnostics: string[];
  yamlBytes: string;
}

export interface Results {
  expectedTests: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  todoTests: number;
  tapVersion: number;
  bailOut: boolean;
  bailOutReason: string;
  foundTapData: boolean;
  tests: Test[];
  lines: string[];
  explanation: string[];
  isPassing(): boolean;
  toString(): string;
}

export interface TestResult {
  suite?: string;
  group?: string;
  test_number: number;
  passed: boolean;
  directive?: string;
  description: string;
  info?: string;
}

export interface ResultSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  expected: number;
  bailout?: boolean;
  bailout_reason?: string;
  failures?: TestResult[];
}

export interface JsonResults {
  version: number;
  summary: ResultSummary;
  results: TestResult[];
}

export interface Formatter {
  format(results: Results): void;
  summary(): void;
  formatToString?(results: Results): string;
  summaryToString?(): string;
}

export type FormatterType = "spec" | "json";
