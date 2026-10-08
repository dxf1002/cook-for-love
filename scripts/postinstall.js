#!/usr/bin/env node
'use strict';

// Postinstall script — tries fullstack-cli action-plugin init but
// gracefully degrades if the platform CLI is not available.
// This ensures npm install works on local Windows machines.

const { execSync } = require('child_process');

const isCI = process.env.CI === 'true' || process.env.CI === '1';
const isLocalDev = !process.env.MIAODA_APP_ID && !process.env.SANDBOX_ID;

function tryFullstackCli() {
  try {
    execSync('fullstack-cli action-plugin init', {
      stdio: isCI ? 'inherit' : 'ignore',
      timeout: 30000,
    });
    return true;
  } catch (err) {
    return false;
  }
}

if (isLocalDev) {
  // 本地开发环境：fullstack-cli 是平台 SDK 的一部分，
  // 没有也不影响本地运行，静默跳过
  const ok = tryFullstackCli();
  if (!ok) {
    console.log('[postinstall] Platform CLI not available — skipping action-plugin init (local dev mode)');
  } else {
    console.log('[postinstall] Action plugins initialized');
  }
} else {
  // 沙箱/平台环境：正常执行
  try {
    execSync('fullstack-cli action-plugin init', { stdio: 'inherit', timeout: 60000 });
  } catch (err) {
    console.warn('[postinstall] Warning: action-plugin init failed:', err.message);
  }
}
