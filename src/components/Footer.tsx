import React from 'react';
import { Hotel, Phone, Mail, MapPin, Clock, ShieldCheck, Heart } from 'lucide-react';
import Logo from './Logo';

interface FooterProps {
  onOpenAdmin?: () => void;
  onOpenRooms?: () => void;
  onOpenTracking?: () => void;
}

export default function Footer({ onOpenAdmin, onOpenRooms, onOpenTracking }: FooterProps) {
  return (
    <footer className="bg-[#1E100A] text-white pt-16 pb-12 border-t border-[#EA580C]/30 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-[#EA580C]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <Logo className="h-11 w-11" light={true} orangeAccent={true} />
            <p className="text-xs text-gray-300 leading-relaxed">
              Monaz Hotel &amp; Café offers refined boutique accommodations, world-class Ethiopian hospitality, signature traditional dining feasts, gourmet burgers, and artisanal highland coffees.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#FB923C]">
              <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
              <span>Reception & Concierge 24/7</span>
            </div>
          </div>

          {/* Hotel Accommodations */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-bold text-white tracking-wide border-l-2 border-[#EA580C] pl-2.5">
              Suites & Rooms
            </h4>
            <ul className="space-y-2 text-xs text-gray-300">
              <li>
                <button onClick={onOpenRooms} className="hover:text-[#FB923C] transition-colors text-left">
                  Monaz Presidential Penthouse
                </button>
              </li>
              <li>
                <button onClick={onOpenRooms} className="hover:text-[#FB923C] transition-colors text-left">
                  Executive Deluxe Suite
                </button>
              </li>
              <li>
                <button onClick={onOpenRooms} className="hover:text-[#FB923C] transition-colors text-left">
                  Royal Balcony City View
                </button>
              </li>
              <li>
                <button onClick={onOpenRooms} className="hover:text-[#FB923C] transition-colors text-left">
                  Deluxe King Bedroom
                </button>
              </li>
              <li>
                <button onClick={onOpenRooms} className="hover:text-[#FB923C] transition-colors text-left cursor-pointer">
                  Superior Twin Accommodations
                </button>
              </li>
              {onOpenTracking && (
                <li className="pt-1.5 border-t border-white/10">
                  <button onClick={onOpenTracking} className="text-[#FB923C] hover:underline font-bold text-left cursor-pointer flex items-center gap-1">
                    <span>Track Order or Booking &rarr;</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Restaurant & Dining */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-bold text-white tracking-wide border-l-2 border-[#EA580C] pl-2.5">
              Dining & Bar
            </h4>
            <ul className="space-y-2 text-xs text-gray-300">
              <li>Authentic Ethiopian Tibs & Shiro</li>
              <li>Gourmet Monaz Special Burger</li>
              <li>Traditional Dulet & Kitfo Special</li>
              <li>Ethiopian Macchiato & Korerima Brew</li>
              <li>24/7 Room Delivery for Guests</li>
            </ul>
          </div>

          {/* Contact & Administration */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-bold text-white tracking-wide border-l-2 border-[#EA580C] pl-2.5">
              Contact & Location
            </h4>
            <div className="space-y-2.5 text-xs text-gray-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Betel, Addis Ababa, Ethiopia</span>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Betel,+Addis+Ababa,+Ethiopia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[11px] text-[#FB923C] hover:underline mt-0.5"
                  >
                    View on Google Maps →
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#EA580C] shrink-0" />
                <span>+251 11 662 4400 / +251 91 123 4567</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#EA580C] shrink-0" />
                <span>reservations@monazhotel.com</span>
              </div>
              <div className="pt-2">
                <button
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#EA580C] text-[#FB923C] hover:text-white transition-colors text-[11px] font-semibold cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Portal</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-3">
          <p>© {new Date().getFullYear()} Monaz Hotel &amp; Café. All rights reserved.</p>
          <p className="flex items-center gap-1 text-[11px]">
            Crafted for exceptional hospitality & gourmet dining.
          </p>
        </div>
      </div>
    </footer>
  );
}
