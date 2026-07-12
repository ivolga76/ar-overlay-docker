'use client';
// Awesome Animated Background — purple/white flowing gradient
// Based on "Awesome Animated background" by beshoy ekram (CodePen jmbGNd)
// Purple and white mixed together moving in a pleasant, appealing way

export function AnimatedBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Layer 1: base purple gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #3b0764 0%, #1e0030 50%, #0a0a0c 100%)',
        }}
      />
      
      {/* Layer 2: flowing white/purple gradient shapes */}
      <div
        className="absolute inset-0 animate-awesome-bg"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(168,85,247,0.2) 0%, transparent 45%),
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 35%),
            radial-gradient(circle at 70% 20%, rgba(147,51,234,0.15) 0%, transparent 40%),
            radial-gradient(circle at 30% 80%, rgba(255,255,255,0.08) 0%, transparent 35%)
          `,
          backgroundSize: '200% 200%',
        }}
      />

      {/* Layer 3: subtle animated shapes */}
      <div
        className="absolute inset-0 animate-awesome-shapes"
        style={{
          background: `
            radial-gradient(ellipse at 40% 60%, rgba(192,132,252,0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 60% 40%, rgba(255,255,255,0.06) 0%, transparent 50%)
          `,
          backgroundSize: '150% 150%',
        }}
      />

      {/* SVG grain overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '250px 250px',
          opacity: 0.03,
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  );
}
