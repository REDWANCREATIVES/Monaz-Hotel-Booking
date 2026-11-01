import { jsPDF } from 'jspdf';
import { RoomBooking } from '../types';

export function generateBookingReceiptPDF(booking: RoomBooking): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryBrown = '#2A1810';
  const primaryOrange = '#EA580C';
  const lightBg = '#FAF6F0';
  const textDark = '#1E100A';
  const textMuted = '#6E4733';

  // 1. Header background banner
  doc.setFillColor(42, 24, 16); // #2A1810
  doc.rect(0, 0, 210, 45, 'F');

  // Orange accent line
  doc.setFillColor(234, 88, 12); // #EA580C
  doc.rect(0, 45, 210, 3, 'F');

  // 2. Hotel Title & Location
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('MONAZ HOTEL & CAFE', 20, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(251, 146, 60); // #FB923C
  doc.text('LUXURY HOSPITALITY & AUTHENTIC ETHIOPIAN CUISINE', 20, 27);

  doc.setFontSize(9);
  doc.setTextColor(220, 215, 210);
  doc.text('Location: Betel, Addis Ababa, Ethiopia | Tel: +251 91 444 7722 | Email: redwanredhood@gmail.com', 20, 36);

  // 3. Document Title
  doc.setTextColor(42, 24, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('HOTEL ROOM RESERVATION RECEIPT', 20, 58);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 71, 51);
  const generatedDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  doc.text(`Receipt Issue Date: ${generatedDate}`, 20, 64);

  // 4. Prominent Booking Reference Badge
  doc.setFillColor(255, 247, 237); // #FFF7ED
  doc.setDrawColor(234, 88, 12);
  doc.roundedRect(135, 52, 55, 18, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(110, 71, 51);
  doc.text('BOOKING REFERENCE', 140, 58);

  doc.setFontSize(13);
  doc.setTextColor(234, 88, 12);
  doc.text(booking.id, 140, 66);

  // 5. Payment Verification Status Banner (MANDATORY REQUIREMENT)
  const isVerified = booking.paymentStatus === 'verified';
  let bannerY = 76;

  if (isVerified) {
    // Green Verified Banner
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.roundedRect(20, bannerY, 170, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(5, 150, 105);
    doc.text('[VERIFIED] Payment Verified & Room Confirmed', 26, bannerY + 9);
  } else {
    // Unverified / Warning Banner
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(239, 68, 68); // red-500
    doc.roundedRect(20, bannerY, 170, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    // Explicitly labeled as requested: "Booking Receipt — Payment Not Verified"
    const statusText = booking.paymentStatus === 'proof_submitted'
      ? 'Booking Receipt — Payment Not Verified (Transfer Proof Submitted for Review)'
      : 'Booking Receipt — Payment Not Verified (Pending Payment at Check-In)';
    doc.text(statusText, 26, bannerY + 9);
  }

  // 6. Two Column Information Grid
  let gridY = 100;

  // Guest Details Box
  doc.setFillColor(250, 246, 240);
  doc.setDrawColor(220, 210, 200);
  doc.roundedRect(20, gridY, 82, 54, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(42, 24, 16);
  doc.text('GUEST DETAILS', 25, gridY + 8);
  doc.line(25, gridY + 11, 95, gridY + 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 71, 51);
  doc.text('Guest Name:', 25, gridY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 16, 10);
  doc.text(booking.guestName || 'Valued Guest', 50, gridY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 71, 51);
  doc.text('Phone:', 25, gridY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 16, 10);
  doc.text(booking.guestPhone || '-', 50, gridY + 26);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 71, 51);
  doc.text('Email:', 25, gridY + 34);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 16, 10);
  doc.text(booking.guestEmail || '-', 50, gridY + 34);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 71, 51);
  doc.text('Party Size:', 25, gridY + 42);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 16, 10);
  doc.text(`${booking.guestsCount} Guest(s)`, 50, gridY + 42);

  // Reservation Details Box
  doc.setFillColor(250, 246, 240);
  doc.roundedRect(108, gridY, 82, 54, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(42, 24, 16);
  doc.text('STAY INFORMATION', 113, gridY + 8);
  doc.line(113, gridY + 11, 183, gridY + 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 71, 51);
  doc.text('Room Booked:', 113, gridY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 16, 10);
  doc.text(booking.roomName || 'Luxury Room', 140, gridY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 71, 51);
  doc.text('Check-in:', 113, gridY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 16, 10);
  doc.text(booking.checkInDate, 140, gridY + 26);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 71, 51);
  doc.text('Check-out:', 113, gridY + 34);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 16, 10);
  doc.text(booking.checkOutDate, 140, gridY + 34);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 71, 51);
  doc.text('Duration:', 113, gridY + 42);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 16, 10);
  doc.text(`${booking.nights} Night(s)`, 140, gridY + 42);

  // Special requests row if present
  let tableY = 162;
  if (booking.specialRequests) {
    doc.setFillColor(255, 247, 237);
    doc.setDrawColor(234, 88, 12);
    doc.roundedRect(20, tableY, 170, 12, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(234, 88, 12);
    doc.text('SPECIAL REQUEST:', 25, tableY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(42, 24, 16);
    doc.text(booking.specialRequests.substring(0, 80), 60, tableY + 7);

    tableY += 18;
  }

  // 7. Charges Breakdown Table
  doc.setFillColor(42, 24, 16);
  doc.rect(20, tableY, 170, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION', 25, tableY + 5.5);
  doc.text('RATE / NIGHT', 115, tableY + 5.5);
  doc.text('AMOUNT (ETB)', 160, tableY + 5.5);

  tableY += 8;

  // Row 1: Room subtotal
  const roomPricePerNight = Math.round(booking.totalPrice / 1.1 / Math.max(1, booking.nights));
  const subtotal = roomPricePerNight * booking.nights;
  const taxes = Math.round(subtotal * 0.10);

  doc.setFillColor(250, 246, 240);
  doc.rect(20, tableY, 170, 8, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(42, 24, 16);
  doc.text(`${booking.roomName} (${booking.nights} nights stay)`, 25, tableY + 5.5);
  doc.text(`${roomPricePerNight.toLocaleString()} ETB`, 115, tableY + 5.5);
  doc.text(`${subtotal.toLocaleString()} ETB`, 160, tableY + 5.5);

  tableY += 8;

  // Row 2: Taxes & VAT (10%)
  doc.setFillColor(255, 255, 255);
  doc.rect(20, tableY, 170, 8, 'F');
  doc.text('Hotel Service, VAT & Tourism Levy (10%)', 25, tableY + 5.5);
  doc.text('Included', 115, tableY + 5.5);
  doc.text(`${taxes.toLocaleString()} ETB`, 160, tableY + 5.5);

  tableY += 8;

  // Total Row
  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(234, 88, 12);
  doc.rect(20, tableY, 170, 10, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(42, 24, 16);
  doc.text('TOTAL AMOUNT DUE:', 25, tableY + 7);

  doc.setFontSize(13);
  doc.setTextColor(234, 88, 12);
  doc.text(`${booking.totalPrice.toLocaleString()} ETB`, 155, tableY + 7);

  // 8. Payment Proof note if attached
  tableY += 16;
  if (booking.paymentProof) {
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(20, tableY, 170, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(110, 71, 51);
    doc.text('PAYMENT PROOF ATTACHED:', 25, tableY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(42, 24, 16);
    doc.text(`File: ${booking.paymentProof.fileName} (${(booking.paymentProof.fileSize / 1024).toFixed(1)} KB) - Uploaded on ${new Date(booking.paymentProof.uploadedAt).toLocaleDateString()}`, 25, tableY + 11);
    tableY += 18;
  }

  // 9. Policies & Check-in instructions
  const footerY = 248;
  doc.setFillColor(250, 246, 240);
  doc.roundedRect(20, footerY, 170, 32, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(42, 24, 16);
  doc.text('HOTEL CHECK-IN POLICIES & TERMS', 25, footerY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 71, 51);
  doc.text('1. Standard check-in is 2:00 PM; check-out is 12:00 PM. Early check-in subject to room availability.', 25, footerY + 12);
  doc.text('2. Please present a valid government-issued ID / passport and this booking receipt upon arrival.', 25, footerY + 17);
  doc.text('3. For airport pickup, room service, or itinerary adjustments, call our 24/7 concierge at +251 91 444 7722.', 25, footerY + 22);
  doc.text('4. Monaz Hotel & Cafe - Betel, Addis Ababa, Ethiopia. We look forward to hosting you!', 25, footerY + 27);

  // Save the PDF
  const filename = `Monaz_Hotel_Reservation_${booking.id}.pdf`;
  doc.save(filename);
}
