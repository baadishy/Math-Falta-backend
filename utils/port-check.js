const net = require("net");
const { exec } = require("child_process");

function _checkOnce(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (err) => {
      server.close();
      reject(err);
    });
    server.once("listening", () => {
      server.close();
      resolve();
    });
    // Try to bind to both IPv6/IPv4 wildcards by default
    server.listen(port);
  });
}

function _diagnosePort(port) {
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      const cmd = `powershell -NoProfile -Command "try{ $p=(Get-NetTCPConnection -LocalPort ${port} -ErrorAction Stop).OwningProcess; if($p){Get-Process -Id $p | Select-Object Id,ProcessName,Path,StartTime} } catch { Write-Output 'no process found' }"`;
      exec(cmd, { windowsHide: true, timeout: 2000 }, (err, stdout, stderr) => {
        const out = (stdout || stderr || "").toString().trim();
        resolve(out || "no diagnostics available");
      });
    } else {
      // Try lsof on unix-like systems
      const cmd = `lsof -i :${port} -sTCP:LISTEN -n -P`;
      exec(cmd, { timeout: 2000 }, (err, stdout, stderr) => {
        const out = (stdout || stderr || "").toString().trim();
        resolve(out || "no diagnostics available");
      });
    }
  });
}

async function ensurePortFree(port, options = {}) {
  const retries = options.retries == null ? 3 : options.retries;
  const delay = options.delay == null ? 500 : options.delay;

  for (let i = 0; i < retries; i++) {
    try {
      await _checkOnce(port);
      return;
    } catch (err) {
      if (err.code === "EADDRINUSE") {
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        const diag = await _diagnosePort(port);
        const details = `Port ${port} appears to be in use.\n${diag}`;
        const hint =
          process.platform === "win32"
            ? `Run: powershell "Get-NetTCPConnection -LocalPort ${port} | Format-List -Property *" and then "taskkill /PID <pid> /F" to stop the process.`
            : `Run: lsof -i :${port} -sTCP:LISTEN -n -P to find and kill the process, for example: kill $(lsof -t -i :${port})`;
        throw new Error(`${details}\n${hint}`);
      }
      throw err;
    }
  }
}

module.exports = { ensurePortFree };
