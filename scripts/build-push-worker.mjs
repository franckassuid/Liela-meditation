import { build } from "esbuild";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const keys = ["PROJECT_ID", "API_KEY", "AUTH_DOMAIN", "STORAGE_BUCKET", "MESSAGING_SENDER_ID", "APP_ID", "MEASUREMENT_ID", "EMULATORS"];
await build({
  entryPoints: ["src/workers/push.ts"], outfile: "public/push-worker.js", bundle: true,
  format: "iife", platform: "browser", target: "es2020", minify: true,
  define: Object.fromEntries(keys.map(key => [`process.env.NEXT_PUBLIC_FIREBASE_${key}`, JSON.stringify(process.env[`NEXT_PUBLIC_FIREBASE_${key}`] || "")])),
});
