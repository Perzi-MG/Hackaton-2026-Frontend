import { useState, useEffect } from 'react';

export type Intensity = 'low' | 'medium' | 'high';

/**
 * Shape of the JSON sent by the Raspberry Pi (Python backend) via UDP.
 * Values are PWM duty cycle: 0-255.
 * "distancia" is the ToF sensor reading in mm.
 */
export interface BackendPayload {
  armL1: number;
  armL2: number;
  armR1: number;
  armR2: number;
  footL: number;
  footR: number;
  chest: number;
  back: number;
  alert: number;
  distancia?: number;
}

export type AlertMap = Record<string, Intensity>;

/**
 * Converts a PWM value (0-255) to an Intensity level.
 * Returns null when the value is 0 (no vibration / no alert).
 *
 *   0        → null  (off)
 *   1–84     → 'low'
 *   85–169   → 'medium'
 *   170–255  → 'high'
 */
export function pwmToIntensity(value: number): Intensity | null {
  if (value <= 0) return null;
  if (value < 85) return 'low';
  if (value < 170) return 'medium';
  return 'high';
}

/** Builds an AlertMap from a raw BackendPayload, skipping zero values. */
function parsePayload(data: BackendPayload): AlertMap {
  const map: AlertMap = {};
  const fields: (keyof Omit<BackendPayload, 'alert' | 'distancia'>)[] = [
    'armL1', 'armL2', 'armR1', 'armR2',
    'footL', 'footR', 'chest', 'back',
  ];
  for (const key of fields) {
    const intensity = pwmToIntensity(data[key] as number);
    if (intensity) map[key] = intensity;
  }
  return map;
}

/**
 * useSocketAlerts
 *
 * Connects to /api/udp-stream (SSE).
 * The Next.js server listens on UDP :1234, receives JSON from the Raspberry Pi,
 * and forwards it here via Server-Sent Events.
 *
 * Returns { alerts, distancia }
 */
export const useSocketAlerts = (): { alerts: AlertMap; distancia: number | null } => {
  const [alerts, setAlerts] = useState<AlertMap>({});
  const [distancia, setDistancia] = useState<number | null>(null);

  useEffect(() => {
    const source = new EventSource('/api/udp-stream');

    source.addEventListener('connected', () => {
      console.log('[SSE] Connected to UDP bridge (port 1234)');
    });

    source.onmessage = (event) => {
      try {
        const data: BackendPayload = JSON.parse(event.data);
        setAlerts(parsePayload(data));
        if (typeof data.distancia === 'number') {
          setDistancia(data.distancia);
        }
      } catch (err) {
        console.warn('[SSE] Parse error:', event.data, err);
      }
    };

    source.onerror = () => {
      console.warn('[SSE] Connection lost — browser will retry automatically');
    };

    return () => source.close();
  }, []);

  return { alerts, distancia };
};