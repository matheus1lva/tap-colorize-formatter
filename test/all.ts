import test, { load } from "brittle";

test.pause();
await load(import.meta.resolve("./parser.test.ts"));
await load(import.meta.resolve("./spec.test.ts"));
await load(import.meta.resolve("./json.test.ts"));
await load(import.meta.resolve("./cli.test.ts"));
test.resume();
