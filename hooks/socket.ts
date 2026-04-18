import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export type Intensity = 'low' | 'medium' | 'high';

export interface BodyPartAlert {
  part: string;
  intensity: Intensity;
}

export const useSocketAlerts = () => {
  const [alerts, setAlerts] = useState<Record<string, Intensity>>({});

  useEffect(() => {
    const socket = io('http://localhost:4000');

    socket.on('security_alert', (data: { alerts: BodyPartAlert[] } | BodyPartAlert[]) => {

      const alertList: BodyPartAlert[] = Array.isArray(data)
        ? data
        : Array.isArray((data as { alerts: BodyPartAlert[] }).alerts)
          ? (data as { alerts: BodyPartAlert[] }).alerts
          : [];

      if (alertList.length === 0) return;

      const newAlerts: Record<string, Intensity> = {};
      alertList.forEach(({ part, intensity }) => {
        newAlerts[part] = intensity;
      });

      setAlerts(newAlerts);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return alerts;
};