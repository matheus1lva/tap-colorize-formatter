import {
  blue,
  bold,
  brightRed,
  cyan,
  faint,
  green,
  red,
  underline,
  yellow,
} from "./colors.js";
import type { Formatter, Results, Test } from "./types.js";

export class SpecFormatter implements Formatter {
  public results: Results | null = null;
  public failedTests: Test[] = [];

  public formatToString(results: Results): string {
    this.results = results;
    let out = "";
    let suite = "";

    if (results.explanation.length > 1 && suite !== results.explanation[0]) {
      suite = results.explanation[0];
      out += `\n  ${bold(suite)}\n\n`;

      suite = results.explanation[results.explanation.length - 1];
      out += `  ${underline(suite)}\n\n`;
    } else if (results.explanation.length === 1) {
      suite = results.explanation[0];
      out += `\n  ${underline(suite)}\n\n`;
    }

    let suitechanged = false;
    const failedtests: Test[] = [];

    for (let i = 0; i < results.tests.length; i++) {
      const test = results.tests[i];

      if (test.skipped) {
        const icon = "\u21B7";
        const cleanedDirective = test.directiveText.replace(/skip/gi, "").trim();
        out += `    ${faint(blue(icon))} ${faint(blue("skipped"))} ${faint(blue(cleanedDirective))}\n`;
      } else if (test.todo) {
        const icon = "🗹";
        const cleanedDirective = test.directiveText.replace(/todo/gi, "").trim();
        out += `    ${yellow(icon)}${bold(yellow("TO DO:"))} ${yellow(cleanedDirective)}\n`;
      } else {
        if (test.passed) {
          out += `    ${green("\u2713")} ${faint(test.description)}\n`;
        } else {
          failedtests.push(test);

          let begin = "";
          if (test.yamlBytes.length > 0 && !suitechanged && i > 0) {
            begin = "\n";
          }

          out += this.formatFail(test, false, begin);
        }

        out += this.formatDetail(test);
      }

      suitechanged = false;

      if (test.diagnostics.length > 0 && test.testNumber < results.totalTests) {
        suite = test.diagnostics[0];
        suitechanged = true;
        out += `\n  ${underline(suite)}\n\n`;
      }
    }

    if (results.bailOut) {
      let sep = "";
      if (results.bailOutReason.trim().length > 0) {
        sep = ": ";
      }
      out += `\n  ${bold(yellow("\u26A0 Aborted"))}${yellow(sep)}${yellow(results.bailOutReason)}\n`;
    }

    this.failedTests = failedtests;
    return out;
  }

  public summaryToString(): string {
    if (!this.results) return "";
    const results = this.results;
    const failedtests = this.failedTests;
    let out = "";

    if (results.totalTests === 0) {
      out += "  No tests found\n\n";
    } else {
      if (failedtests.length > 0) {
        const tense = failedtests.length === 1 ? "was" : "were";
        const action = failedtests.length === 1 ? "failure" : "failures";

        out += `\n  ${bold(brightRed("Failed Tests:"))} There ${tense} ${bold(brightRed(String(failedtests.length)))} ${action}\n\n`;

        for (const test of failedtests) {
          out += this.formatFail(test, false);
        }
        out += "\n";
      }

      out += `  total:     ${results.totalTests}\n`;
      out += `  ${green("passing:")}   ${green(results.passedTests)}\n`;
      out += `  ${red("failing:")}   ${red(results.failedTests)}\n`;
      if (results.skippedTests > 0) {
        out += `  ${blue("skipped:")}   ${blue(results.skippedTests)}\n`;
      }
      if (results.todoTests > 0) {
        out += `  ${yellow("tasks:")}     ${yellow(results.todoTests)}\n`;
      }
      out += "\n\n";
    }

    return out;
  }

  public format(results: Results): void {
    const text = this.formatToString(results);
    if (text) {
      process.stdout.write(text);
    }
  }

  public summary(): void {
    const text = this.summaryToString();
    if (text) {
      process.stdout.write(text);
    }
  }

  private formatFail(test: Test, info = false, prefix = ""): string {
    let out = `${prefix}    ${red("\u2A2F")} ${faint(red(test.description))}\n`;
    if (info) {
      out += this.formatDetail(test);
    }
    return out;
  }

  private formatDetail(test: Test): string {
    if (test.yamlBytes.length === 0) return "";

    const chars = "-".repeat(Math.max(test.description.length + 2, 3));
    let out = `    ${faint(red(chars))}\n`;
    out += formatYaml(test.yamlBytes);
    return out;
  }
}

export function formatSpec(results: Results): SpecFormatter {
  const formatter = new SpecFormatter();
  formatter.format(results);
  formatter.summary();
  return formatter;
}

const yamlKey = /^(\s*)([A-Za-z_][\w-]*)\s*:/;
const caretLine = /^\s*-+\^\s*$/;

function formatYaml(yaml: string): string {
  const lines = yaml.split("\n");
  let out = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = yamlKey.exec(line);

    if (key && (key[2] === "source" || key[2] === "stack")) {
      const keyIndent = key[1].length;
      const block: string[] = [];
      i++;
      while (i < lines.length) {
        const next = lines[i];
        if (next.trim() === "") {
          i++;
          continue;
        }
        const nextKey = yamlKey.exec(next);
        if (nextKey && nextKey[1].length <= keyIndent) break;
        block.push(next);
        i++;
      }
      if (key[2] === "source") {
        out += formatSourceBlock(block);
      } else {
        for (const l of block) {
          out += `  ${faint(l)}\n`;
        }
      }
      continue;
    }

    if (line.trim() !== "") {
      out += `  ${cyan(line)}\n`;
    }
    i++;
  }

  return out;
}

function formatSourceBlock(lines: string[]): string {
  const caretAt = lines.findIndex((line) => caretLine.test(line));
  let out = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const error = caretAt >= 0 && (i === caretAt || i === caretAt - 1);
    out += `  ${error ? red(line) : faint(line)}\n`;
  }
  return out;
}
