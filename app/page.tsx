"use client";

import { useSocketAlerts, Intensity } from "@/hooks/socket";

// Mapping from SVG path IDs (silueta.svg) → WebSocket alert part keys
const SVG_TO_ALERT: Record<string, string> = {
  cabeza_mike: "head",
  hombro_izq: "arm_upper_left",
  hombro_der: "arm_upper_right",
  torso_izq: "torso_left",
  torso_der: "torso_right",
  antebrazo_izq: "arm_lower_left",
  antebrazo_der: "arm_lower_right",
  mano_izq: "hand_left",
  mano_der: "hand_right",
  pierna_izq: "leg_left",
  pierna_der: "leg_right",
  pie_izq: "foot_left",
  pie_der: "foot_right",
};

const PART_LABELS: Record<string, string> = {
  head: "Cabeza",
  arm_upper_left: "Hombro izq.",
  arm_upper_right: "Hombro der.",
  torso_left: "Torso izq.",
  torso_right: "Torso der.",
  arm_lower_left: "Antebrazo izq.",
  arm_lower_right: "Antebrazo der.",
  hand_left: "Mano izq.",
  hand_right: "Mano der.",
  leg_left: "Pierna izq.",
  leg_right: "Pierna der.",
  foot_left: "Pie izq.",
  foot_right: "Pie der.",
};

const INTENSITY_CONFIG: Record<
  Intensity,
  { fill: string; glow: string; label: string; color: string }
> = {
  low: {
    fill: "#75e116ff",
    glow: "0 0 14px 5px #75e116ff",
    label: "Baja",
    color: "#78350f",
  },
  medium: {
    fill: "#f9f516ff",
    glow: "0 0 18px 7px #f9f516ff",
    label: "Media",
    color: "#fff",
  },
  high: {
    fill: "#ef4444",
    glow: "0 0 26px 10px #ef4444",
    label: "Alta",
    color: "#fff",
  },
};

const DEFAULT_FILL = "#1e3a5f";
const STROKE_COLOR = "#3b82f6";

export default function SecuritySilhouette() {
  const alerts = useSocketAlerts();

  // Reverse map: alertKey → SVG IDs
  const alertToSvg = Object.fromEntries(
    Object.entries(SVG_TO_ALERT).map(([svgId, alertKey]) => [alertKey, svgId])
  );

  const getPathStyle = (svgId: string): React.CSSProperties => {
    const alertKey = SVG_TO_ALERT[svgId];
    const intensity = alertKey ? (alerts[alertKey] as Intensity | undefined) : undefined;
    const cfg = intensity ? INTENSITY_CONFIG[intensity] : undefined;

    if (!cfg) {
      return {
        fill: DEFAULT_FILL,
        stroke: STROKE_COLOR,
        strokeWidth: 0.5,
        transition: "fill 0.4s ease, filter 0.4s ease",
        cursor: "default",
      };
    }

    return {
      fill: cfg.fill,
      stroke: cfg.fill,
      strokeWidth: 1,
      filter: `drop-shadow(${cfg.glow})`,
      transition: "fill 0.3s ease, filter 0.3s ease",
      animation: "pulse-alert 1.2s ease-in-out infinite",
      cursor: "default",
    };
  };

  const activeAlerts = Object.entries(alerts);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Inter', sans-serif;
          background: #020817;
        }

        @keyframes pulse-alert {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.72; }
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes scan-line {
          0%   { top: 0%; opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }

        .page-wrapper {
          min-height: 100vh;
          background: radial-gradient(ellipse at 20% 20%, #0f2a4a 0%, #020817 60%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          gap: 1.5rem;
        }

        .header {
          text-align: center;
        }

        .header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #e2e8f0;
          letter-spacing: 0.04em;
        }

        .header p {
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 0.3rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .content-row {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ── Silhouette card ── */
        .silhouette-card {
          position: relative;
          background: linear-gradient(160deg, rgba(15,42,74,0.8) 0%, rgba(2,8,23,0.9) 100%);
          border: 1px solid rgba(59,130,246,0.25);
          border-radius: 1.5rem;
          padding: 2rem 2.5rem;
          backdrop-filter: blur(12px);
          box-shadow: 0 0 40px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.05);
          overflow: hidden;
        }

        .silhouette-card::before {
          content: '';
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent);
          animation: scan-line 4s linear infinite;
        }

        .silhouette-svg {
          display: block;
          width: 200px;
          height: auto;
          filter: drop-shadow(0 0 20px rgba(59,130,246,0.15));
        }

        /* ── Right panel ── */
        .panel {
          min-width: 260px;
          max-width: 340px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .panel-section-title {
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 0.75rem;
        }

        /* Alerts */
        .alert-list {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .alert-empty {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 0.75rem;
          padding: 1.5rem;
          text-align: center;
          color: #475569;
          font-size: 0.85rem;
        }

        .alert-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.04);
          border: 1px solid transparent;
          border-radius: 0.65rem;
          padding: 0.65rem 1rem;
          animation: fade-in 0.3s ease;
        }

        .alert-part {
          color: #e2e8f0;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .alert-badge {
          border-radius: 9999px;
          padding: 0.2rem 0.65rem;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.06em;
        }

        /* Legend */
        .legend {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .legend-label {
          color: #94a3b8;
          font-size: 0.78rem;
        }

        /* Status bar */
        .status-bar {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.78rem;
          color: #64748b;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse-alert 1.5s ease-in-out infinite;
          flex-shrink: 0;
        }
      `}</style>

      <div className="page-wrapper">
        <div className="header">
          <h1>🛡️ Monitor de Seguridad</h1>
          <p>Detección de impacto en tiempo real</p>
        </div>

        <div className="content-row">

          {/* ── Silhouette ── */}
          <div className="silhouette-card">
            <svg
              className="silhouette-svg"
              viewBox="0 0 197.35 457.95"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                id="antebrazo_izq"
                style={getPathStyle("antebrazo_izq")}
                d="M31.09,151.45s-5.57,6.94-7.28,24.45c-1.57,16.07-4.31,37.06-6.63,43.21,4.6,1,8.37,3.58,12.91,2.2.28-1.35,2.56-11.72,6.94-20.77,4.7-9.7,11.67-26.68,11.37-35.02-.02-.54,0-1.18.05-1.91-4.8-5.06-11.71-8-17.37-12.2,0,.01,0,.03,0,.04Z"
              />
              <path
                id="hombro_izq"
                style={getPathStyle("hombro_izq")}
                d="M56.24,78.04c-.06.02-.13.04-.19.06-10.39,3.34-19.94,6.82-20.77,24.87,0,0-.15,10.99,0,14.52.15,3.52-4.61,18.39-3.83,32.71,5.66,4.2,12.58,7.14,17.37,12.2.55-8.24,5.2-27.74,7.36-36.06.04-15.98-1.35-32.36.06-48.29Z"
              />
              <path
                id="hombro_der"
                style={getPathStyle("hombro_der")}
                d="M165.98,150.78c-.25-.38-.4-.56-.4-.56.8-14.33-3.98-29.23-3.83-32.75.15-3.53,0-14.52,0-14.52-.79-17.01-9.32-21.08-18.99-24.29-1.01,16.74-3.33,32.76-1.46,49.44,2.24,8.83,6.18,25.7,6.86,33.68,5.23-4.67,12.71-6.53,17.82-11Z"
              />
              <path
                id="cabeza_mike"
                style={getPathStyle("cabeza_mike")}
                d="M114.56,65.2c-.16-.11-.29-.21-.39-.3-1.9-1.67-1.9-4.4-1.97-8.87-.07-4.33,1.77-8.94,3.26-14.18,4.02-.09,6.39-12.16,4.4-13.26-.72-.4-1.26-.43-1.66-.29.63-6.14.37-13.05-2.58-18.43C110-.38,99.09,0,99.09,0h-.96s-10.92-.38-16.53,9.85c-2.95,5.38-3.21,12.29-2.58,18.43-.4-.14-.94-.11-1.66.29-1.99,1.1.38,13.17,4.4,13.26,1.49,5.24,3.34,9.85,3.26,14.18-.06,3.59-.09,6.04-1.07,7.74,10.09,2.18,21.72,4.4,30.62,1.43Z"
              />
              <path
                id="torso_izq"
                style={getPathStyle("torso_izq")}
                d="M97.62,67.62c-4.75-.52-9.58-1.5-14.09-2.48-.24.42-.52.8-.9,1.13-1.88,1.66-14.4,7.96-24.75,11.31-1.32,14.96-.18,30.32-.07,45.36.02.03.04.06.04.1v.67c.02.07.05.14.07.22.01.02.04.03.04.05.01.05.02.1.02.16.03.1.06.2.09.3.01.04.01.08,0,.12,0,0,0,0,0,0,0,.02.02.04.03.06,0,0,0,.01,0,.02,0,.02.02.04.02.05.01.04,0,.07,0,.11.2,2,.5,4.12.92,6.29,2.12,10.92,5.31,24.11,4.85,32.29-.44,7.96-1.31,19.9-2.2,25.02,6.92-.73,13.71-1.33,19.9-1.33,5.6,0,11.28.18,17,.4,0-40.27-.92-79.64-.99-119.85Z"
              />
              <path
                id="torso_der"
                style={getPathStyle("torso_der")}
                d="M139.24,124.83s0,0,0,0c0-.02,0-.03,0-.04,0,0,0-.01,0-.02,0,0,0,0,0,0,.01-.11.04-.21.05-.31.02-.08.03-.17.05-.25.05-.18.13-.35.19-.53.03-.09.05-.18.07-.28,0-.02,0-.05.01-.07-1.07-15.11.92-29.78,1.84-45.04-.59-.2-1.18-.39-1.78-.58-9.84-3.16-21.72-9.04-24.55-11.07-4.92,1.64-10.67,1.69-16.53,1.05.07,40.21.98,79.58.99,119.85,12.02.46,24.19,1.11,36.05.79-.88-5.2-1.73-17-2.17-24.88-.45-8.19,2.73-21.38,4.85-32.3.42-2.18.72-4.31.92-6.32Z"
              />
              <path
                id="pie_izq"
                style={getPathStyle("pie_izq")}
                d="M67.18,429.08s0,.01,0,.02c-.7,1.41-1.54,2.77-2.4,4.08-1.17,1.77-2.49,3.42-3.83,5.06-1.36,1.65-2.74,3.28-4.04,4.98-.64.84-1.26,1.71-1.85,2.6-.61.93-1.29,1.9-1.51,3.01-.2,1.02.09,2.05,1.06,2.54.19.1.4.16.61.18-.03.31,0,.63.08.96.33,1.21,1.56,2.08,2.8,2.11.17.58.59,1.01,1.25,1.2.8.23,1.68-.01,2.4-.43.04.18.09.36.18.54.45.88,1.45,1.25,2.39,1.22,1.11-.03,2.05-.69,2.79-1.47.38-.41.73-.84,1.08-1.27-.15.59-.16,1.2.06,1.77.41,1.06,1.56,1.6,2.62,1.74,1,.14,2.02-.06,2.92-.51.35-.17.7-.39,1.03-.65.62-.3,1.18-.75,1.66-1.22,1.07-1.06,1.81-2.38,2.36-3.77,1.23-3.08,1.63-6.42,2.27-9.65.12-.61.25-1.22.39-1.83.08.05.21.05.32-.06,1.38-1.4,1.91-3.66,2.08-5.56.2-2.32-.15-4.64-.58-6.92-.04-.21-.08-.42-.12-.62-5.4.37-10.51,2.98-16.02,1.97Z"
              />
              <path
                id="pierna_izq"
                style={getPathStyle("pierna_izq")}
                d="M81.44,189.65c-6.19,0-12.98.6-19.9,1.33-.03.15-.05.31-.08.45-.91,4.85-6.37,23.65-6.22,46.85.15,23.2,3.34,50.57,4.85,56.33,1.52,5.76,1.95,11.47,1.5,15.41-.46,3.94-1.35,12.71-.44,18.62,0,0-3.64,15.47-.76,36.54s8.04,44.27,8.04,46.7v.96c-.25,1.13-.52,2.26-.77,3.39-.3,1.37-.5,2.74-.54,4.14-.04,1.39.04,2.77.07,4.15.02.96-.01,1.93-.1,2.89,5.51,1.01,10.61-1.6,16.02-1.97-.41-2.21-.82-4.41-1.08-6.65-.29-2.44-.44-4.9-.56-7.35-.06-1.35-.12-2.7-.18-4.05,0-.1-.01-.2-.01-.3.28-3.75.6-7.4.96-10.52,1.52-13.04,6.82-34.72,5.46-45.94-1.36-11.22.3-39.88,1.74-48.06s8.41-54.28,6.9-67.47l1.29-.12c.04-.05.09-.1.13-.15.03-.04.04-.08.07-.11v-44.7c-5.51-.21-10.98-.37-16.37-.37Z"
              />
              <path
                id="pie_der"
                style={getPathStyle("pie_der")}
                d="M144.74,448.72c-.22-1.11-.9-2.08-1.51-3.01-.58-.89-1.2-1.75-1.85-2.6-1.29-1.7-2.68-3.33-4.04-4.98-1.34-1.63-2.67-3.29-3.84-5.06-.86-1.3-1.7-2.66-2.4-4.08,0-.09-.01-.19-.02-.28-5.35-.13-10.69-.78-16.04-1.52-.03.15-.05.29-.08.44-.43,2.28-.78,4.6-.58,6.92.17,1.89.7,4.16,2.08,5.56.11.11.24.12.32.06.14.61.27,1.22.39,1.83.64,3.23,1.04,6.57,2.27,9.65.56,1.39,1.29,2.71,2.36,3.77.48.48,1.04.92,1.66,1.22.33.26.68.48,1.03.65.9.45,1.92.65,2.92.51,1.06-.15,2.21-.68,2.62-1.74.22-.57.2-1.18.06-1.77.35.43.69.87,1.08,1.27.74.78,1.68,1.44,2.79,1.47.94.03,1.94-.35,2.39-1.22.09-.17.15-.35.18-.54.72.42,1.59.66,2.39.43.66-.19,1.08-.62,1.25-1.2,1.24-.03,2.47-.9,2.8-2.11.09-.33.11-.65.08-.96.21-.03.41-.09.61-.18.97-.48,1.26-1.52,1.06-2.54Z"
              />
              <path
                id="pierna_der"
                style={getPathStyle("pierna_der")}
                d="M130.92,424.16c.02-1.39.1-2.77.07-4.15-.04-1.4-.24-2.77-.54-4.14-.25-1.13-.52-2.26-.77-3.39v-.96c0-2.43,5.16-25.62,8.04-46.7s-.76-36.54-.76-36.54c.91-5.91.02-14.68-.44-18.62-.46-3.94-.02-9.65,1.5-15.41,1.52-5.76,4.7-33.13,4.85-56.33.15-23.2-5.31-42-6.22-46.85-.03-.18-.07-.39-.1-.6-12.06.33-24.45-.36-36.67-.82v44.71s0,0,.01,0c.14.09.29.16.43.23l1.45.13c-1.52,13.19,5.45,59.28,6.9,67.47s3.11,36.84,1.74,48.06c-1.36,11.22,3.94,32.9,5.46,45.94.36,3.12.68,6.77.96,10.52,0,.1,0,.2-.01.3-.06,1.35-.12,2.7-.18,4.05-.12,2.46-.27,4.91-.56,7.35-.27,2.3-.68,4.56-1.11,6.83,5.35.75,10.69,1.4,16.04,1.52-.07-.87-.1-1.74-.09-2.62Z"
              />
              <path
                id="antebrazo_der"
                style={getPathStyle("antebrazo_der")}
                d="M180.21,219.23c-2.34-5.73-5.16-27.16-6.75-43.51-1.43-14.68-5.57-21.93-6.88-23.89-5.11,4.47-12.59,6.32-17.82,11,.08.98.12,1.83.09,2.5-.3,8.34,6.67,25.32,11.37,35.02,4.7,9.7,6.97,20.92,6.97,20.92,0,0,0,.01,0,.02,4.18-.51,8.87-.16,13.02-2.07Z"
              />
              <path
                id="mano_der"
                style={getPathStyle("mano_der")}
                d="M196.43,243.35c-1.26-1.55-3.81-7.51-4.95-9.48-1.14-1.97-5.38-8.62-8.64-11.73-.8-.77-1.61-1.31-2.38-1.7-.03-.06-.06-.14-.09-.21-4.15,1.91-8.83,1.56-13.02,2.07-1.81,3.36-1.43,14.24-1.13,17.95.3,3.71.36,6.95.8,12.77.51,6.65,1.24,7.77,3.06,7.39,1.82-.38.87-9.48.76-11.14-.15-2.27,0-3.94.53-3.03.53.91,1.29,13.49,2.05,16.6.76,3.11,3.11,3.49,3.71,1.06.61-2.43-1.04-14.38-1.14-15.39-.3-3.18.15-3.72.68-2.43.53,1.29,1.29,19.1,4.47,19.48,3.18.38,1.67-6.22,1.21-9.17-.45-2.96-.76-7.57-.83-8.49-.21-2.72-.62-4.03.31-3.18.75.68,3.1,11.98,3.48,14.33.38,2.35.97,5.4,3.26,4.78,2.09-.57.57-6.06.14-10.08-.39-3.62-1.8-15.54-1.8-15.54,0,0,.76.46,1.82,2.27,1.06,1.82,3.7,4.87,6.31,6.12,2.64,1.26,2.85-1.42,1.37-3.24Z"
              />
              <path
                id="mano_izq"
                style={getPathStyle("mano_izq")}
                d="M17.09,220.07c-.07.18-.14.36-.21.51-.76.39-1.57.94-2.38,1.7-3.26,3.11-7.51,9.76-8.64,11.73s-3.68,7.92-4.95,9.48c-1.48,1.82-1.27,4.5,1.36,3.24,2.62-1.25,5.25-4.3,6.31-6.12,1.06-1.82,1.82-2.27,1.82-2.27,0,0-1.41,11.92-1.8,15.54-.44,4.02-1.95,9.51.14,10.08,2.29.62,2.88-2.43,3.26-4.78.38-2.35,2.73-13.65,3.48-14.33.93-.85.52.47.31,3.18-.07.92-.38,5.53-.83,8.49-.46,2.96-1.97,9.55,1.21,9.17,3.18-.38,3.94-18.19,4.47-19.48s.99-.76.68,2.43c-.1,1.01-1.74,12.96-1.14,15.39.61,2.43,2.96,2.05,3.71-1.06.76-3.11,1.52-15.69,2.05-16.6.53-.91.68.76.53,3.03-.11,1.66-1.06,10.77.76,11.14,1.82.38,2.56-.74,3.06-7.39.44-5.83.5-9.06.8-12.77.3-3.71.68-14.63-1.14-17.97,0,0,.01-.05.03-.15-4.54,1.38-8.32-1.2-12.91-2.2Z"
              />
            </svg>
          </div>

          {/* ── Right panel ── */}
          <div className="panel">

            {/* Status */}
            <div className="status-bar">
              <div className="status-dot" />
              <span>Conectado · escuchando alertas</span>
            </div>

            {/* Active alerts */}
            <div>
              <div className="panel-section-title">Alertas activas</div>
              {activeAlerts.length === 0 ? (
                <div className="alert-empty">
                  <div style={{ fontSize: "1.8rem" }}>✅</div>
                  <p style={{ marginTop: "0.5rem" }}>Sin alertas — todo normal</p>
                </div>
              ) : (
                <div className="alert-list">
                  {activeAlerts.map(([part, intensity]) => {
                    const cfg = INTENSITY_CONFIG[intensity as Intensity];
                    if (!cfg) return null;
                    const icon =
                      intensity === "high"
                        ? "🔴"
                        : intensity === "medium"
                          ? "🟠"
                          : "🟡";
                    return (
                      <div
                        key={part}
                        className="alert-item"
                        style={{
                          borderColor: `${cfg.fill}44`,
                          boxShadow: `0 0 12px ${cfg.fill}22`,
                        }}
                      >
                        <span className="alert-part">
                          {icon} {PART_LABELS[part] ?? part}
                        </span>
                        <span
                          className="alert-badge"
                          style={{
                            background: cfg.fill,
                            color: cfg.color,
                          }}
                        >
                          {cfg.label.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}