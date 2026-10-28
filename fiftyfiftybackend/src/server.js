import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { checkDatabaseHealth } from './config/db.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`[FiftyFifty Gym] Server listening on port ${PORT}`);
  console.log(`[FiftyFifty Gym] Health check available at http://localhost:${PORT}/api/health`);

  // Safe startup database probe
  try {
    const dbStatus = await checkDatabaseHealth();
    if (dbStatus.connected) {
      console.log(`[FiftyFifty Gym] Database connected successfully to "${dbStatus.database}" (${dbStatus.latencyMs}ms)`);
    } else if (dbStatus.status === 'unconfigured') {
      console.warn(`[FiftyFifty Gym Notice] Database unconfigured: ${dbStatus.message}`);
    } else {
      console.warn(`[FiftyFifty Gym Notice] Database probe failed (${dbStatus.errorCode}): ${dbStatus.errorMessage}`);
      if (dbStatus.hint) {
        console.warn(`[FiftyFifty Gym Hint] ${dbStatus.hint}`);
      }
    }
  } catch (probeErr) {
    console.warn('[FiftyFifty Gym Notice] Database startup probe error:', probeErr.message);
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[FiftyFifty Gym] SIGTERM received. Closing HTTP server...');
  server.close(() => {
    console.log('[FiftyFifty Gym] HTTP server closed.');
    process.exit(0);
  });
});

export default server;
