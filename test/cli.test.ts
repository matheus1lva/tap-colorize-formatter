import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("CLI integration", () => {
  const binPath = path.resolve(__dirname, "../bin/tapfmt.js");
  const examplePath = path.resolve(__dirname, "fixtures/example.txt");

  it("should output help with --help", () => {
    const out = execSync(`node "${binPath}" --help`).toString();
    expect(out).toContain("tapfmt - Pretty-print TAP results");
    expect(out).toContain("Options:");
  });

  it("should output version with --version", () => {
    const out = execSync(`node "${binPath}" --version`).toString().trim();
    expect(out).toBe("1.0.1");
  });

  it("should format piped input with default spec formatter", () => {
    const out = execSync(`cat "${examplePath}" | node "${binPath}"`).toString();
    expect(out).toContain("THIS IS A SUITE");
    expect(out).toContain("✓ this test should pass");
    expect(out).toContain("total:     6");
  });

  it("should format piped input with -f json", () => {
    const out = execSync(`cat "${examplePath}" | node "${binPath}" -f json`).toString();
    const json = JSON.parse(out);
    expect(json.version).toBe(13);
    expect(json.summary.total).toBe(6);
    expect(json.results).toHaveLength(6);
  });

  it("should warn and use spec formatter when unknown format is passed", () => {
    const out = execSync(`cat "${examplePath}" | node "${binPath}" -f unknown`).toString();
    expect(out).toContain("Warning: unrecognized formatter");
    expect(out).toContain("using default formatter instead");
    expect(out).toContain("THIS IS A SUITE");
  });
});
