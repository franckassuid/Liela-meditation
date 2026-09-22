import { build } from "esbuild";
await build({ entryPoints: ["workers/reminders/index.ts"], outfile: "workers/reminders/dist/worker.js", bundle: true, format: "esm", platform: "browser", target: "es2022" });
