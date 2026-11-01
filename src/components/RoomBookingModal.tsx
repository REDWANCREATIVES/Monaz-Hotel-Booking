import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Hotel,
  Calendar,
  Users,
  CheckCircle2,
  ShieldCheck,
  Phone,
  Mail,
  User,
  BedDouble,
  Upload,
  FileText,
  Download,
  AlertCircle,
  FileCheck,
  Receipt
} from 'lucide-react';
import { HOTEL_ROOMS } from '../data';
import { HotelRoom, RoomBooking } from '../types';
import { createRoomBooking } from '../services/dbService';
import { generateBookingReceiptPDF } from '../utils/pdfReceipt';

interface RoomBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRoom?: HotelRoom | null;
  onBookingConfirmed: (booking: RoomBooking) => void;
  userEmail?: string;
  onOpenTracking?: (id: string) => void;
}

export default function RoomBookingModal({
  isOpen,
  onClose,
  selectedRoom,
  onBookingConfirmed,
  userEmail = 'redwanredhood@gmail.com',
  onOpenTracking
}: RoomBookingModalProps) {
  const [activeRoomId, setActiveRoomId] = useState<string>(selectedRoom?.id || HOTEL_ROOMS[0].id);
  const [guestName, setGuestName] = useState('Redwan Hood');
  const [email, setEmail] = useState(userEmail);
  const [phone, setPhone] = useState('+251 91 444 7722');
  const [checkIn, setCheckIn] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [checkOut, setCheckOut] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    return tomorrow.toISOString().split('T')[0];
  });
  const [guestsCount, setGuestsCount] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  
  // Payment Proof File Upload State
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<RoomBooking | null>(null);

  useEffect(() => {
    if (selectedRoom) {
      setActiveRoomId(selectedRoom.id);
    }
  }, [selectedRoom]);

  // Calculate nights & pricing
  const currentRoom = HOTEL_ROOMS.find((r) => r.id === activeRoomId) || HOTEL_ROOMS[0];
  const dIn = new Date(checkIn);
  const dOut = new Date(checkOut);
  const diffTime = Math.max(1000 * 60 * 60 * 24, dOut.getTime() - dIn.getTime());
  const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  const roomSubtotal = currentRoom.pricePerNight * nights;
  const taxesAndService = Math.round(roomSubtotal * 0.10); // 10%
  const grandTotal = roomSubtotal + taxesAndService;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    const file = e.target.files[0];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setFileError('Invalid file format. Please upload JPG, PNG, or PDF.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds 5MB limit. Please choose a smaller file.');
      e.target.value = '';
      return;
    }
    setReceiptFile(file);
  };

  const handleRemoveFile = () => {
    setReceiptFile(null);
    setFileError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (checkOut <= checkIn) {
      setSubmitError('Check-out date must be strictly after the check-in date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const persistedBooking = await createRoomBooking({
        roomId: currentRoom.id,
        guestName: guestName.trim() || 'Valued Guest',
        guestEmail: email.trim() || userEmail,
        guestPhone: phone.trim() || '+251 91 000 0000',
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestsCount,
        specialRequests: specialRequests.trim(),
        receiptFile: receiptFile || undefined
      });

      setConfirmedBooking(persistedBooking);
      setIsConfirmed(true);
      onBookingConfirmed(persistedBooking);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save reservation to database.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsConfirmed(false);
    setConfirmedBooking(null);
    setSubmitError(null);
    setReceiptFile(null);
    setFileError(null);
    onClose();
  };

  const handleDownloadPDF = () => {
    if (confirmedBooking) {
      generateBookingReceiptPDF(confirmedBooking);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#2A1810]/15 overflow-hidden my-8 max-h-[90vh] flex flex-col"
        >
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-[#2A1810] via-[#3E2314] to-[#2A1810] p-6 text-white flex items-center justify-between border-b border-[#EA580C]/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EA580C] flex items-center justify-center text-white shadow-md">
                <Hotel className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold tracking-wide">
                  MONAZ HOTEL <span className="text-[#FB923C]">RESERVATION</span>
                </h3>
                <p className="text-xs text-gray-300">Betel, Addis Ababa • Reserve bedroom & download verified receipt</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {!isConfirmed ? (
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                
                {/* Room Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-2 flex items-center gap-1.5">
                    <BedDouble className="w-4 h-4 text-[#EA580C]" />
                    Select Accommodation
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {HOTEL_ROOMS.map((room) => {
                      const isSelected = room.id === activeRoomId;
                      return (
                        <button
                          type="button"
                          key={room.id}
                          onClick={() => setActiveRoomId(room.id)}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                            isSelected
                              ? 'border-[#EA580C] bg-[#FFF7ED] shadow-sm'
                              : 'border-[#2A1810]/15 hover:border-[#EA580C]/40 bg-white'
                          }`}
                        >
                          <img
                            src={room.image}
                            alt={room.name}
                            className="w-14 h-14 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-serif text-xs font-bold text-[#2A1810] truncate">
                              {room.name}
                            </p>
                            <p className="text-[10px] text-[#6E4733]">{room.bedType}</p>
                            <p className="text-xs font-bold text-[#EA580C] mt-0.5">
                              {room.pricePerNight.toLocaleString()} ETB <span className="text-[9px] text-[#6E4733] font-normal">/ night</span>
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date & Guests Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#EA580C]" />
                      Check-in Date
                    </label>
                    <input
                      type="date"
                      required
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-sm text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#EA580C]" />
                      Check-out Date
                    </label>
                    <input
                      type="date"
                      required
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-sm text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#EA580C]" />
                      Guests
                    </label>
                    <select
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-sm text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    >
                      {[1, 2, 3, 4].map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? 'Guest' : 'Guests'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Guest Information */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#EA580C]" />
                      Guest Name
                    </label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full px-3 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-sm text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#EA580C]" />
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="w-full px-3 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-sm text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#EA580C]" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+251 91 000 0000"
                      className="w-full px-3 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-sm text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1.5">
                    Special Requests / Airport Pickup
                  </label>
                  <input
                    type="text"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="e.g. Late flight arrival, quiet high floor, extra pillows"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-sm text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                  />
                </div>

                {/* Payment Proof Upload Section (Part 3) */}
                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#2A1810]/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#2A1810] flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-[#EA580C]" />
                      Payment Proof / Bank Transfer Receipt (Optional)
                    </label>
                    <span className="text-[10px] font-semibold text-gray-500">Max 5MB (JPG, PNG, PDF)</span>
                  </div>

                  <p className="text-[11px] text-[#6E4733] leading-relaxed">
                    You can pay in advance via <strong>Commercial Bank of Ethiopia (CBE: 1000 4819 2381 9)</strong> or <strong>Telebirr (+251 91 444 7722)</strong> and attach the confirmation slip below, or simply choose to pay upon check-in.
                  </p>

                  {!receiptFile ? (
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#EA580C]/40 rounded-xl bg-white hover:bg-[#FFF7ED]/50 cursor-pointer transition-colors text-center group">
                      <Upload className="w-6 h-6 text-[#EA580C] mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-[#2A1810]">Click to upload payment receipt or screenshot</span>
                      <span className="text-[10px] text-gray-500 mt-0.5">JPEG, PNG or PDF up to 5MB</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-300 shadow-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-bold text-[#2A1810] truncate">{receiptFile.name}</p>
                          <p className="text-[10px] text-gray-500">{(receiptFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {fileError && (
                    <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {fileError}
                    </p>
                  )}
                </div>

                {/* Price Calculation Summary Card */}
                <div className="p-4 rounded-2xl bg-[#FFF7ED] border border-[#EA580C]/25 text-xs text-[#2A1810] space-y-2">
                  <div className="flex justify-between">
                    <span>{currentRoom.name} ({currentRoom.pricePerNight.toLocaleString()} ETB × {nights} {nights === 1 ? 'night' : 'nights'})</span>
                    <span className="font-semibold">{roomSubtotal.toLocaleString()} ETB</span>
                  </div>
                  <div className="flex justify-between text-[#6E4733]">
                    <span>Hotel Service, VAT & Tourism Levy (10%)</span>
                    <span>{taxesAndService.toLocaleString()} ETB</span>
                  </div>
                  <div className="pt-2 border-t border-[#EA580C]/20 flex justify-between text-sm font-bold text-[#2A1810]">
                    <span>Total Booking Price</span>
                    <span className="font-serif text-lg text-[#EA580C]">{grandTotal.toLocaleString()} ETB</span>
                  </div>
                </div>

                {submitError && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-bold">!</div>
                    <div className="flex-1">
                      <p className="font-bold">Reservation Could Not Be Saved</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed">{submitError}</p>
                    </div>
                  </div>
                )}

                {/* Submission button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 text-white font-bold rounded-2xl text-xs uppercase tracking-widest shadow-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed opacity-80'
                      : 'bg-gradient-to-r from-[#2A1810] to-[#422518] hover:from-[#EA580C] hover:to-[#C2410C]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving Securely & Alerting Manager...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#FB923C]" />
                      <span>Confirm & Guarantee Reservation</span>
                    </>
                  )}
                </button>

              </form>
            ) : (
              /* Confirmation Receipt View */
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h4 className="font-serif text-2xl font-bold text-[#2A1810]">Reservation Submitted!</h4>
                  <p className="text-xs text-[#6E4733] mt-1">
                    Your luxury stay at <strong>MONAZ HOTEL</strong> (Betel, Addis Ababa) has been recorded in our database.
                  </p>
                </div>

                {confirmedBooking && (
                  <div className="p-6 rounded-2xl bg-[#FAF6F0] border border-[#2A1810]/10 text-left text-xs space-y-3 max-w-md mx-auto">
                    <div className="flex justify-between pb-2 border-b border-[#2A1810]/10">
                      <span className="text-[#6E4733]">Booking Reference</span>
                      <span className="font-mono font-bold text-[#EA580C] text-sm">{confirmedBooking.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6E4733]">Guest</span>
                      <span className="font-bold text-[#2A1810]">{confirmedBooking.guestName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6E4733]">Accommodation</span>
                      <span className="font-bold text-[#2A1810]">{confirmedBooking.roomName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6E4733]">Dates</span>
                      <span className="font-semibold text-[#2A1810]">{confirmedBooking.checkInDate} to {confirmedBooking.checkOutDate} ({confirmedBooking.nights} nights)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6E4733]">Total Price</span>
                      <span className="text-[#EA580C] font-serif font-bold text-sm">{confirmedBooking.totalPrice.toLocaleString()} ETB</span>
                    </div>

                    {/* Payment Status Indicator */}
                    <div className="flex justify-between items-center pt-2 border-t border-[#2A1810]/10">
                      <span className="text-[#6E4733]">Payment Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        confirmedBooking.paymentStatus === 'proof_submitted'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : confirmedBooking.paymentStatus === 'verified'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-orange-100 text-orange-800 border border-orange-300'
                      }`}>
                        {confirmedBooking.paymentStatus === 'proof_submitted'
                          ? 'Proof Submitted (Pending Review)'
                          : confirmedBooking.paymentStatus === 'verified'
                          ? 'Verified'
                          : 'Unpaid (Due at Check-in)'}
                      </span>
                    </div>

                    {/* Identified Payment Receipt Card */}
                    {confirmedBooking.paymentProof && (
                      <div className="p-3 bg-white rounded-xl border border-emerald-300 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-emerald-800">Payment Receipt Identified:</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Attached for Audit</span>
                        </div>
                        <p className="font-mono text-[11px] text-[#2A1810] truncate">
                          {confirmedBooking.paymentProof.fileName}
                        </p>
                      </div>
                    )}

                    {/* Administrator & Guest Notification Dispatch Badges */}
                    <div className="mt-3 pt-3 border-t border-[#2A1810]/10 space-y-1.5 text-[11px] text-[#6E4733]">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Admin Alert:
                        </span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Dispatched (redwanredhood@gmail.com)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Guest Confirmation:
                        </span>
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          Dispatched to {confirmedBooking.guestEmail}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* PDF Download Button, Track Progress, and Done Button */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  {onOpenTracking && confirmedBooking && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onOpenTracking(confirmedBooking.id);
                      }}
                      className="w-full sm:w-auto px-5 py-3 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Track Booking Progress Live</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-[#FFF7ED] text-[#2A1810] border border-[#2A1810]/20 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#EA580C]" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full sm:w-auto px-5 py-3 bg-[#2A1810] hover:bg-black text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
