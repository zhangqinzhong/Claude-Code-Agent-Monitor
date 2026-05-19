#!/usr/bin/env node

/**
 * Claude Code hook handler.
 * Receives hook event JSON on stdin and forwards it to the Agent Dashboard API.
 * Designed to fail silently so it never blocks Claude Code.
 *
 * @author Son Nguyen <hoangson091104@gmail.com>
 */

const http = require("http");

const hookType = process.argv[2] || "unknown";

/**
 * Resolve the dashboard server port. The conventional port is 4820, but the
 * desktop app's embedded server falls back to the next free port when 4820 is
 * already taken (e.g. by an SSH tunnel) and records its live port in a
 * discovery file. Prefer that file so events always reach the running server;
 * fall back to the CLAUDE_DASHBOARD_PORT override or 4820 if discovery is
 * unavailable for any reason. This must never throw — the handler stays
 * fail-safe so it can never block Claude Code.
 */
function resolvePort() {
  try {
    return require("../server/lib/server-info").resolveDashboardPort();
  } catch {
    const envPort = parseInt(process.env.CLAUDE_DASHBOARD_PORT || "", 10);
    return Number.isInteger(envPort) && envPort > 0 ? envPort : 4820;
  }
}

const port = resolvePort();

let input = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let parsedData;
  try {
    parsedData = JSON.parse(input);
  } catch {
    parsedData = { raw: input };
  }

  const payload = JSON.stringify({
    hook_type: hookType,
    data: parsedData,
  });

  const req = http.request(
    {
      hostname: "127.0.0.1",
      port,
      path: "/api/hooks/event",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
      timeout: 3000,
    },
    (res) => {
      res.resume();
      process.exit(0);
    }
  );

  req.on("error", () => process.exit(0));
  req.on("timeout", () => {
    req.destroy();
    process.exit(0);
  });

  req.write(payload);
  req.end();
});

// Safety net timeout
setTimeout(() => process.exit(0), 5000);
