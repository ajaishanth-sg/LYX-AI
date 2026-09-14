import { motion } from "motion/react";
import { useMemo } from "react";

export default function AudioWaveform({ status, amplitude }) {
  // 17 frequency bars for a balanced, rich audio spectrum
  const numBars = 17;
  
  // Natural curved shape multipliers for an organic audio visualizer
  const barMultipliers = useMemo(() => [
    0.2, 0.35, 0.5, 0.7, 0.9, 1.1, 1.3, 1.6, 1.8, 1.6, 1.3, 1.1, 0.9, 0.7, 0.5, 0.35, 0.2
  ], []);

  const getStatusDetails = () => {
    switch (status) {
      case "speaking":
        return {
          label: "AI is speaking…",
          color: "#a855f7",
          glow: "rgba(168, 85, 247, 0.4)",
          gradient: "linear-gradient(180deg, #c084fc 0%, #7e22ce 100%)",
        };
      case "listening":
        return {
          label: "Listening… speak naturally",
          color: "#06b6d4",
          glow: "rgba(6, 182, 212, 0.4)",
          gradient: "linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)",
        };
      case "processing":
        return {
          label: "Thinking & synthesizing…",
          color: "#f59e0b",
          glow: "rgba(245, 158, 11, 0.4)",
          gradient: "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)",
        };
      case "idle":
      default:
        return {
          label: "Voice session ready",
          color: "#64748b",
          glow: "rgba(100, 116, 139, 0.2)",
          gradient: "linear-gradient(180deg, #94a3b8 0%, #475569 100%)",
        };
    }
  };

  const details = getStatusDetails();

  return (
    <div className="voice-stage-waveform-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
      
      {/* Outer ambient glowing orb container */}
      <div 
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          minHeight: '220px',
          padding: '20px 0',
        }}
      >
        {/* Soft radial glow behind waveform */}
        <div 
          style={{
            position: 'absolute',
            width: '280px',
            height: '140px',
            borderRadius: '50%',
            background: details.glow,
            filter: 'blur(50px)',
            transition: 'background 0.5s ease',
            pointerEvents: 'none',
            opacity: status === "idle" ? 0.2 : 0.65,
          }} 
        />

        {/* Dynamic Spectrum Waveform Bars */}
        <div 
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '7px',
            zIndex: 2,
            height: '160px',
          }}
        >
          {Array.from({ length: numBars }).map((_, i) => {
            let targetHeight = 14;
            let targetOpacity = 0.35;

            if (status === "idle") {
              targetHeight = Math.max(36 * barMultipliers[i], 10);
              targetOpacity = 0.25;
            } else if (status === "processing") {
              const base = Math.max(30 * barMultipliers[i], 12);
              const peak = Math.max(130 * barMultipliers[i], 28);
              targetHeight = [base, peak, base];
              targetOpacity = [0.4, 0.9, 0.4];
            } else if (status === "listening" || status === "speaking") {
              const scaledAmp = Math.min(Math.max(amplitude * 240, 20), 190);
              targetHeight = Math.max(scaledAmp * barMultipliers[i], 12);
              targetOpacity = 0.95;
            }

            return (
              <motion.div
                key={i}
                animate={{
                  height: targetHeight,
                  opacity: targetOpacity,
                }}
                transition={
                  status === "processing" || status === "idle"
                    ? {
                        repeat: Infinity,
                        duration: status === "idle" ? 2.5 : 0.9,
                        ease: "easeInOut",
                        delay: i * 0.06,
                      }
                    : {
                        type: "spring",
                        stiffness: 220,
                        damping: 14,
                        mass: 0.4,
                      }
                }
                style={{
                  width: '7px',
                  borderRadius: '999px',
                  background: details.gradient,
                  boxShadow: `0 4px 16px ${details.glow}`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Voice Status Pill */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '999px',
          background: 'var(--bg-secondary, rgba(255, 255, 255, 0.08))',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
          backdropFilter: 'blur(12px)',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-primary, #ffffff)',
          letterSpacing: '0.02em',
        }}
      >
        <span 
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: details.color,
            boxShadow: `0 0 8px ${details.color}`,
            animation: status === "listening" || status === "speaking" ? "pulse 1.5s infinite" : "none",
          }}
        />
        <span>{details.label}</span>
      </div>
    </div>
  );
}
