#!/usr/bin/env node

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Start Vite dev server on internal port 5173
const viteProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start AI server on port 8000
const aiProcess = spawn('node', ['server.js'], {
  stdio: 'inherit',
  cwd: './ai-server'
});

// Handle AI server process errors
aiProcess.on('error', (err) => {
  console.error('❌ AI server failed to start:', err);
});

aiProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`❌ AI server exited with code ${code}, signal ${signal}`);
  }
});

// Wait for servers to start
setTimeout(() => {
  // Proxy /api requests to AI server
  app.use('/api', createProxyMiddleware({
    target: 'http://localhost:8000/api',
    changeOrigin: true,
    pathRewrite: {
      '^/api': ''
    }
  }));

  // Proxy all other requests to Vite dev server
  app.use('/', createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true // Enable WebSocket proxying for HMR
  }));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Proxy server running on port ${PORT}`);
    console.log(`📱 Vite dev server: http://localhost:5173`);
    console.log(`🤖 AI server: http://localhost:8000`);
    console.log(`🌐 External access: Available on Replit domain`);
    console.log(`📋 AI Chat available at: /ai-chat.html`);
  });
}, 3000);

// Handle process cleanup
process.on('SIGTERM', () => {
  viteProcess.kill();
  aiProcess.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  viteProcess.kill();
  aiProcess.kill();
  process.exit(0);
});