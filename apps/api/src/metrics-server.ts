import http from 'http';
import { register } from './metrics';

const PORT = parseInt(process.env['METRICS_PORT'] || '9464', 10);

export function startMetricsServer() {
  if (process.env['NODE_ENV'] === 'test') {
    return;
  }

  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      try {
        res.setHeader('Content-Type', register.contentType);
        const metrics = await register.metrics();
        res.end(metrics);
      } catch (err) {
        res.statusCode = 500;
        res.end('Error collecting metrics');
      }
    } else if (req.url === '/health') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok' }));
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Metrics server listening on port ${PORT}`);
  });

  return server;
}
