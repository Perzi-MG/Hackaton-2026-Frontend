/**
 * GET /api/udp-stream
 *
 * SSE endpoint — bridges UDP datagrams (from Raspberry Pi) to browser clients.
 * Each browser tab opens one persistent connection here.
 */

import { NextResponse } from 'next/server';
import { getUdpEmitter } from '@/lib/udp-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    const emitter = getUdpEmitter();

    const stream = new ReadableStream({
        start(controller) {
            // Tell the client the SSE connection is alive
            controller.enqueue(
                new TextEncoder().encode('event: connected\ndata: {}\n\n')
            );

            const onPayload = (data: unknown) => {
                try {
                    controller.enqueue(
                        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
                    );
                } catch { /* stream closed */ }
            };

            emitter.on('payload', onPayload);

            // Heartbeat every 20 s — prevents proxies from closing the connection
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
                } catch {
                    clearInterval(heartbeat);
                }
            }, 20_000);

            // Cleanup when the browser disconnects
            return () => {
                emitter.off('payload', onPayload);
                clearInterval(heartbeat);
            };
        },
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
