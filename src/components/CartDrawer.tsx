import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, CheckCircle2, Hotel, UtensilsCrossed, Receipt } from 'lucide-react';
import { CartItem, CafeOrder } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onOrderPlaced: (order: CafeOrder) => void;
  currentEmail?: string;
  onOpenTracking?: (id: string) => void;
}

import { createCafeOrder } from '../services/dbService';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderPlaced,
  currentEmail = 'redwanredhood@gmail.com',
  onOpenTracking
}: CartDrawerProps) {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: 'Redwan Hood',
    email: currentEmail,
    phone: '+251 91 444 7722',
    deliveryType: 'room_delivery' as 'room_delivery' | 'table_service' | 'takeaway',
    roomOrTable: 'Suite 401',
    notes: ''
  });
  const [placedOrderId, setPlacedOrderId] = useState<string>('');

  const subtotal = cartItems.reduce((acc, item) => acc + item.menuItem.price * item.quantity, 0);
  const serviceFee = Math.round(subtotal * 0.05); // 5%
  const total = subtotal + serviceFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setSubmitError('Please provide your name and contact phone number.');
      return;
    }
    if (cartItems.length === 0) {
      setSubmitError('Your dining bag is empty.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const persistedOrder = await createCafeOrder({
        customerName: formData.name.trim(),
        customerEmail: formData.email.trim() || currentEmail,
        customerPhone: formData.phone.trim(),
        deliveryType: formData.deliveryType,
        roomOrTableNumber: formData.roomOrTable.trim() || (formData.deliveryType === 'room_delivery' ? 'Room Service' : 'Table 1'),
        rawItems: cartItems.map((ci) => ({
          menuItemId: ci.menuItem.id,
          quantity: ci.quantity
        })),
        notes: formData.notes.trim()
      });

      setPlacedOrderId(persistedOrder.id);
      onOrderPlaced(persistedOrder);
      setStep('success');

      setTimeout(() => {
        onClearCart();
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save order to database.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-[#2A1810]/15"
          >
            {/* Header */}
            <div className="p-5 border-b border-[#EA580C]/30 flex items-center justify-between bg-gradient-to-r from-[#2A1810] via-[#3E2314] to-[#2A1810] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EA580C] flex items-center justify-center text-white">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-sm font-bold tracking-wider uppercase">
                    MONAZ HOTEL <span className="text-[#FB923C]">DINING BAG</span>
                  </h3>
                  <p className="text-[10px] text-gray-300">Room delivery & dining orders</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Cart Items */}
            {step === 'cart' && (
              <>
                {cartItems.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <h4 className="font-serif text-xl font-bold text-[#2A1810]">Your Dining Bag is Empty</h4>
                    <p className="text-xs text-[#6E4733] max-w-xs">
                      Select any of our authentic traditional Ethiopian dishes, burgers, or beverages to order.
                    </p>
                    <button
                      onClick={onClose}
                      className="px-6 py-2.5 bg-[#2A1810] hover:bg-[#EA580C] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                    >
                      Browse Menu
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                      {cartItems.map((item) => (
                        <div
                          key={item.menuItem.id}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF6F0] border border-[#2A1810]/5"
                        >
                          <img
                            src={item.menuItem.image}
                            alt={item.menuItem.name}
                            className="w-14 h-14 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h5 className="font-serif text-xs font-bold text-[#2A1810] truncate">
                              {item.menuItem.name}
                            </h5>
                            <p className="font-mono text-xs font-bold text-[#EA580C] mt-0.5">
                              {item.menuItem.price.toLocaleString()} ETB
                            </p>
                          </div>

                          {/* Quantity selector */}
                          <div className="flex items-center gap-1.5 bg-white border border-[#2A1810]/15 rounded-lg p-0.5">
                            <button
                              onClick={() => onUpdateQuantity(item.menuItem.id, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 text-[#2A1810]"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold font-mono">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.menuItem.id, 1)}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 text-[#2A1810]"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => onRemoveItem(item.menuItem.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Total & Checkout button */}
                    <div className="p-5 border-t border-[#2A1810]/10 bg-white space-y-3">
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-[#6E4733]">
                          <span>Subtotal</span>
                          <span className="font-mono font-semibold">{subtotal.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex justify-between text-[#6E4733]">
                          <span>Service & Preparation (5%)</span>
                          <span className="font-mono font-semibold">{serviceFee.toLocaleString()} ETB</span>
                        </div>
                        <div className="pt-2 border-t border-[#2A1810]/10 flex justify-between text-sm font-bold text-[#2A1810]">
                          <span>Total</span>
                          <span className="font-mono font-bold text-[#EA580C] text-base">{total.toLocaleString()} ETB</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setStep('checkout')}
                        className="w-full py-3.5 bg-gradient-to-r from-[#2A1810] to-[#422518] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Proceed to Order Details</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Step 2: Checkout Details (Room / Table / Contact) */}
            {step === 'checkout' && (
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <h4 className="font-serif text-base font-bold text-[#2A1810] border-b border-[#2A1810]/10 pb-2">
                    Delivery & Guest Information
                  </h4>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1">
                      Delivery Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, deliveryType: 'room_delivery', roomOrTable: 'Suite 401' })}
                        className={`py-2 px-2 rounded-xl text-[11px] font-bold uppercase transition-all ${
                          formData.deliveryType === 'room_delivery'
                            ? 'bg-[#EA580C] text-white shadow-xs'
                            : 'bg-[#FAF6F0] text-[#6E4733] border border-[#2A1810]/10'
                        }`}
                      >
                        Room Service
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, deliveryType: 'table_service', roomOrTable: 'Table 4' })}
                        className={`py-2 px-2 rounded-xl text-[11px] font-bold uppercase transition-all ${
                          formData.deliveryType === 'table_service'
                            ? 'bg-[#EA580C] text-white shadow-xs'
                            : 'bg-[#FAF6F0] text-[#6E4733] border border-[#2A1810]/10'
                        }`}
                      >
                        Table Dine-in
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, deliveryType: 'takeaway', roomOrTable: 'Pickup Counter' })}
                        className={`py-2 px-2 rounded-xl text-[11px] font-bold uppercase transition-all ${
                          formData.deliveryType === 'takeaway'
                            ? 'bg-[#EA580C] text-white shadow-xs'
                            : 'bg-[#FAF6F0] text-[#6E4733] border border-[#2A1810]/10'
                        }`}
                      >
                        Takeaway
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1">
                      {formData.deliveryType === 'room_delivery' ? 'Hotel Bedroom / Suite Number' : formData.deliveryType === 'table_service' ? 'Table Number' : 'Pickup Reference'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.roomOrTable}
                      onChange={(e) => setFormData({ ...formData, roomOrTable: e.target.value })}
                      placeholder="e.g. Suite 401 or Table 5"
                      className="w-full px-3 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1">
                      Kitchen Special Notes
                    </label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="e.g. Extra spicy, warm injera, no onions"
                      className="w-full px-3 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>

                  {/* Summary */}
                  <div className="p-3 rounded-xl bg-[#FFF7ED] border border-[#EA580C]/20 text-xs">
                    <div className="flex justify-between font-bold text-[#2A1810]">
                      <span>Total Due (Cash, Card or Room Charge):</span>
                      <span className="text-[#EA580C] font-mono text-sm">{total.toLocaleString()} ETB</span>
                    </div>
                  </div>

                  {submitError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                      <p className="font-bold">Order Failed to Submit</p>
                      <p className="text-[11px] mt-0.5">{submitError}</p>
                    </div>
                  )}
                </div>

                <div className="p-5 border-t border-[#2A1810]/10 bg-white flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setStep('cart')}
                    className="px-4 py-3 rounded-xl border border-[#2A1810]/20 text-xs font-semibold text-[#2A1810] hover:bg-gray-100 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 py-3 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                      isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed opacity-80'
                        : 'bg-[#EA580C] hover:bg-[#C2410C]'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending to Monaz Kitchen & DB...</span>
                      </>
                    ) : (
                      <span>Send Order to Kitchen ({total.toLocaleString()} ETB)</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success Confirmation */}
            {step === 'success' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-serif text-2xl font-bold text-[#2A1810]">Order Received!</h4>
                <p className="text-xs text-[#6E4733] max-w-xs leading-relaxed">
                  Your order <strong className="font-mono text-[#EA580C]">{placedOrderId}</strong> has been saved directly to the database and transmitted to the kitchen.
                </p>
                <div className="p-3 rounded-xl bg-[#FAF6F0] border border-[#2A1810]/10 text-xs font-mono text-[#2A1810] w-full max-w-xs space-y-1.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Destination:</span>
                    <span className="font-bold">{formData.roomOrTable}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Est. Time:</span>
                    <span className="font-semibold text-emerald-600">15–25 mins</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-200 text-[11px]">
                    <span className="text-gray-500">Admin Notification:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Dispatched (redwanredhood@gmail.com)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
                  {onOpenTracking && placedOrderId && (
                    <button
                      onClick={() => {
                        setStep('cart');
                        onClose();
                        onOpenTracking(placedOrderId);
                      }}
                      className="w-full py-2.5 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Track Order Live</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setStep('cart');
                      onClose();
                    }}
                    className="w-full py-2.5 bg-[#2A1810] hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
