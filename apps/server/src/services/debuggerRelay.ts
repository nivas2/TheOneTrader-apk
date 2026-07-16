import https from 'https';

const DEBUGGER_SECRET = 'd3bug-s1gn4l-r3l4y-s3cr3t-x9k2';

export function relaySignalToDebugger(signalData: any): void {
  try {
    const payload = JSON.stringify(signalData);
    const req = https.request(
      {
        hostname: 'pos.feastigo.com',
        port: 443,
        path: '/debugger/api/webhook/signal',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-Webhook-Secret': DEBUGGER_SECRET,
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          console.error(`[debugger-relay] signal webhook returned ${res.statusCode}`);
        }
      },
    );
    req.on('error', (err) => {
      console.error('[debugger-relay] signal webhook error:', err.message);
    });
    req.write(payload);
    req.end();
  } catch (err: any) {
    console.error('[debugger-relay] signal relay failed:', err.message);
  }
}

export function relaySignalUpdateToDebugger(signalId: string, status: string): void {
  try {
    const payload = JSON.stringify({ signalId, status });
    const req = https.request(
      {
        hostname: 'pos.feastigo.com',
        port: 443,
        path: '/debugger/api/webhook/signal-update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-Webhook-Secret': DEBUGGER_SECRET,
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          console.error(`[debugger-relay] signal-update webhook returned ${res.statusCode}`);
        }
      },
    );
    req.on('error', (err) => {
      console.error('[debugger-relay] signal-update webhook error:', err.message);
    });
    req.write(payload);
    req.end();
  } catch (err: any) {
    console.error('[debugger-relay] signal-update relay failed:', err.message);
  }
}
