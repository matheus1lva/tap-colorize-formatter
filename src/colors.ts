// Zero-dependency ANSI color utility for terminal styling

const hasProcess = typeof process !== "undefined";
const env = hasProcess ? process.env : {};
const argv = hasProcess ? process.argv : [];

function checkColorSupport(): boolean {
  if (!hasProcess) return true;
  if ("NO_COLOR" in env || argv.includes("--no-color")) return false;
  if ("FORCE_COLOR" in env || argv.includes("--color")) return true;
  if (process.stdout && !process.stdout.isTTY) return false;
  return true;
}

let colorEnabled = checkColorSupport();

export function setColorEnabled(enabled: boolean): void {
  colorEnabled = enabled;
}

export function isColorEnabled(): boolean {
  return colorEnabled;
}

function style(open: string, close: string) {
  return (str: string | number): string => {
    const s = String(str);
    if (!colorEnabled || !s) return s;
    return `${open}${s}${close}`;
  };
}

export const bold = style("\x1b[1m", "\x1b[22m");
export const faint = style("\x1b[2m", "\x1b[22m");
export const dim = faint;
export const italic = style("\x1b[3m", "\x1b[23m");
export const underline = style("\x1b[4m", "\x1b[24m");

export const red = style("\x1b[31m", "\x1b[39m");
export const green = style("\x1b[32m", "\x1b[39m");
export const yellow = style("\x1b[33m", "\x1b[39m");
export const blue = style("\x1b[34m", "\x1b[39m");
export const magenta = style("\x1b[35m", "\x1b[39m");
export const cyan = style("\x1b[36m", "\x1b[39m");

export const brightRed = style("\x1b[91m", "\x1b[39m");
export const brightMagenta = style("\x1b[95m", "\x1b[39m");

export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}
