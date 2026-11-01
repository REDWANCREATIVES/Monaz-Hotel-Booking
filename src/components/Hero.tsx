import React, { useState } from 'react';
import { ArrowRight, UtensilsCrossed, Hotel, Calendar, Users, Coffee, Sparkles, ShieldCheck, Receipt } from 'lucide-react';
import { motion } from 'motion/react';

// Primary image from Monaz assets with robust fallback
import localHeroImage from '../assets/images/raha_latte_entree_1783510101014.jpg';

const fallbackHeroImage = 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=900&auto=format&fit=crop';

interface HeroProps {
  onExploreMenu: (category?: string) => void;
  onOpenBooking: () => void;
  onOpenRoomModal: (roomId?: string) => void;
  onOpenTracking?: () => void;
}

export default function Hero({ onExploreMenu, onOpenBooking, onOpenRoomModal, onOpenTracking }: HeroProps) {
  const [imgSrc, setImgSrc] = useState(localHeroImage);
  const [quickCheckIn, setQuickCheckIn] = useState('');
  const [quickCheckOut, setQuickCheckOut] = useState('');
  const [quickGuests, setQuickGuests] = useState('2');

  const handleQuickBook = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenRoomModal();
  };

  return (
    <section id="home" className="relative min-h-[90vh] pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-gradient-to-b from-[#FFFDF9] via-[#FAF6F0] to-[#F5ECE1]">
      {/* Decorative Warm Ambient Glows (Orange & Warm Brown) */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#EA580C]/15 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] rounded-full bg-gradient-to-tl from-[#2A1810]/10 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 relative z-10">
        
        {/* Top Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            
            {/* Monaz Hotel Welcome Pill */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-[#EA580C]/30 shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#2A1810]">
                WELCOME TO <span className="text-[#EA580C]">MONAZ HOTEL</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EA580C] text-white font-bold uppercase tracking-wider ml-1">
                Betel, Addis Ababa
              </span>
            </motion.div>

            {/* Main Punchy Serif Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#2A1810] font-extrabold tracking-tight leading-[1.12]"
            >
              Exquisite Hospitality, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EA580C] via-[#C2410C] to-[#2A1810]">
                Traditional Dining
              </span> & Suites.
            </motion.h1>

            {/* Sub-headline description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[#6E4733] text-base sm:text-lg max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed"
            >
              Located in Betel, Addis Ababa, immerse yourself in premier boutique accommodations, sizzling authentic Ethiopian culinary feasts, gourmet burgers, and rich highland coffees crafted to perfection.
            </motion.p>

            {/* Primary Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2"
            >
              <button
                onClick={() => onOpenRoomModal()}
                className="px-7 py-3.5 bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white font-bold rounded-full hover:shadow-xl hover:shadow-[#EA580C]/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Hotel className="w-4 h-4 text-white" />
                <span>Book a Bedroom</span>
              </button>

              <button
                onClick={() => onExploreMenu()}
                className="px-7 py-3.5 bg-white text-[#2A1810] hover:text-[#EA580C] font-bold rounded-full border border-[#2A1810]/20 hover:border-[#EA580C] hover:bg-[#FFF7ED] transition-all duration-300 text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <UtensilsCrossed className="w-4 h-4 text-[#EA580C]" />
                <span>Explore Restaurant Menu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>

            {/* Quick Track Link */}
            {onOpenTracking && (
              <div className="pt-2 text-center lg:text-left">
                <button
                  type="button"
                  onClick={onOpenTracking}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6E4733] hover:text-[#EA580C] transition-colors cursor-pointer group"
                >
                  <Receipt className="w-3.5 h-3.5 text-[#EA580C]" />
                  <span>Already placed an order or booked a room?</span>
                  <span className="font-bold underline underline-offset-4 text-[#EA580C] group-hover:text-[#C2410C]">
                    Track Progress Live &rarr;
                  </span>
                </button>
              </div>
            )}

            {/* Key Hotel Highlights */}
            <div className="pt-4 grid grid-cols-3 gap-3 border-t border-[#2A1810]/10 max-w-lg mx-auto lg:mx-0 text-left">
              <div className="p-2.5 rounded-xl bg-white/70 border border-[#EA580C]/15">
                <p className="font-serif text-xl font-bold text-[#2A1810]">70+</p>
                <p className="text-[11px] text-[#6E4733] font-medium leading-tight">Authentic Dishes</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/70 border border-[#EA580C]/15">
                <p className="font-serif text-xl font-bold text-[#EA580C]">24/7</p>
                <p className="text-[11px] text-[#6E4733] font-medium leading-tight">Room Service</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/70 border border-[#EA580C]/15">
                <p className="font-serif text-xl font-bold text-[#2A1810]">5★</p>
                <p className="text-[11px] text-[#6E4733] font-medium leading-tight">Guest Experience</p>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Visual with guaranteed mobile visibility */}
          <div className="lg:col-span-6 relative flex justify-center items-center py-4 sm:py-6">
            
            {/* Background rotating ornamental rings */}
            <div className="absolute w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] border border-[#EA580C]/20 rounded-full animate-[spin_120s_linear_infinite] pointer-events-none" />
            <div className="absolute w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] border border-dashed border-[#2A1810]/20 rounded-full animate-[spin_90s_linear_infinite] pointer-events-none" />

            {/* The Main Food / Hotel Plate - fully responsive on phone screens */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 aspect-square z-10 animate-float-gentle">
              
              {/* Outer glowing halo */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-[#EA580C]/30 to-amber-200/20 rounded-full blur-md pointer-events-none" />
              
              {/* Ground Shadow */}
              <div className="absolute -bottom-6 left-[12%] right-[12%] h-8 bg-black/20 rounded-full blur-xl pointer-events-none" />

              {/* Circular Showcase Container */}
              <div className="w-full h-full rounded-full overflow-hidden border-[6px] sm:border-[8px] border-white shadow-[0_20px_50px_rgba(42,24,16,0.25)] bg-[#2A1810] relative">
                <img
                  src={imgSrc}
                  alt="Monaz Hotel Signature Dining & Artisan Brew"
                  onError={() => setImgSrc(fallbackHeroImage)}
                  referrerPolicy="no-referrer"
                  loading="eager"
                  decoding="sync"
                  className="block w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
                
                {/* Subtle dark vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating Orange Price Badge */}
              <div className="absolute top-4 right-0 sm:-right-4 bg-gradient-to-r from-[#2A1810] to-[#422518] text-white text-xs px-3.5 py-2 rounded-2xl border border-[#EA580C] shadow-2xl flex flex-col items-center">
                <span className="text-[8px] uppercase tracking-wider text-[#FB923C] font-semibold">CHEF SPECIAL</span>
                <span className="font-serif font-bold text-sm text-white">Monaz Feast</span>
                <span className="text-[10px] text-[#FB923C] font-mono font-bold">1,600 ETB</span>
              </div>

              {/* Floating Room Service Badge */}
              <div className="absolute bottom-4 left-0 sm:-left-4 bg-white text-[#2A1810] text-xs px-3.5 py-2 rounded-2xl border border-[#EA580C]/30 shadow-2xl flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#FFF7ED] flex items-center justify-center text-[#EA580C]">
                  <Hotel className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#EA580C] font-bold leading-none">LUXURY SUITES</p>
                  <p className="font-serif text-xs font-bold text-[#2A1810] leading-tight">From 1,600 ETB / night</p>
                </div>
              </div>

            </div>

            {/* Subtle floating leaves/accents */}
            <div className="absolute top-[5%] left-[8%] w-8 h-8 sm:w-10 sm:h-10 animate-float-leaf-1 pointer-events-none z-20">
              <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-[#EA580C]/80 drop-shadow-md">
                <path d="M10 90C40 90 90 60 90 10C90 10 60 10 40 40C20 70 10 90 10 90Z" fill="currentColor" />
              </svg>
            </div>
            <div className="absolute bottom-[8%] right-[8%] w-7 h-7 sm:w-8 sm:h-8 animate-float-leaf-2 pointer-events-none z-20">
              <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-[#2A1810]/70 drop-shadow-md">
                <path d="M90 90C60 90 10 60 10 10C10 10 40 10 60 40C80 70 90 90 90 90Z" fill="currentColor" />
              </svg>
            </div>

          </div>

        </div>

        {/* Bottom Quick Bedroom Booking Bar */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 p-4 sm:p-6 bg-white/95 backdrop-blur-md rounded-3xl border border-[#EA580C]/25 shadow-xl shadow-[#2A1810]/5 max-w-5xl mx-auto"
        >
          <form onSubmit={handleQuickBook} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6E4733] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#EA580C]" />
                Check-in Date
              </label>
              <input
                type="date"
                value={quickCheckIn}
                onChange={(e) => setQuickCheckIn(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A1810]/15 bg-[#FAF6F0] text-sm text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6E4733] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#EA580C]" />
                Check-out Date
              </label>
              <input
                type="date"
                value={quickCheckOut}
                onChange={(e) => setQuickCheckOut(e.target.value)}
                min={quickCheckIn || new Date().toISOString().split('T')[0]}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A1810]/15 bg-[#FAF6F0] text-sm text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6E4733] mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#EA580C]" />
                Guests
              </label>
              <select
                value={quickGuests}
                onChange={(e) => setQuickGuests(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A1810]/15 bg-[#FAF6F0] text-sm text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
              >
                <option value="1">1 Adult (Solo)</option>
                <option value="2">2 Adults (Couple / Twin)</option>
                <option value="3">3 Guests (Suite)</option>
                <option value="4">4+ Guests (Presidential Family)</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#2A1810] to-[#422518] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Hotel className="w-4 h-4 text-[#FB923C]" />
                <span>Search & Book Room</span>
              </button>
            </div>
          </form>
        </motion.div>

      </div>
    </section>
  );
}
