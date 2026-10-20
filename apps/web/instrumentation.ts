export async function register() {
  // Validate once when a Node.js server process starts. `next build` also
  // loads instrumentation, but build environments often lack runtime secrets.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { assertServerEnv } = await import("./lib/env");
  assertServerEnv();
}
