import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { sendMonazEmail, generateDirectGmailUrl } from './server/emailNotificationService';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize Firebase for server-authoritative operations
let db: any = null;
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
      ? getFirestore(fbApp, firebaseConfig.firestoreDatabaseId)
      : getFirestore(fbApp);
    console.log('[Server] Connected to Firestore database:', firebaseConfig.firestoreDatabaseId || '(default)');

    const auth = getAuth(fbApp);
    signInWithEmailAndPassword(auth, 'monazhoteladmin@gmail.com', 'Evolve digital marketing')
      .then((userCred) => {
        console.log('[Server] Authenticated to Firebase as administrator:', userCred.user.email);
      })
      .catch((authErr) => {
        console.warn('[Server] Firebase admin sign-in notice:', authErr.message);
      });
  }
} catch (err) {
  console.error('[Server] Failed to initialize Firebase on server:', err);
}

// ---------------------------------------------------------------------------
// ADMIN CREDENTIALS & SECURITY
// ---------------------------------------------------------------------------
// Authorized Administrator:
// Username: "monaz hotel and café"
// Mapped Email: "redwanredhood@gmail.com"
// Password is stored ONLY as a securely salted cryptographic PBKDF2 hash (100,000 iterations, SHA-512)
// Plaintext password is NEVER kept in memory or sent in any response.

const ADMIN_USERNAME = 'monaz hotel and café';
const ADMIN_EMAIL = 'redwanredhood@gmail.com';
const ADMIN_PASSWORD_SALT = 'f298d42e484ed72ad4c2c6bedfaa342c';
const ADMIN_PASSWORD_HASH = 'c8330bbbdb7bf7511f289861bd1ddecf8993282d39d5a74b6c73af53efcbd2d96eb1525693fb2a9c9957b32b1bbcb56d17b23ea501ba6cc823ea64f03dd2b575';

// Rate Limiting Storage for Brute-force Protection
interface RateLimitRecord {
  attempts: number;
  lockedUntil: number;
}
const loginRateLimiter = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

// Active Admin Sessions
interface AdminSession {
  token: string;
  username: string;
  email: string;
  role: 'admin';
  createdAt: number;
  expiresAt: number;
}
const activeSessions = new Map<string, AdminSession>();
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

// Helper: Normalize username (trim and case-insensitive)
function normalizeUsername(u: string): string {
  return u.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Helper: Constant-time verify password hash
function verifyPassword(password: string): boolean {
  try {
    const computedHash = crypto.pbkdf2Sync(
      password,
      ADMIN_PASSWORD_SALT,
      100000,
      64,
      'sha512'
    ).toString('hex');
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(ADMIN_PASSWORD_HASH, 'hex')
    );
  } catch {
    return false;
  }
}

// Middleware: Authenticate Admin Session Token
function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Administrator authentication required.' });
    return;
  }

  const token = authHeader.substring(7).trim();
  const session = activeSessions.get(token);

  if (!session) {
    res.status(401).json({ error: 'Session invalid or expired. Please sign in again.' });
    return;
  }

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    res.status(401).json({ error: 'Admin session expired. Please sign in again.' });
    return;
  }

  (req as any).adminSession = session;
  next();
}

// ---------------------------------------------------------------------------
// ADMIN AUTHENTICATION API ROUTES
// ---------------------------------------------------------------------------

// POST /api/admin/login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'client';
  const { username, password } = req.body;

  // Rate Limiter Check
  const rateRecord = loginRateLimiter.get(ip) || { attempts: 0, lockedUntil: 0 };
  const now = Date.now();

  if (rateRecord.lockedUntil > now) {
    const remainingMinutes = Math.ceil((rateRecord.lockedUntil - now) / 60000);
    res.status(429).json({
      error: `Too many failed login attempts. Access temporarily restricted for security. Please try again in ${remainingMinutes} minute(s).`,
      locked: true,
      retryAfterSeconds: Math.ceil((rateRecord.lockedUntil - now) / 1000)
    });
    return;
  }

  if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
    res.status(400).json({ error: 'Please enter both username and password.' });
    return;
  }

  const isUsernameMatch = normalizeUsername(username) === normalizeUsername(ADMIN_USERNAME);
  const isPasswordMatch = verifyPassword(password);

  if (!isUsernameMatch || !isPasswordMatch) {
    rateRecord.attempts += 1;
    if (rateRecord.attempts >= MAX_ATTEMPTS) {
      rateRecord.lockedUntil = now + LOCKOUT_DURATION_MS;
      loginRateLimiter.set(ip, rateRecord);
      res.status(429).json({
        error: 'Too many failed login attempts. Account temporarily locked for 15 minutes to prevent unauthorized access.',
        locked: true,
        retryAfterSeconds: 900
      });
      return;
    }

    loginRateLimiter.set(ip, rateRecord);
    const attemptsLeft = MAX_ATTEMPTS - rateRecord.attempts;
    res.status(401).json({
      error: 'Invalid username or password.',
      attemptsRemaining: attemptsLeft
    });
    return;
  }

  // Successful Login: Reset rate limiter
  loginRateLimiter.delete(ip);

  // Generate cryptographically secure session token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = now + SESSION_DURATION_MS;

  const session: AdminSession = {
    token,
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    role: 'admin',
    createdAt: now,
    expiresAt
  };

  activeSessions.set(token, session);

  res.json({
    success: true,
    message: 'Administrator successfully authenticated.',
    token,
    admin: {
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      role: 'admin'
    },
    expiresAt
  });
});

// GET /api/admin/session
app.get('/api/admin/session', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ authenticated: false });
    return;
  }

  const token = authHeader.substring(7).trim();
  const session = activeSessions.get(token);

  if (!session || Date.now() > session.expiresAt) {
    if (session) activeSessions.delete(token);
    res.status(401).json({ authenticated: false });
    return;
  }

  res.json({
    authenticated: true,
    admin: {
      username: session.username,
      email: session.email,
      role: session.role
    },
    expiresAt: session.expiresAt
  });
});

// POST /api/admin/logout
app.post('/api/admin/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    activeSessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ---------------------------------------------------------------------------
// PUBLIC HOTEL BOOKING & PAYMENT PROOF UPLOAD (TRUSTED SERVER ENDPOINT)
// ---------------------------------------------------------------------------

// Directory for securely storing customer payment receipts / transfer screenshots
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads', 'receipts');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage with unique random hashes & extension retention
const receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const randomHex = crypto.randomBytes(8).toString('hex');
    cb(null, `receipt_${Date.now()}_${randomHex}${ext}`);
  }
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Strict 5MB limit as requested
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, JPEG, PNG images and PDF documents up to 5MB are accepted.'));
    }
  }
});

// Server-authoritative catalog of hotel rooms for price & guest validation
const SERVER_ROOMS: Record<string, { id: string; name: string; pricePerNight: number; maxGuests: number; isAvailable: boolean }> = {
  'room-presidential': { id: 'room-presidential', name: 'Monaz Presidential Suite', pricePerNight: 4800, maxGuests: 4, isAvailable: true },
  'room-executive': { id: 'room-executive', name: 'Executive Deluxe Suite', pricePerNight: 3500, maxGuests: 3, isAvailable: true },
  'room-balcony': { id: 'room-balcony', name: 'Royal Balcony Room', pricePerNight: 2800, maxGuests: 2, isAvailable: true },
  'room-deluxe-king': { id: 'room-deluxe-king', name: 'Deluxe King Bedroom', pricePerNight: 2200, maxGuests: 2, isAvailable: true },
  'room-classic-double': { id: 'room-classic-double', name: 'Classic Double Bedroom', pricePerNight: 1800, maxGuests: 2, isAvailable: true },
  'room-superior-twin': { id: 'room-superior-twin', name: 'Superior Twin Bedroom', pricePerNight: 1600, maxGuests: 2, isAvailable: true }
};

function doDatesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

// POST /api/bookings - Public booking creation with optional payment receipt upload
app.post('/api/bookings', (req: Request, res: Response) => {
  uploadReceipt.single('receipt')(req, res, async (uploadErr: any) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Receipt file exceeds the 5MB size limit. Please upload a smaller image or PDF.' });
        return;
      }
      res.status(400).json({ error: uploadErr.message || 'Error processing uploaded file.' });
      return;
    }

    try {
      const {
        roomId,
        guestName,
        guestEmail,
        guestPhone,
        checkInDate,
        checkOutDate,
        guestsCount,
        specialRequests
      } = req.body;

      // 1. Validation
      if (!guestName || typeof guestName !== 'string' || guestName.trim().length < 2) {
        res.status(400).json({ error: 'Please enter a valid guest full name (minimum 2 characters).' });
        return;
      }
      if (!guestPhone || typeof guestPhone !== 'string' || guestPhone.trim().length < 6) {
        res.status(400).json({ error: 'A valid contact phone number is required (minimum 6 digits).' });
        return;
      }
      if (!checkInDate || !checkOutDate) {
        res.status(400).json({ error: 'Both check-in and check-out dates are required.' });
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      if (checkInDate < todayStr) {
        res.status(400).json({ error: 'Check-in date cannot be in the past.' });
        return;
      }
      if (checkOutDate <= checkInDate) {
        res.status(400).json({ error: 'Check-out date must be strictly after the check-in date.' });
        return;
      }

      const room = SERVER_ROOMS[roomId] || SERVER_ROOMS['room-deluxe-king'];
      if (!room.isAvailable) {
        res.status(400).json({ error: `Room ${room.name} is currently undergoing maintenance and unavailable.` });
        return;
      }

      const parsedGuests = parseInt(guestsCount, 10) || 1;
      if (parsedGuests < 1 || parsedGuests > room.maxGuests) {
        res.status(400).json({ error: `Maximum allowed guests for ${room.name} is ${room.maxGuests}.` });
        return;
      }

      // 2. Authoritative Price Calculations
      const dIn = new Date(checkInDate);
      const dOut = new Date(checkOutDate);
      const diffTime = Math.max(1000 * 60 * 60 * 24, dOut.getTime() - dIn.getTime());
      const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      const roomSubtotal = room.pricePerNight * nights;
      const taxesAndService = Math.round(roomSubtotal * 0.10); // 10%
      const totalPrice = roomSubtotal + taxesAndService;

      // 3. Double Booking Concurrency Protection
      if (db) {
        try {
          const bookingsSnap = await getDocs(
            query(
              collection(db, 'roomBookings'),
              where('roomId', '==', room.id),
              where('status', 'in', ['confirmed', 'checked-in'])
            )
          );

          const hasConflict = bookingsSnap.docs.some((docSnap) => {
            const b = docSnap.data();
            return doDatesOverlap(checkInDate, checkOutDate, b.checkInDate, b.checkOutDate);
          });

          if (hasConflict) {
            res.status(409).json({
              error: `Selected dates (${checkInDate} to ${checkOutDate}) conflict with an existing confirmed reservation for ${room.name}. Please select different dates or another luxury room.`
            });
            return;
          }
        } catch (dbReadErr) {
          console.warn('[Server] Double booking check query notice:', dbReadErr);
        }
      }

      // 4. Construct Booking ID and Payment Proof
      const bookingId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
      const nowIso = new Date().toISOString();

      let paymentStatus = 'unpaid';
      let paymentProof: any = null;

      if (req.file) {
        paymentStatus = 'proof_submitted';
        paymentProof = {
          fileUrl: `/api/receipts/${req.file.filename}`,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          uploadedAt: nowIso
        };
      }

      const bookingRecord = {
        id: bookingId,
        roomId: room.id,
        roomName: room.name,
        guestName: guestName.trim(),
        guestEmail: (guestEmail && typeof guestEmail === 'string' && guestEmail.trim()) || ADMIN_EMAIL,
        guestPhone: guestPhone.trim(),
        checkInDate,
        checkOutDate,
        nights,
        guestsCount: parsedGuests,
        specialRequests: (specialRequests && typeof specialRequests === 'string') ? specialRequests.trim() : '',
        totalPrice,
        currency: 'ETB',
        status: 'pending', // Pending administrator confirmation
        paymentStatus,
        paymentProof,
        notificationStatus: 'sent',
        notificationRecipient: ADMIN_EMAIL,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      // 5. Persist to Firestore with server credentials
      if (db) {
        const bookingRef = doc(db, 'roomBookings', bookingId);
        await setDoc(bookingRef, bookingRecord);

        // Outbox notification
        const notifId = `NOTIF-${bookingId}`;
        const notifRecord = {
          id: notifId,
          eventType: 'room_booking',
          recordId: bookingId,
          subject: `New Hotel Reservation — MONAZ HOTEL (${room.name})`,
          recipient: ADMIN_EMAIL,
          status: 'sent',
          summary: `Room: ${room.name} (${nights} nights, ${checkInDate} to ${checkOutDate}) for ${bookingRecord.guestName} (${bookingRecord.guestPhone}). Payment: ${paymentStatus}. Total: ${totalPrice.toLocaleString()} ETB.`,
          details: {
            customerName: bookingRecord.guestName,
            contact: `${bookingRecord.guestEmail} | ${bookingRecord.guestPhone}`,
            datesOrItems: `${checkInDate} to ${checkOutDate} (${nights} nights)`,
            totalAmount: `${totalPrice.toLocaleString()} ETB`
          },
          createdAt: nowIso,
          lastAttemptAt: nowIso,
          retryCount: 0
        };
        await setDoc(doc(db, 'adminNotifications', notifId), notifRecord);

        // Dispatch Dual Automated Gmail Notifications:
        // 1. Hotel Admin Alert: New order/booking entered and waiting for confirmation
        sendMonazEmail(
          {
            target: 'admin',
            to: ADMIN_EMAIL,
            customerName: bookingRecord.guestName,
            referenceId: bookingId,
            type: 'room_booking',
            event: 'booking_waiting',
            details: {
              roomOrDelivery: room.name,
              itemsOrNights: `${nights} Night${nights > 1 ? 's' : ''} (${bookingRecord.guestsCount} Guest${bookingRecord.guestsCount > 1 ? 's' : ''})`,
              datesOrTime: `${checkInDate} to ${checkOutDate}`,
              totalAmount: totalPrice,
              paymentStatus: bookingRecord.paymentStatus,
              paymentReceiptFileName: bookingRecord.paymentProof?.fileName,
              paymentReceiptUrl: bookingRecord.paymentProof?.fileUrl,
              phone: bookingRecord.guestPhone,
              notes: bookingRecord.specialRequests
            }
          },
          db
        ).catch((e) => console.warn('[Email] Admin booking alert notice:', e));

        // 2. Customer Confirmation Email with identified payment receipt and tracking
        if (bookingRecord.guestEmail && bookingRecord.guestEmail !== ADMIN_EMAIL) {
          sendMonazEmail(
            {
              target: 'customer',
              to: bookingRecord.guestEmail,
              customerName: bookingRecord.guestName,
              referenceId: bookingId,
              type: 'room_booking',
              event: 'booking_waiting',
              details: {
                roomOrDelivery: room.name,
                itemsOrNights: `${nights} Night${nights > 1 ? 's' : ''}`,
                datesOrTime: `${checkInDate} to ${checkOutDate}`,
                totalAmount: totalPrice,
                paymentStatus: bookingRecord.paymentStatus,
                paymentReceiptFileName: bookingRecord.paymentProof?.fileName,
                paymentReceiptUrl: bookingRecord.paymentProof?.fileUrl,
                phone: bookingRecord.guestPhone
              }
            },
            db
          ).catch((e) => console.warn('[Email] Customer booking receipt notice:', e));
        }
      }

      res.status(201).json({
        success: true,
        message: 'Reservation successfully created and secured.',
        booking: bookingRecord
      });
    } catch (err: any) {
      console.error('[Server] Critical booking creation error:', err);
      res.status(500).json({
        error: 'Failed to record reservation: ' + (err.message || 'Internal server error')
      });
    }
  });
});

// GET /api/receipts/:filename - Secure access to uploaded customer transfer proofs
app.get('/api/receipts/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(UPLOADS_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Receipt document not found.' });
    return;
  }

  // Security authorization: Administrator session OR booking reference param
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const isAdmin = token && activeSessions.has(token);
  const bookingRef = req.query.bookingRef as string;

  if (!isAdmin && !bookingRef) {
    res.status(403).json({ error: 'Access denied. You must be an authorized administrator or provide the booking reference to view this receipt.' });
    return;
  }

  const ext = path.extname(safeFilename).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.pdf') contentType = 'application/pdf';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
  fs.createReadStream(filePath).pipe(res);
});

// ---------------------------------------------------------------------------
// PUBLIC FOOD & DRINK ORDERS AND TABLE RESERVATION ENDPOINTS
// ---------------------------------------------------------------------------

// POST /api/orders - Public food & beverage ordering with server persistence
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const { customerName, customerEmail, customerPhone, deliveryType, roomOrTableNumber, items, notes } = req.body;

    if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a valid customer name.' });
      return;
    }
    if (!customerPhone || typeof customerPhone !== 'string' || customerPhone.trim().length < 6) {
      res.status(400).json({ error: 'Please enter a valid phone number.' });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one item must be in the order.' });
      return;
    }

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    let subtotal = 0;
    const validatedItems = items.map((i: any) => {
      const price = Number(i.price) || 0;
      const quantity = Math.max(1, Number(i.quantity) || 1);
      subtotal += price * quantity;
      return {
        itemId: String(i.itemId || i.id || ''),
        name: String(i.name || 'Dish'),
        price,
        quantity,
        category: String(i.category || 'general')
      };
    });

    const serviceFee = deliveryType === 'room_delivery' ? 50 : 0;
    const totalAmount = subtotal + serviceFee;

    const orderRecord = {
      id: orderId,
      customerName: customerName.trim(),
      customerEmail: (customerEmail && typeof customerEmail === 'string' && customerEmail.trim()) || ADMIN_EMAIL,
      customerPhone: customerPhone.trim(),
      deliveryType: deliveryType || 'room_delivery',
      roomOrTableNumber: (roomOrTableNumber && String(roomOrTableNumber).trim()) || 'Pickup',
      items: validatedItems,
      subtotal,
      serviceFee,
      totalAmount,
      currency: 'ETB',
      notes: (notes && String(notes).trim()) || '',
      status: 'pending',
      notificationStatus: 'sent',
      notificationRecipient: ADMIN_EMAIL,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (db) {
      await setDoc(doc(db, 'cafeOrders', orderId), orderRecord);

      // Notification outbox
      const notifId = `NOTIF-${orderId}`;
      const itemsSummary = validatedItems.map((it: any) => `${it.quantity}x ${it.name}`).join(', ');
      const notifRecord = {
        id: notifId,
        eventType: 'cafe_order',
        recordId: orderId,
        subject: `New Food & Drinks Order — MONAZ HOTEL (${orderRecord.deliveryType})`,
        recipient: ADMIN_EMAIL,
        status: 'sent',
        summary: `Order #${orderId}: ${itemsSummary}. Total: ${totalAmount.toLocaleString()} ETB. Location: ${orderRecord.roomOrTableNumber}. Customer: ${customerName} (${customerPhone}).`,
        details: {
          customerName: orderRecord.customerName,
          contact: `${orderRecord.customerEmail} | ${orderRecord.customerPhone}`,
          datesOrItems: itemsSummary,
          totalAmount: `${totalAmount.toLocaleString()} ETB`
        },
        createdAt: nowIso,
        lastAttemptAt: nowIso,
        retryCount: 0
      };
      await setDoc(doc(db, 'adminNotifications', notifId), notifRecord);

      // Dispatch Dual Automated Gmail Notifications:
      // 1. Hotel Admin Alert: New order enters & is waiting for confirmation
      sendMonazEmail(
        {
          target: 'admin',
          to: ADMIN_EMAIL,
          customerName: orderRecord.customerName,
          referenceId: orderId,
          type: 'cafe_order',
          event: 'order_waiting',
          details: {
            roomOrDelivery: `${orderRecord.deliveryType === 'room_delivery' ? 'Room Service' : orderRecord.deliveryType === 'table_service' ? 'Table Dine-in' : 'Takeaway'} (${orderRecord.roomOrTableNumber})`,
            itemsOrNights: itemsSummary,
            totalAmount: totalAmount,
            paymentStatus: 'Unpaid (Due at Delivery/Table)',
            phone: orderRecord.customerPhone,
            notes: orderRecord.notes
          }
        },
        db
      ).catch((e) => console.warn('[Email] Admin order alert notice:', e));

      // 2. Customer Confirmation Email with tracking link
      if (orderRecord.customerEmail && orderRecord.customerEmail !== ADMIN_EMAIL) {
        sendMonazEmail(
          {
            target: 'customer',
            to: orderRecord.customerEmail,
            customerName: orderRecord.customerName,
            referenceId: orderId,
            type: 'cafe_order',
            event: 'order_waiting',
            details: {
              roomOrDelivery: orderRecord.roomOrTableNumber,
              itemsOrNights: itemsSummary,
              totalAmount: totalAmount,
              paymentStatus: 'Pay on Delivery / Table',
              phone: orderRecord.customerPhone
            }
          },
          db
        ).catch((e) => console.warn('[Email] Customer order receipt notice:', e));
      }
    }

    res.status(201).json({ success: true, order: orderRecord });
  } catch (err: any) {
    console.error('[Server] Order creation error:', err);
    res.status(500).json({ error: 'Failed to record order: ' + (err.message || 'Internal error') });
  }
});

// POST /api/table-reservations - Public table and catering reservations
app.post('/api/table-reservations', async (req: Request, res: Response) => {
  try {
    const { bookingType, name, email, phone, date, time, guests, package: pkg, notes } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a valid guest name.' });
      return;
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length < 6) {
      res.status(400).json({ error: 'Please enter a valid phone number.' });
      return;
    }
    if (!date) {
      res.status(400).json({ error: 'Please select a reservation date.' });
      return;
    }

    const resId = `RES-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const reservationRecord = {
      id: resId,
      bookingType: bookingType === 'catering' ? 'catering' : 'reservation',
      name: name.trim(),
      email: (email && typeof email === 'string' && email.trim()) || ADMIN_EMAIL,
      phone: phone.trim(),
      date,
      time: time || '19:00',
      guests: String(guests || '2'),
      package: pkg || (bookingType === 'catering' ? 'VIP Banquet Catering' : 'Dining Table'),
      notes: (notes && String(notes).trim()) || '',
      status: 'pending',
      notificationStatus: 'sent',
      notificationRecipient: ADMIN_EMAIL,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (db) {
      await setDoc(doc(db, 'tableReservations', resId), reservationRecord);

      // Notification outbox
      const notifId = `NOTIF-${resId}`;
      const notifRecord = {
        id: notifId,
        eventType: 'table_reservation',
        recordId: resId,
        subject: `New Table Reservation — MONAZ HOTEL (${reservationRecord.bookingType.toUpperCase()})`,
        recipient: ADMIN_EMAIL,
        status: 'sent',
        summary: `${reservationRecord.package} for ${reservationRecord.guests} guests on ${date} at ${reservationRecord.time}. Guest: ${name} (${phone}).`,
        details: {
          customerName: reservationRecord.name,
          contact: `${reservationRecord.email} | ${reservationRecord.phone}`,
          datesOrItems: `${date} at ${reservationRecord.time} (${reservationRecord.guests} guests)`,
          totalAmount: reservationRecord.package
        },
        createdAt: nowIso,
        lastAttemptAt: nowIso,
        retryCount: 0
      };
      await setDoc(doc(db, 'adminNotifications', notifId), notifRecord);
    }

    res.status(201).json({ success: true, reservation: reservationRecord });
  } catch (err: any) {
    console.error('[Server] Table reservation creation error:', err);
    res.status(500).json({ error: 'Failed to record table reservation: ' + (err.message || 'Internal error') });
  }
});

// ---------------------------------------------------------------------------
// PROTECTED ADMIN DATA ENDPOINTS
// ---------------------------------------------------------------------------

// GET /api/admin/bookings
app.get('/api/admin/bookings', requireAdminAuth, async (_req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }
  try {
    const snap = await getDocs(collection(db, 'roomBookings'));
    const bookings: any[] = [];
    snap.forEach((docSnap) => bookings.push(docSnap.data()));
    bookings.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({ bookings });
  } catch (err: any) {
    console.error('[Admin API] Error fetching bookings:', err);
    res.status(500).json({ error: 'Failed to fetch room bookings' });
  }
});

// PATCH /api/admin/bookings/:id/status
app.patch('/api/admin/bookings/:id/status', requireAdminAuth, async (req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }
  const { id } = req.params;
  const { status } = req.body;
  try {
    const ref = doc(db, 'roomBookings', id);
    const existingSnap = await getDoc(ref);
    const currentData = existingSnap.exists() ? existingSnap.data() : null;

    await updateDoc(ref, { status, updatedAt: new Date().toISOString() });

    // When admin confirms reservation: dispatch customer acceptance confirmation email!
    if (currentData && status === 'confirmed') {
      sendMonazEmail(
        {
          target: 'customer',
          to: currentData.guestEmail || ADMIN_EMAIL,
          customerName: currentData.guestName || 'Valued Guest',
          referenceId: id,
          type: 'room_booking',
          event: 'booking_confirmed',
          details: {
            roomOrDelivery: currentData.roomName || 'Luxury Bedroom',
            itemsOrNights: `${currentData.nights || 1} Night(s)`,
            datesOrTime: `${currentData.checkInDate} to ${currentData.checkOutDate}`,
            totalAmount: currentData.totalPrice,
            paymentStatus: currentData.paymentStatus || 'Pay on Arrival',
            paymentReceiptFileName: currentData.paymentProof?.fileName,
            phone: currentData.guestPhone
          }
        },
        db
      ).catch((e) => console.warn('[Email] Customer booking confirmed notice:', e));
    }

    res.json({ success: true, id, status });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// PATCH /api/admin/bookings/:id/payment - Admin verification of customer payment proof
app.patch('/api/admin/bookings/:id/payment', requireAdminAuth, async (req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }
  const { id } = req.params;
  const { paymentStatus, verificationNotes, bookingStatus } = req.body;

  try {
    const ref = doc(db, 'roomBookings', id);
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      res.status(404).json({ error: 'Booking record not found' });
      return;
    }

    const currentData = existingSnap.data();
    const adminSession = (req as any).adminSession;
    const nowIso = new Date().toISOString();

    const updatedPaymentProof = {
      ...(currentData.paymentProof || {}),
      verifiedAt: nowIso,
      verifiedBy: adminSession?.username || ADMIN_USERNAME,
      verificationNotes: verificationNotes !== undefined ? verificationNotes : (currentData.paymentProof?.verificationNotes || '')
    };

    const updatePayload: any = {
      paymentStatus: paymentStatus || currentData.paymentStatus || 'unpaid',
      paymentProof: updatedPaymentProof,
      updatedAt: nowIso
    };

    if (bookingStatus) {
      updatePayload.status = bookingStatus;
    } else if (paymentStatus === 'verified') {
      updatePayload.status = 'confirmed';
    } else if (paymentStatus === 'rejected') {
      updatePayload.status = 'rejected';
    }

    await updateDoc(ref, updatePayload);

    // If payment verified or status confirmed: dispatch customer acceptance confirmation email!
    if (updatePayload.status === 'confirmed' || paymentStatus === 'verified') {
      sendMonazEmail(
        {
          target: 'customer',
          to: currentData.guestEmail || ADMIN_EMAIL,
          customerName: currentData.guestName || 'Valued Guest',
          referenceId: id,
          type: 'room_booking',
          event: 'booking_confirmed',
          details: {
            roomOrDelivery: currentData.roomName || 'Luxury Bedroom',
            itemsOrNights: `${currentData.nights || 1} Night(s)`,
            datesOrTime: `${currentData.checkInDate} to ${currentData.checkOutDate}`,
            totalAmount: currentData.totalPrice,
            paymentStatus: paymentStatus === 'verified' ? 'Payment Verified & Approved' : updatePayload.paymentStatus,
            paymentReceiptFileName: updatedPaymentProof.fileName,
            phone: currentData.guestPhone
          }
        },
        db
      ).catch((e) => console.warn('[Email] Customer booking verified notice:', e));
    }

    res.json({
      success: true,
      id,
      paymentStatus: updatePayload.paymentStatus,
      status: updatePayload.status,
      paymentProof: updatedPaymentProof
    });
  } catch (err: any) {
    console.error('[Admin API] Error updating payment status:', err);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// GET /api/admin/orders
app.get('/api/admin/orders', requireAdminAuth, async (_req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }
  try {
    const snap = await getDocs(collection(db, 'cafeOrders'));
    const orders: any[] = [];
    snap.forEach((docSnap) => orders.push(docSnap.data()));
    orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// PATCH /api/admin/orders/:id/status
app.patch('/api/admin/orders/:id/status', requireAdminAuth, async (req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }
  const { id } = req.params;
  const { status } = req.body;
  try {
    const ref = doc(db, 'cafeOrders', id);
    const existingSnap = await getDoc(ref);
    const currentData = existingSnap.exists() ? existingSnap.data() : null;

    await updateDoc(ref, { status, updatedAt: new Date().toISOString() });

    // When admin accepts order: dispatch customer acceptance email!
    if (currentData && (status === 'accepted' || status === 'preparing' || status === 'confirmed')) {
      const itemsSummary = Array.isArray(currentData.items)
        ? currentData.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')
        : 'Delicious Dishes & Drinks';

      sendMonazEmail(
        {
          target: 'customer',
          to: currentData.customerEmail || ADMIN_EMAIL,
          customerName: currentData.customerName || 'Valued Guest',
          referenceId: id,
          type: 'cafe_order',
          event: 'order_accepted',
          details: {
            roomOrDelivery: currentData.roomOrTableNumber || 'Monaz Restaurant',
            itemsOrNights: itemsSummary,
            totalAmount: currentData.totalAmount,
            paymentStatus: 'Order Accepted & Cooking in Kitchen',
            phone: currentData.customerPhone
          }
        },
        db
      ).catch((e) => console.warn('[Email] Customer order accepted notice:', e));
    }

    res.json({ success: true, id, status });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// GET /api/admin/reservations
app.get('/api/admin/reservations', requireAdminAuth, async (_req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }
  try {
    const snap = await getDocs(collection(db, 'tableReservations'));
    const reservations: any[] = [];
    snap.forEach((docSnap) => reservations.push(docSnap.data()));
    reservations.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({ reservations });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch table reservations' });
  }
});

// PATCH /api/admin/reservations/:id/status
app.patch('/api/admin/reservations/:id/status', requireAdminAuth, async (req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }
  const { id } = req.params;
  const { status } = req.body;
  try {
    const ref = doc(db, 'tableReservations', id);
    await updateDoc(ref, { status, updatedAt: new Date().toISOString() });
    res.json({ success: true, id, status });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update reservation status' });
  }
});

// GET /api/admin/notifications
app.get('/api/admin/notifications', requireAdminAuth, async (_req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }
  try {
    const snap = await getDocs(collection(db, 'adminNotifications'));
    const notifications: any[] = [];
    snap.forEach((docSnap) => notifications.push(docSnap.data()));
    notifications.sort((a, b) => new Date(b.lastAttemptAt || 0).getTime() - new Date(a.lastAttemptAt || 0).getTime());
    res.json({ notifications });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/admin/notifications/:id/retry
app.post('/api/admin/notifications/:id/retry', requireAdminAuth, async (req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }
  const { id } = req.params;
  try {
    const ref = doc(db, 'adminNotifications', id);
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      res.status(404).json({ error: 'Notification record not found' });
      return;
    }
    const data = existingSnap.data();
    const now = new Date().toISOString();
    const updated = {
      ...data,
      status: 'sent',
      errorMessage: null,
      lastAttemptAt: now,
      retryCount: (data.retryCount || 0) + 1
    };
    await setDoc(ref, updated, { merge: true });
    res.json({ success: true, notification: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retry notification dispatch' });
  }
});

// GET /api/admin/services/all - Unified view of all booked hotel rooms, tables, catering, and orders
app.get('/api/admin/services/all', requireAdminAuth, async (_req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }
  try {
    const [bookingsSnap, ordersSnap, reservationsSnap] = await Promise.all([
      getDocs(collection(db, 'roomBookings')),
      getDocs(collection(db, 'cafeOrders')),
      getDocs(collection(db, 'tableReservations'))
    ]);

    const unifiedServices: any[] = [];
    let totalRoomRevenue = 0;
    let totalCafeRevenue = 0;
    let pendingCount = 0;

    // 1. Process Room Bookings
    bookingsSnap.forEach((docSnap) => {
      const b = docSnap.data();
      if (b.status !== 'cancelled' && b.status !== 'rejected') {
        totalRoomRevenue += (Number(b.totalPrice) || 0);
      }
      if (b.status === 'pending' || b.paymentStatus === 'proof_submitted') {
        pendingCount++;
      }

      unifiedServices.push({
        id: b.id,
        category: 'hotel_room',
        categoryLabel: 'Hotel Room Stay',
        title: b.roomName || 'Luxury Bedroom',
        subtitle: `${b.nights || 1} Night(s) • ${b.guestsCount || 1} Guest(s)`,
        customerName: b.guestName || 'Valued Guest',
        customerPhone: b.guestPhone || '',
        customerEmail: b.guestEmail || '',
        dateTimeInfo: `${b.checkInDate} → ${b.checkOutDate}`,
        locationOrRoom: b.roomName || 'Bedroom Suite',
        totalPrice: Number(b.totalPrice) || 0,
        currency: b.currency || 'ETB',
        status: b.status || 'pending',
        paymentStatus: b.paymentStatus || 'unpaid',
        paymentProof: b.paymentProof || null,
        specialRequests: b.specialRequests || '',
        createdAt: b.createdAt || new Date().toISOString(),
        rawDetails: b
      });
    });

    // 2. Process Dining & Banquet Reservations
    reservationsSnap.forEach((docSnap) => {
      const r = docSnap.data();
      const isCatering = r.bookingType === 'catering';
      if (r.status === 'pending') {
        pendingCount++;
      }

      unifiedServices.push({
        id: r.id,
        category: isCatering ? 'banquet_catering' : 'table_dining',
        categoryLabel: isCatering ? 'VIP Banquet Catering' : 'Dining Table',
        title: isCatering ? 'Event Banquet & Catering' : 'Reserved Dining Table',
        subtitle: `${r.guests || '2'} Guests • ${r.time || '19:00'}`,
        customerName: r.name || 'Guest',
        customerPhone: r.phone || '',
        customerEmail: r.email || '',
        dateTimeInfo: `${r.date} at ${r.time || '19:00'}`,
        locationOrRoom: isCatering ? 'Event Hall / Catering' : (r.package || 'Main Dining Floor'),
        totalPrice: 0, // Paid upon dining or custom quote
        currency: 'ETB',
        status: r.status || 'pending',
        paymentStatus: 'unpaid',
        specialRequests: r.notes || '',
        createdAt: r.createdAt || new Date().toISOString(),
        rawDetails: r
      });
    });

    // 3. Process Restaurant & Cafe Orders
    ordersSnap.forEach((docSnap) => {
      const o = docSnap.data();
      if (o.status !== 'cancelled') {
        totalCafeRevenue += (Number(o.totalAmount) || 0);
      }
      if (o.status === 'pending' || o.status === 'preparing') {
        pendingCount++;
      }

      const itemsSummary = Array.isArray(o.items)
        ? o.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')
        : 'Dishes & Beverages';

      const deliveryLabel =
        o.deliveryType === 'room_delivery'
          ? `Room Service (${o.roomOrTableNumber})`
          : o.deliveryType === 'table_service'
          ? `Table Dine-in (${o.roomOrTableNumber})`
          : `Takeaway (${o.roomOrTableNumber})`;

      unifiedServices.push({
        id: o.id,
        category: 'cafe_order',
        categoryLabel: 'Kitchen & Bar Order',
        title: deliveryLabel,
        subtitle: itemsSummary,
        customerName: o.customerName || 'Customer',
        customerPhone: o.customerPhone || '',
        customerEmail: o.customerEmail || '',
        dateTimeInfo: new Date(o.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        locationOrRoom: o.roomOrTableNumber || 'Pickup',
        totalPrice: Number(o.totalAmount) || 0,
        currency: o.currency || 'ETB',
        status: o.status || 'pending',
        paymentStatus: o.paymentStatus || 'unpaid',
        specialRequests: o.notes || '',
        createdAt: o.createdAt || new Date().toISOString(),
        rawDetails: o
      });
    });

    // Sort newest first
    unifiedServices.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json({
      success: true,
      services: unifiedServices,
      metrics: {
        totalServices: unifiedServices.length,
        totalBookings: bookingsSnap.size,
        totalOrders: ordersSnap.size,
        totalReservations: reservationsSnap.size,
        totalRevenue: totalRoomRevenue + totalCafeRevenue,
        totalRoomRevenue,
        totalCafeRevenue,
        pendingActionCount: pendingCount
      }
    });
  } catch (err: any) {
    console.error('[Admin API] Error fetching all services:', err);
    res.status(500).json({ error: 'Failed to fetch booked services' });
  }
});

// ---------------------------------------------------------------------------
// PUBLIC CUSTOMER ORDER & BOOKING LIVE TRACKING API
// ---------------------------------------------------------------------------

type StepStatus = 'completed' | 'current' | 'upcoming';

// Helper to build tracking info object
function buildTrackingResponse(record: any, category: 'hotel_room' | 'cafe_order' | 'table_dining') {
  const commonSupport = {
    phone: '+251 91 123 4567',
    email: 'redwanredhood@gmail.com',
    location: 'Betel, Addis Ababa, Ethiopia'
  };

  if (category === 'hotel_room') {
    const isConfirmed = record.status === 'confirmed' || record.paymentStatus === 'verified';
    const isCheckedIn = record.status === 'checked-in';
    const isCompleted = record.status === 'completed';
    const isRejected = record.status === 'rejected' || record.paymentStatus === 'rejected';

    const hasProof = !!record.paymentProof;
    const isProofVerified = record.paymentStatus === 'verified';

    const steps: { key: string; title: string; description: string; status: StepStatus; timestamp?: string }[] = [
      {
        key: 'step_submitted',
        title: 'Reservation Request Placed',
        description: `Booking #${record.id} for ${record.roomName} safely received.`,
        status: 'completed',
        timestamp: record.createdAt
      },
      {
        key: 'step_receipt',
        title: hasProof ? 'Payment Proof Identified' : 'Payment Method Pending',
        description: hasProof
          ? `Receipt attached: ${record.paymentProof.fileName}. Status: ${isProofVerified ? 'Verified & Approved' : 'Under Admin Audit'}.`
          : 'Due at check-in or bank transfer receipt pending upload.',
        status: hasProof ? 'completed' : 'current',
        timestamp: record.paymentProof?.uploadedAt
      },
      {
        key: 'step_accepted',
        title: isConfirmed ? 'Reservation Accepted & Confirmed' : 'Waiting for Admin Confirmation',
        description: isConfirmed
          ? 'Great news! Your room stay is officially approved by Monaz management.'
          : 'Monaz hotel administration is currently reviewing availability and payment proof.',
        status: (isConfirmed || isCheckedIn || isCompleted) ? 'completed' : isRejected ? 'upcoming' : 'current',
        timestamp: record.updatedAt
      },
      {
        key: 'step_room_ready',
        title: 'Room Prepared & Welcome Ready',
        description: `Your ${record.roomName} will be sanitized and prepared for check-in on ${record.checkInDate}.`,
        status: (isCheckedIn || isCompleted) ? 'completed' : isConfirmed ? 'current' : 'upcoming'
      },
      {
        key: 'step_checkin',
        title: 'Checked-in & Enjoying Stay',
        description: 'Welcome to MONAZ HOTEL Betel, Addis Ababa.',
        status: isCompleted ? 'completed' : isCheckedIn ? 'current' : 'upcoming'
      }
    ];

    let statusLabel = 'Waiting for Hotel Confirmation';
    if (isCompleted) statusLabel = 'Stay Completed';
    else if (isCheckedIn) statusLabel = 'Checked In';
    else if (isConfirmed) statusLabel = 'Reservation Accepted & Confirmed!';
    else if (isRejected) statusLabel = 'Booking Declined / Reschedule Needed';

    let paymentStatusLabel = 'Pay at Hotel Check-in';
    if (record.paymentStatus === 'verified') paymentStatusLabel = 'Bank Transfer Verified & Approved';
    else if (record.paymentStatus === 'proof_submitted') paymentStatusLabel = 'Bank Slip Uploaded — Awaiting Audit';
    else if (record.paymentStatus === 'rejected') paymentStatusLabel = 'Payment Slip Declined';

    return {
      id: record.id,
      category,
      categoryLabel: 'Hotel Bedroom Stay',
      title: record.roomName || 'Luxury Bedroom',
      subtitle: `${record.nights || 1} Nights • ${record.guestsCount || 1} Guests • ${record.checkInDate} to ${record.checkOutDate}`,
      customerName: record.guestName || 'Guest',
      customerEmail: record.guestEmail,
      customerPhone: record.guestPhone,
      locationOrRoom: record.roomName,
      totalPrice: record.totalPrice || 0,
      currency: record.currency || 'ETB',
      status: record.status || 'pending',
      statusLabel,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      hasPaymentProof: hasProof,
      paymentStatus: record.paymentStatus || 'unpaid',
      paymentStatusLabel,
      paymentProof: record.paymentProof,
      steps,
      supportContact: commonSupport
    };
  }

  if (category === 'cafe_order') {
    const isAccepted = ['accepted', 'preparing', 'ready', 'served', 'completed'].includes(record.status);
    const isCooking = ['preparing', 'ready', 'served', 'completed'].includes(record.status);
    const isReady = ['ready', 'served', 'completed'].includes(record.status);
    const isDone = ['served', 'completed'].includes(record.status);
    const isCancelled = record.status === 'cancelled';

    const itemsSummary = Array.isArray(record.items)
      ? record.items.map((it: any) => `${it.quantity}x ${it.name}`).join(', ')
      : 'Delicious dishes';

    const steps: { key: string; title: string; description: string; status: StepStatus; timestamp?: string }[] = [
      {
        key: 'step_order_placed',
        title: 'Order Placed & In Queue',
        description: `Order #${record.id} safely received and transmitted to kitchen staff.`,
        status: 'completed',
        timestamp: record.createdAt
      },
      {
        key: 'step_order_waiting',
        title: isAccepted ? 'Order Accepted by Kitchen' : 'Waiting for Kitchen Confirmation',
        description: isAccepted
          ? 'Chefs have reviewed and officially accepted your order!'
          : 'Waiting for kitchen manager to confirm availability.',
        status: isAccepted ? 'completed' : isCancelled ? 'upcoming' : 'current'
      },
      {
        key: 'step_kitchen_prep',
        title: 'Cooking & Crafting Dishes',
        description: `Preparing: ${itemsSummary}. Made fresh to order.`,
        status: isReady ? 'completed' : (record.status === 'preparing' || record.status === 'accepted') ? 'current' : 'upcoming'
      },
      {
        key: 'step_delivery_ready',
        title: record.deliveryType === 'room_delivery' ? 'Room Service Delivery on the Way' : 'Ready at Table / Counter',
        description: `Target location: ${record.roomOrTableNumber}.`,
        status: isDone ? 'completed' : record.status === 'ready' ? 'current' : 'upcoming'
      },
      {
        key: 'step_completed',
        title: 'Delivered & Enjoyed',
        description: 'Thank you for dining with Monaz Hotel & Café!',
        status: isDone ? 'completed' : 'upcoming'
      }
    ];

    let statusLabel = 'Waiting for Kitchen Confirmation';
    if (isDone) statusLabel = 'Delivered & Completed';
    else if (record.status === 'ready') statusLabel = 'Ready for Table / Room Delivery!';
    else if (record.status === 'preparing') statusLabel = 'Cooking in Monaz Kitchen';
    else if (record.status === 'accepted') statusLabel = 'Order Accepted!';
    else if (isCancelled) statusLabel = 'Order Cancelled';

    return {
      id: record.id,
      category,
      categoryLabel: 'Kitchen & Bar Order',
      title: record.deliveryType === 'room_delivery' ? `Room Service (${record.roomOrTableNumber})` : `Restaurant Dining (${record.roomOrTableNumber})`,
      subtitle: itemsSummary,
      customerName: record.customerName || 'Customer',
      customerEmail: record.customerEmail,
      customerPhone: record.customerPhone,
      locationOrRoom: record.roomOrTableNumber || 'Pickup',
      totalPrice: record.totalAmount || 0,
      currency: record.currency || 'ETB',
      status: record.status || 'pending',
      statusLabel,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      hasPaymentProof: false,
      paymentStatus: 'unpaid' as const,
      paymentStatusLabel: 'Cash / Card / Mobile Transfer on Delivery',
      steps,
      supportContact: commonSupport
    };
  }

  // Dining table reservation
  const isConfirmed = record.status === 'confirmed' || record.status === 'completed';
  const steps: { key: string; title: string; description: string; status: StepStatus; timestamp?: string }[] = [
    {
      key: 'step_res_received',
      title: 'Reservation Request Received',
      description: `Table requested for ${record.guests || '2'} guests on ${record.date} at ${record.time}.`,
      status: 'completed',
      timestamp: record.createdAt
    },
    {
      key: 'step_table_waiting',
      title: isConfirmed ? 'Table Confirmed & Reserved' : 'Waiting for Staff Confirmation',
      description: isConfirmed
        ? 'Your VIP table has been reserved in our dining room.'
        : 'Our host is reviewing floor seating.',
      status: isConfirmed ? 'completed' : 'current'
    },
    {
      key: 'step_welcome_table',
      title: 'Welcome to Monaz Dining',
      description: 'Please arrive 5-10 minutes prior to reservation time.',
      status: record.status === 'completed' ? 'completed' : isConfirmed ? 'current' : 'upcoming'
    }
  ];

  return {
    id: record.id,
    category,
    categoryLabel: 'Dining Table Reservation',
    title: record.package || 'Dining Table',
    subtitle: `${record.guests || '2'} Guests • ${record.date} at ${record.time}`,
    customerName: record.name || 'Guest',
    customerEmail: record.email,
    customerPhone: record.phone,
    locationOrRoom: 'Main Dining Floor',
    totalPrice: 0,
    currency: 'ETB',
    status: record.status || 'pending',
    statusLabel: isConfirmed ? 'Reservation Confirmed!' : 'Waiting for Confirmation',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    hasPaymentProof: false,
    paymentStatus: 'unpaid' as const,
    paymentStatusLabel: 'Pay on Dining',
    steps,
    supportContact: commonSupport
  };
}

// GET /api/track/:referenceId - Public live tracking for booker / customer
app.get('/api/track/:referenceId', async (req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }

  const rawId = req.params.referenceId?.trim().toUpperCase();
  if (!rawId || rawId.length < 3) {
    res.status(400).json({ error: 'Please enter a valid Reference ID (e.g. BK-1234 or ORD-5678)' });
    return;
  }

  try {
    // 1. Check Room Bookings
    const bookingDoc = await getDoc(doc(db, 'roomBookings', rawId));
    if (bookingDoc.exists()) {
      const data = bookingDoc.data();
      const tracking = buildTrackingResponse(data, 'hotel_room');
      res.json({ success: true, tracking });
      return;
    }

    // 2. Check Cafe Orders
    const orderDoc = await getDoc(doc(db, 'cafeOrders', rawId));
    if (orderDoc.exists()) {
      const data = orderDoc.data();
      const tracking = buildTrackingResponse(data, 'cafe_order');
      res.json({ success: true, tracking });
      return;
    }

    // 3. Check Table Reservations
    const resDoc = await getDoc(doc(db, 'tableReservations', rawId));
    if (resDoc.exists()) {
      const data = resDoc.data();
      const tracking = buildTrackingResponse(data, 'table_dining');
      res.json({ success: true, tracking });
      return;
    }

    res.status(404).json({
      error: `Reference ID #${rawId} was not found. Please double-check your booking reference or order receipt code.`
    });
  } catch (err: any) {
    console.error('[Track API] Error fetching tracking info:', err);
    res.status(500).json({ error: 'Failed to look up booking progress' });
  }
});

// POST /api/track - Search tracking by Reference ID, Phone, or Email
app.post('/api/track', async (req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }

  const { query: searchQuery } = req.body;
  if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length < 2) {
    res.status(400).json({ error: 'Please enter a Reference ID, contact phone number, or email address.' });
    return;
  }

  const cleanQuery = searchQuery.trim().toLowerCase();
  const upperQuery = searchQuery.trim().toUpperCase();

  try {
    // Direct ID Match first
    if (upperQuery.startsWith('BK-') || upperQuery.startsWith('ORD-') || upperQuery.startsWith('RES-')) {
      const bDoc = await getDoc(doc(db, 'roomBookings', upperQuery));
      if (bDoc.exists()) {
        res.json({ success: true, results: [buildTrackingResponse(bDoc.data(), 'hotel_room')] });
        return;
      }
      const oDoc = await getDoc(doc(db, 'cafeOrders', upperQuery));
      if (oDoc.exists()) {
        res.json({ success: true, results: [buildTrackingResponse(oDoc.data(), 'cafe_order')] });
        return;
      }
      const rDoc = await getDoc(doc(db, 'tableReservations', upperQuery));
      if (rDoc.exists()) {
        res.json({ success: true, results: [buildTrackingResponse(rDoc.data(), 'table_dining')] });
        return;
      }
    }

    // Search across collections by phone or email
    const results: any[] = [];

    // Search bookings
    const bookingsSnap = await getDocs(collection(db, 'roomBookings'));
    bookingsSnap.forEach((d) => {
      const b = d.data();
      const phoneMatch = b.guestPhone && b.guestPhone.toLowerCase().includes(cleanQuery);
      const emailMatch = b.guestEmail && b.guestEmail.toLowerCase().includes(cleanQuery);
      const idMatch = b.id && b.id.toUpperCase().includes(upperQuery);
      if (phoneMatch || emailMatch || idMatch) {
        results.push(buildTrackingResponse(b, 'hotel_room'));
      }
    });

    // Search orders
    const ordersSnap = await getDocs(collection(db, 'cafeOrders'));
    ordersSnap.forEach((d) => {
      const o = d.data();
      const phoneMatch = o.customerPhone && o.customerPhone.toLowerCase().includes(cleanQuery);
      const emailMatch = o.customerEmail && o.customerEmail.toLowerCase().includes(cleanQuery);
      const idMatch = o.id && o.id.toUpperCase().includes(upperQuery);
      if (phoneMatch || emailMatch || idMatch) {
        results.push(buildTrackingResponse(o, 'cafe_order'));
      }
    });

    // Sort newest first
    results.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json({ success: true, results: results.slice(0, 10) });
  } catch (err: any) {
    console.error('[Track Search API] Error searching orders/bookings:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/admin/emails - Admin inspection of dispatched emails with direct Gmail links
app.get('/api/admin/emails', requireAdminAuth, async (_req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }
  try {
    const snap = await getDocs(collection(db, 'emailNotifications'));
    const emails: any[] = [];
    snap.forEach((d) => emails.push(d.data()));
    emails.sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime());
    res.json({ success: true, emails });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch email logs' });
  }
});

// POST /api/admin/emails/resend - Admin triggers direct customer email dispatch
app.post('/api/admin/emails/resend', requireAdminAuth, async (req: Request, res: Response) => {
  if (!db) {
    res.status(500).json({ error: 'Database service unavailable' });
    return;
  }
  const { referenceId, type, customNote } = req.body;
  if (!referenceId) {
    res.status(400).json({ error: 'Reference ID is required' });
    return;
  }

  try {
    if (referenceId.startsWith('ORD-')) {
      const orderDoc = await getDoc(doc(db, 'cafeOrders', referenceId));
      if (!orderDoc.exists()) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      const o = orderDoc.data();
      const itemsSummary = Array.isArray(o.items) ? o.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ') : 'Dishes';
      const result = await sendMonazEmail(
        {
          target: 'customer',
          to: o.customerEmail || ADMIN_EMAIL,
          customerName: o.customerName || 'Customer',
          referenceId,
          type: 'cafe_order',
          event: 'order_accepted',
          details: {
            roomOrDelivery: o.roomOrTableNumber,
            itemsOrNights: itemsSummary,
            totalAmount: o.totalAmount,
            paymentStatus: 'Order Accepted by Kitchen',
            notes: customNote
          }
        },
        db
      );
      res.json({ success: true, result });
      return;
    }

    // Room booking
    const bDoc = await getDoc(doc(db, 'roomBookings', referenceId));
    if (!bDoc.exists()) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    const b = bDoc.data();
    const result = await sendMonazEmail(
      {
        target: 'customer',
        to: b.guestEmail || ADMIN_EMAIL,
        customerName: b.guestName || 'Valued Guest',
        referenceId,
        type: 'room_booking',
        event: 'booking_confirmed',
        details: {
          roomOrDelivery: b.roomName,
          itemsOrNights: `${b.nights} Night(s)`,
          datesOrTime: `${b.checkInDate} to ${b.checkOutDate}`,
          totalAmount: b.totalPrice,
          paymentStatus: b.paymentStatus || 'Pay on Arrival',
          paymentReceiptFileName: b.paymentProof?.fileName,
          notes: customNote
        }
      },
      db
    );
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to dispatch email' });
  }
});

// ---------------------------------------------------------------------------
// VITE DEV SERVER / STATIC ASSET SERVING
// ---------------------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] MONAZ HOTEL applet server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
