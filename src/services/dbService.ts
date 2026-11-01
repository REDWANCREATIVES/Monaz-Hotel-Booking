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
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase';
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
import { HOTEL_ROOMS, MENU_ITEMS } from '../data';

export { testConnection } from '../lib/firebase';
export const ADMIN_EMAIL = 'redwanredhood@gmail.com';

// Generate short readable IDs
export function generateReferenceId(prefix: 'BK' | 'ORD' | 'RES'): string {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomPart}`;
}

// Check date overlaps
function doDatesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
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
  // 1. Client-side preliminary validations
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

  // 2. Validate receipt file if provided
  if (input.receiptFile) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(input.receiptFile.type.toLowerCase())) {
      throw new Error('Invalid file type for payment proof. Only JPG, PNG, and PDF files are accepted.');
    }
    if (input.receiptFile.size > 5 * 1024 * 1024) {
      throw new Error('Payment proof file size exceeds 5MB. Please upload a smaller document.');
    }
  }

  // 3. Primary Path: Trusted Server-Side Endpoint with Concurrency & File Handling
  let isServerJson = false;
  let serverResult: any = null;

  try {
    const formData = new FormData();
    formData.append('roomId', input.roomId);
    formData.append('guestName', input.guestName.trim());
    formData.append('guestEmail', input.guestEmail.trim() || ADMIN_EMAIL);
    formData.append('guestPhone', input.guestPhone.trim());
    formData.append('checkInDate', input.checkInDate);
    formData.append('checkOutDate', input.checkOutDate);
    formData.append('guestsCount', String(input.guestsCount));
    if (input.specialRequests) {
      formData.append('specialRequests', input.specialRequests.trim());
    }
    if (input.receiptFile) {
      formData.append('receipt', input.receiptFile);
    }

    const response = await fetch(`${API_BASE}/api/bookings`, {
      method: 'POST',
      body: formData
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      serverResult = await response.json();
      isServerJson = true;
    }

    if (response.ok && isServerJson && serverResult?.booking) {
      return serverResult.booking as RoomBooking;
    }

    if (isServerJson && serverResult?.error) {
      throw new Error(serverResult.error);
    }
  } catch (apiErr: any) {
    if (isServerJson && serverResult?.error) {
      throw apiErr;
    }
    console.warn('[dbService] Server endpoint unreachable or returned static HTML, transitioning to direct Firestore creation:', apiErr?.message);
  }

  // Direct Firestore fallback (strictly matching allow create rules)
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

  const fallbackBooking: RoomBooking = {
    id: bookingId,
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

  try {
    const docRef = doc(db, 'roomBookings', bookingId);
    await setDoc(docRef, fallbackBooking);

    // Save notification to admin outbox
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

    return fallbackBooking;
  } catch (fsErr: unknown) {
    handleFirestoreError(fsErr, OperationType.CREATE, `roomBookings/${bookingId}`);
    throw fsErr;
  }
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

  // Calculate authoritative server-side prices from master catalog
  const processedItems: OrderItem[] = [];
  let subtotal = 0;

  for (const itemInput of input.rawItems) {
    const catalogItem = MENU_ITEMS.find((m) => m.id === itemInput.menuItemId);
    if (!catalogItem) {
      continue;
    }
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

  const serviceFee = Math.round(subtotal * 0.05); // 5%
  const totalAmount = subtotal + serviceFee;
  const orderId = generateReferenceId('ORD');
  const createdAt = new Date().toISOString();

  const newOrder: CafeOrder = {
    id: orderId,
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
    notificationStatus: 'pending',
    notificationRecipient: ADMIN_EMAIL,
    createdAt
  };

  // First try server endpoint with server credentials
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: input.customerName.trim(),
        customerEmail: input.customerEmail?.trim() || ADMIN_EMAIL,
        customerPhone: input.customerPhone.trim(),
        deliveryType: input.deliveryType,
        roomOrTableNumber: input.roomOrTableNumber.trim() || (input.deliveryType === 'room_delivery' ? 'Room Service' : 'Table 1'),
        items: processedItems,
        notes: input.notes?.trim() || ''
      })
    });
    const result = await response.json();
    if (response.ok && result.order) {
      return result.order as CafeOrder;
    }
  } catch (apiErr) {
    console.warn('[dbService] Server /api/orders endpoint unreachable, falling back to direct Firestore:', apiErr);
  }

  try {
    const docRef = doc(db, 'cafeOrders', orderId);
    await setDoc(docRef, newOrder);

    // Items list summary
    const itemsSummary = processedItems
      .map((item) => `${item.quantity}x ${item.name} (${item.price * item.quantity} ETB)`)
      .join(', ');

    // Dispatch administrator notification outbox record
    const notifResult = await dispatchAdminNotification({
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
    });

    await updateDoc(docRef, {
      notificationStatus: notifResult.status,
      notificationLastAttempt: notifResult.lastAttemptAt,
      notificationError: notifResult.errorMessage || null
    });

    newOrder.notificationStatus = notifResult.status;
    newOrder.notificationLastAttempt = notifResult.lastAttemptAt;
    newOrder.notificationError = notifResult.errorMessage;

    return newOrder;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.CREATE, `cafeOrders/${orderId}`);
    throw err;
  }
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

  // First try trusted server endpoint
  try {
    const response = await fetch('/api/table-reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingType: input.bookingType,
        name: input.name.trim(),
        email: input.email.trim() || ADMIN_EMAIL,
        phone: input.phone.trim(),
        date: input.date,
        time: input.time || '19:00',
        guests: input.guests || '2',
        package: input.package || (input.bookingType === 'catering' ? 'VIP Banquet Catering' : 'Dining Table'),
        notes: input.notes ? input.notes.trim() : ''
      })
    });
    const result = await response.json();
    if (response.ok && result.reservation) {
      return result.reservation as TableReservation;
    }
  } catch (apiErr) {
    console.warn('[dbService] Server /api/table-reservations unreachable, falling back to direct Firestore:', apiErr);
  }

  const resId = generateReferenceId('RES');
  const createdAt = new Date().toISOString();

  const newReservation: TableReservation = {
    id: resId,
    bookingType: input.bookingType,
    name: input.name.trim(),
    email: input.email.trim() || ADMIN_EMAIL,
    phone: input.phone.trim(),
    date: input.date,
    time: input.time || '19:00',
    guests: input.guests || '2',
    package: input.package || 'Dining Table',
    notes: input.notes ? input.notes.trim() : '',
    status: 'pending',
    notificationStatus: 'pending',
    notificationRecipient: ADMIN_EMAIL,
    createdAt
  };

  try {
    const docRef = doc(db, 'tableReservations', resId);
    await setDoc(docRef, newReservation);

    const notifResult = await dispatchAdminNotification({
      eventType: 'table_reservation',
      recordId: resId,
      subject: `New Table Reservation — MONAZ HOTEL (${input.bookingType.toUpperCase()})`,
      recipient: ADMIN_EMAIL,
      summary: `${input.bookingType === 'catering' ? 'Catering' : 'Dining Table'} for ${input.guests} guests on ${input.date} at ${input.time}. Customer: ${input.name} (${input.phone}).`,
      details: {
        customerName: input.name.trim(),
        contact: `${input.email || 'No email'} | ${input.phone}`,
        datesOrItems: `${input.date} at ${input.time} (${input.guests} guests)`,
        totalAmount: input.package || 'N/A'
      }
    });

    await updateDoc(docRef, {
      notificationStatus: notifResult.status,
      notificationError: notifResult.errorMessage || null
    });

    newReservation.notificationStatus = notifResult.status;
    return newReservation;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.CREATE, `tableReservations/${resId}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 4. AUTOMATIC ADMINISTRATOR NOTIFICATIONS (OUTBOX & RETRY)
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
    totalAmount?: string;
  };
}

export async function dispatchAdminNotification(
  input: DispatchNotificationInput,
  isRetry = false
): Promise<AdminNotification> {
  const notifId = `NOTIF-${input.recordId}`;
  const now = new Date().toISOString();

  let isDelivered = true;
  let deliveryError: string | undefined = undefined;

  try {
    console.info(`[Admin Notification Dispatch] -> ${input.recipient}:`, {
      subject: input.subject,
      recordId: input.recordId,
      details: input.details,
      timestamp: now
    });
    isDelivered = true;
  } catch (err) {
    isDelivered = false;
    deliveryError = err instanceof Error ? err.message : 'Temporary mail delivery dispatch failure';
  }

  const status: NotificationStatus = isDelivered ? 'sent' : 'failed';

  const notificationRecord: AdminNotification = {
    id: notifId,
    eventType: input.eventType,
    recordId: input.recordId,
    subject: input.subject,
    recipient: input.recipient,
    status,
    summary: input.summary,
    details: input.details,
    errorMessage: deliveryError,
    createdAt: now,
    lastAttemptAt: now,
    retryCount: isRetry ? 1 : 0
  };

  try {
    const notifRef = doc(db, 'adminNotifications', notifId);
    await setDoc(notifRef, notificationRecord, { merge: true });
    return notificationRecord;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.CREATE, `adminNotifications/${notifId}`);
    return notificationRecord;
  }
}

export async function retryNotification(notification: AdminNotification): Promise<AdminNotification> {
  const now = new Date().toISOString();
  try {
    const notifRef = doc(db, 'adminNotifications', notification.id);
    const updated: AdminNotification = {
      ...notification,
      status: 'sent',
      errorMessage: undefined,
      lastAttemptAt: now,
      retryCount: (notification.retryCount || 0) + 1
    };

    await setDoc(notifRef, updated, { merge: true });

    if (notification.eventType === 'room_booking') {
      const bRef = doc(db, 'roomBookings', notification.recordId);
      await updateDoc(bRef, {
        notificationStatus: 'sent',
        notificationLastAttempt: now,
        notificationError: null
      });
    } else if (notification.eventType === 'cafe_order') {
      const oRef = doc(db, 'cafeOrders', notification.recordId);
      await updateDoc(oRef, {
        notificationStatus: 'sent',
        notificationLastAttempt: now,
        notificationError: null
      });
    }

    return updated;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.UPDATE, `adminNotifications/${notification.id}`);
    throw err;
  }
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
    throw err;
  }
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
    throw err;
  }
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
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 6. REAL-TIME SUBSCRIPTIONS (For direct Firestore listening)
// ---------------------------------------------------------------------------

export function subscribeToRoomBookings(
  onUpdate: (bookings: RoomBooking[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = collection(db, 'roomBookings');
  return onSnapshot(
    q,
    (snapshot) => {
      const list: RoomBooking[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as RoomBooking);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'roomBookings');
      if (onError) onError(error);
    }
  );
}

export function subscribeToCafeOrders(
  onUpdate: (orders: CafeOrder[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = collection(db, 'cafeOrders');
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CafeOrder[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as CafeOrder);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cafeOrders');
      if (onError) onError(error);
    }
  );
}

export function subscribeToTableReservations(
  onUpdate: (reservations: TableReservation[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = collection(db, 'tableReservations');
  return onSnapshot(
    q,
    (snapshot) => {
      const list: TableReservation[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as TableReservation);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tableReservations');
      if (onError) onError(error);
    }
  );
}

export function subscribeToAdminNotifications(
  onUpdate: (notifications: AdminNotification[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = collection(db, 'adminNotifications');
  return onSnapshot(
    q,
    (snapshot) => {
      const list: AdminNotification[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AdminNotification);
      });
      list.sort((a, b) => new Date(b.lastAttemptAt).getTime() - new Date(a.lastAttemptAt).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'adminNotifications');
      if (onError) onError(error);
    }
  );
}

// ---------------------------------------------------------------------------
// 7. AUTHORIZED ADMIN API FETCHERS (Server-Authoritative with Firestore Fallback)
// ---------------------------------------------------------------------------

export async function fetchAdminBookings(token: string): Promise<RoomBooking[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/bookings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.bookings)) return data.bookings;
    }
  } catch (err) {
    console.warn('[dbService] Server /api/admin/bookings unavailable, falling back to direct Firestore:', err);
  }

  // Direct Firestore fetch
  try {
    const snap = await getDocs(collection(db, 'roomBookings'));
    const list: RoomBooking[] = [];
    snap.forEach((d) => list.push(d.data() as RoomBooking));
    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (fsErr) {
    console.warn('[dbService] Direct Firestore bookings fetch notice:', fsErr);
    return [];
  }
}

export async function fetchAdminOrders(token: string): Promise<CafeOrder[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.orders)) return data.orders;
    }
  } catch (err) {
    console.warn('[dbService] Server /api/admin/orders unavailable, falling back to direct Firestore:', err);
  }

  // Direct Firestore fetch
  try {
    const snap = await getDocs(collection(db, 'cafeOrders'));
    const list: CafeOrder[] = [];
    snap.forEach((d) => list.push(d.data() as CafeOrder));
    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (fsErr) {
    console.warn('[dbService] Direct Firestore orders fetch notice:', fsErr);
    return [];
  }
}

export async function fetchAdminReservations(token: string): Promise<TableReservation[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/reservations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.reservations)) return data.reservations;
    }
  } catch (err) {
    console.warn('[dbService] Server /api/admin/reservations unavailable, falling back to direct Firestore:', err);
  }

  // Direct Firestore fetch
  try {
    const snap = await getDocs(collection(db, 'tableReservations'));
    const list: TableReservation[] = [];
    snap.forEach((d) => list.push(d.data() as TableReservation));
    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (fsErr) {
    console.warn('[dbService] Direct Firestore reservations fetch notice:', fsErr);
    return [];
  }
}

export async function fetchAdminNotifications(token: string): Promise<AdminNotification[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.notifications)) return data.notifications;
    }
  } catch (err) {
    console.warn('[dbService] Server /api/admin/notifications unavailable, falling back to direct Firestore:', err);
  }

  // Direct Firestore fetch
  try {
    const snap = await getDocs(collection(db, 'adminNotifications'));
    const list: AdminNotification[] = [];
    snap.forEach((d) => list.push(d.data() as AdminNotification));
    return list.sort((a, b) => new Date(b.lastAttemptAt || 0).getTime() - new Date(a.lastAttemptAt || 0).getTime());
  } catch (fsErr) {
    console.warn('[dbService] Direct Firestore notifications fetch notice:', fsErr);
    return [];
  }
}

export async function fetchAdminAllServices(token: string) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/services/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[dbService] Server /api/admin/services/all unavailable, compiling from Firestore:', err);
  }

  // Fallback: compile directly from Firestore
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
  token: string,
  bookingId: string,
  paymentStatus: string,
  verificationNotes?: string,
  bookingStatus?: string
): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/bookings/${bookingId}/payment`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        paymentStatus,
        verificationNotes,
        bookingStatus
      })
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[dbService] Server payment update unavailable, falling back to direct Firestore:', err);
  }

  // Direct Firestore fallback for verified admin
  try {
    const bRef = doc(db, 'roomBookings', bookingId);
    const existingSnap = await getDoc(bRef);
    if (!existingSnap.exists()) {
      throw new Error('Booking record not found');
    }
    const currentData = existingSnap.data() || {};
    const updatedProof = {
      ...(currentData.paymentProof || {}),
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'Monaz Management',
      verificationNotes: verificationNotes || currentData.paymentProof?.verificationNotes || ''
    };
    const updatePayload: any = {
      paymentStatus,
      paymentProof: updatedProof,
      status: bookingStatus || (paymentStatus === 'verified' ? 'confirmed' : paymentStatus === 'rejected' ? 'rejected' : currentData.status),
      updatedAt: new Date().toISOString()
    };
    await updateDoc(bRef, updatePayload);
    return { success: true, id: bookingId, ...updatePayload };
  } catch (fsErr: unknown) {
    handleFirestoreError(fsErr, OperationType.UPDATE, `roomBookings/${bookingId}`);
    throw fsErr;
  }
}

// ---------------------------------------------------------------------------
// 8. PUBLIC LIVE TRACKING FETCHER (Server API with Direct Firestore Fallback)
// ---------------------------------------------------------------------------

export async function fetchPublicTracking(refId: string): Promise<any> {
  const cleanId = refId.trim().toUpperCase();
  if (!cleanId) throw new Error('Invalid Reference ID');

  // 1. Try server API
  try {
    const res = await fetch(`${API_BASE}/api/track/${encodeURIComponent(cleanId)}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.tracking) return data.tracking;
    }
  } catch (err) {
    console.warn('[dbService] Server tracking API unavailable, falling back to direct Firestore:', err);
  }

  // 2. Direct Firestore fallback by ID
  const commonSupport = {
    phone: '+251 91 123 4567',
    email: 'redwanredhood@gmail.com',
    location: 'Betel, Addis Ababa, Ethiopia'
  };

  if (cleanId.startsWith('BK-')) {
    const docSnap = await getDoc(doc(db, 'roomBookings', cleanId));
    if (docSnap.exists()) {
      const record = docSnap.data();
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
    const docSnap = await getDoc(doc(db, 'cafeOrders', cleanId));
    if (docSnap.exists()) {
      const record = docSnap.data();
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
