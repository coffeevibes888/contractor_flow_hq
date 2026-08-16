"use client";

import { useEffect, useState } from "react";

const COLORS = ["#f97316", "#22c55e", "#3b82f6", "#e11d48", "#a855f7", "#facc15"];

const Celebration = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const confettiPieces = Array.from({ length: 80 });
  const balloons = Array.from({ length: 6 });

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {/* Confetti */}
      <div className="absolute inset-0">
        {confettiPieces.map((_, idx) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 4;
          const duration = 4 + Math.random() * 3;
          const size = 6 + Math.random() * 6;
          const color = COLORS[idx % COLORS.length];

          return (
            <div
              key={idx}
              className="absolute confetti-piece"
              style={{
                left: `${left}%`,
                width: size,
                height: size * 2,
                backgroundColor: color,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* Balloons */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-6">
        {balloons.map((_, idx) => {
          const color = COLORS[idx % COLORS.length];
          const delay = idx * 0.6;
          const duration = 7 + idx * 0.4;

          return (
            <div
              key={idx}
              className="relative balloon"
              style={{
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
              }}
            >
              <div
                className="rounded-full shadow-md"
                style={{
                  width: 40,
                  height: 52,
                  background: color,
                }}
              />
              <div className="mx-auto h-6 w-px bg-slate-500" />
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translate3d(0, -100%, 0) rotateZ(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translate3d(0, 120vh, 0) rotateZ(360deg);
            opacity: 0;
          }
        }

        @keyframes balloon-rise {
          0% {
            transform: translateY(20vh) scale(0.9);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateY(-120vh) scale(1.05);
            opacity: 0;
          }
        }

        .confetti-piece {
          border-radius: 2px;
          animation-name: confetti-fall;
          animation-timing-function: linear;
          animation-iteration-count: 1;
        }

        .balloon {
          animation-name: balloon-rise;
          animation-timing-function: ease-out;
          animation-iteration-count: 1;
        }
      `}</style>
    </div>
  );
};

export default Celebration;
