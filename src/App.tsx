import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Check, Heart, ShoppingBag, X, Hotel, ShieldCheck } from 'lucide-react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';

import Header from './components/Header';
import Hero from './components/Hero';
import RoomsSection from './components/RoomsSection';
import MenuSection from './components/MenuSection';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import RoomBookingModal from './components/RoomBookingModal';
import AdminDashboard from './components/AdminDashboard';
import AdminLoginModal from './components/AdminLoginModal';
import AuthModal from './components/AuthModal';
import FoodCursor from './components/FoodCursor';
import { TrackingModal } from './components/TrackingModal';

import { CartItem, MenuItem, HotelRoom, RoomBooking, CafeOrder, TableReservation, AdminNotification } from './types';
import { MENU_ITEMS, HOTEL_ROOMS, INITIAL_ROOM_BOOKINGS, INITIAL_CAFE_ORDERS } from './data';
import {
  subscribeToRoomBookings,
  subscribeToCafeOrders,
  subscribeToTableReservations,
  subscribeToAdminNotifications,
  updateBookingStatusInDb,
  updateOrderStatusInDb,
  updateReservationStatusInDb,
  retryNotification,
  testConnection,
  fetchAdminBookings,
  fetchAdminOrders,
  fetchAdminReservations,
  fetchAdminNotifications,
  updateAdminBookingPayment,
  API_BASE
} from './services/dbService';

export interface AdminSession {
  token: string;
  username: string;
  email: string;
  role: string;
  expiresAt: number;
}

export default function App() {
  // Real authenticated administrator session (persisted in sessionStorage)
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => {
    try {
      const saved = sessionStorage.getItem('monaz_admin_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.expiresAt > Date.now()) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  // Current customer contact email for booking receipts
  const [currentEmail] = useState<string>('guest@monazhotel.com');

  // Menu items (71 authentic items from Monaz photos, editable via admin)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem('monaz_menu_items');
      return saved ? JSON.parse(saved) : MENU_ITEMS;
    } catch {
      return MENU_ITEMS;
    }
  });

  // Hotel rooms & suites (editable via admin)
  const [hotelRooms, setHotelRooms] = useState<HotelRoom[]>(() => {
    try {
      const saved = localStorage.getItem('monaz_hotel_rooms');
      return saved ? JSON.parse(saved) : HOTEL_ROOMS;
    } catch {
      return HOTEL_ROOMS;
    }
  });

  // Room bookings (synced with Firestore)
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>(() => {
    try {
      const saved = localStorage.getItem('monaz_room_bookings');
      return saved ? JSON.parse(saved) : INITIAL_ROOM_BOOKINGS;
    } catch {
      return INITIAL_ROOM_BOOKINGS;
    }
  });

  // Cafe & restaurant orders (synced with Firestore)
  const [cafeOrders, setCafeOrders] = useState<CafeOrder[]>(() => {
    try {
      const saved = localStorage.getItem('monaz_cafe_orders');
      return saved ? JSON.parse(saved) : INITIAL_CAFE_ORDERS;
    } catch {
      return INITIAL_CAFE_ORDERS;
    }
  });

  // Table reservations & catering
  const [tableReservations, setTableReservations] = useState<TableReservation[]>([]);

  // Admin notification dispatch outbox
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);

  // Shopping cart items
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('monaz_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('monaz_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // UI state
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDiningModalOpen, setIsDiningModalOpen] = useState(false);
  const [isRoomBookingOpen, setIsRoomBookingOpen] = useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<HotelRoom | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ id: number; text: string; type: 'success' | 'favorite' | 'admin' } | null>(null);
  const [isRefreshingAdmin, setIsRefreshingAdmin] = useState(false);
  const [lastAdminSync, setLastAdminSync] = useState<Date | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingRefId, setTrackingRefId] = useState<string | null>(null);

  // Firebase Authenticated User State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleSignOutAuth = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      showToast('Signed out of Monaz account.', 'favorite');
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  // Listen to Firebase Authentication State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.email?.toLowerCase() === 'redwanredhood@gmail.com') {
        const adminSess: AdminSession = {
          token: 'fb_' + user.uid,
          username: user.displayName || 'Monaz Administrator',
          email: user.email,
          role: 'admin',
          expiresAt: Date.now() + 24 * 60 * 60 * 1000
        };
        setAdminSession(adminSess);
        sessionStorage.setItem('monaz_admin_session', JSON.stringify(adminSess));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleOpenTracking = (refId?: string) => {
    if (refId && typeof refId === 'string') {
      setTrackingRefId(refId);
    }
    setIsTrackingOpen(true);
  };

  // Authoritative admin data loader
  const loadAdminData = async () => {
    if (!adminSession?.token) return;
    setIsRefreshingAdmin(true);
    try {
      const [bookingsRes, ordersRes, reservationsRes, notifsRes] = await Promise.allSettled([
        fetchAdminBookings(adminSession.token),
        fetchAdminOrders(adminSession.token),
        fetchAdminReservations(adminSession.token),
        fetchAdminNotifications(adminSession.token)
      ]);

      if (bookingsRes.status === 'fulfilled' && bookingsRes.value) {
        setRoomBookings(bookingsRes.value);
        localStorage.setItem('monaz_room_bookings', JSON.stringify(bookingsRes.value));
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value) {
        setCafeOrders(ordersRes.value);
        localStorage.setItem('monaz_cafe_orders', JSON.stringify(ordersRes.value));
      }
      if (reservationsRes.status === 'fulfilled' && reservationsRes.value) {
        setTableReservations(reservationsRes.value);
      }
      if (notifsRes.status === 'fulfilled' && notifsRes.value) {
        setAdminNotifications(notifsRes.value);
      }
      setLastAdminSync(new Date());
    } catch (err) {
      console.warn('[Admin Sync Notice]:', err);
    } finally {
      setIsRefreshingAdmin(false);
    }
  };

  // Validate session on startup & trigger initial admin fetch if valid
  useEffect(() => {
    if (adminSession?.token) {
      if (adminSession.expiresAt < Date.now()) {
        setAdminSession(null);
        sessionStorage.removeItem('monaz_admin_session');
        return;
      }
      fetch(`${API_BASE}/api/admin/session`, {
        headers: { Authorization: `Bearer ${adminSession.token}` }
      })
        .then((res) => {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json') && !res.ok) {
            setAdminSession(null);
            sessionStorage.removeItem('monaz_admin_session');
            return;
          }
          loadAdminData();
        })
        .catch(() => {
          loadAdminData();
        });
    }
  }, []);

  // Periodic polling for real-time live admin dashboard updates
  useEffect(() => {
    if (adminSession?.token) {
      loadAdminData();
      const interval = setInterval(loadAdminData, 8000); // 8 second live sync
      return () => clearInterval(interval);
    }
  }, [adminSession?.token]);

  // Real-time Firestore subscriptions for bookings, orders, table reservations and notifications outbox
  useEffect(() => {
    testConnection().then(() => {
      console.info('[Firebase] Connected to Monaz Firestore database');
    });

    const unsubBookings = subscribeToRoomBookings((liveBookings) => {
      if (liveBookings && liveBookings.length > 0) {
        setRoomBookings(liveBookings);
      }
    });

    const unsubOrders = subscribeToCafeOrders((liveOrders) => {
      if (liveOrders && liveOrders.length > 0) {
        setCafeOrders(liveOrders);
      }
    });

    const unsubTable = subscribeToTableReservations((liveTableRes) => {
      setTableReservations(liveTableRes);
    });

    const unsubNotifs = subscribeToAdminNotifications((liveNotifs) => {
      setAdminNotifications(liveNotifs);
    });

    return () => {
      unsubBookings();
      unsubOrders();
      unsubTable();
      unsubNotifs();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('monaz_menu_items', JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem('monaz_hotel_rooms', JSON.stringify(hotelRooms));
  }, [hotelRooms]);

  useEffect(() => {
    localStorage.setItem('monaz_room_bookings', JSON.stringify(roomBookings));
  }, [roomBookings]);

  useEffect(() => {
    localStorage.setItem('monaz_cafe_orders', JSON.stringify(cafeOrders));
  }, [cafeOrders]);

  useEffect(() => {
    localStorage.setItem('monaz_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('monaz_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const showToast = (text: string, type: 'success' | 'favorite' | 'admin' = 'success') => {
    setToastMessage({ id: Date.now(), text, type });
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3200);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Cart operations
  const handleAddToCart = (item: MenuItem) => {
    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === item.id);
      if (existing) {
        showToast(`Increased quantity of ${item.name} in dining bag`);
        return prev.map((ci) =>
          ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      showToast(`Added ${item.name} to dining bag`);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((ci) => {
          if (ci.menuItem.id === itemId) {
            const nextQty = ci.quantity + delta;
            return { ...ci, quantity: nextQty };
          }
          return ci;
        })
        .filter((ci) => ci.quantity > 0)
    );
  };

  const handleRemoveItem = (itemId: string) => {
    const item = cartItems.find((ci) => ci.menuItem.id === itemId);
    if (item) {
      showToast(`Removed ${item.menuItem.name} from dining bag`);
    }
    setCartItems((prev) => prev.filter((ci) => ci.menuItem.id !== itemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleToggleFavorite = (itemId: string) => {
    setFavorites((prev) => {
      const isFav = prev.includes(itemId);
      if (isFav) {
        showToast('Removed from favorites', 'favorite');
        return prev.filter((id) => id !== itemId);
      } else {
        showToast('Added to your favorite dishes!', 'favorite');
        return [...prev, itemId];
      }
    });
  };

  // Bedroom Booking operations
  const handleOpenRoomBooking = (room?: HotelRoom) => {
    setSelectedRoomForBooking(room || hotelRooms[0]);
    setIsRoomBookingOpen(true);
  };

  const handleBookingConfirmed = (newBooking: RoomBooking) => {
    setRoomBookings((prev) => {
      const exists = prev.some((b) => b.id === newBooking.id);
      return exists ? prev : [newBooking, ...prev];
    });
    showToast(`Reservation confirmed for ${newBooking.roomName}! Ref: ${newBooking.id}`, 'success');
  };

  // Cafe Order Placed
  const handleOrderPlaced = (newOrder: CafeOrder) => {
    setCafeOrders((prev) => {
      const exists = prev.some((o) => o.id === newOrder.id);
      return exists ? prev : [newOrder, ...prev];
    });
    showToast(`Order #${newOrder.id} sent to Monaz kitchen!`, 'success');
  };

  // Admin Portal & Authentication Management
  const handleOpenAdminPortal = () => {
    if (adminSession && adminSession.token && Date.now() < adminSession.expiresAt) {
      setIsAdminOpen(true);
      loadAdminData();
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleLoginSuccess = (session: AdminSession) => {
    setAdminSession(session);
    sessionStorage.setItem('monaz_admin_session', JSON.stringify(session));
    setIsLoginModalOpen(false);
    setIsAdminOpen(true);
    showToast(`Administrator authenticated successfully. Welcome back!`, 'admin');
    setTimeout(() => {
      loadAdminData();
    }, 100);
  };

  const handleLogout = async () => {
    if (adminSession?.token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminSession.token}` }
        });
      } catch {}
    }
    setAdminSession(null);
    sessionStorage.removeItem('monaz_admin_session');
    setIsAdminOpen(false);
    showToast('Administrator session closed successfully.', 'admin');
  };

  // Admin Dashboard handlers
  const handleUpdateBookingStatus = async (bookingId: string, newStatus: RoomBooking['status']) => {
    setRoomBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );
    try {
      await updateBookingStatusInDb(bookingId, newStatus);
      if (adminSession?.token && API_BASE) {
        fetch(`${API_BASE}/api/admin/bookings/${bookingId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.token}`
          },
          body: JSON.stringify({ status: newStatus })
        }).catch(() => {});
      }
      showToast(`Updated reservation ${bookingId} to ${newStatus}`, 'admin');
    } catch {
      showToast(`Failed to update booking status in database`, 'admin');
    }
  };

  const handleUpdateBookingPayment = async (
    bookingId: string,
    paymentStatus: RoomBooking['paymentStatus'],
    notes?: string
  ) => {
    setRoomBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              paymentStatus,
              status: paymentStatus === 'verified' ? 'confirmed' : paymentStatus === 'rejected' ? 'rejected' : b.status,
              paymentProof: b.paymentProof
                ? {
                    ...b.paymentProof,
                    verificationNotes: notes !== undefined ? notes : b.paymentProof.verificationNotes,
                    verifiedAt: new Date().toISOString(),
                    verifiedBy: adminSession?.username || 'monaz hotel and café'
                  }
                : undefined
            }
          : b
      )
    );

    try {
      await updateAdminBookingPayment(
        adminSession?.token || '',
        bookingId,
        paymentStatus || 'unpaid',
        notes
      );
      if (adminSession?.token && API_BASE) {
        fetch(`${API_BASE}/api/admin/bookings/${bookingId}/payment`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.token}`
          },
          body: JSON.stringify({ paymentStatus, verificationNotes: notes })
        }).catch(() => {});
      }
      showToast(`Payment status updated to "${paymentStatus}" for ${bookingId}`, 'admin');
    } catch {
      showToast(`Failed to update payment status`, 'admin');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: CafeOrder['status']) => {
    setCafeOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    try {
      await updateOrderStatusInDb(orderId, newStatus);
      if (adminSession?.token && API_BASE) {
        fetch(`${API_BASE}/api/admin/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.token}`
          },
          body: JSON.stringify({ status: newStatus })
        }).catch(() => {});
      }
      showToast(`Updated order ${orderId} status to ${newStatus}`, 'admin');
    } catch {
      showToast(`Failed to update order status in database`, 'admin');
    }
  };

  const handleUpdateReservationStatus = async (resId: string, newStatus: TableReservation['status']) => {
    setTableReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status: newStatus } : r))
    );
    try {
      await updateReservationStatusInDb(resId, newStatus);
      if (adminSession?.token && API_BASE) {
        fetch(`${API_BASE}/api/admin/reservations/${resId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminSession.token}`
          },
          body: JSON.stringify({ status: newStatus })
        }).catch(() => {});
      }
      showToast(`Updated table reservation ${resId} to ${newStatus}`, 'admin');
    } catch {
      showToast(`Failed to update reservation in database`, 'admin');
    }
  };

  const handleRetryNotification = async (notification: AdminNotification) => {
    try {
      await retryNotification(notification);
      if (adminSession?.token && API_BASE) {
        fetch(`${API_BASE}/api/admin/notifications/${notification.id}/retry`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminSession.token}` }
        }).catch(() => {});
      }
      showToast(`Re-dispatched alert to ${notification.recipient}`, 'admin');
    } catch {
      showToast(`Retry failed. Please check network.`, 'admin');
    }
  };

  const handleUpdateMenuItemPrice = (itemId: string, newPrice: number) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, price: newPrice } : item))
    );
    showToast(`Updated price for menu item`, 'admin');
  };

  const handleToggleMenuItemAvailability = (itemId: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, available: item.available === false ? true : false } : item
      )
    );
    showToast(`Updated item stock availability`, 'admin');
  };

  const handleUpdateRoomPrice = (roomId: string, newPrice: number) => {
    setHotelRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, pricePerNight: newPrice } : r))
    );
    showToast(`Updated nightly room rate`, 'admin');
  };

  const handleToggleRoomAvailability = (roomId: string) => {
    setHotelRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, isAvailable: !r.isAvailable } : r))
    );
    showToast(`Updated room maintenance status`, 'admin');
  };

  return (
    <div id="landing-root" className="min-h-screen flex flex-col relative bg-[#FAF6F0] text-[#2A1810]">
      
      {/* Header and Brand Navigation */}
      <Header
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOrderNow={() => setIsDiningModalOpen(true)}
        onOpenRooms={() => handleOpenRoomBooking()}
        onOpenAdmin={handleOpenAdminPortal}
        onOpenTracking={handleOpenTracking}
        onLogout={handleLogout}
        adminSession={adminSession}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onSignOutAuth={handleSignOutAuth}
      />

      {/* Main Page Sections */}
      <main className="flex-1">
        
        {/* Hero Section with fixed responsive phone image display and quick booking */}
        <Hero
          onExploreMenu={(category) => {
            if (category) {
              setActiveCategory(category);
            }
            const el = document.querySelector('#menu');
            if (el) {
              setTimeout(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }
          }}
          onOpenBooking={() => setIsDiningModalOpen(true)}
          onOpenRoomModal={() => handleOpenRoomBooking()}
          onOpenTracking={handleOpenTracking}
        />

        {/* Bedroom & Suites Booking Showcase */}
        <RoomsSection
          onBookRoom={(room) => handleOpenRoomBooking(room)}
        />

        {/* Full 70+ Dishes Authentic Monaz Restaurant & Cafe Menu */}
        <MenuSection
          menuItems={menuItems}
          onAddToCart={handleAddToCart}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          onOpenBooking={() => setIsDiningModalOpen(true)}
        />

      </main>

      {/* Footer */}
      <Footer
        onOpenAdmin={handleOpenAdminPortal}
        onOpenRooms={() => handleOpenRoomBooking()}
        onOpenTracking={handleOpenTracking}
      />

      {/* Shopping / Room Dining Bag Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onOrderPlaced={handleOrderPlaced}
        currentEmail={currentUser?.email || currentEmail}
        onOpenTracking={handleOpenTracking}
      />

      {/* Table Dining Reservation Modal */}
      <CheckoutModal
        isOpen={isDiningModalOpen}
        onClose={() => setIsDiningModalOpen(false)}
        initialType="reservation"
      />

      {/* Bedroom Booking Modal */}
      <RoomBookingModal
        isOpen={isRoomBookingOpen}
        onClose={() => setIsRoomBookingOpen(false)}
        selectedRoom={selectedRoomForBooking}
        onBookingConfirmed={handleBookingConfirmed}
        userEmail={currentUser?.email || currentEmail}
        onOpenTracking={handleOpenTracking}
      />

      {/* Customer Live Tracking Modal */}
      <TrackingModal
        isOpen={isTrackingOpen}
        onClose={() => {
          setIsTrackingOpen(false);
          setTrackingRefId(null);
        }}
        initialReferenceId={trackingRefId}
      />

      {/* Customer Authentication Modal (Email/Password Sign In & Sign Up) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={(user) => {
          showToast(`Welcome, ${user.displayName || user.email}!`, 'success');
        }}
      />

      {/* Dedicated Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Dedicated Admin Dashboard (Strictly Authorized) */}
      {isAdminOpen && (
        <AdminDashboard
          adminSession={adminSession}
          onLogout={handleLogout}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onClose={() => setIsAdminOpen(false)}
          bookings={roomBookings}
          onUpdateBookingStatus={handleUpdateBookingStatus}
          onUpdateBookingPayment={handleUpdateBookingPayment}
          orders={cafeOrders}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          tableReservations={tableReservations}
          onUpdateReservationStatus={handleUpdateReservationStatus}
          adminNotifications={adminNotifications}
          onRetryNotification={handleRetryNotification}
          menuItems={menuItems}
          onUpdateMenuItemPrice={handleUpdateMenuItemPrice}
          onToggleMenuItemAvailability={handleToggleMenuItemAvailability}
          hotelRooms={hotelRooms}
          onUpdateRoomPrice={handleUpdateRoomPrice}
          onToggleRoomAvailability={handleToggleRoomAvailability}
          onRefreshAdminData={loadAdminData}
          isRefreshingAdmin={isRefreshingAdmin}
          lastAdminSync={lastAdminSync}
        />
      )}

      {/* Toast Notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-[#2A1810] border border-[#EA580C] text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm"
          >
            <div className="p-1.5 bg-[#EA580C]/20 border border-[#EA580C]/40 rounded-full text-[#FB923C] shrink-0">
              {toastMessage.type === 'favorite' ? (
                <Heart className="w-4 h-4 fill-current text-[#EA580C]" />
              ) : toastMessage.type === 'admin' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-[#FB923C]" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold leading-tight">{toastMessage.text}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-gray-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Food Cursor */}
      <FoodCursor />

    </div>
  );
}
