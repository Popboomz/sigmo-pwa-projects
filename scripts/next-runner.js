#!/usr/bin/env node

const { execSync, spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mode = process.argv[2];
const cwd = process.env.COZE_WORKSPACE_PATH || process.cwd();
const defaultPort = Number(process.env.DEPLOY_RUN_PORT || 5000);

process.chdir(cwd);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function getPidsOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });

      return [...new Set(
        output
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => line.split(/\s+/).at(-1))
          .filter((pid) => /^\d+$/.test(pid))
      )];
    }

    const output = execSync(`lsof -ti tcp:${port}`, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return [...new Set(output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

function killPortIfListening(port) {
  const pids = getPidsOnPort(port);

  if (pids.length === 0) {
    console.log(`Port ${port} is free.`);
    return;
  }

  console.log(`Port ${port} in use by PIDs: ${pids.join(', ')}. Stopping them...`);

  for (const pid of pids) {
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', pid, '/F', '/T'], {
          cwd,
          stdio: 'ignore',
          shell: true,
        });
      } else {
        process.kill(Number(pid), 'SIGKILL');
      }
    } catch {
      // Ignore individual kill failures and verify port again below.
    }
  }

  const remaining = getPidsOnPort(port);
  if (remaining.length > 0) {
    console.warn(`Warning: port ${port} is still busy: ${remaining.join(', ')}`);
  } else {
    console.log(`Port ${port} cleared.`);
  }
}

function cleanNextArtifacts() {
  const lockFile = path.join(cwd, '.next', 'lock');
  const cacheDir = path.join(cwd, '.next', 'cache');

  try {
    fs.rmSync(lockFile, { force: true });
  } catch {}

  try {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  } catch {}
}

switch (mode) {
  case 'dev': {
    console.log(`Clearing port ${defaultPort} before start.`);
    killPortIfListening(defaultPort);
    console.log(`Starting HTTP service on port ${defaultPort} for dev...`);
    const child = spawn('npx', ['next', 'dev', '--webpack', '--port', String(defaultPort)], {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DEPLOY_RUN_PORT: String(defaultPort),
      },
    });
    child.on('exit', (code) => process.exit(code ?? 0));
    break;
  }

  case 'start': {
    console.log(`Starting HTTP service on port ${defaultPort} for deploy...`);
    const child = spawn('npx', ['next', 'start', '--port', String(defaultPort)], {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    });
    child.on('exit', (code) => process.exit(code ?? 0));
    break;
  }

  case 'build': {
    console.log('=== Starting build process ===');
    console.log('Cleaning up stale Next.js lock files...');
    cleanNextArtifacts();
    console.log('Installing dependencies...');
    run('pnpm', ['install', '--prefer-frozen-lockfile', '--prefer-offline', '--loglevel=info', '--reporter=append-only']);
    console.log('Building the project...');
    run('npx', ['next', 'build']);
    console.log('=== Build completed successfully! ===');
    break;
  }

  default:
    console.error('Usage: node ./scripts/next-runner.js <dev|start|build>');
    process.exit(1);
}
