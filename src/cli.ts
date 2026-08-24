import fs from "node:fs";
import { bold, brightMagenta, faint, italic, magenta } from "./colors.js";
import { JsonFormatter } from "./json.js";
import { parse } from "./parser.js";
import { SpecFormatter } from "./spec.js";
import type { Formatter } from "./types.js";

function getVersion(): string {
  try {
    const pkgPath = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.version ?? "1.0.1";
  } catch {
    return "1.0.1";
  }
}

function printHelp(): void {
  console.log(`
  tapfmt - Pretty-print TAP results

  Usage:
    myprocess | tapfmt [-f spec]
    cat results.tap | tapfmt [options]

  Options:
    -f, --format <format>  Output format: spec (default), json
    -h, --help             Show help
    -v, --version          Show version
`);
}

export async function run(args: string[] = process.argv.slice(2)): Promise<void> {
  let formatName = "spec";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      return;
    }
    if (arg === "-v" || arg === "--version") {
      console.log(getVersion());
      return;
    }
    if (arg === "-f" || arg === "--format") {
      formatName = args[i + 1] ?? "spec";
      i++;
    } else if (arg.startsWith("-f=")) {
      formatName = arg.slice(3);
    } else if (arg.startsWith("--format=")) {
      formatName = arg.slice(9);
    }
  }

  let formatter: Formatter;
  const normalizedFormat = formatName.trim().toLowerCase();

  switch (normalizedFormat) {
    case "spec":
      formatter = new SpecFormatter();
      break;
    case "json":
      formatter = new JsonFormatter();
      break;
    default:
      console.log(
        `\n\n  ${brightMagenta("\u26A0 Warning: unrecognized formatter,")} ${bold(magenta(formatName))}\n  ${italic(faint("  (using default formatter instead)"))}\n`
      );
      formatter = new SpecFormatter();
      break;
  }

  let receivedData = false;
  let chunks = "";

  const monitor = setTimeout(() => {
    if (!receivedData) {
      console.log("No input stream to format.");
      console.log(faint("usage: myprocess | tapfmt [-f spec]"));
      process.exit(0);
    }
  }, 1000);

  process.stdin.setEncoding("utf-8");

  process.stdin.on("data", (chunk: string) => {
    if (!receivedData) {
      receivedData = true;
      clearTimeout(monitor);
    }
    chunks += chunk;
  });

  await new Promise<void>((resolve, reject) => {
    process.stdin.on("end", () => {
      clearTimeout(monitor);
      if (!receivedData && chunks.length === 0) {
        console.log("No input stream to format.");
        console.log(faint("usage: myprocess | tapfmt [-f spec]"));
        process.exit(0);
      }

      const results = parse(chunks);
      formatter.format(results);
      formatter.summary();
      resolve();
    });

    process.stdin.on("error", (err) => {
      clearTimeout(monitor);
      reject(err);
    });
  });
}

// Only invoke run() if this module is being executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("/tapfmt") || process.argv[1]?.endsWith("/cli.js")) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
