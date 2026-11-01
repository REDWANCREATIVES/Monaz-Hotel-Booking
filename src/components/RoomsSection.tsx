import React, { useState } from 'react';
import { Hotel, Users, Maximize, Check, Star, Wifi, Coffee, Sparkles, ArrowRight } from 'lucide-react';
import { HOTEL_ROOMS } from '../data';
import { HotelRoom } from '../types';

interface RoomsSectionProps {
  onBookRoom: (room?: HotelRoom) => void;
}

export default function RoomsSection({ onBookRoom }: RoomsSectionProps) {
  const [filter, setFilter] = useState<'all' | 'suite' | 'standard'>('all');

  const filteredRooms = HOTEL_ROOMS.filter((room) => {
    if (filter === 'suite') return room.name.toLowerCase().includes('suite');
    if (filter === 'standard') return !room.name.toLowerCase().includes('suite');
    return true;
  });

  return (
    <section id="rooms" className="py-20 md:py-28 bg-[#FAF6F0] relative">
      {/* Decorative subtle ambient lights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#EA580C]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#EA580C]/30 text-[#EA580C] text-xs uppercase font-bold tracking-widest shadow-xs mb-3">
            <Hotel className="w-3.5 h-3.5" />
            <span>Monaz Hotel Accommodations</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#2A1810] tracking-tight">
            Bedrooms & <span className="text-[#EA580C]">Luxury Suites</span>
          </h2>
          <p className="mt-4 text-[#6E4733] text-sm sm:text-base leading-relaxed">
            Every bedroom at Monaz Hotel is crafted for restful indulgence, featuring soundproof acoustic architecture, bespoke furnishings, and dedicated 24-hour room service.
          </p>

          {/* Filter Pills */}
          <div className="flex items-center justify-center gap-2.5 mt-8">
            <button
              onClick={() => setFilter('all')}
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#2A1810] text-white shadow-md'
                  : 'bg-white text-[#6E4733] hover:text-[#EA580C] border border-[#2A1810]/15'
              }`}
            >
              All Rooms ({HOTEL_ROOMS.length})
            </button>
            <button
              onClick={() => setFilter('suite')}
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filter === 'suite'
                  ? 'bg-[#EA580C] text-white shadow-md'
                  : 'bg-white text-[#6E4733] hover:text-[#EA580C] border border-[#2A1810]/15'
              }`}
            >
              Suites
            </button>
            <button
              onClick={() => setFilter('standard')}
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filter === 'standard'
                  ? 'bg-[#2A1810] text-white shadow-md'
                  : 'bg-white text-[#6E4733] hover:text-[#EA580C] border border-[#2A1810]/15'
              }`}
            >
              Deluxe & Standard
            </button>
          </div>
        </div>

        {/* Room Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-3xl overflow-hidden border border-[#2A1810]/10 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col group"
            >
              {/* Image Frame */}
              <div className="relative h-64 overflow-hidden bg-[#2A1810]">
                <img
                  src={room.image}
                  alt={room.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Tag pill */}
                <span className="absolute top-4 left-4 px-3 py-1 bg-[#2A1810]/85 backdrop-blur-md text-[#FB923C] text-[10px] font-bold uppercase tracking-widest rounded-full border border-[#EA580C]/40">
                  {room.tag}
                </span>

                {/* Rating badge */}
                <div className="absolute top-4 right-4 px-2.5 py-1 bg-white/90 backdrop-blur-md text-[#2A1810] text-xs font-bold rounded-full flex items-center gap-1 shadow-sm">
                  <Star className="w-3.5 h-3.5 fill-[#EA580C] text-[#EA580C]" />
                  <span>{room.rating.toFixed(1)}</span>
                </div>

                {/* Bottom Nightly Rate Overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex items-end justify-between text-white">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-300 font-medium">Nightly Rate</span>
                    <p className="font-serif text-2xl font-bold text-white">
                      {room.pricePerNight.toLocaleString()} <span className="text-xs font-sans font-normal text-[#FB923C]">ETB / night</span>
                    </p>
                  </div>
                  <span className="text-xs bg-[#EA580C] text-white px-2.5 py-1 rounded-lg font-semibold">
                    Available
                  </span>
                </div>
              </div>

              {/* Room Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#2A1810] group-hover:text-[#EA580C] transition-colors">
                    {room.name}
                  </h3>
                  
                  {/* Specs Row */}
                  <div className="flex items-center gap-4 py-3 border-b border-[#2A1810]/10 text-xs text-[#6E4733]">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#EA580C]" />
                      <span>Up to {room.maxGuests} guests</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Maximize className="w-4 h-4 text-[#EA580C]" />
                      <span>{room.size}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#6E4733] mt-3 line-clamp-2 leading-relaxed">
                    {room.description}
                  </p>

                  {/* Amenities Highlights */}
                  <div className="mt-4 space-y-1.5">
                    {room.amenities.slice(0, 4).map((amenity, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-[#2A1810]">
                        <Check className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <div className="mt-6 pt-4 border-t border-[#2A1810]/10 flex items-center gap-3">
                  <button
                    onClick={() => onBookRoom(room)}
                    className="flex-1 py-3 bg-gradient-to-r from-[#2A1810] to-[#422518] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
                  >
                    <Hotel className="w-4 h-4 text-[#FB923C]" />
                    <span>Book This Room</span>
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Hotel Perks Banner */}
        <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-[#2A1810] via-[#3E2314] to-[#2A1810] text-white border border-[#EA580C]/30 shadow-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EA580C]/20 border border-[#EA580C]/40 flex items-center justify-center text-[#FB923C] shrink-0">
                <Coffee className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif text-base font-bold">Complimentary Breakfast</h4>
                <p className="text-xs text-gray-300">Fresh pastries, juice & Ethiopian coffee</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EA580C]/20 border border-[#EA580C]/40 flex items-center justify-center text-[#FB923C] shrink-0">
                <Wifi className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif text-base font-bold">Fiber High-Speed Wi-Fi</h4>
                <p className="text-xs text-gray-300">Dedicated bandwidth in all suites</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EA580C]/20 border border-[#EA580C]/40 flex items-center justify-center text-[#FB923C] shrink-0">
                <Hotel className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif text-base font-bold">24/7 Room Delivery</h4>
                <p className="text-xs text-gray-300">Any menu dish brought hot to your bed</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EA580C]/20 border border-[#EA580C]/40 flex items-center justify-center text-[#FB923C] shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif text-base font-bold">VIP Concierge</h4>
                <p className="text-xs text-gray-300">Personalized city transfers & tours</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
