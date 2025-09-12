#!/usr/bin/env node

// Custom dev server that forces port 5000
process.env.PORT = '5000';
process.env.VITE_PORT = '5000';

// Import and run vite with explicit port
const { createServer } = require('vite');
const path = require('path');

async function startDevServer() {
  try {
    const server = await createServer({
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      server: {
        host: '::',
        port: 5000,
        strictPort: true,
      }
    });

    await server.listen();
    server.printUrls();
  } catch (error) {
    console.error('Error starting dev server:', error);
    process.exit(1);
  }
}

startDevServer();