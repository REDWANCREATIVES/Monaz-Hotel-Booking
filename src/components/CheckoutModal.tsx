import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Users, Coffee, UtensilsCrossed, CheckCircle2, Sparkles, Hotel } from 'lucide-react';

import { createTableReservation } from '../services/dbService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'reservation' | 'catering';
}

export default function CheckoutModal({ isOpen, onClose, initialType = 'reservation' }: CheckoutModalProps) {
  const [bookingType, setBookingType] = useState<'reservation' | 'catering'>(initialType);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedResId, setConfirmedResId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: 'Redwan Hood',
    email: 'redwanredhood@gmail.com',
    phone: '+251 91 444 7722',
    date: new Date().toISOString().split('T')[0],
    time: '19:30',
    guests: '2',
    package: 'traditional-banquet',
    notes: 'Table near the window please.'
  });

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setSubmitError('Please complete all contact details.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const res = await createTableReservation({
        bookingType,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        date: formData.date,
        time: formData.time,
        guests: formData.guests,
        package: formData.package,
        notes: formData.notes.trim()
      });
      setConfirmedResId(res.id);
      setIsSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save table reservation.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setSubmitError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="fixed inset-0 cursor-pointer" onClick={handleClose} />

          <motion.div
            id="booking-modal-panel"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="bg-white border border-[#2A1810]/15 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col my-8"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-[#EA580C]/30 bg-gradient-to-r from-[#2A1810] via-[#3E2314] to-[#2A1810] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-[#EA580C]" />
                <h3 className="font-serif text-lg tracking-wider font-semibold uppercase">
                  {bookingType === 'reservation' ? 'Reserve a Dining Table' : 'Monaz Event Catering'}
                </h3>
              </div>
              <button
                id="close-booking-modal-btn"
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Type Switcher */}
            <div className="grid grid-cols-2 p-2 bg-[#FAF6F0] border-b border-[#2A1810]/10">
              <button
                onClick={() => setBookingType('reservation')}
                className={`py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  bookingType === 'reservation'
                    ? 'bg-[#2A1810] text-white shadow-xs'
                    : 'text-[#6E4733] hover:text-[#EA580C]'
                }`}
              >
                Table Dining
              </button>
              <button
                onClick={() => setBookingType('catering')}
                className={`py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  bookingType === 'catering'
                    ? 'bg-[#2A1810] text-white shadow-xs'
                    : 'text-[#6E4733] hover:text-[#EA580C]'
                }`}
              >
                VIP Banquet Catering
              </button>
            </div>

            {!isSuccess ? (
              <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1">
                      Party Size
                    </label>
                    <select
                      value={formData.guests}
                      onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    >
                      <option value="1">1 Person</option>
                      <option value="2">2 People</option>
                      <option value="4">4 People</option>
                      <option value="6">6+ People</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1">
                    Special Seating Requests
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Quiet corner, anniversary setup"
                    className="w-full px-3 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                  />
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                    <p className="font-bold">Reservation Failed</p>
                    <p className="text-[11px] mt-0.5">{submitError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3.5 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2 ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed opacity-80'
                      : 'bg-gradient-to-r from-[#2A1810] to-[#422518] hover:from-[#EA580C] hover:to-[#C2410C]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving Reservation & Transmitting Alert...</span>
                    </>
                  ) : (
                    <span>Confirm Table Reservation</span>
                  )}
                </button>
              </form>
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-serif text-xl font-bold text-[#2A1810]">Table Reserved!</h4>
                <p className="text-xs text-[#6E4733]">
                  Thank you, <strong>{formData.name}</strong>. Your table at MONAZ HOTEL restaurant in Betel, Addis Ababa for {formData.guests} guest(s) on {formData.date} at {formData.time} is confirmed and recorded.
                </p>
                {confirmedResId && (
                  <div className="p-3 rounded-xl bg-[#FAF6F0] border border-[#2A1810]/10 text-xs font-mono text-[#2A1810] max-w-xs mx-auto text-left space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reference:</span>
                      <span className="font-bold text-[#EA580C]">{confirmedResId}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Manager Notification:</span>
                      <span className="text-emerald-700 font-bold">Dispatched</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-[#2A1810] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
