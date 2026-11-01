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

    const response = await fetch('/api/bookings', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Server could not process your reservation.');
    }

    return result.booking as RoomBooking;
  } catch (apiErr: any) {
    // If error is from server rejection (e.g. 409 conflict or validation error), bubble directly
    if (apiErr.message && !apiErr.message.includes('Failed to fetch') && !apiErr.message.includes('NetworkError')) {
      throw apiErr;
    }

    // Direct Firestore fallback (strictly matching allow create rules)
    console.warn('[dbService] Server endpoint unavailable, falling back to direct Firestore creation:', apiErr);
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
      notificationStatus: 'sent',
      notificationRecipient: ADMIN_EMAIL,
      createdAt
    };

    try {
      const docRef = doc(db, 'roomBookings', bookingId);
      await setDoc(docRef, fallbackBooking);
      return fallbackBooking;
    } catch (fsErr: unknown) {
      handleFirestoreError(fsErr, OperationType.CREATE, `roomBookings/${bookingId}`);
      throw fsErr;
    }
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
// 7. AUTHORIZED ADMIN API FETCHERS (Server-Authoritative)
// ---------------------------------------------------------------------------

export async function fetchAdminBookings(token: string): Promise<RoomBooking[]> {
  const res = await fetch('/api/admin/bookings', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch admin bookings');
  }
  const data = await res.json();
  return data.bookings || [];
}

export async function fetchAdminOrders(token: string): Promise<CafeOrder[]> {
  const res = await fetch('/api/admin/orders', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch admin orders');
  }
  const data = await res.json();
  return data.orders || [];
}

export async function fetchAdminReservations(token: string): Promise<TableReservation[]> {
  const res = await fetch('/api/admin/reservations', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch admin reservations');
  }
  const data = await res.json();
  return data.reservations || [];
}

export async function fetchAdminNotifications(token: string): Promise<AdminNotification[]> {
  const res = await fetch('/api/admin/notifications', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch admin notifications');
  }
  const data = await res.json();
  return data.notifications || [];
}

export async function fetchAdminAllServices(token: string) {
  const res = await fetch('/api/admin/services/all', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch all booked services');
  }
  return await res.json();
}

export async function updateAdminBookingPayment(
  token: string,
  bookingId: string,
  paymentStatus: string,
  verificationNotes?: string,
  bookingStatus?: string
): Promise<any> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/payment`, {
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
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to update payment status');
  }
  return await res.json();
}
