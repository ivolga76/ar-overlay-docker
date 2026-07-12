'use client';
// AnimatedBackground — Embark Studios style: Canvas-частицы (пыль/туман),
// радиальные свечения и зернистая текстура. Имитирует фоновое видео с сайта embark-studios.com.

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  depth: number; // 0 (far) to 1 (near)
  hue: number;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const count = 180;
      particles = [];
      for (let i = 0; i < count; i++) {
        const depth = Math.random(); // 0…1
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 0.3 + depth * 2.5, // 0.3px to 2.8px
          speedX: (Math.random() - 0.5) * 0.15 * (1 + depth),
          speedY: (Math.random() - 0.5) * 0.25 * (1 + depth) - 0.08 * depth,
          opacity: 0.12 + depth * 0.5, // 0.12 to 0.62
          depth,
          hue: 200 + Math.random() * 40, // blue-cyan range (200–240°)
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Soft radial glows (like embark's radial-gradients)
      // Top-left blue glow
      const glow1 = ctx.createRadialGradient(
        canvas.width * 0.2, canvas.height * 0.1, 0,
        canvas.width * 0.2, canvas.height * 0.1, canvas.width * 0.45
      );
      glow1.addColorStop(0, 'rgba(5, 73, 146, 0.12)');
      glow1.addColorStop(0.5, 'rgba(0, 40, 100, 0.04)');
      glow1.addColorStop(1, 'transparent');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center-right softer glow
      const glow2 = ctx.createRadialGradient(
        canvas.width * 0.75, canvas.height * 0.4, 0,
        canvas.width * 0.75, canvas.height * 0.4, canvas.width * 0.35
      );
      glow2.addColorStop(0, 'rgba(100, 149, 237, 0.06)');
      glow2.addColorStop(0.5, 'rgba(60, 100, 200, 0.02)');
      glow2.addColorStop(1, 'transparent');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Bottom-left subtle glow
      const glow3 = ctx.createRadialGradient(
        canvas.width * 0.3, canvas.height * 0.85, 0,
        canvas.width * 0.3, canvas.height * 0.85, canvas.width * 0.3
      );
      glow3.addColorStop(0, 'rgba(0, 100, 180, 0.05)');
      glow3.addColorStop(1, 'transparent');
      ctx.fillStyle = glow3;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dust particles
      for (const p of particles) {
        // Move
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around edges
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

        // Color: blue-cyan with varying brightness by depth
        const alpha = p.opacity;
        const brightness = 140 + p.depth * 115;
        ctx.fillStyle = `hsla(${p.hue}, 60%, ${brightness}%, ${alpha})`;

        // Soft glow on larger particles
        if (p.size > 1.2) {
          ctx.shadowColor = `hsla(${p.hue}, 80%, 70%, ${alpha * 0.5})`;
          ctx.shadowBlur = p.size * 4;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    createParticles();
    draw();

    window.addEventListener('resize', () => {
      resize();
      createParticles();
    });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      />
      {/* SVG noise/grain overlay — same technique as embark-studios.com */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '250px 250px',
          opacity: 0.04,
          mixBlendMode: 'overlay',
        }}
        aria-hidden="true"
      />
    </>
  );
}
