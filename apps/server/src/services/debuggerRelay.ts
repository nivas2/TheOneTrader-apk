import http from 'http';

const DEBUGGER_PORT = 5060;
const DEBUGGER_SECRET = 'd3bug-s1gn4l-r3l4y-s3cr3t-x9k2';

export function relaySignalToDebugger(signalData: any): void {
  try {
    const payload = JSON.stringify(signalData);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: DEBUGGER_PORT,
        path: '/api/webhook/signal',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-Webhook-Secret': DEBUGGER_SECRET,
        },
      },
      () => {},
    );
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch {
    // silent
  }
}

export function relaySignalUpdateToDebugger(signalId: string, status: string): void {
  try {
    const payload = JSON.stringify({ signalId, status });
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: DEBUGGER_PORT,
        path: '/api/webhook/signal-update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-Webhook-Secret': DEBUGGER_SECRET,
        },
      },
      () => {},
    );
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch {
    // silent
  }
}
