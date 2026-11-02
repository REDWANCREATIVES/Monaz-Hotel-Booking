import React, { useState, useEffect } from 'react';
import { ShoppingBag, User, Menu, X, ChevronDown, ShieldCheck, Hotel, UtensilsCrossed, LogOut, Check, Receipt, Clock, LogIn, UserPlus } from 'lucide-react';
import Logo from './Logo';
import { CartItem } from '../types';

interface HeaderProps {
  cartItems: CartItem[];
  onOpenCart: () => void;
  onOpenOrderNow: () => void;
  onOpenRooms: () => void;
  onOpenAdmin: () => void;
  onOpenTracking?: () => void;
  onLogout?: () => void;
  adminSession: {
    token: string;
    username: string;
    email: string;
    role: string;
    expiresAt: number;
  } | null;
  currentUser?: {
    email: string | null;
    displayName: string | null;
    uid: string;
  } | null;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  onSignOutAuth?: () => void;
}

export default function Header({
  cartItems,
  onOpenCart,
  onOpenOrderNow,
  onOpenRooms,
  onOpenAdmin,
  onOpenTracking,
  onLogout,
  adminSession,
  currentUser,
  onOpenAuth,
  onSignOutAuth
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isAdmin = Boolean(adminSession && adminSession.token && Date.now() < adminSession.expiresAt);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Bedrooms & Suites', href: '#rooms' },
    { label: 'Restaurant & Cafe Menu', href: '#menu' }
  ];

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const targetElement = document.querySelector(href);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-md py-3 border-b border-[#2A1810]/10'
          : 'bg-[#FAF6F0]/80 backdrop-blur-xs py-4 border-b border-[#2A1810]/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 flex items-center justify-between">
        
        {/* Brand Logo */}
        <a href="#home" onClick={(e) => scrollToSection(e, '#home')} className="cursor-pointer">
          <Logo className="h-10 w-10 sm:h-11 sm:w-11" orangeAccent={true} />
        </a>

        {/* Navigation Menu (Desktop) */}
        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="font-sans text-xs uppercase tracking-[0.16em] text-[#2A1810] hover:text-[#EA580C] font-semibold transition-colors py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-3">

          {/* Customer Live Tracking Button */}
          {onOpenTracking && (
            <button
              onClick={onOpenTracking}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-white hover:bg-[#FFF7ED] text-[#2A1810] hover:text-[#EA580C] border border-[#2A1810]/15 hover:border-[#EA580C]/40 transition-all cursor-pointer shadow-xs"
              title="Track Order or Bedroom Booking Progress"
            >
              <Receipt className="w-3.5 h-3.5 text-[#EA580C]" />
              <span className="hidden sm:inline">Track Progress</span>
            </button>
          )}
          
          {/* Admin Dashboard Entry Button */}
          <button
            onClick={onOpenAdmin}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs ${
              isAdmin
                ? 'bg-[#2A1810] text-[#FB923C] border border-[#EA580C]/40 hover:bg-[#EA580C] hover:text-white'
                : 'bg-white text-[#2A1810] border border-[#2A1810]/20 hover:border-[#EA580C]'
            }`}
            title="Admin Dashboard Portal"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>Admin</span>
            {isAdmin && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          {/* User Profile Droplist */}
          <div className="relative">
            <button
              id="profile-dropdown-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center border shadow-xs ${
                currentUser
                  ? 'bg-[#2A1810] text-[#FB923C] border-[#EA580C]/40 hover:bg-[#EA580C] hover:text-white'
                  : 'bg-white hover:bg-[#FFF7ED] text-[#2A1810] hover:text-[#EA580C] border-[#2A1810]/15'
              }`}
              title={currentUser ? `Signed in as ${currentUser.displayName || currentUser.email}` : "User Account & Authentication"}
            >
              {currentUser ? (
                <span className="w-5 h-5 flex items-center justify-center font-bold text-xs uppercase">
                  {(currentUser.displayName?.[0] || currentUser.email?.[0] || 'U')}
                </span>
              ) : (
                <User className="w-4 h-4" />
              )}
            </button>
            
            {profileOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setProfileOpen(false)} 
                />
                <div 
                  id="profile-dropdown-panel"
                  className="absolute right-0 mt-3 w-76 bg-white border border-[#2A1810]/15 rounded-2xl shadow-2xl z-50 p-4 animate-fade-in-up"
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-[#2A1810]/10">
                    <div className="w-10 h-10 rounded-full bg-[#2A1810] text-[#FB923C] flex items-center justify-center font-serif text-lg font-bold uppercase shrink-0">
                      {currentUser
                        ? (currentUser.displayName?.[0] || currentUser.email?.[0] || 'U')
                        : isAdmin ? 'M' : 'G'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-serif text-sm font-bold text-[#2A1810] truncate">
                          {currentUser
                            ? currentUser.displayName || 'Monaz Guest'
                            : isAdmin ? adminSession?.username || 'Monaz Hotel & Café' : 'Valued Guest'}
                        </h4>
                        {(isAdmin || currentUser?.email?.toLowerCase() === 'redwanredhood@gmail.com') ? (
                          <span className="px-1.5 py-0.2 bg-[#EA580C] text-white rounded text-[8px] font-bold">ADMIN</span>
                        ) : currentUser ? (
                          <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[8px] font-bold">MEMBER</span>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono truncate">
                        {currentUser
                          ? currentUser.email
                          : isAdmin ? adminSession?.email || 'redwanredhood@gmail.com' : 'Betel, Addis Ababa, Ethiopia'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="py-2.5 space-y-1.5 text-xs text-[#2A1810]">
                    {/* User state banner */}
                    {currentUser ? (
                      <div className="p-2.5 bg-[#FFF7ED] rounded-xl border border-[#EA580C]/20">
                        <p className="text-[10px] font-bold uppercase text-[#EA580C]">Signed In via Firebase</p>
                        <p className="text-[11px] text-[#6E4733] mt-0.5">
                          {currentUser.email?.toLowerCase() === 'redwanredhood@gmail.com'
                            ? 'Executive Administrator account verified.'
                            : 'Logged in as guest member. Faster bookings & order tracking.'}
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-[#FFF7ED] rounded-xl border border-[#EA580C]/20">
                        <p className="text-[10px] font-bold uppercase text-[#EA580C]">Member Access</p>
                        <p className="text-[11px] text-[#6E4733] mt-0.5">
                          Sign in or create an account to manage your room reservations and cafe orders.
                        </p>
                      </div>
                    )}

                    {/* Non-authenticated quick auth buttons */}
                    {!currentUser && onOpenAuth && (
                      <div className="pt-1 pb-1 space-y-1">
                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            onOpenAuth('signin');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-xl transition-colors text-left cursor-pointer shadow-xs"
                        >
                          <div className="flex items-center gap-2">
                            <LogIn className="w-4 h-4" />
                            <span>Sign In to Account</span>
                          </div>
                          <span className="text-[10px] opacity-80">Email</span>
                        </button>

                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            onOpenAuth('signup');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#2A1810] bg-white hover:bg-[#FFF7ED] border border-[#2A1810]/15 rounded-xl transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-[#EA580C]" />
                            <span>Create Free Account</span>
                          </div>
                          <span className="text-[10px] text-gray-400">Join</span>
                        </button>
                      </div>
                    )}

                    {/* Admin portal launch */}
                    {(isAdmin || currentUser?.email?.toLowerCase() === 'redwanredhood@gmail.com') ? (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#2A1810] hover:bg-[#FFF7ED] hover:text-[#EA580C] rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-[#EA580C]" />
                          <span>Launch Admin Dashboard</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold">Active</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#2A1810] hover:bg-[#FFF7ED] hover:text-[#EA580C] rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-[#EA580C]" />
                          <span>Administrator Portal</span>
                        </div>
                        <span className="text-[10px] text-gray-400">Login</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onOpenRooms();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#2A1810] hover:bg-[#FFF7ED] rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Hotel className="w-4 h-4 text-[#EA580C]" />
                      <span>Book a Bedroom</span>
                    </button>

                    {onOpenTracking && (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onOpenTracking();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#2A1810] hover:bg-[#FFF7ED] rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <Receipt className="w-4 h-4 text-[#EA580C]" />
                        <span>Track My Order or Booking</span>
                      </button>
                    )}

                    {/* Sign out buttons */}
                    {currentUser && onSignOutAuth && (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onSignOutAuth();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Sign Out ({currentUser.email?.split('@')[0]})</span>
                      </button>
                    )}

                    {!currentUser && isAdmin && onLogout && (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Sign Out of Administrator</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Shopping Bag Counter */}
          <button
            id="shopping-bag-btn"
            onClick={onOpenCart}
            className="p-2.5 rounded-full bg-white hover:bg-[#FFF7ED] text-[#2A1810] hover:text-[#EA580C] transition-colors relative cursor-pointer border border-[#2A1810]/15 shadow-xs"
            title="Cart"
          >
            <ShoppingBag className="w-4 h-4" />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#EA580C] text-white font-bold text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                {totalCartCount}
              </span>
            )}
          </button>

          {/* Book Bedroom CTA */}
          <button
            onClick={onOpenRooms}
            className="hidden sm:inline-flex px-5 py-2.5 bg-gradient-to-r from-[#EA580C] to-[#C2410C] hover:from-[#C2410C] hover:to-[#EA580C] text-white font-bold rounded-full text-[11px] uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            Book a Room
          </button>

          {/* Mobile Menu Toggle */}
          <button
            id="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-full bg-white border border-[#2A1810]/15 text-[#2A1810] hover:text-[#EA580C] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[65px] bg-white border-b border-[#2A1810]/10 shadow-xl p-5 z-50 animate-fade-in-up space-y-3">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="font-sans text-xs uppercase tracking-[0.16em] text-[#2A1810] hover:text-[#EA580C] font-semibold transition-colors py-2"
              >
                {link.label}
              </a>
            ))}
            
            <div className="h-px bg-[#2A1810]/10 my-1" />

            {/* Auth options for mobile */}
            {currentUser ? (
              <div className="p-3 bg-[#FFF7ED] rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#2A1810]">{currentUser.displayName || 'Monaz Member'}</p>
                  <p className="text-[10px] text-gray-500">{currentUser.email}</p>
                </div>
                {onSignOutAuth && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSignOutAuth();
                    }}
                    className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            ) : onOpenAuth && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signin');
                  }}
                  className="py-2.5 px-3 bg-[#2A1810] text-white font-bold rounded-xl text-xs uppercase tracking-wider text-center cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                  className="py-2.5 px-3 bg-[#FFF7ED] text-[#EA580C] border border-[#EA580C]/40 font-bold rounded-xl text-xs uppercase tracking-wider text-center cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenRooms();
              }}
              className="w-full py-3 bg-[#EA580C] text-white font-bold rounded-xl text-xs uppercase tracking-wider text-center shadow-md cursor-pointer"
            >
              Book a Bedroom
            </button>

            {onOpenTracking && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenTracking();
                }}
                className="w-full py-2.5 bg-[#FFF7ED] text-[#2A1810] hover:text-[#EA580C] border border-[#EA580C]/30 font-bold rounded-xl text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-[#EA580C]" />
                <span>Track Order & Booking Progress</span>
              </button>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAdmin();
              }}
              className="w-full py-2.5 bg-[#2A1810] text-[#FB923C] font-bold rounded-xl text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#EA580C]" />
              <span>Admin Portal ({isAdmin ? 'Verified' : 'Login'})</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
