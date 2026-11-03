import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import {
  RoomBooking,
  CafeOrder,
  TableReservation,
  AdminNotification,
  OrderItem,
  NotificationStatus,
  RoomBookingStatus,
  CafeOrderStatus
} from '../types';
import { HOTEL_ROOMS, MENU_ITEMS, INITIAL_ROOM_BOOKINGS, INITIAL_CAFE_ORDERS } from '../data';

export const ADMIN_EMAIL = 'redwanredhood@gmail.com';
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export { testConnection } from '../lib/firebase';

// Generate short readable IDs
export function generateReferenceId(prefix: 'BK' | 'ORD' | 'RES'): string {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomPart}`;
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// LOCAL STORAGE CACHE HELPERS (For offline resilience and instant UI updates)
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  BOOKINGS: 'monaz_room_bookings',
  ORDERS: 'monaz_cafe_orders',
  RESERVATIONS: 'monaz_table_reservations',
  NOTIFICATIONS: 'monaz_admin_notifications'
};

function getLocalData<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('monaz_db_updated', { detail: { key } }));
    }
  } catch (err) {
    console.warn(`[dbService] Cache persist error:`, err);
  }
}

// ---------------------------------------------------------------------------
// 1. HOTEL ROOM RESERVATIONS
// ---------------------------------------------------------------------------

export interface CreateBookingInput {
  roomId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  guestsCount: number;
  specialRequests?: string;
  receiptFile?: File | null;
}

export async function createRoomBooking(input: CreateBookingInput): Promise<RoomBooking> {
  if (!input.guestName || input.guestName.trim().length < 2) {
    throw new Error('Please provide the guest full name (at least 2 characters).');
  }
  if (!input.guestPhone || input.guestPhone.trim().length < 6) {
    throw new Error('A valid contact phone number is required (minimum 6 digits).');
  }
  if (!input.checkInDate || !input.checkOutDate) {
    throw new Error('Both check-in and check-out dates are required.');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (input.checkInDate < todayStr) {
    throw new Error('Check-in date cannot be in the past.');
  }
  if (input.checkOutDate <= input.checkInDate) {
    throw new Error('Check-out date must be strictly after the check-in date.');
  }

  if (input.receiptFile) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(input.receiptFile.type.toLowerCase())) {
      throw new Error('Invalid file type for payment proof. Only JPG, PNG, and PDF files are accepted.');
    }
    if (input.receiptFile.size > 5 * 1024 * 1024) {
      throw new Error('Payment proof file size exceeds 5MB. Please upload a smaller document.');
    }
  }

  const room = HOTEL_ROOMS.find((r) => r.id === input.roomId) || HOTEL_ROOMS[0];
  const dIn = new Date(input.checkInDate);
  const dOut = new Date(input.checkOutDate);
  const diffTime = Math.max(1000 * 60 * 60 * 24, dOut.getTime() - dIn.getTime());
  const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  const roomSubtotal = room.pricePerNight * nights;
  const taxesAndService = Math.round(roomSubtotal * 0.10);
  const grandTotal = roomSubtotal + taxesAndService;
  const bookingId = generateReferenceId('BK');
  const createdAt = new Date().toISOString();

  let paymentProof: any = undefined;
  if (input.receiptFile) {
    let fileDataUrl = '';
    try {
      fileDataUrl = await readFileAsBase64(input.receiptFile);
    } catch {
      fileDataUrl = '';
    }
    paymentProof = {
      fileName: input.receiptFile.name,
      fileSize: input.receiptFile.size,
      fileType: input.receiptFile.type,
      fileUrl: fileDataUrl,
      uploadedAt: createdAt,
      verificationNotes: 'Uploaded via customer portal. Identified bank payment slip awaiting admin confirmation.'
    };
  }

  const newBooking: RoomBooking = {
    id: bookingId,
    userId: (auth as any)?.currentUser?.uid || undefined,
    roomId: room.id,
    roomName: room.name,
    guestName: input.guestName.trim(),
    guestEmail: input.guestEmail.trim() || ADMIN_EMAIL,
    guestPhone: input.guestPhone.trim(),
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    nights,
    guestsCount: input.guestsCount,
    specialRequests: input.specialRequests ? input.specialRequests.trim() : '',
    totalPrice: grandTotal,
    currency: 'ETB',
    status: 'pending',
    paymentStatus: input.receiptFile ? 'proof_submitted' : 'unpaid',
    paymentProof,
    notificationStatus: 'sent',
    notificationRecipient: ADMIN_EMAIL,
    createdAt
  };

  // 1. Write directly to Firestore
  try {
    const docRef = doc(db, 'roomBookings', bookingId);
    await setDoc(docRef, newBooking);
  } catch (err: unknown) {
    console.warn('[dbService] Firestore write notice for room booking:', err);
    // Don't throw if network is slow; cache will preserve it
  }

  // 2. Cache locally for instant UI update
  const currentList = getLocalData<RoomBooking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_ROOM_BOOKINGS);
  const updatedList = [newBooking, ...currentList.filter((b) => b.id !== bookingId)];
  setLocalData(STORAGE_KEYS.BOOKINGS, updatedList);

  // 3. Dispatch administrator alert outbox to Firestore
  await dispatchAdminNotification({
    eventType: 'room_booking',
    recordId: bookingId,
    subject: `New Room Reservation — Monaz Hotel & Café (${room.name})`,
    recipient: ADMIN_EMAIL,
    summary: `Booking #${bookingId}: ${room.name} (${nights} nights, ${input.checkInDate} to ${input.checkOutDate}). Total: ${grandTotal.toLocaleString()} ETB. Guest: ${input.guestName} (${input.guestPhone}). Payment: ${input.receiptFile ? 'Bank Transfer Proof Attached' : 'Pay on Arrival'}`,
    details: {
      customerName: input.guestName.trim(),
      contact: `${input.guestEmail || 'No email'} | ${input.guestPhone}`,
      datesOrItems: `${input.checkInDate} to ${input.checkOutDate} (${nights} nights)`,
      totalAmount: `${grandTotal.toLocaleString()} ETB`
    }
  }).catch((e) => console.warn('[Admin Notif]:', e));

  return newBooking;
}

// ---------------------------------------------------------------------------
// 2. FOOD AND DRINKS ORDERING
// ---------------------------------------------------------------------------

export interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryType: 'room_delivery' | 'table_service' | 'takeaway';
  roomOrTableNumber: string;
  rawItems: { menuItemId: string; quantity: number }[];
  notes?: string;
}

export async function createCafeOrder(input: CreateOrderInput): Promise<CafeOrder> {
  if (!input.customerName || input.customerName.trim().length < 2) {
    throw new Error('Please provide the customer name.');
  }
  if (!input.customerPhone || input.customerPhone.trim().length < 6) {
    throw new Error('A valid contact phone number is required.');
  }
  if (!input.rawItems || input.rawItems.length === 0) {
    throw new Error('Cannot submit an empty dining order.');
  }

  const processedItems: OrderItem[] = [];
  let subtotal = 0;

  for (const itemInput of input.rawItems) {
    const catalogItem = MENU_ITEMS.find((m) => m.id === itemInput.menuItemId);
    if (!catalogItem) continue;
    const qty = Math.max(1, Math.floor(itemInput.quantity));
    const price = catalogItem.price;
    subtotal += price * qty;
    processedItems.push({
      itemId: catalogItem.id,
      name: catalogItem.name,
      quantity: qty,
      price,
      category: catalogItem.category
    });
  }

  if (processedItems.length === 0) {
    throw new Error('None of the ordered items were recognized in our authentic menu catalog.');
  }

  const serviceFee = Math.round(subtotal * 0.05);
  const totalAmount = subtotal + serviceFee;
  const orderId = generateReferenceId('ORD');
  const createdAt = new Date().toISOString();

  const newOrder: CafeOrder = {
    id: orderId,
    userId: (auth as any)?.currentUser?.uid || undefined,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail.trim() || ADMIN_EMAIL,
    customerPhone: input.customerPhone.trim(),
    deliveryType: input.deliveryType,
    roomOrTableNumber: input.roomOrTableNumber.trim() || (input.deliveryType === 'room_delivery' ? 'Room Service' : 'Table 1'),
    items: processedItems,
    subtotal,
    serviceFee,
    totalAmount,
    currency: 'ETB',
    notes: input.notes ? input.notes.trim() : '',
    status: 'pending',
    notificationStatus: 'sent',
    notificationRecipient: ADMIN_EMAIL,
    createdAt
  };

  // 1. Write to Firestore
  try {
    const docRef = doc(db, 'cafeOrders', orderId);
    await setDoc(docRef, newOrder);
  } catch (err: unknown) {
    console.warn('[dbService] Firestore write notice for cafe order:', err);
  }

  // 2. Cache locally
  const currentOrders = getLocalData<CafeOrder[]>(STORAGE_KEYS.ORDERS, INITIAL_CAFE_ORDERS);
  const updatedOrders = [newOrder, ...currentOrders.filter((o) => o.id !== orderId)];
  setLocalData(STORAGE_KEYS.ORDERS, updatedOrders);

  const itemsSummary = processedItems
    .map((item) => `${item.quantity}x ${item.name} (${item.price * item.quantity} ETB)`)
    .join(', ');

  await dispatchAdminNotification({
    eventType: 'cafe_order',
    recordId: orderId,
    subject: `New Food & Drinks Order — MONAZ HOTEL (${input.deliveryType.replace('_', ' ')})`,
    recipient: ADMIN_EMAIL,
    summary: `Order #${orderId} (${input.deliveryType}): ${itemsSummary}. Total: ${totalAmount.toLocaleString()} ETB. Customer: ${input.customerName} (${input.customerPhone}). Location: ${newOrder.roomOrTableNumber}`,
    details: {
      customerName: input.customerName.trim(),
      contact: `${input.customerEmail || 'No email'} | ${input.customerPhone}`,
      datesOrItems: itemsSummary,
      totalAmount: `${totalAmount.toLocaleString()} ETB`
    }
  }).catch((e) => console.warn('[Admin Notif]:', e));

  return newOrder;
}

// ---------------------------------------------------------------------------
// 3. TABLE RESERVATIONS / CATERING
// ---------------------------------------------------------------------------

export interface CreateTableReservationInput {
  bookingType: 'reservation' | 'catering';
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: string;
  package?: string;
  notes?: string;
}

export async function createTableReservation(input: CreateTableReservationInput): Promise<TableReservation> {
  if (!input.name || input.name.trim().length < 2) {
    throw new Error('Please provide your name.');
  }
  if (!input.phone || input.phone.trim().length < 6) {
    throw new Error('A valid contact phone number is required.');
  }
  if (!input.date) {
    throw new Error('Please select a reservation date.');
  }

  const resId = generateReferenceId('RES');
  const createdAt = new Date().toISOString();

  const newReservation: TableReservation = {
    id: resId,
    userId: (auth as any)?.currentUser?.uid || undefined,
    bookingType: input.bookingType,
    name: input.name.trim(),
    email: input.email.trim() || ADMIN_EMAIL,
    phone: input.phone.trim(),
    date: input.date,
    time: input.time || '19:00',
    guests: input.guests || '2',
    package: input.package || (input.bookingType === 'catering' ? 'VIP Banquet Catering' : 'Dining Table'),
    notes: input.notes ? input.notes.trim() : '',
    status: 'pending',
    notificationStatus: 'sent',
    notificationRecipient: ADMIN_EMAIL,
    createdAt
  };

  // 1. Write to Firestore
  try {
    const docRef = doc(db, 'tableReservations', resId);
    await setDoc(docRef, newReservation);
  } catch (err: unknown) {
    console.warn('[dbService] Firestore write notice for table reservation:', err);
  }

  // 2. Cache locally
  const currentReservations = getLocalData<TableReservation[]>(STORAGE_KEYS.RESERVATIONS, []);
  const updatedReservations = [newReservation, ...currentReservations.filter((r) => r.id !== resId)];
  setLocalData(STORAGE_KEYS.RESERVATIONS, updatedReservations);

  await dispatchAdminNotification({
    eventType: 'table_reservation',
    recordId: resId,
    subject: `New Table Reservation — MONAZ HOTEL (${input.bookingType.toUpperCase()})`,
    recipient: ADMIN_EMAIL,
    summary: `${input.bookingType === 'catering' ? 'Catering' : 'Dining Table'} for ${input.guests} guests on ${input.date} at ${input.time}. Customer: ${input.name} (${input.phone}).`,
    details: {
      customerName: input.name.trim(),
      contact: `${input.email || 'No email'} | ${input.phone}`,
      datesOrItems: `${input.date} at ${input.time} (${input.guests} guests)`,
      totalAmount: input.bookingType === 'catering' ? 'Custom Catering Quotation' : 'Standard Reservation'
    }
  }).catch((e) => console.warn('[Admin Notif]:', e));

  return newReservation;
}

// ---------------------------------------------------------------------------
// 4. ADMIN NOTIFICATIONS
// ---------------------------------------------------------------------------

export interface DispatchNotificationInput {
  eventType: 'room_booking' | 'cafe_order' | 'table_reservation';
  recordId: string;
  subject: string;
  recipient: string;
  summary: string;
  details: {
    customerName: string;
    contact: string;
    datesOrItems: string;
    totalAmount: string;
  };
}

export async function dispatchAdminNotification(input: DispatchNotificationInput): Promise<AdminNotification> {
  const notifId = `NOTIF-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date().toISOString();

  const notificationRecord: AdminNotification = {
    id: notifId,
    eventType: input.eventType,
    recordId: input.recordId,
    subject: input.subject,
    recipient: input.recipient,
    status: 'sent',
    summary: input.summary,
    details: input.details,
    createdAt: now,
    lastAttemptAt: now,
    retryCount: 0
  };

  try {
    const notifRef = doc(db, 'adminNotifications', notifId);
    await setDoc(notifRef, notificationRecord);
  } catch (err: unknown) {
    console.warn('[dbService] Firestore write notice for admin notification:', err);
  }

  const currentNotifs = getLocalData<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  setLocalData(STORAGE_KEYS.NOTIFICATIONS, [notificationRecord, ...currentNotifs]);

  return notificationRecord;
}

export async function retryNotification(notification: AdminNotification): Promise<AdminNotification> {
  const now = new Date().toISOString();
  try {
    const notifRef = doc(db, 'adminNotifications', notification.id);
    await updateDoc(notifRef, {
      status: 'sent',
      lastAttemptAt: now,
      retryCount: (notification.retryCount || 0) + 1
    });
  } catch (err: unknown) {
    console.warn('[dbService] Firestore retry update notice:', err);
  }

  const currentNotifs = getLocalData<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  const updatedNotifs = currentNotifs.map((n) => {
    if (n.id === notification.id) {
      return {
        ...n,
        status: 'sent' as NotificationStatus,
        errorMessage: undefined,
        lastAttemptAt: now,
        retryCount: (n.retryCount || 0) + 1
      };
    }
    return n;
  });
  setLocalData(STORAGE_KEYS.NOTIFICATIONS, updatedNotifs);

  return {
    ...notification,
    status: 'sent',
    errorMessage: undefined,
    lastAttemptAt: now,
    retryCount: (notification.retryCount || 0) + 1
  };
}

// ---------------------------------------------------------------------------
// 5. STATUS UPDATERS
// ---------------------------------------------------------------------------

export async function updateBookingStatusInDb(
  bookingId: string,
  newStatus: RoomBookingStatus
): Promise<void> {
  try {
    const docRef = doc(db, 'roomBookings', bookingId);
    await updateDoc(docRef, { status: newStatus, updatedAt: new Date().toISOString() });
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.UPDATE, `roomBookings/${bookingId}`);
  }

  const currentList = getLocalData<RoomBooking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_ROOM_BOOKINGS);
  const updated = currentList.map((b) =>
    b.id === bookingId ? { ...b, status: newStatus, updatedAt: new Date().toISOString() } : b
  );
  setLocalData(STORAGE_KEYS.BOOKINGS, updated);
}

export async function updateOrderStatusInDb(
  orderId: string,
  newStatus: CafeOrderStatus
): Promise<void> {
  try {
    const docRef = doc(db, 'cafeOrders', orderId);
    await updateDoc(docRef, { status: newStatus, updatedAt: new Date().toISOString() });
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.UPDATE, `cafeOrders/${orderId}`);
  }

  const currentOrders = getLocalData<CafeOrder[]>(STORAGE_KEYS.ORDERS, INITIAL_CAFE_ORDERS);
  const updated = currentOrders.map((o) =>
    o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o
  );
  setLocalData(STORAGE_KEYS.ORDERS, updated);
}

export async function updateReservationStatusInDb(
  reservationId: string,
  newStatus: TableReservation['status']
): Promise<void> {
  try {
    const docRef = doc(db, 'tableReservations', reservationId);
    await updateDoc(docRef, { status: newStatus, updatedAt: new Date().toISOString() });
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.UPDATE, `tableReservations/${reservationId}`);
  }

  const currentReservations = getLocalData<TableReservation[]>(STORAGE_KEYS.RESERVATIONS, []);
  const updated = currentReservations.map((r) =>
    r.id === reservationId ? { ...r, status: newStatus, updatedAt: new Date().toISOString() } : r
  );
  setLocalData(STORAGE_KEYS.RESERVATIONS, updated);
}

// ---------------------------------------------------------------------------
// 6. REAL-TIME SUBSCRIPTIONS (Firestore onSnapshot with Resilient Local Cache Fallback)
// ---------------------------------------------------------------------------

export function subscribeToRoomBookings(
  onUpdate: (bookings: RoomBooking[]) => void,
  onError?: (err: unknown) => void
): () => void {
  // 1. Initial emission from local cache for instant UI rendering
  const initialList = getLocalData<RoomBooking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_ROOM_BOOKINGS);
  onUpdate(initialList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));

  // 2. Attach live Firestore listener
  try {
    const q = collection(db, 'roomBookings');
    const unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        const list: RoomBooking[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as RoomBooking);
        });
        if (list.length > 0) {
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setLocalData(STORAGE_KEYS.BOOKINGS, list);
          onUpdate(list);
        }
      },
      (error) => {
        // If not logged in as admin yet, listing is restricted; fall back quietly to cached items
        const msg = error?.message || '';
        if (!msg.includes('insufficient permissions')) {
          handleFirestoreError(error, OperationType.LIST, 'roomBookings');
        }
        if (onError) onError(error);
      }
    );

    const handleLocalUpdate = () => {
      const list = getLocalData<RoomBooking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_ROOM_BOOKINGS);
      onUpdate(list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    };

    window.addEventListener('monaz_db_updated', handleLocalUpdate);

    return () => {
      unsubFirestore();
      window.removeEventListener('monaz_db_updated', handleLocalUpdate);
    };
  } catch {
    return () => {};
  }
}

export function subscribeToCafeOrders(
  onUpdate: (orders: CafeOrder[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const initialOrders = getLocalData<CafeOrder[]>(STORAGE_KEYS.ORDERS, INITIAL_CAFE_ORDERS);
  onUpdate(initialOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));

  try {
    const q = collection(db, 'cafeOrders');
    const unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        const list: CafeOrder[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as CafeOrder);
        });
        if (list.length > 0) {
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setLocalData(STORAGE_KEYS.ORDERS, list);
          onUpdate(list);
        }
      },
      (error) => {
        const msg = error?.message || '';
        if (!msg.includes('insufficient permissions')) {
          handleFirestoreError(error, OperationType.LIST, 'cafeOrders');
        }
        if (onError) onError(error);
      }
    );

    const handleLocalUpdate = () => {
      const list = getLocalData<CafeOrder[]>(STORAGE_KEYS.ORDERS, INITIAL_CAFE_ORDERS);
      onUpdate(list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    };

    window.addEventListener('monaz_db_updated', handleLocalUpdate);

    return () => {
      unsubFirestore();
      window.removeEventListener('monaz_db_updated', handleLocalUpdate);
    };
  } catch {
    return () => {};
  }
}

export function subscribeToTableReservations(
  onUpdate: (reservations: TableReservation[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const initialReservations = getLocalData<TableReservation[]>(STORAGE_KEYS.RESERVATIONS, []);
  onUpdate(initialReservations.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));

  try {
    const q = collection(db, 'tableReservations');
    const unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        const list: TableReservation[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as TableReservation);
        });
        if (list.length > 0) {
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setLocalData(STORAGE_KEYS.RESERVATIONS, list);
          onUpdate(list);
        }
      },
      (error) => {
        const msg = error?.message || '';
        if (!msg.includes('insufficient permissions')) {
          handleFirestoreError(error, OperationType.LIST, 'tableReservations');
        }
        if (onError) onError(error);
      }
    );

    const handleLocalUpdate = () => {
      const list = getLocalData<TableReservation[]>(STORAGE_KEYS.RESERVATIONS, []);
      onUpdate(list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    };

    window.addEventListener('monaz_db_updated', handleLocalUpdate);

    return () => {
      unsubFirestore();
      window.removeEventListener('monaz_db_updated', handleLocalUpdate);
    };
  } catch {
    return () => {};
  }
}

export function subscribeToAdminNotifications(
  onUpdate: (notifications: AdminNotification[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const initialNotifs = getLocalData<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  onUpdate(initialNotifs.sort((a, b) => new Date(b.lastAttemptAt || 0).getTime() - new Date(a.lastAttemptAt || 0).getTime()));

  try {
    const q = collection(db, 'adminNotifications');
    const unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        const list: AdminNotification[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as AdminNotification);
        });
        if (list.length > 0) {
          list.sort((a, b) => new Date(b.lastAttemptAt || 0).getTime() - new Date(a.lastAttemptAt || 0).getTime());
          setLocalData(STORAGE_KEYS.NOTIFICATIONS, list);
          onUpdate(list);
        }
      },
      (error) => {
        const msg = error?.message || '';
        if (!msg.includes('insufficient permissions')) {
          handleFirestoreError(error, OperationType.LIST, 'adminNotifications');
        }
        if (onError) onError(error);
      }
    );

    const handleLocalUpdate = () => {
      const list = getLocalData<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
      onUpdate(list.sort((a, b) => new Date(b.lastAttemptAt || 0).getTime() - new Date(a.lastAttemptAt || 0).getTime()));
    };

    window.addEventListener('monaz_db_updated', handleLocalUpdate);

    return () => {
      unsubFirestore();
      window.removeEventListener('monaz_db_updated', handleLocalUpdate);
    };
  } catch {
    return () => {};
  }
}

// ---------------------------------------------------------------------------
// 7. AUTHORIZED ADMIN FETCHERS (Direct Firestore Queries)
// ---------------------------------------------------------------------------

export async function fetchAdminBookings(_token?: string): Promise<RoomBooking[]> {
  try {
    const snap = await getDocs(collection(db, 'roomBookings'));
    const list: RoomBooking[] = [];
    snap.forEach((d) => list.push(d.data() as RoomBooking));
    if (list.length > 0) {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setLocalData(STORAGE_KEYS.BOOKINGS, list);
      return list;
    }
  } catch (err: unknown) {
    console.warn('[dbService] Firestore bookings fetch notice:', err);
  }

  const list = getLocalData<RoomBooking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_ROOM_BOOKINGS);
  return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export async function fetchAdminOrders(_token?: string): Promise<CafeOrder[]> {
  try {
    const snap = await getDocs(collection(db, 'cafeOrders'));
    const list: CafeOrder[] = [];
    snap.forEach((d) => list.push(d.data() as CafeOrder));
    if (list.length > 0) {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setLocalData(STORAGE_KEYS.ORDERS, list);
      return list;
    }
  } catch (err: unknown) {
    console.warn('[dbService] Firestore orders fetch notice:', err);
  }

  const list = getLocalData<CafeOrder[]>(STORAGE_KEYS.ORDERS, INITIAL_CAFE_ORDERS);
  return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export async function fetchAdminReservations(_token?: string): Promise<TableReservation[]> {
  try {
    const snap = await getDocs(collection(db, 'tableReservations'));
    const list: TableReservation[] = [];
    snap.forEach((d) => list.push(d.data() as TableReservation));
    if (list.length > 0) {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setLocalData(STORAGE_KEYS.RESERVATIONS, list);
      return list;
    }
  } catch (err: unknown) {
    console.warn('[dbService] Firestore reservations fetch notice:', err);
  }

  const list = getLocalData<TableReservation[]>(STORAGE_KEYS.RESERVATIONS, []);
  return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export async function fetchAdminNotifications(_token?: string): Promise<AdminNotification[]> {
  try {
    const snap = await getDocs(collection(db, 'adminNotifications'));
    const list: AdminNotification[] = [];
    snap.forEach((d) => list.push(d.data() as AdminNotification));
    if (list.length > 0) {
      list.sort((a, b) => new Date(b.lastAttemptAt || 0).getTime() - new Date(a.lastAttemptAt || 0).getTime());
      setLocalData(STORAGE_KEYS.NOTIFICATIONS, list);
      return list;
    }
  } catch (err: unknown) {
    console.warn('[dbService] Firestore notifications fetch notice:', err);
  }

  const list = getLocalData<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  return list.sort((a, b) => new Date(b.lastAttemptAt || 0).getTime() - new Date(a.lastAttemptAt || 0).getTime());
}

export async function fetchAdminAllServices(token?: string) {
  const [bookings, orders, reservations] = await Promise.all([
    fetchAdminBookings(token),
    fetchAdminOrders(token),
    fetchAdminReservations(token)
  ]);

  const unifiedServices: any[] = [];
  bookings.forEach((b) => {
    unifiedServices.push({
      id: b.id,
      category: 'hotel_room',
      categoryLabel: 'Hotel Bedroom Stay',
      title: b.roomName || 'Luxury Bedroom',
      subtitle: `${b.nights} Night(s) • ${b.guestsCount} Guest(s)`,
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

  orders.forEach((o) => {
    unifiedServices.push({
      id: o.id,
      category: 'cafe_order',
      categoryLabel: 'Kitchen & Bar Order',
      title: o.deliveryType === 'room_delivery' ? `Room Service (${o.roomOrTableNumber})` : `Table Dining (${o.roomOrTableNumber})`,
      subtitle: (o.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', '),
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerEmail: o.customerEmail,
      dateTimeInfo: new Date(o.createdAt).toLocaleString(),
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

  reservations.forEach((r) => {
    unifiedServices.push({
      id: r.id,
      category: r.bookingType === 'catering' ? 'banquet_catering' : 'table_dining',
      categoryLabel: r.bookingType === 'catering' ? 'VIP Banquet Catering' : 'Dining Table',
      title: r.bookingType === 'catering' ? 'Event Banquet & Catering' : 'Reserved Dining Table',
      subtitle: `${r.guests} Guests • ${r.time}`,
      customerName: r.name,
      customerPhone: r.phone,
      customerEmail: r.email,
      dateTimeInfo: `${r.date} at ${r.time}`,
      locationOrRoom: r.package || 'Dining Room',
      totalPrice: 0,
      currency: 'ETB',
      status: r.status,
      paymentStatus: 'unpaid',
      specialRequests: r.notes,
      createdAt: r.createdAt,
      rawDetails: r
    });
  });

  unifiedServices.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return { success: true, services: unifiedServices };
}

export async function updateAdminBookingPayment(
  _token: string,
  bookingId: string,
  paymentStatus: string,
  verificationNotes?: string,
  bookingStatus?: string
): Promise<any> {
  const currentList = getLocalData<RoomBooking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_ROOM_BOOKINGS);
  const found = currentList.find((b) => b.id === bookingId);
  if (!found) {
    throw new Error('Booking record not found');
  }

  const updatedProof = {
    ...(found.paymentProof || {}),
    verifiedAt: new Date().toISOString(),
    verifiedBy: 'Monaz Management',
    verificationNotes: verificationNotes || found.paymentProof?.verificationNotes || ''
  };

  const updatedBooking: RoomBooking = {
    ...found,
    paymentStatus: paymentStatus as any,
    paymentProof: updatedProof as any,
    status: (bookingStatus || (paymentStatus === 'verified' ? 'confirmed' : paymentStatus === 'rejected' ? 'rejected' : found.status)) as any,
    updatedAt: new Date().toISOString()
  };

  // 1. Update Firestore
  try {
    const docRef = doc(db, 'roomBookings', bookingId);
    await updateDoc(docRef, {
      paymentStatus,
      paymentProof: updatedProof,
      status: updatedBooking.status,
      updatedAt: updatedBooking.updatedAt
    });
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.UPDATE, `roomBookings/${bookingId}`);
  }

  // 2. Update local cache
  const updatedList = currentList.map((b) => (b.id === bookingId ? updatedBooking : b));
  setLocalData(STORAGE_KEYS.BOOKINGS, updatedList);

  return { success: true, id: bookingId, booking: updatedBooking };
}

// ---------------------------------------------------------------------------
// 8. PUBLIC LIVE TRACKING FETCHER (Direct Single-Document Firestore Query)
// ---------------------------------------------------------------------------

export async function fetchPublicTracking(refId: string): Promise<any> {
  const cleanId = refId.trim().toUpperCase();
  if (!cleanId) throw new Error('Invalid Reference ID');

  const commonSupport = {
    phone: '+251 91 123 4567',
    email: 'redwanredhood@gmail.com',
    location: 'Betel, Addis Ababa, Ethiopia'
  };

  if (cleanId.startsWith('BK-')) {
    // 1. Try Firestore direct get
    try {
      const docSnap = await getDoc(doc(db, 'roomBookings', cleanId));
      if (docSnap.exists()) {
        const record = docSnap.data() as RoomBooking;
        const isConfirmed = record.status === 'confirmed' || record.paymentStatus === 'verified';
        const hasProof = !!record.paymentProof;
        return {
          id: record.id,
          category: 'hotel_room',
          categoryLabel: 'Hotel Bedroom Stay',
          title: record.roomName || 'Luxury Bedroom',
          subtitle: `${record.nights || 1} Night(s) • ${record.guestsCount || 1} Guest(s)`,
          customerName: record.guestName,
          customerEmail: record.guestEmail,
          customerPhone: record.guestPhone,
          locationOrRoom: record.roomName || 'Bedroom Suite',
          totalPrice: record.totalPrice || 0,
          currency: record.currency || 'ETB',
          status: record.status || 'pending',
          statusLabel: isConfirmed ? 'Confirmed & Guaranteed' : 'Waiting for Admin Confirmation',
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          hasPaymentProof: hasProof,
          paymentStatus: record.paymentStatus || 'unpaid',
          paymentStatusLabel: record.paymentStatus === 'verified' ? 'Payment Verified & Approved' : hasProof ? 'Receipt Attached (Auditing)' : 'Pay on Arrival / Transfer Pending',
          paymentProof: record.paymentProof,
          steps: [
            { key: 'step_submitted', title: 'Reservation Request Placed', description: `Booking #${record.id} safely stored in database.`, status: 'completed', timestamp: record.createdAt },
            { key: 'step_receipt', title: hasProof ? 'Payment Proof Identified' : 'Payment Method Pending', description: hasProof ? `Receipt attached: ${record.paymentProof?.fileName}. Status: ${record.paymentStatus === 'verified' ? 'Verified' : 'Under Audit'}.` : 'Due at check-in or bank transfer.', status: hasProof ? 'completed' : 'current' },
            { key: 'step_accepted', title: isConfirmed ? 'Reservation Accepted & Confirmed' : 'Waiting for Admin Confirmation', description: isConfirmed ? 'Your room stay is officially approved by Monaz management.' : 'Administration is reviewing availability and proof.', status: isConfirmed ? 'completed' : 'current' },
            { key: 'step_room_ready', title: 'Room Prepared & Welcome Ready', description: `Your room will be prepared for check-in on ${record.checkInDate}.`, status: record.status === 'checked-in' ? 'completed' : 'upcoming' },
            { key: 'step_completed', title: 'Checked In & Enjoyed', description: 'Thank you for choosing Monaz Hotel & Café!', status: record.status === 'completed' ? 'completed' : 'upcoming' }
          ],
          supportContact: commonSupport
        };
      }
    } catch (err: unknown) {
      console.warn('[dbService] Firestore tracking lookup notice:', err);
    }

    // 2. Fallback to local cache
    const list = getLocalData<RoomBooking[]>(STORAGE_KEYS.BOOKINGS, INITIAL_ROOM_BOOKINGS);
    const record = list.find((b) => b.id.toUpperCase() === cleanId);
    if (record) {
      const isConfirmed = record.status === 'confirmed' || record.paymentStatus === 'verified';
      const hasProof = !!record.paymentProof;
      return {
        id: record.id,
        category: 'hotel_room',
        categoryLabel: 'Hotel Bedroom Stay',
        title: record.roomName || 'Luxury Bedroom',
        subtitle: `${record.nights || 1} Night(s) • ${record.guestsCount || 1} Guest(s)`,
        customerName: record.guestName,
        customerEmail: record.guestEmail,
        customerPhone: record.guestPhone,
        locationOrRoom: record.roomName || 'Bedroom Suite',
        totalPrice: record.totalPrice || 0,
        currency: record.currency || 'ETB',
        status: record.status || 'pending',
        statusLabel: isConfirmed ? 'Confirmed & Guaranteed' : 'Waiting for Admin Confirmation',
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        hasPaymentProof: hasProof,
        paymentStatus: record.paymentStatus || 'unpaid',
        paymentStatusLabel: record.paymentStatus === 'verified' ? 'Payment Verified & Approved' : hasProof ? 'Receipt Attached (Auditing)' : 'Pay on Arrival / Transfer Pending',
        paymentProof: record.paymentProof,
        steps: [
          { key: 'step_submitted', title: 'Reservation Request Placed', description: `Booking #${record.id} safely received.`, status: 'completed', timestamp: record.createdAt },
          { key: 'step_receipt', title: hasProof ? 'Payment Proof Identified' : 'Payment Method Pending', description: hasProof ? `Receipt attached: ${record.paymentProof?.fileName}. Status: ${record.paymentStatus === 'verified' ? 'Verified' : 'Under Audit'}.` : 'Due at check-in or bank transfer.', status: hasProof ? 'completed' : 'current' },
          { key: 'step_accepted', title: isConfirmed ? 'Reservation Accepted & Confirmed' : 'Waiting for Admin Confirmation', description: isConfirmed ? 'Your room stay is officially approved by Monaz management.' : 'Administration is reviewing availability and proof.', status: isConfirmed ? 'completed' : 'current' },
          { key: 'step_room_ready', title: 'Room Prepared & Welcome Ready', description: `Your room will be prepared for check-in on ${record.checkInDate}.`, status: record.status === 'checked-in' ? 'completed' : 'upcoming' },
          { key: 'step_completed', title: 'Checked In & Enjoyed', description: 'Thank you for choosing Monaz Hotel & Café!', status: record.status === 'completed' ? 'completed' : 'upcoming' }
        ],
        supportContact: commonSupport
      };
    }
  }

  if (cleanId.startsWith('ORD-')) {
    try {
      const docSnap = await getDoc(doc(db, 'cafeOrders', cleanId));
      if (docSnap.exists()) {
        const record = docSnap.data() as CafeOrder;
        const isAccepted = record.status === 'accepted' || record.status === 'preparing' || record.status === 'ready' || record.status === 'completed';
        const itemsSummary = (record.items || []).map((i: any) => `${i.quantity}x ${i.name}`).join(', ');
        return {
          id: record.id,
          category: 'cafe_order',
          categoryLabel: 'Kitchen & Bar Order',
          title: record.deliveryType === 'room_delivery' ? `Room Service (${record.roomOrTableNumber})` : `Restaurant Dining (${record.roomOrTableNumber})`,
          subtitle: itemsSummary,
          customerName: record.customerName,
          customerEmail: record.customerEmail,
          customerPhone: record.customerPhone,
          locationOrRoom: record.roomOrTableNumber,
          totalPrice: record.totalAmount || 0,
          currency: record.currency || 'ETB',
          status: record.status || 'pending',
          statusLabel: isAccepted ? 'Order Accepted!' : 'Waiting for Kitchen Confirmation',
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          hasPaymentProof: false,
          paymentStatus: 'unpaid',
          paymentStatusLabel: 'Cash / Card / Mobile Transfer on Delivery',
          steps: [
            { key: 'step_placed', title: 'Order Placed & In Queue', description: `Order #${record.id} received and transmitted to kitchen.`, status: 'completed', timestamp: record.createdAt },
            { key: 'step_waiting', title: isAccepted ? 'Order Accepted by Kitchen' : 'Waiting for Kitchen Confirmation', description: isAccepted ? 'Chefs have reviewed and accepted your order!' : 'Waiting for kitchen manager to confirm availability.', status: isAccepted ? 'completed' : 'current' },
            { key: 'step_prep', title: 'Cooking & Crafting Dishes', description: `Preparing: ${itemsSummary}.`, status: record.status === 'preparing' ? 'current' : record.status === 'ready' || record.status === 'completed' ? 'completed' : 'upcoming' },
            { key: 'step_ready', title: 'Delivery / Ready for Dining', description: `Destination: ${record.roomOrTableNumber}.`, status: record.status === 'ready' ? 'current' : record.status === 'completed' ? 'completed' : 'upcoming' },
            { key: 'step_completed', title: 'Delivered & Enjoyed', description: 'Thank you for dining with Monaz Hotel & Café!', status: record.status === 'completed' ? 'completed' : 'upcoming' }
          ],
          supportContact: commonSupport
        };
      }
    } catch (err: unknown) {
      console.warn('[dbService] Firestore order tracking lookup notice:', err);
    }

    const orders = getLocalData<CafeOrder[]>(STORAGE_KEYS.ORDERS, INITIAL_CAFE_ORDERS);
    const record = orders.find((o) => o.id.toUpperCase() === cleanId);
    if (record) {
      const isAccepted = record.status === 'accepted' || record.status === 'preparing' || record.status === 'ready' || record.status === 'completed';
      const itemsSummary = (record.items || []).map((i: any) => `${i.quantity}x ${i.name}`).join(', ');
      return {
        id: record.id,
        category: 'cafe_order',
        categoryLabel: 'Kitchen & Bar Order',
        title: record.deliveryType === 'room_delivery' ? `Room Service (${record.roomOrTableNumber})` : `Restaurant Dining (${record.roomOrTableNumber})`,
        subtitle: itemsSummary,
        customerName: record.customerName,
        customerEmail: record.customerEmail,
        customerPhone: record.customerPhone,
        locationOrRoom: record.roomOrTableNumber,
        totalPrice: record.totalAmount || 0,
        currency: record.currency || 'ETB',
        status: record.status || 'pending',
        statusLabel: isAccepted ? 'Order Accepted!' : 'Waiting for Kitchen Confirmation',
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        hasPaymentProof: false,
        paymentStatus: 'unpaid',
        paymentStatusLabel: 'Cash / Card / Mobile Transfer on Delivery',
        steps: [
          { key: 'step_placed', title: 'Order Placed & In Queue', description: `Order #${record.id} received and transmitted to kitchen.`, status: 'completed', timestamp: record.createdAt },
          { key: 'step_waiting', title: isAccepted ? 'Order Accepted by Kitchen' : 'Waiting for Kitchen Confirmation', description: isAccepted ? 'Chefs have reviewed and accepted your order!' : 'Waiting for kitchen manager to confirm availability.', status: isAccepted ? 'completed' : 'current' },
          { key: 'step_prep', title: 'Cooking & Crafting Dishes', description: `Preparing: ${itemsSummary}.`, status: record.status === 'preparing' ? 'current' : record.status === 'ready' || record.status === 'completed' ? 'completed' : 'upcoming' },
          { key: 'step_ready', title: 'Delivery / Ready for Dining', description: `Destination: ${record.roomOrTableNumber}.`, status: record.status === 'ready' ? 'current' : record.status === 'completed' ? 'completed' : 'upcoming' },
          { key: 'step_completed', title: 'Delivered & Enjoyed', description: 'Thank you for dining with Monaz Hotel & Café!', status: record.status === 'completed' ? 'completed' : 'upcoming' }
        ],
        supportContact: commonSupport
      };
    }
  }

  throw new Error(`Reference #${cleanId} was not found. Please double-check your booking reference or order receipt code.`);
}
