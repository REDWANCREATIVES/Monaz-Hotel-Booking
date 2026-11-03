import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Utensils,
  BedDouble,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { ServiceTrackingInfo, PaymentStatus } from '../types';
import { fetchPublicTracking } from '../services/dbService';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReferenceId?: string | null;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({
  isOpen,
  onClose,
  initialReferenceId = null
}) => {
  const [searchInput, setSearchInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTracking, setActiveTracking] = useState<ServiceTrackingInfo | null>(null);
  const [searchResults, setSearchResults] = useState<ServiceTrackingInfo[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Auto-search if initial reference ID passed
  useEffect(() => {
    if (isOpen) {
      if (initialReferenceId) {
        setSearchInput(initialReferenceId);
        fetchTracking(initialReferenceId);
      } else {
        // Try local storage for recent tracking ID
        const savedId = localStorage.getItem('monaz_last_tracking_id');
        if (savedId && !activeTracking) {
          setSearchInput(savedId);
          fetchTracking(savedId);
        }
      }
    }
  }, [isOpen, initialReferenceId]);

  // Periodic polling for live status progress updates (every 6 seconds while open)
  useEffect(() => {
    if (!isOpen || !activeTracking?.id) return;

    const interval = setInterval(() => {
      fetchTracking(activeTracking.id, true);
    }, 6000);

    return () => clearInterval(interval);
  }, [isOpen, activeTracking?.id]);

  const fetchTracking = async (refId: string, isSilent = false) => {
    const cleanId = refId.trim().toUpperCase();
    if (!cleanId) return;

    if (!isSilent) setIsLoading(true);
    setError(null);

    try {
      const tracking = await fetchPublicTracking(cleanId);
      setActiveTracking(tracking);
      setSearchResults([]);
      setLastUpdated(new Date());
      localStorage.setItem('monaz_last_tracking_id', tracking.id);
    } catch (err: any) {
      if (!isSilent) {
        setError(err?.message || `Reference #${cleanId} was not found. Please double-check your code.`);
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  const handleFuzzySearch = async (queryText: string, isSilent = false) => {
    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          if (data.results.length === 1) {
            setActiveTracking(data.results[0]);
            setSearchResults([]);
            localStorage.setItem('monaz_last_tracking_id', data.results[0].id);
          } else {
            setSearchResults(data.results);
            setActiveTracking(null);
          }
          setLastUpdated(new Date());
          return;
        }
      }
    } catch {
      // Backend not running; fall through to local lookup
    }

    // Direct fallback lookup by reference ID, phone, or name from client cache
    try {
      const cleanQ = queryText.trim().toLowerCase();
      const rawBookings = localStorage.getItem('monaz_room_bookings');
      const rawOrders = localStorage.getItem('monaz_cafe_orders');
      const bookings: any[] = rawBookings ? JSON.parse(rawBookings) : [];
      const orders: any[] = rawOrders ? JSON.parse(rawOrders) : [];

      const matchedBooking = bookings.find(
        (b) =>
          b.id.toLowerCase() === cleanQ ||
          (b.guestPhone && b.guestPhone.replace(/\D/g, '').includes(cleanQ.replace(/\D/g, ''))) ||
          (b.guestName && b.guestName.toLowerCase().includes(cleanQ))
      );
      if (matchedBooking) {
        await fetchTracking(matchedBooking.id, isSilent);
        return;
      }

      const matchedOrder = orders.find(
        (o) =>
          o.id.toLowerCase() === cleanQ ||
          (o.customerPhone && o.customerPhone.replace(/\D/g, '').includes(cleanQ.replace(/\D/g, ''))) ||
          (o.customerName && o.customerName.toLowerCase().includes(cleanQ))
      );
      if (matchedOrder) {
        await fetchTracking(matchedOrder.id, isSilent);
        return;
      }
    } catch {}

    if (!isSilent) {
      setError(`No active booking or food order found matching "${queryText}". Please verify your reference number or phone.`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    fetchTracking(searchInput.trim());
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E100A]/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#EA580C]/20 overflow-hidden my-8"
        >
          {/* Header Bar */}
          <div className="bg-[#2A1810] text-white p-6 sm:p-7 relative border-b-4 border-[#EA580C]">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EA580C] flex items-center justify-center text-white shadow-lg">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#FB923C] block">
                  Customer Concierge & Progress
                </span>
                <h3 className="font-serif text-2xl font-bold text-white leading-tight">
                  Track Order & Booking Progress
                </h3>
              </div>
            </div>

            <p className="text-xs text-[#E8DFD5] mt-2 max-w-lg">
              Check live preparation, room readiness, payment receipt audit, and Gmail confirmation status for Monaz Hotel & Café.
            </p>

            {/* Quick Search Input */}
            <form onSubmit={handleSearchSubmit} className="mt-5 relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Reference (e.g. BK-4921, ORD-1082) or phone/email"
                className="w-full pl-11 pr-28 py-3.5 bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-[#2A1810] rounded-2xl border border-white/20 focus:border-[#EA580C] text-xs font-mono placeholder:text-gray-300 focus:outline-none transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-[#FB923C] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Track'}
              </button>
            </form>
          </div>

          {/* Modal Body */}
          <div className="p-6 sm:p-7 max-h-[75vh] overflow-y-auto space-y-6">

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{error}</p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Tip: Reference numbers are printed on your order slip or booking confirmation email (e.g. BK-1234 or ORD-5678).
                  </p>
                </div>
              </div>
            )}

            {/* Search Multiple Results Selection List */}
            {searchResults.length > 0 && !activeTracking && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6E4733]">
                  Select From Found Bookings & Orders ({searchResults.length})
                </h4>
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-[#FAF6F0]">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTracking(item);
                        setSearchResults([]);
                      }}
                      className="w-full text-left p-4 hover:bg-white transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#EA580C]">{item.id}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 font-semibold">
                            {item.categoryLabel}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#2A1810] mt-1">{item.title}</p>
                        <p className="text-[11px] text-gray-500">{item.customerName} • {item.totalPrice.toLocaleString()} {item.currency}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#EA580C] group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active Tracking Details */}
            {activeTracking && (
              <div className="space-y-6">
                
                {/* Status Hero Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#FFF7ED] to-[#FFF1E6] border border-[#EA580C]/30 shadow-sm relative overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3 relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold bg-[#EA580C] text-white px-2.5 py-0.5 rounded-lg shadow-sm">
                          #{activeTracking.id}
                        </span>
                        <span className="text-[11px] font-bold text-[#6E4733] uppercase tracking-wider">
                          {activeTracking.categoryLabel}
                        </span>
                      </div>
                      <h4 className="font-serif text-xl font-bold text-[#2A1810]">
                        {activeTracking.title}
                      </h4>
                      {activeTracking.subtitle && (
                        <p className="text-xs text-[#6E4733] mt-1 leading-relaxed">
                          {activeTracking.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm ${
                        activeTracking.status === 'confirmed' || activeTracking.status === 'accepted' || activeTracking.status === 'served' || activeTracking.status === 'completed'
                          ? 'bg-emerald-600 text-white'
                          : activeTracking.status === 'preparing' || activeTracking.status === 'ready'
                          ? 'bg-amber-500 text-white'
                          : activeTracking.status === 'rejected' || activeTracking.status === 'cancelled'
                          ? 'bg-red-600 text-white'
                          : 'bg-[#EA580C] text-white'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        {activeTracking.statusLabel}
                      </span>

                      {lastUpdated && (
                        <p className="text-[10px] text-[#9A7B68] mt-1 flex items-center justify-end gap-1">
                          <RefreshCw className="w-2.5 h-2.5" /> Live Synced: {lastUpdated.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#EA580C]/20 flex flex-wrap items-center justify-between gap-3 text-xs text-[#4B3528]">
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase">Guest / Customer</span>
                      <strong>{activeTracking.customerName}</strong> {activeTracking.customerPhone && `(${activeTracking.customerPhone})`}
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase">Service Destination</span>
                      <strong>{activeTracking.locationOrRoom}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 block text-[10px] uppercase">Grand Total</span>
                      <strong className="text-base text-[#EA580C] font-mono">
                        {activeTracking.totalPrice.toLocaleString()} {activeTracking.currency}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Identified Payment Receipt Section (Explicit Requirement) */}
                <div className={`p-5 rounded-2xl border ${
                  activeTracking.paymentProof
                    ? activeTracking.paymentStatus === 'verified'
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-amber-50/70 border-amber-300'
                    : 'bg-stone-50 border-stone-200'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${
                        activeTracking.paymentStatus === 'verified'
                          ? 'bg-emerald-100 text-emerald-700'
                          : activeTracking.paymentProof
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-stone-200 text-stone-600'
                      }`}>
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-[#2A1810]">
                          Identified Payment Receipt & Audit Status
                        </h5>
                        <p className="text-xs font-semibold text-[#6E4733] mt-0.5">
                          {activeTracking.paymentStatusLabel}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      activeTracking.paymentStatus === 'verified'
                        ? 'bg-emerald-600 text-white'
                        : activeTracking.paymentProof
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-300 text-gray-800'
                    }`}>
                      {activeTracking.paymentStatus === 'verified' ? 'Verified' : activeTracking.paymentProof ? 'Attached' : 'Pending'}
                    </span>
                  </div>

                  {activeTracking.paymentProof ? (
                    <div className="mt-3.5 p-3.5 rounded-xl bg-white border border-gray-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#2A1810] font-medium">
                          <FileText className="w-4 h-4 text-[#EA580C]" />
                          <span className="font-mono text-[11px] truncate max-w-[240px] sm:max-w-xs">
                            {activeTracking.paymentProof.fileName}
                          </span>
                        </div>
                        <a
                          href={`${activeTracking.paymentProof.fileUrl}?bookingRef=${activeTracking.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-[#EA580C] hover:text-[#C2410C] flex items-center gap-1 cursor-pointer"
                        >
                          View Receipt <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Size: {(activeTracking.paymentProof.fileSize / 1024).toFixed(1)} KB</span>
                        <span>Uploaded: {new Date(activeTracking.paymentProof.uploadedAt).toLocaleString()}</span>
                        {activeTracking.paymentProof.verifiedBy && (
                          <span className="text-emerald-700 font-semibold">
                            Audited by: {activeTracking.paymentProof.verifiedBy}
                          </span>
                        )}
                      </div>

                      {activeTracking.paymentProof.verificationNotes && (
                        <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                          <strong>Admin Note:</strong> {activeTracking.paymentProof.verificationNotes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">
                      No bank transfer receipt was attached. Payment is due at the hotel front desk upon check-in or delivery.
                    </p>
                  )}
                </div>

                {/* Progress Step Pipeline */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#EA580C]" /> Live Fulfillment Timeline
                  </h5>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
                    {activeTracking.steps.map((step, idx) => {
                      const isComplete = step.status === 'completed';
                      const isCurrent = step.status === 'current';

                      return (
                        <div key={step.key || idx} className="relative group">
                          {/* Dot / Indicator */}
                          <div
                            className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              isComplete
                                ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                                : isCurrent
                                ? 'bg-[#EA580C] text-white ring-4 ring-orange-100 animate-pulse'
                                : 'bg-gray-200 text-gray-400'
                            }`}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>

                          <div className={`p-4 rounded-2xl border transition-all ${
                            isCurrent
                              ? 'bg-[#FFF7ED] border-[#EA580C]/40 shadow-sm'
                              : isComplete
                              ? 'bg-white border-gray-200'
                              : 'bg-gray-50/50 border-gray-100 opacity-60'
                          }`}>
                            <div className="flex items-center justify-between">
                              <h6 className={`text-xs font-bold ${
                                isCurrent ? 'text-[#EA580C]' : isComplete ? 'text-[#2A1810]' : 'text-gray-500'
                              }`}>
                                {step.title}
                              </h6>
                              {isCurrent && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EA580C] text-white uppercase tracking-wider">
                                  Current Status
                                </span>
                              )}
                              {isComplete && step.timestamp && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#6E4733] mt-1 leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Concierge Contact / Action Bar */}
                <div className="p-4 rounded-2xl bg-[#2A1810] text-white flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#EA580C]" />
                    <span>Monaz Hotel: Betel, Addis Ababa, Ethiopia</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href="tel:+251911234567"
                      className="px-3 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call Front Desk
                    </a>
                  </div>
                </div>

              </div>
            )}

            {/* Empty State when no search conducted */}
            {!activeTracking && searchResults.length === 0 && !error && (
              <div className="text-center py-10 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center mx-auto border border-[#EA580C]/20 shadow-sm">
                  <Search className="w-8 h-8" />
                </div>
                <h4 className="font-serif text-lg font-bold text-[#2A1810]">
                  Track Any Order or Bedroom Stay
                </h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Enter your Reference ID (e.g. <strong>BK-4821</strong> for rooms or <strong>ORD-1234</strong> for food) to inspect real-time kitchen status, room readiness, payment audit, and Gmail alerts.
                </p>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="bg-[#FAF6F0] p-4 px-6 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>MONAZ HOTEL & CAFÉ System</span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 font-bold text-[#2A1810] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
