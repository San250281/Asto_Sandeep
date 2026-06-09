/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

interface Star {
  id: number;
  top: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
}

export default function CosmicBackground() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // Generate static stars once on mount to avoid layout shifts or hydration conflicts
    const generated: Star[] = Array.from({ length: 70 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      delay: Math.random() * 8,
      duration: Math.random() * 5 + 4,
    }));
    setStars(generated);
  }, []);

  return (
    <div id="cosmic-stellar-canvas" className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Immersive Deep Celestial Gradients */}
      <div className="absolute inset-0 bg-radial from-[#060412] via-[#0d0925] to-[#04020c]"></div>
      
      {/* Nebulan glowing ambient gas overlays */}
      <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full filter blur-[120px] mix-blend-screen animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[45vw] h-[45vw] bg-[#9a3412]/5 rounded-full filter blur-[150px] mix-blend-screen animate-pulse pointer-events-none"></div>
      
      {/* Interactive Constellation Array mapping */}
      {stars.map((star) => (
        <span
          key={star.id}
          className="absolute rounded-full bg-amber-100/80 animate-ping"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
            boxShadow: star.size > 2 ? '0 0 8px #fef3c7' : 'none',
          }}
        />
      ))}
    </div>
  );
}
