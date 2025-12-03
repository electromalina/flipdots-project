'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FlipdotProps {
  index: number;
}

// Deterministic pseudo-random function based on seed
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function Flipdot({ index }: FlipdotProps) {
  const [isActive, setIsActive] = useState(false);
  // Use deterministic values based on index to avoid hydration mismatch
  // Round to 3 decimal places to ensure consistent server/client rendering
  const animationDelay = Math.round(seededRandom(index) * 2000 * 1000) / 1000;
  const animationType = Math.floor(seededRandom(index * 7) * 3);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    // Different animation patterns
    switch (animationType) {
      case 0: // Slow random flipping
        interval = setInterval(() => {
          setIsActive(prev => !prev);
        }, 4000 + animationDelay);
        break;
      case 1: // Fast blinking
        interval = setInterval(() => {
          setIsActive(prev => !prev);
        }, 1500 + animationDelay);
        break;
      case 2: // Wave pattern based on position
        const row = Math.floor(index / 10);
        const col = index % 10;
        const waveDelay = (row + col) * 100;
        interval = setInterval(() => {
          setIsActive(prev => !prev);
        }, 2500 + waveDelay);
        break;
    }

    // Initial deterministic state based on index
    setIsActive(seededRandom(index * 13) > 0.5);

    return () => clearInterval(interval);
  }, [animationDelay, animationType, index]);

  return (
    <div 
      className={`
        aspect-square rounded-full transition-all duration-300 ease-in-out
        ${isActive 
          ? 'bg-white shadow-lg shadow-white/30' 
          : 'bg-gray-800 shadow-inner scale-100'
        }
      `}
      style={{
        animationDelay: `${animationDelay}ms`,
      }}
    />
  );
}

export default function About() {
  return (
    <section id="about" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-6">
              ABOUT FLIPDOTS
            </h2>
            <div className="space-y-4 font-body text-foreground/80">
              <p>
                Flip-dot displays, also known as flip-disc displays, are electromechanical signs that use small discs to show information. Each disc has two sides with contrasting colors and can flip to display different images or text. These displays are energy-efficient and highly visible, making them ideal for public transportation signs and other applications requiring clear, dynamic information.
              </p>
              <p>
                Originally developed in the 1950s, flip-dot technology has evolved into a versatile display solution perfect for art installations, retail displays, information boards, and creative projects. The distinctive clicking sound and retro aesthetic of these mechanical marvels continue to captivate audiences in our digital age.
              </p>
              <p className="pt-2">
                Learn more about flip-dot displays at{' '}
                <Link
                  href="https://flipdots.com/en/products-services/flip-dot-boards-xy5/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Alfa-Zeta
                </Link>
                , a leading manufacturer of flip-dot displays.
              </p>
            </div>
          </div>

          {/* Visual Element - Flipdot Display */}
          <div className="relative">
            <div className="aspect-square bg-black rounded-lg flex items-center justify-center p-4 shadow-2xl border-4 border-gray-800">
              <div className="grid grid-cols-10 gap-1 w-full h-full">
                {Array.from({ length: 100 }).map((_, i) => (
                  <Flipdot key={i} index={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
