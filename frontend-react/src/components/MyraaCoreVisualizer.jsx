import { useEffect, useRef } from "react";
import { motion } from "motion/react";

const getGlowColors = (status) => {
  switch (status) {
    case "speaking":
      return { primary: "rgba(147, 51, 234, 1)", secondary: "rgba(192, 38, 211, 0.8)", glow: "rgba(168, 85, 247, 0.7)", base: "violet" };
    case "listening":
      return { primary: "rgba(34, 211, 238, 1)", secondary: "rgba(79, 70, 229, 0.8)", glow: "rgba(6, 182, 212, 0.7)", base: "cyan" };
    case "processing":
      return { primary: "rgba(245, 158, 11, 1)", secondary: "rgba(217, 119, 6, 0.8)", glow: "rgba(251, 191, 36, 0.7)", base: "gold" };
    default:
      return { primary: "rgba(100, 116, 139, 1)", secondary: "rgba(71, 85, 105, 0.8)", glow: "rgba(148, 163, 184, 0.7)", base: "slate" };
  }
};

export default function MyraaCoreVisualizer({ status, amplitude }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Interaction and tracking references
  const mouseRef = useRef({ x: 0.5, y: 0.4 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.4 });
  
  // Physics & Animation states
  const speechVolumeRef = useRef(0);
  const particlesRef = useRef([]);

  // Cursor position tracking hook
  useEffect(() => {
    const handleMouseMove = (e) => {
      targetMouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Main high speed Canvas graphics rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const generateParticles = () => {
      const count = Math.min(80, Math.floor(width / 15));
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height + height * 0.1,
        speed: Math.random() * 0.35 + 0.12,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.2,
      }));
    };

    generateParticles();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      generateParticles();
    };

    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const colors = getGlowColors(status);

      // Smooth amplitude tracking (amplitude comes from props, 0.0 to 1.0)
      const currentAmp = (status === "speaking" || status === "listening") ? amplitude : (status === "processing" ? 0.3 : 0.05);
      speechVolumeRef.current += (currentAmp - speechVolumeRef.current) * 0.2;

      const baseScale = height / 440;
      const s = Math.max(0.95, Math.min(1.85, baseScale)); 

      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.05;

      const centerX = width / 2;
      const projectorCenterY = height + 40;
      const baseDiameterX = 280 * s;

      // Volumetric beam
      ctx.save();
      const conicalBeamGrad = ctx.createLinearGradient(centerX, height * 0.25, centerX, height);
      conicalBeamGrad.addColorStop(0, "rgba(0,0,0,0)");
      conicalBeamGrad.addColorStop(0.4, colors.primary.replace("1)", "0.03)"));
      conicalBeamGrad.addColorStop(0.75, colors.primary.replace("1)", "0.08)"));
      conicalBeamGrad.addColorStop(1, colors.secondary.replace("0.8)", "0.18)"));

      ctx.fillStyle = conicalBeamGrad;
      ctx.beginPath();
      ctx.moveTo(centerX - baseDiameterX * 0.35, projectorCenterY - 145);
      ctx.lineTo(centerX + baseDiameterX * 0.35, projectorCenterY - 145);
      ctx.lineTo(centerX + baseDiameterX * 1.5, height);
      ctx.lineTo(centerX - baseDiameterX * 1.5, height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Neural Fields (Glitch)
      const applyGlitch = (status === "processing" && Math.random() < 0.1) || (Math.random() < 0.005);
      if (applyGlitch) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 2);
        ctx.fillStyle = colors.primary.replace("1)", "0.03)");
        ctx.fillRect(0, 0, width, height);
      }

      // Holographic Neural Particles
      particlesRef.current.forEach((p) => {
        const riseSpeed = p.speed * (1 + speechVolumeRef.current * 3.5);
        p.y -= riseSpeed;
        p.x += Math.sin(p.y * 0.015 + p.size) * 0.4;
        
        const currentOpacity = p.opacity * Math.max(0, Math.min(1, p.y / height));

        if (p.y < height * 0.1) {
          p.y = height + Math.random() * 30;
          p.x = Math.random() * width;
        }

        ctx.fillStyle = colors.primary.replace("1)", `${currentOpacity * 0.6})`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * s, 0, Math.PI * 2);
        ctx.fill();
      });

      if (applyGlitch) ctx.restore();
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [status, amplitude]);

  const colors = getGlowColors(status);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      
      {/* Background Atmosphere Glow */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          width: '350px', height: '350px', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.3,
          background: `radial-gradient(circle, ${colors.primary}, transparent)`,
          transition: 'background 1s ease'
        }} />
      </div>

      {/* Holographic Canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}
      />

      {/* Center Voice Orb core (replaces avatar) */}
      <motion.div
        animate={{
          scale: status === "listening" || status === "speaking" ? 1 + amplitude * 0.3 : (status === "processing" ? [1, 1.05, 1] : 1),
          boxShadow: `0 0 ${20 + amplitude * 40}px ${colors.glow}`,
        }}
        transition={status === "processing" ? { repeat: Infinity, duration: 1.5 } : { type: "spring", stiffness: 200, damping: 15 }}
        style={{
          width: '80px', height: '80px', borderRadius: '50%', zIndex: 20,
          background: `radial-gradient(circle at 30% 30%, ${colors.primary}, #000)`,
          border: `2px solid ${colors.secondary}`,
        }}
      />

      {/* Status Pill */}
      <div 
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px',
          background: 'var(--bg-secondary, rgba(255, 255, 255, 0.08))', border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
          backdropFilter: 'blur(12px)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary, #ffffff)',
          marginTop: '60px', zIndex: 30
        }}
      >
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors.primary,
          boxShadow: `0 0 8px ${colors.primary}`,
          animation: status === "listening" || status === "speaking" ? "pulse 1.5s infinite" : "none",
        }} />
        <span>
          {status === "speaking" ? "AI is speaking…" : 
           status === "listening" ? "Listening… speak naturally" : 
           status === "processing" ? "Thinking & synthesizing…" : "Voice session ready"}
        </span>
      </div>
    </div>
  );
}
