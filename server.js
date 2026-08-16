const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Register ts-node early for TypeScript file support
require('ts-node').register({
  project: './tsconfig.json',
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
  },
});

// Register tsconfig-paths so @/ aliases resolve in CommonJS (ts-node) context
require('tsconfig-paths').register({
  baseUrl: '.',
  paths: { '@/*': ['./*'] },
});

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize WebSocket server (noServer mode — does NOT intercept upgrades)
  let chatWsServer = null;
  try {
    const { initializeWebSocketServer, handleChatUpgrade } = require('./lib/websocket-server.ts');
    chatWsServer = initializeWebSocketServer();

    // Get Next.js internal upgrade handler for HMR WebSocket (/_next/webpack-hmr)
    const nextUpgradeHandler = typeof app.getUpgradeHandler === 'function'
      ? app.getUpgradeHandler()
      : null;

    // Route WebSocket upgrade requests by path
    server.on('upgrade', async (req, socket, head) => {
      const pathname = (req.url || '').split('?')[0];
      if (pathname === '/api/websocket/team-chat') {
        handleChatUpgrade(req, socket, head);
      } else if (nextUpgradeHandler) {
        await nextUpgradeHandler(req, socket, head);
      } else {
        socket.destroy();
      }
    });
  } catch (error) {
    console.error('Failed to initialize WebSocket server:', error);
  }

  // Initialize event-driven system (replaces cron jobs)
  try {
    const { initializeEventSystem } = require('./lib/event-system/index.ts');
    await initializeEventSystem();
  } catch (error) {
    console.error('Failed to initialize event system:', error);
  }

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      if (dev) {
        console.log('> WebSocket server initialized');
        console.log('> Event-driven system active');
      }
    });
});