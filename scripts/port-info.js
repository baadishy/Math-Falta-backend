#!/usr/bin/env node
// Simple helper to print information about the process using a TCP port (cross-platform convenience)
const { exec } = require("child_process");
const port = process.argv[2] || process.env.PORT || 3000;

if (process.platform === "win32") {
  const cmd = `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} | Format-List -Property *"`;
  exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
    if (err) console.error(stderr || err.message);
    console.log(stdout || stderr || `No output for port ${port}`);
  });
} else {
  const cmd = `lsof -i :${port} -sTCP:LISTEN -n -P`;
  exec(cmd, (err, stdout, stderr) => {
    if (err) console.error(stderr || err.message);
    console.log(stdout || stderr || `No output for port ${port}`);
  });
}
