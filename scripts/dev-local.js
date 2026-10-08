#!/usr/bin/env node
'use strict';

/**
 * Local development entry point — cross-platform (Windows / macOS / Linux).
 *
 * Uses concurrently to start the NestJS backend and Vite frontend
 * side-by-side with colored output.  Falls back to sequential spawn if
 * concurrently is not available.
 *
 * Environment variables:
 *   SERVER_PORT     default 3000
 *   CLIENT_DEV_PORT default 8080
 *   NODE_ENV        default development
 */

const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
process.chdir(PROJECT_ROOT);

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
loadEnv();

// ── Try concurrently first ────────────────────────────────────────────────────
const isWin = process.platform === 'win32';
const npx = isWin ? 'npx.cmd' : 'npx';
const npm = isWin ? 'npm.cmd' : 'npm';

function hasConcurrently() {
  try {
    execSync('concurrently --version', { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function runWithConcurrently() {
  console.log('\n🚀 启动开发服务器（concurrently 模式）...\n');

  const child = spawn(npx, [
    'concurrently',
    '--names', 'server,client',
    '--prefix-colors', 'blue,green',
    '--kill-others',
    '--prefix', '[{time} {name}]',
    '--timestamp-format', 'HH:mm:ss',
    'npm:dev:server',
    'npm:dev:client',
  ], {
    stdio: 'inherit',
    shell: isWin,
    cwd: PROJECT_ROOT,
    env: { ...process.env },
  });

  child.on('error', (err) => {
    console.error('Failed to start concurrently:', err.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    console.log('\n👋 开发服务已停止');
    process.exit(code ?? 0);
  });

  // Forward Ctrl+C
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

function runWithManualSpawn() {
  console.log('\n🚀 启动开发服务器（原生 spawn 模式）...\n');

  const server = spawn(npm, ['run', 'dev:server'], {
    stdio: 'inherit',
    shell: isWin,
    cwd: PROJECT_ROOT,
    env: { ...process.env },
  });

  const client = spawn(npm, ['run', 'dev:client'], {
    stdio: 'inherit',
    shell: isWin,
    cwd: PROJECT_ROOT,
    env: { ...process.env },
  });

  function shutdown(code) {
    try { server.kill('SIGTERM'); } catch {}
    try { client.kill('SIGTERM'); } catch {}
    setTimeout(() => {
      try { server.kill('SIGKILL'); } catch {}
      try { client.kill('SIGKILL'); } catch {}
      process.exit(code ?? 0);
    }, 2000);
  }

  server.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error('\n❌ 服务端异常退出，正在关闭客户端...');
      shutdown(code);
    }
  });

  client.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error('\n❌ 客户端异常退出，正在关闭服务端...');
      shutdown(code);
    }
  });

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('========================================');
console.log('  为爱下厨 - 点菜小程序 本地开发');
console.log('========================================');
console.log('  后端端口: ' + (process.env.SERVER_PORT || 3000));
console.log('  前端端口: ' + (process.env.CLIENT_DEV_PORT || 8080));
console.log('  数据库:   SQLite (data/app.db)');
console.log('  调试端口: 9229 (后端 inspect)');
console.log('========================================\n');

if (hasConcurrently()) {
  runWithConcurrently();
} else {
  console.log('ℹ️  未找到 concurrently，使用原生 spawn 模式\n');
  runWithManualSpawn();
}
