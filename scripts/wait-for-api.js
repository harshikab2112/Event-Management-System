const { spawn } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const frontendRoot = path.join(projectRoot, 'frontend');
const healthUrl = process.env.API_HEALTH_URL || 'http://127.0.0.1:3000/api/health';
const deadline = Date.now() + 60_000;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForHealthyApi() {
  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1800) });
      const health = await response.json();
      if (response.ok && health.database === 'connected') return;
    } catch (_) {
      // The API process or its database connection may still be starting.
    }
    await delay(400);
  }
  throw new Error('API did not become healthy within 60 seconds. Check the backend startup and Atlas connection.');
}

async function main() {
  await waitForHealthyApi();
  console.log('API is healthy. Starting the frontend.');
  const vite = spawn(process.execPath, [path.join(frontendRoot, 'node_modules', 'vite', 'bin', 'vite.js')], {
    cwd: frontendRoot,
    stdio: 'inherit'
  });
  const forwardSignal = (signal) => { if (!vite.killed) vite.kill(signal); };
  process.on('SIGINT', () => forwardSignal('SIGINT'));
  process.on('SIGTERM', () => forwardSignal('SIGTERM'));
  vite.on('error', (error) => { console.error('Could not start Vite:', error.message); process.exitCode = 1; });
  vite.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
