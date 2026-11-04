"use client";

/**
 * Blurred road background for the simulation page.
 * Shows a stylized asphalt road with lane markings, subtly blurred
 * so the 3D canvas on top stays the focal point.
 */
export default function SimulationBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base asphalt gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #1a1a1e 0%, #2a2a2f 40%, #3a3a3f 60%, #2a2a2f 100%)",
        }}
      />

      {/* Road surface texture — subtle noise */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Center lane markings — dashed white lines */}
      <div className="absolute inset-0">
        <div
          className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2"
          style={{
            backgroundImage:
              "repeating-linear-gradient(180deg, white 0px, white 20px, transparent 20px, transparent 40px)",
            opacity: 0.06,
          }}
        />
        {/* Left edge line */}
        <div
          className="absolute left-[25%] top-0 h-full w-[1px]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(180deg, white 0px, white 12px, transparent 12px, transparent 24px)",
            opacity: 0.04,
          }}
        />
        {/* Right edge line */}
        <div
          className="absolute right-[25%] top-0 h-full w-[1px]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(180deg, white 0px, white 12px, transparent 12px, transparent 24px)",
            opacity: 0.04,
          }}
        />
      </div>

      {/* Horizontal road stripe accent (bottom) */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ backgroundColor: "var(--accent)", opacity: 0.15 }}
      />

      {/* Gaussian blur overlay to soften everything */}
      <div className="absolute inset-0 backdrop-blur-[2px]" />
    </div>
  );
}
