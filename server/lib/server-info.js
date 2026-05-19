/**
 * @file server-info.js
 * @description Live discovery of the running dashboard server's TCP port.
 *
 * The conventional port is 4820, and a plain `npm start` setup almost always
 * binds it. But the embedded server inside the macOS desktop app falls back to
 * the next free port (4821, 4822, …) whenever 4820 is already taken — for
 * example by an unrelated SSH tunnel. When that happens the Claude Code hook
 * handler must still be able to find the server, otherwise every event is
 * POSTed to the wrong listener and the dashboard stays empty.
 *
 * The contract is intentionally tiny: on startup the server writes its live
 * port (plus its PID) to a small JSON file under the Claude Code home
 * directory — the one location the hook handler can locate deterministically,
 * with no environment variables. `resolveDashboardPort()` reads it back and
 * verifies the recorded process is still alive so a stale file left by a
 * crashed server can never misdirect events.
 *
 * Every function here is best-effort and never throws: discovery must never
 * block server startup, and the hook handler must never fail because of it.
 *
 * @author Son Nguyen <hoangson091104@gmail.com>
 */

const fs = require("fs");
const path = require("path");

const { getClaudeHome } = require("./claude-home");

/** Conventional dashboard port — used when discovery yields nothing. */
const DEFAULT_PORT = 4820;

/** Absolute path of the discovery file. */
function getServerInfoPath() {
  return path.join(getClaudeHome(), ".agent-dashboard.json");
}

/**
 * Record the live server port so the hook handler (and any other local
 * consumer) can find it. Written atomically via a temp file + rename so a
 * concurrently-running hook never reads a half-written file. Best-effort: a
 * failure here is logged-by-omission and never interrupts server startup.
 *
 * @param {number} port - The port the HTTP server is listening on.
 */
function writeServerInfo(port) {
  if (!Number.isInteger(port) || port <= 0) return;
  try {
    const dir = getClaudeHome();
    fs.mkdirSync(dir, { recursive: true });
    const payload = JSON.stringify(
      { port, pid: process.pid, startedAt: new Date().toISOString() },
      null,
      2
    );
    const finalPath = getServerInfoPath();
    const tmpPath = `${finalPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, payload);
    fs.renameSync(tmpPath, finalPath);
  } catch {
    // Discovery is an optimization, not a requirement — never block startup.
  }
}

/** Remove the discovery file. Best-effort; safe to call when it is absent. */
function removeServerInfo() {
  try {
    fs.unlinkSync(getServerInfoPath());
  } catch {
    // Already gone, or never written — nothing to do.
  }
}

/**
 * Whether a process is still running. `process.kill(pid, 0)` sends no signal;
 * it only probes existence. EPERM means the process exists but is owned by
 * another user — still "alive" for our purposes.
 *
 * @param {number} pid
 * @returns {boolean}
 */
function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return Boolean(err) && err.code === "EPERM";
  }
}

/**
 * Resolve the port the dashboard server is listening on.
 *
 * Resolution order, most to least authoritative:
 *   1. `CLAUDE_DASHBOARD_PORT` — explicit operator override; always wins.
 *   2. The discovery file — but only if the server process that wrote it is
 *      still alive, so a stale file from a crashed run is ignored.
 *   3. `DEFAULT_PORT` (4820) — the conventional fallback.
 *
 * @returns {number}
 */
function resolveDashboardPort() {
  const envPort = parseInt(process.env.CLAUDE_DASHBOARD_PORT || "", 10);
  if (Number.isInteger(envPort) && envPort > 0) return envPort;

  try {
    const info = JSON.parse(fs.readFileSync(getServerInfoPath(), "utf8"));
    if (Number.isInteger(info.port) && info.port > 0 && isPidAlive(info.pid)) {
      return info.port;
    }
  } catch {
    // No discovery file, unreadable, or invalid JSON — fall through.
  }
  return DEFAULT_PORT;
}

module.exports = {
  DEFAULT_PORT,
  getServerInfoPath,
  writeServerInfo,
  removeServerInfo,
  resolveDashboardPort,
};
