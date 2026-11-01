import React from 'react';
import { Hotel, UtensilsCrossed } from 'lucide-react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  light?: boolean;
  orangeAccent?: boolean;
}

export default function Logo({ className = 'h-11 w-11', showText = true, light = false, orangeAccent = true }: LogoProps) {
  const textColor = light ? 'text-white' : 'text-[#2A1810]';
  const subtextColor = light ? 'text-[#FB923C]' : 'text-[#EA580C]';

  return (
    <div className="flex items-center gap-3 select-none">
      {/* Monaz Hotel Distinctive Emblem with Brown, Orange & White */}
      <div className={`relative flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-br from-[#2A1810] via-[#3E2314] to-[#1E100A] p-2 border border-[#EA580C]/40 shadow-md ${className}`}>
        {/* Subtle orange accent corner */}
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EA580C] shadow-[0_0_8px_#EA580C]" />
        
        <div className="flex flex-col items-center justify-center text-white">
          <Hotel className="w-5 h-5 text-[#FB923C]" />
          <span className="text-[8px] font-serif font-black tracking-widest text-white leading-none mt-0.5">M</span>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-serif text-xl tracking-[0.15em] font-extrabold uppercase leading-none ${textColor}`}>
              MONAZ <span className="text-[#EA580C]">HOTEL</span>
            </span>
          </div>
          <span className={`font-sans text-[8.5px] tracking-[0.28em] font-semibold uppercase ${subtextColor} leading-none mt-1`}>
            Hotel &amp; Café • Betel
          </span>
        </div>
      )}
    </div>
  );
}
