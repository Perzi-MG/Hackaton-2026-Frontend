
import { useState, useEffect } from 'react';

export const useBodyStatus = () => {
    const [alerts, setAlerts] = useState<Record<string, string>>({});
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const socket = new WebSocket('http://localhost:4000');
        
        socket.onopen = () => {
            console.log('Conexión WebSocket abierta');
        };
        
        socket.onmessage = (event) => {
            console.log('Mensaje recibido:', event.data);
            try {
                const data = JSON.parse(event.data);
                
                // Si es un array de alertas
                if (Array.isArray(data)) {
                    console.log('Múltiples alertas recibidas:', data);
                    const newAlerts: Record<string, string> = {};
                    data.forEach(({ part, intensity }: { part: string; intensity: string }) => {
                        newAlerts[part] = intensity;
                    });
                    setAlerts(newAlerts);
                } else {
                    // Si es una alerta individual
                    const { part, intensity } = data;
                    console.log('Datos parseados:', { part, intensity });
                    setAlerts(prev => ({ ...prev, [part]: intensity }));
                }

                // Limpiar timeout anterior si existe
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                // Establecer nuevo timeout para limpiar todas las alertas
                const newTimeout = setTimeout(() => {
                    setAlerts({});
                }, 3000);
                
                setTimeoutId(newTimeout);
            } catch (error) {
                console.error('Error al parsear el mensaje:', error);
            }
        };
        
        socket.onerror = (error: Event) => {
            console.error('Error en WebSocket:', error);
        };
        
        socket.onclose = () => {
            console.log('Conexión WebSocket cerrada');
        };
        
        return () => {
            socket.close();
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [timeoutId]);

    return alerts;
};