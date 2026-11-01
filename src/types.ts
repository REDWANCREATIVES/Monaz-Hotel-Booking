export interface MenuItem {
  id: string;
  name: string;
  amharicName?: string;
  category: 'traditional' | 'burgers' | 'pasta_rice' | 'salad_soup' | 'hot_drinks' | 'smoothies_cold' | string;
  description: string;
  price: number; // in ETB
  image: string;
  rating: number;
  tags: string[];
  isSpecial?: boolean;
  available?: boolean;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface HotelRoom {
  id: string;
  name: string;
  tag: string;
  description: string;
  pricePerNight: number; // in ETB
  image: string;
  images?: string[];
  maxGuests: number;
  bedType: string;
  size: string;
  amenities: string[];
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
}

export type RoomBookingStatus = 'pending' | 'confirmed' | 'rejected' | 'checked-in' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'proof_submitted' | 'verified' | 'rejected' | 'refunded';
export type NotificationStatus = 'sent' | 'pending' | 'failed' | 'retrying';

export interface PaymentProof {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
}

export interface RoomBooking {
  id: string;
  roomId: string;
  roomName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guestsCount: number;
  specialRequests?: string;
  totalPrice: number;
  currency?: string; // defaults to 'ETB'
  status: RoomBookingStatus;
  paymentStatus?: PaymentStatus;
  paymentProof?: PaymentProof;
  notificationStatus?: NotificationStatus;
  notificationRecipient?: string;
  notificationError?: string;
  notificationLastAttempt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CafeOrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number; // in ETB
  category?: string;
}

export interface CafeOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryType: 'room_delivery' | 'table_service' | 'takeaway';
  roomOrTableNumber: string;
  items: OrderItem[];
  subtotal?: number;
  serviceFee?: number;
  totalAmount: number;
  currency?: string; // defaults to 'ETB'
  notes?: string;
  status: CafeOrderStatus;
  notificationStatus?: NotificationStatus;
  notificationRecipient?: string;
  notificationError?: string;
  notificationLastAttempt?: string;
  createdAt: string;
}

export interface TableReservation {
  id: string;
  bookingType: 'reservation' | 'catering';
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: string;
  package?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notificationStatus?: NotificationStatus;
  notificationRecipient?: string;
  notificationError?: string;
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  eventType: 'room_booking' | 'cafe_order' | 'table_reservation';
  recordId: string;
  subject: string;
  recipient: string;
  status: NotificationStatus;
  summary: string;
  details: {
    customerName: string;
    contact: string;
    datesOrItems: string;
    totalAmount?: string;
  };
  errorMessage?: string;
  createdAt: string;
  lastAttemptAt: string;
  retryCount: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  text: string;
  date: string;
}

export type ServiceCategory = 'hotel_room' | 'table_dining' | 'banquet_catering' | 'cafe_order';

export interface BookedService {
  id: string;
  category: ServiceCategory;
  categoryLabel: string;
  title: string;
  subtitle: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  dateTimeInfo: string;
  locationOrRoom: string;
  totalPrice: number;
  currency: string;
  status: string;
  paymentStatus: PaymentStatus;
  paymentProof?: PaymentProof;
  specialRequests?: string;
  createdAt: string;
  rawDetails: RoomBooking | CafeOrder | TableReservation;
}

export interface TrackingStep {
  key: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  timestamp?: string;
}

export interface ServiceTrackingInfo {
  id: string;
  category: ServiceCategory;
  categoryLabel: string;
  title: string;
  subtitle?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  locationOrRoom: string;
  totalPrice: number;
  currency: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  updatedAt?: string;
  hasPaymentProof: boolean;
  paymentStatus: PaymentStatus;
  paymentStatusLabel: string;
  paymentProof?: PaymentProof;
  steps: TrackingStep[];
  directGmailUrl?: string;
  supportContact: {
    phone: string;
    email: string;
    location: string;
  };
}

export interface EmailLogEntry {
  id: string;
  target: 'admin' | 'customer';
  to: string;
  from: string;
  customerName?: string;
  referenceId: string;
  type: string;
  event: string;
  subject: string;
  previewText: string;
  directGmailUrl: string;
  sentAt: string;
  deliveryStatus: 'delivered' | 'simulated' | 'failed';
}

