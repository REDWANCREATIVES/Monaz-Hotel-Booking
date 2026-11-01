import React, { useState, useMemo } from 'react';
import {
  Hotel,
  UtensilsCrossed,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  LogOut,
  Coffee,
  BedDouble,
  ChevronRight,
  Eye,
  AlertCircle,
  Bell,
  RotateCw,
  Mail,
  Send,
  CalendarCheck,
  Download,
  Paperclip,
  ExternalLink,
  FileText,
  Sparkles,
  Copy,
  Check,
  Phone,
  MapPin,
  Layers,
  LayoutGrid,
  List
} from 'lucide-react';
import { MenuItem, HotelRoom, RoomBooking, CafeOrder, TableReservation, AdminNotification, BookedService, ServiceCategory } from '../types';
import { generateBookingReceiptPDF } from '../utils/pdfReceipt';
import { API_BASE } from '../services/dbService';

interface AdminDashboardProps {
  currentEmail?: string;
  adminSession: {
    token: string;
    username: string;
    email: string;
    role: string;
    expiresAt: number;
  } | null;
  onLogout: () => void;
  onOpenLoginModal?: () => void;
  onClose: () => void;
  bookings: RoomBooking[];
  onUpdateBookingStatus: (bookingId: string, newStatus: RoomBooking['status']) => void;
  orders: CafeOrder[];
  onUpdateOrderStatus: (orderId: string, newStatus: CafeOrder['status']) => void;
  tableReservations?: TableReservation[];
  onUpdateReservationStatus?: (reservationId: string, newStatus: TableReservation['status']) => void;
  adminNotifications?: AdminNotification[];
  onRetryNotification?: (notification: AdminNotification) => Promise<void>;
  menuItems: MenuItem[];
  onUpdateMenuItemPrice: (itemId: string, newPrice: number) => void;
  onToggleMenuItemAvailability: (itemId: string) => void;
  hotelRooms: HotelRoom[];
  onUpdateRoomPrice: (roomId: string, newPrice: number) => void;
  onToggleRoomAvailability: (roomId: string) => void;
  onUpdateBookingPayment?: (bookingId: string, status: RoomBooking['paymentStatus'], notes?: string) => Promise<void>;
  onRefreshAdminData?: () => Promise<void> | void;
  isRefreshingAdmin?: boolean;
  lastAdminSync?: Date | null;
}

export const AUTHORIZED_ADMIN_EMAIL = 'redwanredhood@gmail.com';
export const AUTHORIZED_ADMIN_USERNAME = 'monaz hotel and café';

export default function AdminDashboard({
  currentEmail = 'redwanredhood@gmail.com',
  adminSession,
  onLogout,
  onOpenLoginModal,
  onClose,
  bookings,
  onUpdateBookingStatus,
  onUpdateBookingPayment,
  orders,
  onUpdateOrderStatus,
  tableReservations = [],
  onUpdateReservationStatus,
  adminNotifications = [],
  onRetryNotification,
  menuItems,
  onUpdateMenuItemPrice,
  onToggleMenuItemAvailability,
  hotelRooms,
  onUpdateRoomPrice,
  onToggleRoomAvailability,
  onRefreshAdminData,
  isRefreshingAdmin = false,
  lastAdminSync = null
}: AdminDashboardProps) {
  const isSessionValid = adminSession && adminSession.token && Date.now() < adminSession.expiresAt;

  const [activeTab, setActiveTab] = useState<'allServices' | 'overview' | 'bookings' | 'orders' | 'tableReservations' | 'notifications' | 'menu' | 'rooms'>('allServices');
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>('all');
  const [serviceStatusFilter, setServiceStatusFilter] = useState<string>('all');
  const [servicePaymentFilter, setServicePaymentFilter] = useState<string>('all');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [notifStatusFilter, setNotifStatusFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);
  const [retryingNotifId, setRetryingNotifId] = useState<string | null>(null);
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Detail Modal State
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<BookedService | null>(null);

  // Email Notification & Customer Dispatch State
  const [sendingEmailRefId, setSendingEmailRefId] = useState<string | null>(null);
  const [emailSentSuccessRefId, setEmailSentSuccessRefId] = useState<string | null>(null);
  const [emailActionMessage, setEmailActionMessage] = useState<string | null>(null);

  // Payment Verification Modal State
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<RoomBooking | null>(null);
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);

  // Unified Booked Services collection combining all hotel, dining & room service orders
  const allBookedServices: BookedService[] = useMemo(() => {
    const list: BookedService[] = [];

    // 1. Hotel Room Bookings
    bookings.forEach((b) => {
      list.push({
        id: b.id,
        category: 'hotel_room',
        categoryLabel: 'Hotel Bedroom Stay',
        title: b.roomName || 'Luxury Bedroom',
        subtitle: `${b.nights} Night${b.nights > 1 ? 's' : ''} • ${b.guestsCount} Guest${b.guestsCount > 1 ? 's' : ''}`,
        customerName: b.guestName,
        customerPhone: b.guestPhone,
        customerEmail: b.guestEmail,
        dateTimeInfo: `${b.checkInDate} → ${b.checkOutDate}`,
        locationOrRoom: b.roomName,
        totalPrice: b.totalPrice,
        currency: b.currency || 'ETB',
        status: b.status,
        paymentStatus: b.paymentStatus || 'unpaid',
        paymentProof: b.paymentProof,
        specialRequests: b.specialRequests,
        createdAt: b.createdAt,
        rawDetails: b
      });
    });

    // 2. Dining Table & Banquet Reservations
    tableReservations.forEach((r) => {
      const isCatering = r.bookingType === 'catering';
      list.push({
        id: r.id,
        category: isCatering ? 'banquet_catering' : 'table_dining',
        categoryLabel: isCatering ? 'VIP Banquet Catering' : 'Dining Table',
        title: isCatering ? 'Event Banquet & Catering' : 'Reserved Dining Table',
        subtitle: `${r.guests} Guests • ${r.time || '19:00'}`,
        customerName: r.name,
        customerPhone: r.phone,
        customerEmail: r.email,
        dateTimeInfo: `${r.date} at ${r.time || '19:00'}`,
        locationOrRoom: isCatering ? 'VIP Banquet Hall' : (r.package || 'Dining Room'),
        totalPrice: 0,
        currency: 'ETB',
        status: r.status,
        paymentStatus: 'unpaid',
        specialRequests: r.notes,
        createdAt: r.createdAt,
        rawDetails: r
      });
    });

    // 3. Cafe & Restaurant Orders
    orders.forEach((o) => {
      const itemsSummary = o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
      const locLabel =
        o.deliveryType === 'room_delivery'
          ? `Room Service (${o.roomOrTableNumber})`
          : o.deliveryType === 'table_service'
          ? `Table Dine-in (${o.roomOrTableNumber})`
          : `Takeaway (${o.roomOrTableNumber})`;

      list.push({
        id: o.id,
        category: 'cafe_order',
        categoryLabel: 'Kitchen & Bar Order',
        title: locLabel,
        subtitle: itemsSummary,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        dateTimeInfo: new Date(o.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        locationOrRoom: o.roomOrTableNumber,
        totalPrice: o.totalAmount,
        currency: o.currency || 'ETB',
        status: o.status,
        paymentStatus: 'unpaid',
        specialRequests: o.notes,
        createdAt: o.createdAt,
        rawDetails: o
      });
    });

    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [bookings, tableReservations, orders]);

  // If NOT authorized or session expired:
  if (!isSessionValid) {
    return (
      <div className="fixed inset-0 z-50 bg-[#1E100A]/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-[#EA580C]/30 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h3 className="font-serif text-2xl font-bold text-[#2A1810]">Access Restricted</h3>
            <p className="text-xs text-[#6E4733] mt-2 leading-relaxed">
              The <strong>MONAZ HOTEL Management System</strong> is restricted exclusively to authorized administration.
            </p>
            <div className="mt-3 p-3 rounded-xl bg-[#FFF7ED] border border-[#EA580C]/30 text-xs font-mono font-bold text-[#EA580C]">
              Username: {AUTHORIZED_ADMIN_USERNAME}
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Authentication required to view customer bookings, orders, and revenue.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                onClose();
                if (onOpenLoginModal) onOpenLoginModal();
              }}
              className="w-full py-3 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sign In to Admin Portal</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-[#2A1810] font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Return to Public Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Metrics
  const totalRoomRevenue = bookings
    .filter((b) => b.status !== 'cancelled' && b.status !== 'rejected')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const totalCafeRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const totalRevenue = totalRoomRevenue + totalCafeRevenue;
  const activeBookingsCount = bookings.filter((b) => b.status === 'confirmed' || b.status === 'checked-in').length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending' || o.status === 'preparing').length;
  const failedNotifsCount = adminNotifications.filter((n) => n.status === 'failed').length;
  const proofSubmittedCount = bookings.filter((b) => b.paymentStatus === 'proof_submitted').length;
  const pendingServicesCount = allBookedServices.filter((s) => s.status === 'pending' || s.paymentStatus === 'proof_submitted').length;

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedRefId(id);
    setTimeout(() => setCopiedRefId(null), 2000);
  };

  const handleRetry = async (notif: AdminNotification) => {
    if (!onRetryNotification) return;
    setRetryingNotifId(notif.id);
    try {
      await onRetryNotification(notif);
    } finally {
      setRetryingNotifId(null);
    }
  };

  const getDirectGmailComposeUrl = (service: BookedService) => {
    const toEmail = (service.customerEmail && service.customerEmail.includes('@') && service.customerEmail !== AUTHORIZED_ADMIN_EMAIL)
      ? service.customerEmail
      : AUTHORIZED_ADMIN_EMAIL;
    const subject = `[MONAZ HOTEL] Confirmation & Progress Update #${service.id}`;
    const body = `Dear ${service.customerName || 'Valued Guest'},

Warm greetings from Monaz Hotel & Café!

We are pleased to inform you that your reservation/order #${service.id} has been reviewed and ACCEPTED by our management team.

SERVICE DETAILS:
• Service: ${service.title} (${service.categoryLabel})
• Schedule / Room: ${service.locationOrRoom} • ${service.dateTimeInfo}
• Overview: ${service.subtitle || 'Standard Package'}
• Total Amount: ${service.totalPrice > 0 ? `${service.totalPrice.toLocaleString()} ETB` : 'Pay upon dining'}
• Status: Confirmed & Accepted

${service.paymentProof ? `PAYMENT RECEIPT: Identified & Attached (${service.paymentProof.fileName})` : 'PAYMENT: Cash, Card or Mobile Bank Transfer'}

You can follow your live preparation, room check-in, or delivery progress anytime directly on our website using your reference code:
Tracking Reference: #${service.id}

If you have any questions, our 24/7 concierge desk is here for you:
📍 Location: Betel, Addis Ababa, Ethiopia
📞 Telephone: +251 91 123 4567
✉️ Email: redwanredhood@gmail.com

Thank you for choosing Monaz Hotel & Café!
Monaz Executive Hospitality Team`;

    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSendAcceptanceEmail = async (service: BookedService, customNote?: string) => {
    if (!adminSession?.token) return;
    setSendingEmailRefId(service.id);
    setEmailActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/emails/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession.token}`
        },
        body: JSON.stringify({
          referenceId: service.id,
          customNote
        })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setEmailSentSuccessRefId(service.id);
        setEmailActionMessage(`Acceptance email successfully dispatched for #${service.id}!`);
        setTimeout(() => {
          setEmailSentSuccessRefId(null);
          setEmailActionMessage(null);
        }, 5000);
        if (onRefreshAdminData) onRefreshAdminData();
        return;
      }
      // If server route not available (e.g. static host), open Gmail directly
      window.open(getDirectGmailComposeUrl(service), '_blank');
      setEmailSentSuccessRefId(service.id);
      setEmailActionMessage(`Opened pre-filled acceptance email in Gmail for #${service.id}!`);
      setTimeout(() => {
        setEmailSentSuccessRefId(null);
        setEmailActionMessage(null);
      }, 5000);
    } catch (err: any) {
      console.warn('Backend email endpoint offline, opening Gmail compose draft:', err);
      window.open(getDirectGmailComposeUrl(service), '_blank');
      setEmailSentSuccessRefId(service.id);
      setEmailActionMessage(`Opened pre-filled official acceptance draft in Gmail!`);
      setTimeout(() => {
        setEmailSentSuccessRefId(null);
        setEmailActionMessage(null);
      }, 5000);
    } finally {
      setSendingEmailRefId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden">
      
      {/* Top Admin Header */}
      <header className="bg-[#2A1810] text-white px-6 py-4 border-b border-[#EA580C]/40 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EA580C] to-[#C2410C] flex items-center justify-center text-white shadow-md">
            <Hotel className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-bold tracking-wide">MONAZ HOTEL &amp; CAFÉ</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#EA580C] text-white text-[9px] font-bold uppercase tracking-wider">
                ADMIN PORTAL
              </span>
            </div>
            <p className="text-[11px] text-gray-300">Executive Management & Real-time Operations</p>
          </div>
        </div>

        {/* Current Admin User Badge & Live Sync Actions */}
        <div className="flex items-center gap-3">
          {/* Live Sync Status & Manual Refresh */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-200 text-[11px] font-medium hidden md:inline">
                {lastAdminSync ? `Synced: ${lastAdminSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Live Firestore Sync'}
              </span>
            </div>

            {onRefreshAdminData && (
              <button
                type="button"
                onClick={() => onRefreshAdminData()}
                disabled={isRefreshingAdmin}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Refresh database records"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshingAdmin ? 'animate-spin text-[#FB923C]' : 'text-gray-300'}`} />
                <span className="hidden sm:inline">{isRefreshingAdmin ? 'Syncing...' : 'Refresh'}</span>
              </button>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs">
            <span className="text-gray-300">Admin:</span>
            <span className="font-semibold text-white capitalize">{adminSession?.username || AUTHORIZED_ADMIN_USERNAME}</span>
            <span className="text-gray-400 font-mono text-[11px]">({adminSession?.email || AUTHORIZED_ADMIN_EMAIL})</span>
          </div>

          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
            title="Log out of Administrator Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* Tab Navigation Bar */}
      <nav className="bg-white border-b border-[#2A1810]/10 px-6 py-2.5 flex items-center gap-3 overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveTab('allServices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'allServices'
              ? 'bg-[#EA580C] text-white shadow-xs'
              : 'text-[#6E4733] hover:text-[#EA580C] hover:bg-[#FFF7ED]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>All Booked Services</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'allServices' ? 'bg-white/25 text-white' : 'bg-[#EA580C] text-white'
          }`}>
            {allBookedServices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-[#2A1810] text-white shadow-xs'
              : 'text-[#6E4733] hover:text-[#EA580C] hover:bg-[#FFF7ED]'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-[#EA580C]" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'bookings'
              ? 'bg-[#2A1810] text-white shadow-xs'
              : 'text-[#6E4733] hover:text-[#EA580C] hover:bg-[#FFF7ED]'
          }`}
        >
          <BedDouble className="w-4 h-4 text-[#EA580C]" />
          <span>Room Bookings</span>
          <span className="px-1.5 py-0.2 bg-[#EA580C] text-white rounded-full text-[10px]">
            {bookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-[#2A1810] text-white shadow-xs'
              : 'text-[#6E4733] hover:text-[#EA580C] hover:bg-[#FFF7ED]'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4 text-[#EA580C]" />
          <span>Restaurant Orders</span>
          {pendingOrdersCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
              {pendingOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tableReservations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'tableReservations'
              ? 'bg-[#2A1810] text-white shadow-xs'
              : 'text-[#6E4733] hover:text-[#EA580C] hover:bg-[#FFF7ED]'
          }`}
        >
          <CalendarCheck className="w-4 h-4 text-[#EA580C]" />
          <span>Table & Banquet</span>
          <span className="px-1.5 py-0.2 bg-gray-600 text-white rounded-full text-[10px]">
            {tableReservations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'notifications'
              ? 'bg-[#2A1810] text-white shadow-xs'
              : 'text-[#6E4733] hover:text-[#EA580C] hover:bg-[#FFF7ED]'
          }`}
        >
          <Bell className="w-4 h-4 text-[#EA580C]" />
          <span>Notifications Outbox</span>
          {failedNotifsCount > 0 ? (
            <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] animate-pulse">
              {failedNotifsCount} Failed
            </span>
          ) : (
            <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded-full text-[10px]">
              {adminNotifications.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'menu'
              ? 'bg-[#2A1810] text-white shadow-xs'
              : 'text-[#6E4733] hover:text-[#EA580C] hover:bg-[#FFF7ED]'
          }`}
        >
          <Coffee className="w-4 h-4 text-[#EA580C]" />
          <span>Menu & Pricing</span>
          <span className="text-[10px] text-gray-500">({menuItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'rooms'
              ? 'bg-[#2A1810] text-white shadow-xs'
              : 'text-[#6E4733] hover:text-[#EA580C] hover:bg-[#FFF7ED]'
          }`}
        >
          <Hotel className="w-4 h-4 text-[#EA580C]" />
          <span>Room Rates</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        
        {/* TAB 0: ALL BOOKED SERVICES (UNIFIED MASTER VIEW) */}
        {activeTab === 'allServices' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Top Welcome & KPI Header */}
            <div className="bg-gradient-to-r from-[#2A1810] via-[#3E2314] to-[#2A1810] rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-[#EA580C]/30 relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full bg-[#EA580C] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      Live Central Registry
                    </span>
                    <span className="text-xs text-amber-300 font-medium">
                      {allBookedServices.length} Total Registered Services
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold mt-2 tracking-wide">
                    Booked Services & Reservations
                  </h2>
                  <p className="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">
                    Live operational feed tracking every hotel room stay, dining table reservation, VIP event catering, and kitchen room-service order persisted in the database.
                  </p>
                </div>

                {/* Right side stats summary */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs text-center min-w-[100px]">
                    <p className="text-[10px] text-gray-300 uppercase tracking-wider font-semibold">Total Revenue</p>
                    <p className="text-lg font-bold font-mono text-[#FB923C] mt-0.5">{totalRevenue.toLocaleString()} <span className="text-[10px] text-gray-300">ETB</span></p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs text-center min-w-[100px]">
                    <p className="text-[10px] text-gray-300 uppercase tracking-wider font-semibold">Pending Actions</p>
                    <p className="text-lg font-bold font-mono text-amber-400 mt-0.5">{pendingServicesCount}</p>
                  </div>
                  {proofSubmittedCount > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[#EA580C]/30 border border-[#EA580C]/50 backdrop-blur-xs text-center min-w-[100px]">
                      <p className="text-[10px] text-orange-200 uppercase tracking-wider font-semibold">Proofs to Audit</p>
                      <p className="text-lg font-bold font-mono text-white mt-0.5">{proofSubmittedCount}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Category Filter Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => setServiceCategoryFilter('hotel_room')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  serviceCategoryFilter === 'hotel_room'
                    ? 'bg-[#2A1810] text-white border-[#EA580C] shadow-md'
                    : 'bg-white hover:bg-[#FFF7ED] border-[#2A1810]/10 text-[#2A1810]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <BedDouble className="w-5 h-5 text-[#EA580C]" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#EA580C]">{bookings.length}</span>
                </div>
                <h4 className="font-serif text-sm font-bold mt-2">Hotel Bedrooms</h4>
                <p className={`text-[11px] mt-0.5 ${serviceCategoryFilter === 'hotel_room' ? 'text-gray-300' : 'text-gray-500'}`}>
                  {bookings.filter(b => b.status === 'confirmed').length} Confirmed Stays
                </p>
              </button>

              <button
                type="button"
                onClick={() => setServiceCategoryFilter('cafe_order')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  serviceCategoryFilter === 'cafe_order'
                    ? 'bg-[#2A1810] text-white border-[#EA580C] shadow-md'
                    : 'bg-white hover:bg-[#FFF7ED] border-[#2A1810]/10 text-[#2A1810]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center">
                    <UtensilsCrossed className="w-5 h-5 text-[#EA580C]" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#EA580C]">{orders.length}</span>
                </div>
                <h4 className="font-serif text-sm font-bold mt-2">Kitchen Orders</h4>
                <p className={`text-[11px] mt-0.5 ${serviceCategoryFilter === 'cafe_order' ? 'text-gray-300' : 'text-gray-500'}`}>
                  {pendingOrdersCount} In Preparation
                </p>
              </button>

              <button
                type="button"
                onClick={() => setServiceCategoryFilter('table_dining')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  serviceCategoryFilter === 'table_dining'
                    ? 'bg-[#2A1810] text-white border-[#EA580C] shadow-md'
                    : 'bg-white hover:bg-[#FFF7ED] border-[#2A1810]/10 text-[#2A1810]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-emerald-700" />
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-700">
                    {tableReservations.filter(t => t.bookingType !== 'catering').length}
                  </span>
                </div>
                <h4 className="font-serif text-sm font-bold mt-2">Dining Tables</h4>
                <p className={`text-[11px] mt-0.5 ${serviceCategoryFilter === 'table_dining' ? 'text-gray-300' : 'text-gray-500'}`}>
                  Restaurant Table Seating
                </p>
              </button>

              <button
                type="button"
                onClick={() => setServiceCategoryFilter('banquet_catering')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  serviceCategoryFilter === 'banquet_catering'
                    ? 'bg-[#2A1810] text-white border-[#EA580C] shadow-md'
                    : 'bg-white hover:bg-[#FFF7ED] border-[#2A1810]/10 text-[#2A1810]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-purple-700" />
                  </div>
                  <span className="font-mono text-xs font-bold text-purple-700">
                    {tableReservations.filter(t => t.bookingType === 'catering').length}
                  </span>
                </div>
                <h4 className="font-serif text-sm font-bold mt-2">VIP Banquets</h4>
                <p className={`text-[11px] mt-0.5 ${serviceCategoryFilter === 'banquet_catering' ? 'text-gray-300' : 'text-gray-500'}`}>
                  Events & Catering Requests
                </p>
              </button>
            </div>

            {/* Filter and Search Controls */}
            <div className="bg-white rounded-3xl border border-[#2A1810]/10 shadow-sm p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by customer name, ref ID, phone, room, or dish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-[#2A1810]/15 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C] transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Category Filter */}
                  <select
                    value={serviceCategoryFilter}
                    onChange={(e) => setServiceCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-[#2A1810]/15 bg-[#FAF6F0] text-xs font-semibold text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                  >
                    <option value="all">All Service Categories ({allBookedServices.length})</option>
                    <option value="hotel_room">Hotel Bedrooms ({bookings.length})</option>
                    <option value="cafe_order">Restaurant & Cafe Orders ({orders.length})</option>
                    <option value="table_dining">Dining Tables ({tableReservations.filter(t => t.bookingType !== 'catering').length})</option>
                    <option value="banquet_catering">Banquet & Catering ({tableReservations.filter(t => t.bookingType === 'catering').length})</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={serviceStatusFilter}
                    onChange={(e) => setServiceStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-[#2A1810]/15 bg-[#FAF6F0] text-xs font-semibold text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked-in">Checked In</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready / Served</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  {/* Payment Filter */}
                  <select
                    value={servicePaymentFilter}
                    onChange={(e) => setServicePaymentFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-[#2A1810]/15 bg-[#FAF6F0] text-xs font-semibold text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                  >
                    <option value="all">All Payments</option>
                    <option value="proof_submitted">Proof Uploaded (Action Required)</option>
                    <option value="verified">Verified</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  {/* Reset Filters */}
                  {(serviceCategoryFilter !== 'all' || serviceStatusFilter !== 'all' || servicePaymentFilter !== 'all' || searchQuery) && (
                    <button
                      onClick={() => {
                        setServiceCategoryFilter('all');
                        setServiceStatusFilter('all');
                        setServicePaymentFilter('all');
                        setSearchQuery('');
                      }}
                      className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#2A1810] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  )}

                  {/* View Mode Toggle */}
                  <div className="flex items-center p-1 rounded-xl bg-[#FAF6F0] border border-[#2A1810]/10 ml-auto">
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        viewMode === 'table' ? 'bg-[#2A1810] text-white shadow-xs' : 'text-gray-500 hover:text-black'
                      }`}
                      title="Table List View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        viewMode === 'cards' ? 'bg-[#2A1810] text-white shadow-xs' : 'text-gray-500 hover:text-black'
                      }`}
                      title="Grid Cards View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* TABLE VIEW */}
              {viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#2A1810]/10 text-[#6E4733] font-bold uppercase tracking-wider">
                        <th className="py-3 px-3">Service & Reference</th>
                        <th className="py-3 px-3">Customer Details</th>
                        <th className="py-3 px-3">Timing / Stay</th>
                        <th className="py-3 px-3">Location / Service</th>
                        <th className="py-3 px-3">Total (ETB)</th>
                        <th className="py-3 px-3">Payment</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A1810]/5">
                      {allBookedServices
                        .filter((s) => {
                          const matchesCategory = serviceCategoryFilter === 'all' || s.category === serviceCategoryFilter;
                          const matchesStatus = serviceStatusFilter === 'all' || s.status === serviceStatusFilter;
                          const matchesPayment = servicePaymentFilter === 'all' || s.paymentStatus === servicePaymentFilter;
                          const q = searchQuery.toLowerCase().trim();
                          const matchesSearch =
                            !q ||
                            s.customerName.toLowerCase().includes(q) ||
                            s.id.toLowerCase().includes(q) ||
                            s.customerPhone.toLowerCase().includes(q) ||
                            s.title.toLowerCase().includes(q) ||
                            s.locationOrRoom.toLowerCase().includes(q) ||
                            (s.subtitle && s.subtitle.toLowerCase().includes(q));
                          return matchesCategory && matchesStatus && matchesPayment && matchesSearch;
                        })
                        .map((s) => (
                          <tr key={s.id} className="hover:bg-[#FAF6F0]/70 transition-colors">
                            {/* Service Category & Ref */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className={`p-1.5 rounded-lg shrink-0 ${
                                  s.category === 'hotel_room' ? 'bg-amber-100 text-amber-900' :
                                  s.category === 'cafe_order' ? 'bg-orange-100 text-orange-900' :
                                  s.category === 'table_dining' ? 'bg-emerald-100 text-emerald-900' :
                                  'bg-purple-100 text-purple-900'
                                }`}>
                                  {s.category === 'hotel_room' && <BedDouble className="w-3.5 h-3.5" />}
                                  {s.category === 'cafe_order' && <UtensilsCrossed className="w-3.5 h-3.5" />}
                                  {s.category === 'table_dining' && <Coffee className="w-3.5 h-3.5" />}
                                  {s.category === 'banquet_catering' && <CalendarCheck className="w-3.5 h-3.5" />}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-[#EA580C]">{s.id}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyId(s.id)}
                                      className="text-gray-400 hover:text-[#EA580C] transition-colors"
                                      title="Copy Reference ID"
                                    >
                                      {copiedRefId === s.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  </div>
                                  <span className="text-[10px] text-gray-500 font-medium block">
                                    {s.categoryLabel}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Customer Details */}
                            <td className="py-3.5 px-3">
                              <p className="font-bold text-[#2A1810]">{s.customerName}</p>
                              {s.customerPhone && (
                                <a
                                  href={`tel:${s.customerPhone}`}
                                  className="text-[10px] text-gray-600 hover:text-[#EA580C] flex items-center gap-1 mt-0.5"
                                >
                                  <Phone className="w-2.5 h-2.5 text-gray-400" />
                                  <span>{s.customerPhone}</span>
                                </a>
                              )}
                              {s.customerEmail && s.customerEmail !== AUTHORIZED_ADMIN_EMAIL && (
                                <p className="text-[10px] text-gray-500 truncate max-w-[140px]">{s.customerEmail}</p>
                              )}
                            </td>

                            {/* Timing / Stay */}
                            <td className="py-3.5 px-3">
                              <p className="font-medium text-[#2A1810]">{s.dateTimeInfo}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">{s.subtitle}</p>
                            </td>

                            {/* Location / Service */}
                            <td className="py-3.5 px-3">
                              <span className="px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#EA580C] font-semibold text-[10px] border border-[#EA580C]/20 inline-block">
                                {s.locationOrRoom}
                              </span>
                              <p className="text-[11px] text-[#6E4733] font-medium mt-1 truncate max-w-[160px]">
                                {s.title}
                              </p>
                            </td>

                            {/* Total ETB */}
                            <td className="py-3.5 px-3">
                              {s.totalPrice > 0 ? (
                                <span className="font-mono font-bold text-[#2A1810]">
                                  {s.totalPrice.toLocaleString()} {s.currency}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-500 italic">Bill upon dining</span>
                              )}
                            </td>

                            {/* Payment Status & Proof */}
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                                  s.paymentStatus === 'verified' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                  s.paymentStatus === 'proof_submitted' ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold animate-pulse' :
                                  s.paymentStatus === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                                  'bg-orange-50 text-orange-800 border border-orange-200'
                                }`}>
                                  {s.paymentProof && <Paperclip className="w-3 h-3" />}
                                  {s.paymentStatus === 'proof_submitted' ? 'Proof Uploaded' :
                                   s.paymentStatus === 'verified' ? 'Verified' :
                                   s.paymentStatus === 'rejected' ? 'Rejected' : 'Unpaid'}
                                </span>
                                {s.category === 'hotel_room' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const b = s.rawDetails as RoomBooking;
                                      setSelectedBookingForPayment(b);
                                      setPaymentNote(b.paymentProof?.verificationNotes || '');
                                    }}
                                    className="text-[10px] text-[#EA580C] hover:underline font-semibold cursor-pointer inline-flex items-center gap-0.5 mt-0.5"
                                  >
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>{s.paymentProof ? 'Review Proof' : 'Payment Notes'}</span>
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Service Status & Quick Changer */}
                            <td className="py-3.5 px-3">
                              <select
                                value={s.status}
                                onChange={(e) => {
                                  const newStatus = e.target.value;
                                  if (s.category === 'hotel_room') {
                                    onUpdateBookingStatus(s.id, newStatus as RoomBooking['status']);
                                  } else if (s.category === 'cafe_order') {
                                    onUpdateOrderStatus(s.id, newStatus as CafeOrder['status']);
                                  } else if (onUpdateReservationStatus) {
                                    onUpdateReservationStatus(s.id, newStatus as TableReservation['status']);
                                  }
                                  if (onRefreshAdminData) onRefreshAdminData();
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border cursor-pointer ${
                                  s.status === 'confirmed' || s.status === 'ready' || s.status === 'served'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : s.status === 'checked-in'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                                    : s.status === 'preparing'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : s.status === 'completed'
                                    ? 'bg-gray-100 text-gray-800 border-gray-300'
                                    : s.status === 'pending'
                                    ? 'bg-amber-100 text-amber-900 border-amber-400 font-extrabold'
                                    : 'bg-red-50 text-red-800 border-red-300'
                                }`}
                              >
                                {s.category === 'hotel_room' && (
                                  <>
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="checked-in">Checked In</option>
                                    <option value="completed">Completed</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="cancelled">Cancelled</option>
                                  </>
                                )}
                                {s.category === 'cafe_order' && (
                                  <>
                                    <option value="pending">Pending</option>
                                    <option value="accepted">Accepted</option>
                                    <option value="preparing">Preparing</option>
                                    <option value="ready">Ready / Served</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                  </>
                                )}
                                {(s.category === 'table_dining' || s.category === 'banquet_catering') && (
                                  <>
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                  </>
                                )}
                              </select>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <a
                                  href={getDirectGmailComposeUrl(s)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg bg-white hover:bg-orange-50 border border-gray-200 text-[#EA580C] transition-colors cursor-pointer"
                                  title="Open Gmail to Review/Confirm to Customer"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  disabled={sendingEmailRefId === s.id}
                                  onClick={() => handleSendAcceptanceEmail(s)}
                                  className="p-1.5 rounded-lg bg-white hover:bg-orange-50 border border-gray-200 text-gray-700 hover:text-[#EA580C] transition-colors cursor-pointer disabled:opacity-50"
                                  title="Send Customer Acceptance Email"
                                >
                                  {sendingEmailRefId === s.id ? (
                                    <RotateCw className="w-3.5 h-3.5 animate-spin text-[#EA580C]" />
                                  ) : emailSentSuccessRefId === s.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedServiceForDetail(s)}
                                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-[#EA580C] hover:text-white text-gray-700 transition-colors cursor-pointer"
                                  title="View Full Service Dossier"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {s.category === 'hotel_room' && (
                                  <button
                                    type="button"
                                    onClick={() => generateBookingReceiptPDF(s.rawDetails as RoomBooking)}
                                    className="p-1.5 rounded-lg bg-white hover:bg-orange-50 border border-gray-200 text-[#EA580C] transition-colors cursor-pointer"
                                    title="Generate Official PDF Receipt"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* CARD GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allBookedServices
                    .filter((s) => {
                      const matchesCategory = serviceCategoryFilter === 'all' || s.category === serviceCategoryFilter;
                      const matchesStatus = serviceStatusFilter === 'all' || s.status === serviceStatusFilter;
                      const matchesPayment = servicePaymentFilter === 'all' || s.paymentStatus === servicePaymentFilter;
                      const q = searchQuery.toLowerCase().trim();
                      const matchesSearch =
                        !q ||
                        s.customerName.toLowerCase().includes(q) ||
                        s.id.toLowerCase().includes(q) ||
                        s.customerPhone.toLowerCase().includes(q) ||
                        s.title.toLowerCase().includes(q) ||
                        s.locationOrRoom.toLowerCase().includes(q) ||
                        (s.subtitle && s.subtitle.toLowerCase().includes(q));
                      return matchesCategory && matchesStatus && matchesPayment && matchesSearch;
                    })
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-5 rounded-2xl bg-[#FAF6F0] border border-[#2A1810]/10 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                              s.category === 'hotel_room' ? 'bg-amber-100 text-amber-900' :
                              s.category === 'cafe_order' ? 'bg-orange-100 text-orange-900' :
                              s.category === 'table_dining' ? 'bg-emerald-100 text-emerald-900' :
                              'bg-purple-100 text-purple-900'
                            }`}>
                              {s.category === 'hotel_room' && <BedDouble className="w-3 h-3" />}
                              {s.category === 'cafe_order' && <UtensilsCrossed className="w-3 h-3" />}
                              {s.category === 'table_dining' && <Coffee className="w-3 h-3" />}
                              {s.category === 'banquet_catering' && <CalendarCheck className="w-3 h-3" />}
                              <span>{s.categoryLabel}</span>
                            </span>

                            <span className="font-mono font-bold text-xs text-[#EA580C]">{s.id}</span>
                          </div>

                          <h4 className="font-serif text-base font-bold text-[#2A1810] mt-3">{s.title}</h4>
                          <p className="text-xs font-semibold text-[#EA580C] mt-0.5">{s.locationOrRoom}</p>

                          <div className="mt-3 p-3 rounded-xl bg-white border border-[#2A1810]/5 space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Customer:</span>
                              <span className="font-bold text-[#2A1810]">{s.customerName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Phone:</span>
                              <a href={`tel:${s.customerPhone}`} className="text-[#EA580C] font-semibold">{s.customerPhone}</a>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Schedule:</span>
                              <span className="font-medium text-[#2A1810]">{s.dateTimeInfo}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#2A1810]/10 flex items-center justify-between">
                          <div>
                            {s.totalPrice > 0 ? (
                              <span className="font-mono font-bold text-[#2A1810] text-sm">
                                {s.totalPrice.toLocaleString()} {s.currency}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Bill upon dining</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={getDirectGmailComposeUrl(s)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-xl bg-white border border-[#2A1810]/15 text-[#EA580C] hover:bg-orange-50 transition-colors cursor-pointer"
                              title="Open Gmail to Review/Confirm"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              disabled={sendingEmailRefId === s.id}
                              onClick={() => handleSendAcceptanceEmail(s)}
                              className="p-1.5 rounded-xl bg-white border border-[#2A1810]/15 text-gray-700 hover:text-[#EA580C] transition-colors cursor-pointer disabled:opacity-50"
                              title="Send Customer Acceptance Email"
                            >
                              {sendingEmailRefId === s.id ? (
                                <RotateCw className="w-3.5 h-3.5 animate-spin text-[#EA580C]" />
                              ) : emailSentSuccessRefId === s.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedServiceForDetail(s)}
                              className="px-3 py-1.5 rounded-xl bg-[#2A1810] hover:bg-[#EA580C] text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                              Inspect Details
                            </button>
                            {s.category === 'hotel_room' && (
                              <button
                                type="button"
                                onClick={() => generateBookingReceiptPDF(s.rawDetails as RoomBooking)}
                                className="p-1.5 rounded-xl bg-white border border-[#2A1810]/15 text-[#EA580C] hover:bg-orange-50 transition-colors cursor-pointer"
                                title="Download PDF Receipt"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Empty state */}
              {allBookedServices.length === 0 && (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-lg font-bold text-[#2A1810]">No Booked Services Recorded Yet</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    When customers reserve hotel bedrooms, table dining, banquet catering, or room service orders on the website, they will appear here in real time.
                  </p>
                  {onRefreshAdminData && (
                    <button
                      type="button"
                      onClick={() => onRefreshAdminData()}
                      className="px-4 py-2 bg-[#EA580C] text-white text-xs font-bold uppercase rounded-xl transition-colors cursor-pointer"
                    >
                      Refresh Database
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-3xl border border-[#2A1810]/10 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E4733]">Total Revenue</p>
                  <p className="font-serif text-2xl font-bold text-[#2A1810] mt-0.5">
                    {totalRevenue.toLocaleString()} <span className="text-xs font-sans text-[#EA580C]">ETB</span>
                  </p>
                  <p className="text-[10px] text-emerald-600 font-medium">Persisted in Firestore</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#2A1810]/10 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <BedDouble className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E4733]">Active Bookings</p>
                  <p className="font-serif text-2xl font-bold text-[#2A1810] mt-0.5">
                    {activeBookingsCount} <span className="text-xs font-sans text-gray-500">/ {hotelRooms.length} rooms</span>
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {Math.round((activeBookingsCount / Math.max(1, hotelRooms.length)) * 100)}% Occupancy
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#2A1810]/10 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E4733]">Restaurant Orders</p>
                  <p className="font-serif text-2xl font-bold text-[#2A1810] mt-0.5">
                    {orders.length} <span className="text-xs font-sans text-amber-600">({pendingOrdersCount} in prep)</span>
                  </p>
                  <p className="text-[10px] text-gray-500">Room delivery & dining</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#2A1810]/10 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E4733]">Manager Outbox</p>
                  <p className="font-serif text-2xl font-bold text-[#2A1810] mt-0.5">
                    {adminNotifications.length} <span className="text-xs font-sans text-emerald-600">alerts</span>
                  </p>
                  <p className="text-[10px] text-emerald-600 font-medium">To {AUTHORIZED_ADMIN_EMAIL}</p>
                </div>
              </div>
            </div>

            {/* Quick Three Column Grid: Recent Bookings, Kitchen Queue, Table Reservations */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Recent Bookings Box */}
              <div className="bg-white rounded-3xl border border-[#2A1810]/10 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-[#2A1810]/10">
                  <h3 className="font-serif text-base font-bold text-[#2A1810] flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-[#EA580C]" />
                    <span>Recent Hotel Bookings</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-xs text-[#EA580C] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {bookings.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No reservations recorded yet.</p>
                  ) : (
                    bookings.slice(0, 4).map((b) => (
                      <div key={b.id} className="p-3 rounded-2xl bg-[#FAF6F0] flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#2A1810]">{b.guestName}</span>
                            <span className="font-mono text-[10px] text-gray-500">({b.id})</span>
                          </div>
                          <p className="text-[11px] text-[#6E4733] mt-0.5">{b.roomName} • {b.nights}n</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-[#EA580C]">{b.totalPrice.toLocaleString()} ETB</span>
                          <div className="mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              b.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                              b.status === 'checked-in' ? 'bg-emerald-100 text-emerald-700' :
                              b.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                              b.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Kitchen / Cafe Queue Box */}
              <div className="bg-white rounded-3xl border border-[#2A1810]/10 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-[#2A1810]/10">
                  <h3 className="font-serif text-base font-bold text-[#2A1810] flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-[#EA580C]" />
                    <span>Live Kitchen Orders</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-[#EA580C] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {orders.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No active kitchen orders.</p>
                  ) : (
                    orders.slice(0, 4).map((o) => (
                      <div key={o.id} className="p-3 rounded-2xl bg-[#FAF6F0] flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#2A1810]">{o.customerName}</span>
                            <span className="px-1.5 py-0.2 bg-[#FFF7ED] text-[#EA580C] rounded font-semibold text-[10px]">
                              {o.roomOrTableNumber}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6E4733] mt-0.5 truncate max-w-[140px]">
                            {o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-[#EA580C]">{o.totalAmount.toLocaleString()} ETB</span>
                          <div className="mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              o.status === 'preparing' ? 'bg-amber-100 text-amber-800' :
                              o.status === 'served' || o.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                              o.status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {o.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Table & Banquet Reservations Box */}
              <div className="bg-white rounded-3xl border border-[#2A1810]/10 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-[#2A1810]/10">
                  <h3 className="font-serif text-base font-bold text-[#2A1810] flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-[#EA580C]" />
                    <span>Table & Banquet Queue</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('tableReservations')}
                    className="text-xs text-[#EA580C] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {tableReservations.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No table reservations recorded.</p>
                  ) : (
                    tableReservations.slice(0, 4).map((r) => (
                      <div key={r.id} className="p-3 rounded-2xl bg-[#FAF6F0] flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#2A1810]">{r.name}</span>
                            <span className="font-mono text-[10px] text-gray-500">({r.id})</span>
                          </div>
                          <p className="text-[11px] text-[#6E4733] mt-0.5">
                            {r.date} • {r.time} ({r.guests} guests)
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-orange-900 border border-orange-200">
                            {r.status}
                          </span>
                          <p className="text-[10px] text-gray-500 mt-1 font-medium">{r.bookingType === 'catering' ? 'Catering' : 'Dining'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROOM BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-3xl border border-[#2A1810]/10 shadow-sm p-6 space-y-4 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A1810]/10">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#2A1810]">Hotel Bedroom Reservations</h3>
                <p className="text-xs text-[#6E4733]">Live Firestore records with real-time sync and status control</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search guest, room or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 rounded-xl border border-[#2A1810]/15 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                  />
                </div>

                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#2A1810]/15 bg-[#FAF6F0] text-xs font-semibold text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked-in">Checked In</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2A1810]/10 text-[#6E4733] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Booking ID</th>
                    <th className="py-3 px-3">Guest Details</th>
                    <th className="py-3 px-3">Room & Stay</th>
                    <th className="py-3 px-3">Total (ETB)</th>
                    <th className="py-3 px-3">Payment Status</th>
                    <th className="py-3 px-3">Stay Status</th>
                    <th className="py-3 px-3">Actions & Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A1810]/5">
                  {bookings
                    .filter((b) => {
                      const matchesSearch =
                        b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.roomName.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesStatus = bookingStatusFilter === 'all' || b.status === bookingStatusFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map((b) => (
                      <tr key={b.id} className="hover:bg-[#FAF6F0]/70 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-[#EA580C]">
                          {b.id}
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="font-bold text-[#2A1810]">{b.guestName}</p>
                          <p className="text-[10px] text-gray-500">{b.guestEmail}</p>
                          <p className="text-[10px] text-gray-500">{b.guestPhone}</p>
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="font-medium text-[#2A1810]">{b.roomName}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">{b.checkInDate} → {b.checkOutDate} ({b.nights}n, {b.guestsCount}g)</p>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-[#2A1810]">
                          {b.totalPrice.toLocaleString()} ETB
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                              b.paymentStatus === 'verified' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              b.paymentStatus === 'proof_submitted' ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold' :
                              b.paymentStatus === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                              b.paymentStatus === 'refunded' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              'bg-orange-50 text-orange-800 border border-orange-200'
                            }`}>
                              {b.paymentProof && <Paperclip className="w-3 h-3" />}
                              {b.paymentStatus === 'proof_submitted' ? 'Proof Uploaded' :
                               b.paymentStatus === 'verified' ? 'Verified' :
                               b.paymentStatus === 'rejected' ? 'Rejected' :
                               b.paymentStatus === 'refunded' ? 'Refunded' : 'Unpaid'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBookingForPayment(b);
                                setPaymentNote(b.paymentProof?.verificationNotes || '');
                              }}
                              className="text-[10px] text-[#EA580C] hover:underline font-semibold cursor-pointer inline-flex items-center gap-0.5 mt-0.5"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>{b.paymentProof ? 'Review Proof' : 'Payment Details'}</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                            b.status === 'checked-in' ? 'bg-emerald-100 text-emerald-700' :
                            b.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                            b.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => generateBookingReceiptPDF(b)}
                              className="p-1.5 bg-[#FFF7ED] hover:bg-[#EA580C] text-[#EA580C] hover:text-white rounded-lg border border-[#EA580C]/30 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Download Monaz Hotel Branded PDF Receipt"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">PDF</span>
                            </button>

                            <select
                              value={b.status}
                              onChange={(e) => onUpdateBookingStatus(b.id, e.target.value as RoomBooking['status'])}
                              className="px-2 py-1 rounded-lg border border-[#2A1810]/20 bg-white text-[11px] font-semibold text-[#2A1810] focus:outline-none focus:border-[#EA580C] cursor-pointer"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirm</option>
                              <option value="checked-in">Check In</option>
                              <option value="completed">Complete</option>
                              <option value="rejected">Reject</option>
                              <option value="cancelled">Cancel</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: RESTAURANT & ROOM SERVICE ORDERS */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-3xl border border-[#2A1810]/10 shadow-sm p-6 space-y-4 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A1810]/10">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#2A1810]">Restaurant & Room Service Orders</h3>
                <p className="text-xs text-[#6E4733]">Real-time orders with server-calculated totals and kitchen routing</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customer, item, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 rounded-xl border border-[#2A1810]/15 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                  />
                </div>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#2A1810]/15 bg-[#FAF6F0] text-xs font-semibold text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                >
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready / Served</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2A1810]/10 text-[#6E4733] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Order ID</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Delivery Location</th>
                    <th className="py-3 px-3">Dishes & Drinks</th>
                    <th className="py-3 px-3">Total Amount</th>
                    <th className="py-3 px-3">Manager Alert</th>
                    <th className="py-3 px-3">Kitchen Status</th>
                    <th className="py-3 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A1810]/5">
                  {orders
                    .filter((o) => {
                      const matchesSearch =
                        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        o.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
                      const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map((o) => (
                      <tr key={o.id} className="hover:bg-[#FAF6F0]/70 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-[#EA580C]">{o.id}</td>
                        <td className="py-3.5 px-3">
                          <p className="font-bold text-[#2A1810]">{o.customerName}</p>
                          <p className="text-[10px] text-gray-500">{o.customerPhone}</p>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#EA580C] font-bold text-[10px] border border-[#EA580C]/20">
                            {o.roomOrTableNumber}
                          </span>
                          <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">{o.deliveryType.replace('_', ' ')}</p>
                        </td>
                        <td className="py-3.5 px-3">
                          <ul className="space-y-0.5 text-[11px] text-[#2A1810]">
                            {o.items.map((item, idx) => (
                              <li key={idx}>
                                <span className="font-bold text-[#EA580C]">{item.quantity}x</span> {item.name} ({item.price * item.quantity} ETB)
                              </li>
                            ))}
                          </ul>
                          {o.notes && (
                            <p className="text-[10px] italic text-[#6E4733] mt-1 bg-amber-50 p-1 rounded">
                              Note: {o.notes}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-[#2A1810]">
                          {o.totalAmount.toLocaleString()} ETB
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Dispatched
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            o.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                            o.status === 'preparing' ? 'bg-amber-100 text-amber-800' :
                            o.status === 'ready' || o.status === 'served' ? 'bg-emerald-100 text-emerald-700' :
                            o.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <select
                            value={o.status}
                            onChange={(e) => onUpdateOrderStatus(o.id, e.target.value as CafeOrder['status'])}
                            className="px-2 py-1 rounded-lg border border-[#2A1810]/20 bg-white text-[11px] font-semibold text-[#2A1810] focus:outline-none focus:border-[#EA580C] cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="accepted">Accept</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready">Ready / Served</option>
                            <option value="completed">Complete</option>
                            <option value="cancelled">Cancel</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TABLE RESERVATIONS */}
        {activeTab === 'tableReservations' && (
          <div className="bg-white rounded-3xl border border-[#2A1810]/10 shadow-sm p-6 space-y-4 max-w-7xl mx-auto">
            <div className="pb-4 border-b border-[#2A1810]/10 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#2A1810]">Table Dining & Banquet Reservations</h3>
                <p className="text-xs text-[#6E4733]">Customer inquiries for dining tables and VIP catering packages</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2A1810]/10 text-[#6E4733] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Ref ID</th>
                    <th className="py-3 px-3">Guest Name</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Party Size</th>
                    <th className="py-3 px-3">Type / Package</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A1810]/5">
                  {tableReservations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        No table reservations submitted yet.
                      </td>
                    </tr>
                  ) : (
                    tableReservations.map((r) => (
                      <tr key={r.id} className="hover:bg-[#FAF6F0]/70 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-[#EA580C]">{r.id}</td>
                        <td className="py-3.5 px-3 font-bold text-[#2A1810]">{r.name}</td>
                        <td className="py-3.5 px-3">
                          <p>{r.email}</p>
                          <p className="text-gray-500">{r.phone}</p>
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="font-semibold">{r.date}</p>
                          <p className="text-gray-500">{r.time}</p>
                        </td>
                        <td className="py-3.5 px-3">{r.guests} guests</td>
                        <td className="py-3.5 px-3 font-medium text-[#EA580C]">
                          {r.bookingType === 'catering' ? 'VIP Banquet Catering' : 'Dining Table'}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            r.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                            r.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          {onUpdateReservationStatus && (
                            <select
                              value={r.status}
                              onChange={(e) => onUpdateReservationStatus(r.id, e.target.value as TableReservation['status'])}
                              className="px-2 py-1 rounded-lg border border-[#2A1810]/20 bg-white text-[11px] font-semibold text-[#2A1810]"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirm</option>
                              <option value="completed">Complete</option>
                              <option value="cancelled">Cancel</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: NOTIFICATIONS OUTBOX & RETRY */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-3xl border border-[#2A1810]/10 shadow-sm p-6 space-y-4 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A1810]/10">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#2A1810]">
                  Administrator Dispatch Outbox
                </h3>
                <p className="text-xs text-[#6E4733]">
                  All alerts routed to <strong>{AUTHORIZED_ADMIN_EMAIL}</strong> with delivery status & retry engine
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={notifStatusFilter}
                  onChange={(e) => setNotifStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#2A1810]/15 bg-[#FAF6F0] text-xs font-semibold text-[#2A1810]"
                >
                  <option value="all">All Alerts</option>
                  <option value="sent">Delivered / Sent</option>
                  <option value="failed">Failed / Retry Needed</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2A1810]/10 text-[#6E4733] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Log ID</th>
                    <th className="py-3 px-3">Subject / Event</th>
                    <th className="py-3 px-3">Recipient</th>
                    <th className="py-3 px-3">Payload Summary</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A1810]/5">
                  {adminNotifications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        No notifications generated yet. Submit a booking or order to trigger an alert.
                      </td>
                    </tr>
                  ) : (
                    adminNotifications
                      .filter((n) => notifStatusFilter === 'all' || n.status === notifStatusFilter)
                      .map((n) => (
                        <tr key={n.id} className="hover:bg-[#FAF6F0]/70 transition-colors">
                          <td className="py-3.5 px-3 font-mono font-bold text-[#EA580C]">{n.id}</td>
                          <td className="py-3.5 px-3">
                            <p className="font-bold text-[#2A1810]">{n.subject}</p>
                            <span className="text-[10px] text-gray-500 uppercase font-semibold">Ref: {n.recordId}</span>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-[11px] text-[#6E4733]">{n.recipient}</td>
                          <td className="py-3.5 px-3 max-w-xs truncate text-[11px] text-gray-600" title={n.summary}>
                            {n.summary}
                          </td>
                          <td className="py-3.5 px-3 text-[11px] text-gray-500 whitespace-nowrap">
                            {new Date(n.lastAttemptAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                              n.status === 'sent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${n.status === 'sent' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              {n.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <button
                              onClick={() => handleRetry(n)}
                              disabled={retryingNotifId === n.id}
                              className="px-2.5 py-1 rounded-lg border border-[#EA580C]/30 hover:bg-[#FFF7ED] text-[#EA580C] text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <RotateCw className={`w-3 h-3 ${retryingNotifId === n.id ? 'animate-spin' : ''}`} />
                              <span>{retryingNotifId === n.id ? 'Retrying...' : 'Retry Dispatch'}</span>
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: MENU & PRICING MANAGEMENT */}
        {activeTab === 'menu' && (
          <div className="bg-white rounded-3xl border border-[#2A1810]/10 shadow-sm p-6 space-y-4 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A1810]/10">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#2A1810]">
                  Monaz Hotel Menu & Price Management
                </h3>
                <p className="text-xs text-[#6E4733]">
                  All 71 authentic items transcribed from the attached photos. Edit prices live or toggle availability.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search dish or beverage..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 rounded-xl border border-[#2A1810]/15 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#2A1810]/15 bg-[#FAF6F0] text-xs font-semibold text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                >
                  <option value="all">All Categories</option>
                  <option value="traditional">Traditional Food (የባህል)</option>
                  <option value="burgers">Burgers & Sandwiches</option>
                  <option value="pasta_rice">Pasta, Spaight & Rice</option>
                  <option value="salad_soup">Salad & Soup</option>
                  <option value="hot_drinks">Hot Drinks (ቡና እና ሻይ)</option>
                  <option value="smoothies_cold">Smoothies & Cold Drinks</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2A1810]/10 text-[#6E4733] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Item Details</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Current Price</th>
                    <th className="py-3 px-3">Stock Status</th>
                    <th className="py-3 px-3">Live Price Adjustment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A1810]/5">
                  {menuItems
                    .filter((item) => {
                      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
                      const matchesSearch =
                        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.amharicName && item.amharicName.includes(searchQuery));
                      return matchesCategory && matchesSearch;
                    })
                    .map((item) => {
                      const isEditing = editingPriceId === item.id;
                      return (
                        <tr key={item.id} className="hover:bg-[#FAF6F0]/70 transition-colors">
                          <td className="py-3 px-3 flex items-center gap-3">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                            />
                            <div>
                              <p className="font-bold text-[#2A1810]">{item.name}</p>
                              {item.amharicName && (
                                <p className="text-[10px] text-[#EA580C] font-serif">{item.amharicName}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 capitalize text-[#6E4733]">
                            {item.category.replace('_', ' ')}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#EA580C] text-sm">
                            {item.price.toLocaleString()} ETB
                          </td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => onToggleMenuItemAvailability(item.id)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer ${
                                item.available !== false
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {item.available !== false ? 'In Stock' : 'Sold Out'}
                            </button>
                          </td>
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={tempPrice}
                                  onChange={(e) => setTempPrice(Number(e.target.value))}
                                  className="w-20 px-2 py-1 rounded border border-[#EA580C] text-xs font-mono"
                                />
                                <button
                                  onClick={() => {
                                    if (tempPrice > 0) {
                                      onUpdateMenuItemPrice(item.id, tempPrice);
                                    }
                                    setEditingPriceId(null);
                                  }}
                                  className="px-2 py-1 bg-[#EA580C] text-white rounded text-[10px] font-bold"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingPriceId(null)}
                                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-[10px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingPriceId(item.id);
                                    setTempPrice(item.price);
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-[#2A1810]/15 hover:border-[#EA580C] text-[11px] font-semibold text-[#2A1810] flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3 text-[#EA580C]" />
                                  <span>Edit Price</span>
                                </button>
                                <button
                                  onClick={() => onUpdateMenuItemPrice(item.id, item.price + 50)}
                                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-[10px] font-bold rounded cursor-pointer"
                                  title="Add 50 ETB"
                                >
                                  +50
                                </button>
                                <button
                                  onClick={() => onUpdateMenuItemPrice(item.id, Math.max(10, item.price - 50))}
                                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-[10px] font-bold rounded cursor-pointer"
                                  title="Subtract 50 ETB"
                                >
                                  -50
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: ROOM RATES & INVENTORY */}
        {activeTab === 'rooms' && (
          <div className="bg-white rounded-3xl border border-[#2A1810]/10 shadow-sm p-6 space-y-4 max-w-7xl mx-auto">
            <div className="pb-4 border-b border-[#2A1810]/10">
              <h3 className="font-serif text-xl font-bold text-[#2A1810]">
                Hotel Bedroom Inventory & Rates
              </h3>
              <p className="text-xs text-[#6E4733]">
                Manage nightly rates and room maintenance availability for all Monaz Hotel accommodations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotelRooms.map((room) => (
                <div key={room.id} className="p-5 rounded-2xl border border-[#2A1810]/15 bg-[#FAF6F0] flex flex-col justify-between space-y-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={room.image}
                      alt={room.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#EA580C] font-bold">
                        {room.tag}
                      </span>
                      <h4 className="font-serif text-sm font-bold text-[#2A1810]">{room.name}</h4>
                      <p className="text-[10px] text-[#6E4733]">{room.bedType} • {room.size}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#2A1810]/10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[#6E4733] uppercase">Nightly Rate</p>
                      <p className="font-mono font-bold text-[#EA580C] text-base">
                        {room.pricePerNight.toLocaleString()} ETB
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateRoomPrice(room.id, room.pricePerNight + 200)}
                        className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-xs font-bold rounded cursor-pointer"
                      >
                        +200
                      </button>
                      <button
                        onClick={() => onUpdateRoomPrice(room.id, Math.max(500, room.pricePerNight - 200))}
                        className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-xs font-bold rounded cursor-pointer"
                      >
                        -200
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#2A1810]/10 text-xs">
                    <span className="text-[#6E4733]">Status</span>
                    <button
                      onClick={() => onToggleRoomAvailability(room.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer ${
                        room.isAvailable
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {room.isAvailable ? 'Available for Booking' : 'Under Maintenance'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Payment Proof & Verification Modal */}
      {selectedBookingForPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#2A1810]/20 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#2A1810] text-white p-5 flex items-center justify-between border-b border-[#EA580C]/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EA580C] text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-base font-bold">Payment Verification</h4>
                  <p className="text-[11px] text-gray-300">Booking Reference: <span className="font-mono text-[#FB923C] font-bold">{selectedBookingForPayment.id}</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForPayment(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#2A1810]/10 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-[#6E4733] uppercase">Guest</span>
                  <p className="font-bold text-[#2A1810] text-sm">{selectedBookingForPayment.guestName}</p>
                  <p className="text-[10px] text-gray-500">{selectedBookingForPayment.guestPhone}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#6E4733] uppercase">Accommodation</span>
                  <p className="font-bold text-[#2A1810] text-sm">{selectedBookingForPayment.roomName}</p>
                  <p className="text-[10px] text-gray-500">{selectedBookingForPayment.checkInDate} to {selectedBookingForPayment.checkOutDate} ({selectedBookingForPayment.nights} nights)</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#6E4733] uppercase">Total Due</span>
                  <p className="font-serif font-bold text-base text-[#EA580C]">{selectedBookingForPayment.totalPrice.toLocaleString()} ETB</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#6E4733] uppercase">Current Payment Status</span>
                  <p className="font-bold text-[#2A1810] capitalize mt-0.5">{selectedBookingForPayment.paymentStatus || 'Unpaid'}</p>
                </div>
              </div>

              {/* Proof Document Viewer */}
              <div className="space-y-2">
                <label className="font-bold text-[#2A1810] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-[#EA580C]" />
                  Submitted Payment Proof Document
                </label>

                {selectedBookingForPayment.paymentProof ? (
                  <div className="p-4 rounded-2xl bg-white border border-[#2A1810]/15 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#EA580C]" />
                        <div>
                          <p className="font-bold text-[#2A1810]">{selectedBookingForPayment.paymentProof.fileName}</p>
                          <p className="text-[10px] text-gray-500">
                            {(selectedBookingForPayment.paymentProof.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(selectedBookingForPayment.paymentProof.uploadedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`${selectedBookingForPayment.paymentProof.fileUrl}?bookingRef=${selectedBookingForPayment.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[#2A1810] hover:bg-[#EA580C] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Document</span>
                      </a>
                    </div>

                    {/* Image Preview if JPEG/PNG */}
                    {selectedBookingForPayment.paymentProof.mimeType?.startsWith('image/') && (
                      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 max-h-64 flex items-center justify-center">
                        <img
                          src={`${selectedBookingForPayment.paymentProof.fileUrl}?bookingRef=${selectedBookingForPayment.id}`}
                          alt="Customer payment transfer proof"
                          className="max-h-64 w-auto object-contain rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#FFF7ED] border border-[#EA580C]/20 text-[#6E4733] text-center">
                    <p className="font-semibold">No payment proof uploaded.</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Guest selected to pay via cash or card upon check-in at Monaz Hotel.</p>
                  </div>
                )}
              </div>

              {/* Verification Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#2A1810] uppercase tracking-wider text-[11px]">
                  Administrator Verification Notes & Audit Log
                </label>
                <textarea
                  rows={2}
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Verified transfer in CBE mobile banking app, ref #98221, approved by Monaz Manager."
                  className="w-full px-3 py-2 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-xs text-[#2A1810] focus:outline-none focus:border-[#EA580C]"
                />
                {selectedBookingForPayment.paymentProof?.verifiedBy && (
                  <p className="text-[10px] text-gray-500 italic">
                    Last audited by {selectedBookingForPayment.paymentProof.verifiedBy} on {new Date(selectedBookingForPayment.paymentProof.verifiedAt || '').toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#FAF6F0] border-t border-[#2A1810]/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => generateBookingReceiptPDF(selectedBookingForPayment)}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-[#2A1810] border border-[#2A1810]/20 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>Download PDF Receipt</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isVerifyingPayment}
                  onClick={async () => {
                    setIsVerifyingPayment(true);
                    try {
                      if (onUpdateBookingPayment) {
                        await onUpdateBookingPayment(selectedBookingForPayment.id, 'rejected', paymentNote);
                      }
                      setSelectedBookingForPayment((prev) => prev ? { ...prev, paymentStatus: 'rejected', status: 'rejected' } : null);
                    } finally {
                      setIsVerifyingPayment(false);
                    }
                  }}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Reject Proof
                </button>

                <button
                  type="button"
                  disabled={isVerifyingPayment}
                  onClick={async () => {
                    setIsVerifyingPayment(true);
                    try {
                      if (onUpdateBookingPayment) {
                        await onUpdateBookingPayment(selectedBookingForPayment.id, 'verified', paymentNote);
                      }
                      setSelectedBookingForPayment((prev) => prev ? { ...prev, paymentStatus: 'verified', status: 'confirmed' } : null);
                    } finally {
                      setIsVerifyingPayment(false);
                    }
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Confirm Booking</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Service Details Modal */}
      {selectedServiceForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#2A1810]/20 overflow-hidden my-4">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#2A1810] via-[#3E2314] to-[#2A1810] text-white p-5 flex items-center justify-between border-b border-[#EA580C]/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${
                  selectedServiceForDetail.category === 'hotel_room' ? 'bg-[#EA580C]' :
                  selectedServiceForDetail.category === 'cafe_order' ? 'bg-amber-600' :
                  selectedServiceForDetail.category === 'table_dining' ? 'bg-emerald-600' :
                  'bg-purple-600'
                }`}>
                  {selectedServiceForDetail.category === 'hotel_room' && <BedDouble className="w-5 h-5" />}
                  {selectedServiceForDetail.category === 'cafe_order' && <UtensilsCrossed className="w-5 h-5" />}
                  {selectedServiceForDetail.category === 'table_dining' && <Coffee className="w-5 h-5" />}
                  {selectedServiceForDetail.category === 'banquet_catering' && <CalendarCheck className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif text-lg font-bold">{selectedServiceForDetail.title}</h4>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-orange-200">
                      {selectedServiceForDetail.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300">
                    {selectedServiceForDetail.categoryLabel} • Booked on {new Date(selectedServiceForDetail.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedServiceForDetail(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* Customer Contact Box */}
              <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#2A1810]/10 space-y-2">
                <p className="font-bold uppercase tracking-wider text-[#6E4733] text-[10px]">Customer Dossier</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-gray-500 text-[10px] block">Full Name:</span>
                    <span className="font-bold text-[#2A1810] text-sm">{selectedServiceForDetail.customerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Phone Contact:</span>
                    <a
                      href={`tel:${selectedServiceForDetail.customerPhone}`}
                      className="font-bold text-[#EA580C] hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="w-3 h-3 text-[#EA580C]" />
                      <span>{selectedServiceForDetail.customerPhone}</span>
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Email:</span>
                    <span className="font-semibold text-gray-700">{selectedServiceForDetail.customerEmail || 'None provided'}</span>
                  </div>
                </div>
              </div>

              {/* Service Logistics Box */}
              <div className="p-4 rounded-2xl bg-white border border-[#2A1810]/15 space-y-3">
                <p className="font-bold uppercase tracking-wider text-[#6E4733] text-[10px]">Service Logistics</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 text-[10px] block">Destination / Venue:</span>
                    <span className="font-bold text-[#2A1810]">{selectedServiceForDetail.locationOrRoom}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Dates & Schedule:</span>
                    <span className="font-bold text-[#2A1810]">{selectedServiceForDetail.dateTimeInfo}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Price & Total:</span>
                    <span className="font-mono font-bold text-sm text-[#EA580C]">
                      {selectedServiceForDetail.totalPrice > 0 ? `${selectedServiceForDetail.totalPrice.toLocaleString()} ${selectedServiceForDetail.currency}` : 'Pay Upon Dining'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Service Status:</span>
                    <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-900 border border-orange-200">
                      {selectedServiceForDetail.status}
                    </span>
                  </div>
                </div>

                {/* Subtitle / Details */}
                {selectedServiceForDetail.subtitle && (
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-gray-500 text-[10px] block">Summary:</span>
                    <p className="text-xs text-[#2A1810] font-medium mt-0.5">{selectedServiceForDetail.subtitle}</p>
                  </div>
                )}

                {/* Special Requests */}
                {selectedServiceForDetail.specialRequests && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    <span className="font-bold text-[10px] uppercase tracking-wider block">Special Notes & Requests:</span>
                    <p className="text-xs mt-0.5 italic">"{selectedServiceForDetail.specialRequests}"</p>
                  </div>
                )}
              </div>

              {/* Itemized Breakdown for Cafe Orders */}
              {selectedServiceForDetail.category === 'cafe_order' && (
                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#2A1810]/10 space-y-2">
                  <p className="font-bold uppercase tracking-wider text-[#6E4733] text-[10px]">Itemized Kitchen Order</p>
                  <div className="divide-y divide-gray-200">
                    {((selectedServiceForDetail.rawDetails as CafeOrder).items || []).map((it, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-[#2A1810]">
                          <strong className="text-[#EA580C] mr-1">{it.quantity}x</strong> {it.name}
                        </span>
                        <span className="font-mono font-bold text-gray-700">
                          {(it.price * it.quantity).toLocaleString()} ETB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hotel Room Specifics & Payment Proof Review */}
              {selectedServiceForDetail.category === 'hotel_room' && (
                <div className="p-4 rounded-2xl bg-[#FFF7ED] border border-[#EA580C]/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#2A1810] text-xs">Hotel Payment Verification</p>
                      <p className="text-[10px] text-gray-500">
                        Status: <strong className="uppercase text-[#EA580C]">{selectedServiceForDetail.paymentStatus}</strong>
                      </p>
                    </div>
                    {selectedServiceForDetail.paymentProof && (
                      <button
                        type="button"
                        onClick={() => {
                          const b = selectedServiceForDetail.rawDetails as RoomBooking;
                          setSelectedBookingForPayment(b);
                          setPaymentNote(b.paymentProof?.verificationNotes || '');
                        }}
                        className="px-3 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-[11px] font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Audit Proof Document</span>
                      </button>
                    )}
                  </div>

                  {selectedServiceForDetail.paymentProof && (
                    <div className="p-2.5 rounded-xl bg-white border border-[#EA580C]/20 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-[#EA580C]" />
                        <div>
                          <p className="font-medium text-[#2A1810]">{selectedServiceForDetail.paymentProof.fileName}</p>
                          <p className="text-[9px] text-gray-500">
                            {(selectedServiceForDetail.paymentProof.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(selectedServiceForDetail.paymentProof.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <a
                        href={selectedServiceForDetail.paymentProof.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#EA580C] hover:underline font-bold text-xs flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Proof</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Automated Gmail Notification System & Booker Progress */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FFF7ED] to-[#FAF6F0] border border-[#EA580C]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#EA580C] text-white flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-serif font-bold text-sm text-[#2A1810]">
                        Automated Gmail Notification & Booker Progress
                      </h5>
                      <p className="text-[10px] text-gray-500">
                        Synchronized with admin ({AUTHORIZED_ADMIN_EMAIL}) and customer inbox
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-orange-100 text-[#EA580C] border border-orange-200">
                    Dual Notification
                  </span>
                </div>

                {/* Status Badges Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                  {/* Admin Alert Card */}
                  <div className="p-3 rounded-xl bg-white border border-[#2A1810]/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] uppercase text-[#6E4733] flex items-center gap-1">
                          <Bell className="w-3 h-3 text-[#EA580C]" />
                          <span>Admin Waiting Alert</span>
                        </span>
                        <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Dispatched
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1">
                        Notification sent to <strong>{AUTHORIZED_ADMIN_EMAIL}</strong>: <em>"Order enters / is waiting for confirmation"</em>.
                      </p>
                    </div>
                  </div>

                  {/* Customer Acceptance Card */}
                  <div className="p-3 rounded-xl bg-white border border-[#2A1810]/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] uppercase text-[#6E4733] flex items-center gap-1">
                          <Send className="w-3 h-3 text-[#EA580C]" />
                          <span>Customer Acceptance Email</span>
                        </span>
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                          selectedServiceForDetail.status === 'confirmed' || selectedServiceForDetail.status === 'accepted' || selectedServiceForDetail.paymentStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {selectedServiceForDetail.status === 'confirmed' || selectedServiceForDetail.status === 'accepted' || selectedServiceForDetail.paymentStatus === 'verified'
                            ? 'Accepted & Sent'
                            : 'Awaiting Acceptance'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1">
                        Recipient: <strong>{selectedServiceForDetail.customerEmail || 'Guest Phone Contact'}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email Action Feedback */}
                {emailActionMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{emailActionMessage}</span>
                  </div>
                )}

                {/* 1-Click Dispatch & Gmail Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={getDirectGmailComposeUrl(selectedServiceForDetail)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open in Gmail (Compose)</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>

                  <button
                    type="button"
                    disabled={sendingEmailRefId === selectedServiceForDetail.id}
                    onClick={() => handleSendAcceptanceEmail(selectedServiceForDetail)}
                    className="px-3.5 py-2 bg-white hover:bg-gray-100 text-[#2A1810] border border-[#2A1810]/20 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {sendingEmailRefId === selectedServiceForDetail.id ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin text-[#EA580C]" />
                        <span>Dispatching Email...</span>
                      </>
                    ) : emailSentSuccessRefId === selectedServiceForDetail.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Acceptance Email Sent!</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-[#EA580C]" />
                        <span>Send Customer Acceptance Email</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedServiceForDetail.id);
                      setCopiedRefId(selectedServiceForDetail.id);
                      setTimeout(() => setCopiedRefId(null), 2500);
                    }}
                    className="px-3 py-2 bg-white hover:bg-gray-100 text-[#6E4733] border border-[#2A1810]/15 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                  >
                    {copiedRefId === selectedServiceForDetail.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedRefId === selectedServiceForDetail.id ? 'Ref ID Copied' : `Copy Ref #${selectedServiceForDetail.id}`}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-[#FAF6F0] border-t border-[#2A1810]/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {selectedServiceForDetail.category === 'hotel_room' && (
                  <button
                    type="button"
                    onClick={() => generateBookingReceiptPDF(selectedServiceForDetail.rawDetails as RoomBooking)}
                    className="px-4 py-2 bg-white hover:bg-gray-100 text-[#2A1810] border border-[#2A1810]/20 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span>Download PDF Receipt</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedServiceForDetail(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#2A1810] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Close Dossier
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
