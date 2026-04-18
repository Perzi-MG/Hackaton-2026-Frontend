/**
 * Singleton UDP server — runs inside the Next.js Node.js process.
 *
 * The Raspberry Pi sends UDP datagrams (JSON) to this machine (dashboard)
 * at port 1234. This module receives them and re-emits via EventEmitter
 * so SSE clients (browsers) can subscribe.
 *
 * Payload shape from the Python backend:
 * {"armL1":0,"armL2":0,"armR1":0,"armR2":0,
 *  "footL":0,"footR":0,"chest":0,"back":0,"alert":0,"distancia":0}
 *
 * Values are PWM 0-255.
 */

import dgram from 'dgram';
import { EventEmitter } from 'events';

// Must match PORT_DASHBOARD in the Python script
export const UDP_PORT = 1234;

// Survive Next.js hot-reloads in dev via global singleton
const g = global as typeof global & {
    _udpEmitter?: EventEmitter;
    _udpSocket?: dgram.Socket;
};

export function getUdpEmitter(): EventEmitter {
    if (g._udpEmitter) return g._udpEmitter;

    const emitter = new EventEmitter();
    emitter.setMaxListeners(100);
    g._udpEmitter = emitter;

    const socket = dgram.createSocket('udp4');
    g._udpSocket = socket;

    socket.on('message', (msg, rinfo) => {
        const raw = msg.toString().trim();
        try {
            const data = JSON.parse(raw);
            emitter.emit('payload', data);
            console.log(`[UDP] from ${rinfo.address}:`, raw);
        } catch {
            console.warn('[UDP] Could not parse JSON from', rinfo.address, '→', raw);
        }
    });

    socket.on('error', (err) => {
        console.error('[UDP] Error:', err.message);
    });

    socket.bind(UDP_PORT, '0.0.0.0', () => { // ip de la maquina que tiene el dashboard
        console.log(`[UDP] Listening on 0.0.0.0:${UDP_PORT}`); // ip de la direccion de broadcast de la red de 
    });

    return emitter;
}
