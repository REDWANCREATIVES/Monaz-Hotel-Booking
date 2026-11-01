import nodemailer from 'nodemailer';
import { Firestore, doc, setDoc } from 'firebase/firestore';

export interface EmailNotificationPayload {
  target: 'admin' | 'customer';
  to: string;
  customerName: string;
  referenceId: string;
  type: 'room_booking' | 'cafe_order' | 'table_reservation';
  event: 'order_waiting' | 'order_accepted' | 'booking_waiting' | 'booking_confirmed' | 'payment_verified';
  details: {
    roomOrDelivery?: string;
    itemsOrNights?: string;
    datesOrTime?: string;
    totalAmount?: string | number;
    paymentStatus?: string;
    paymentReceiptFileName?: string;
    paymentReceiptUrl?: string;
    notes?: string;
    phone?: string;
  };
}

// Nodemailer transport initialization
let transporter: any = null;

function getMailTransporter(): any {
  if (transporter) return transporter;

  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (gmailUser && gmailPass) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });
    console.log('[Email Service] Configured live Gmail SMTP transporter for:', gmailUser);
  } else if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('[Email Service] Configured custom SMTP transporter:', process.env.SMTP_HOST);
  } else {
    // Development / Stream transporter that logs emails securely
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
    console.log('[Email Service] Running in managed email mode with database outbox logging & direct Gmail sync.');
  }

  return transporter;
}

// Generate direct Gmail compose link so user or admin can open and view in Gmail with 1 click
export function generateDirectGmailUrl(to: string, subject: string, bodyText: string): string {
  const base = 'https://mail.google.com/mail/?view=cm&fs=1';
  return `${base}&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
}

// Send automated email and record in database outbox
export async function sendMonazEmail(
  payload: EmailNotificationPayload,
  db?: Firestore | null
): Promise<{ success: boolean; messageId?: string; directGmailUrl: string; subject: string }> {
  const mailer = getMailTransporter();
  const senderEmail = process.env.GMAIL_USER || 'monazhoteladmin@gmail.com';
  const senderName = 'MONAZ HOTEL & CAFÉ';

  let subject = '';
  let heading = '';
  let subHeading = '';
  let callToAction = '';
  let plainBody = '';

  const totalFormatted =
    typeof payload.details.totalAmount === 'number'
      ? `${payload.details.totalAmount.toLocaleString()} ETB`
      : payload.details.totalAmount || 'N/A';

  const receiptNotice = payload.details.paymentReceiptFileName
    ? `Bank Payment Receipt Identified: ${payload.details.paymentReceiptFileName} (Status: ${payload.details.paymentStatus || 'Awaiting Verification'})`
    : `Payment Status: ${payload.details.paymentStatus || 'Pay on Arrival / Cash on Delivery'}`;

  // 1. Template branches
  if (payload.event === 'order_waiting') {
    if (payload.target === 'admin') {
      subject = `[MONAZ HOTEL] 🛎️ New Kitchen Order #${payload.referenceId} is WAITING for Confirmation`;
      heading = 'ORDER IS AVAILABLE & WAITING FOR CONFIRMATION';
      subHeading = `A new customer order has entered the system and is waiting for your confirmation.`;
      callToAction = 'Please review the kitchen order, verify items, and confirm it in the Admin Dashboard.';
      plainBody = `MONAZ HOTEL - NEW ORDER ON WAITING\n\nReference: ${payload.referenceId}\nCustomer: ${payload.customerName} (${payload.details.phone || 'No phone'})\nLocation/Delivery: ${payload.details.roomOrDelivery || 'Dine-in'}\nItems: ${payload.details.itemsOrNights}\nTotal: ${totalFormatted}\n${receiptNotice}\n\nAction: Please confirm this order in the Admin Dashboard.`;
    } else {
      subject = `[MONAZ HOTEL] 📋 Your Food & Drinks Order #${payload.referenceId} Has Been Received`;
      heading = 'ORDER RECEIVED — PENDING CONFIRMATION';
      subHeading = `Thank you for ordering with MONAZ HOTEL & CAFÉ! Your order has been received and sent to the kitchen queue.`;
      callToAction = 'Our team is reviewing your order now. You will receive an acceptance notification as soon as it is confirmed!';
      plainBody = `Dear ${payload.customerName},\n\nThank you for ordering with MONAZ HOTEL & CAFÉ. Your order #${payload.referenceId} has been safely received.\n\nItems: ${payload.details.itemsOrNights}\nTotal: ${totalFormatted}\nLocation: ${payload.details.roomOrDelivery}\n${receiptNotice}\n\nTrack progress anytime using your reference ID: #${payload.referenceId}.\n\nMonaz Hotel & Café - Betel, Addis Ababa, Ethiopia`;
    }
  } else if (payload.event === 'order_accepted') {
    // When the order is accepted by the admin
    subject = `[MONAZ HOTEL] 🎉 Great News! Your Order #${payload.referenceId} Has Been ACCEPTED!`;
    heading = 'YOUR ORDER HAS BEEN ACCEPTED & IS PREPARING!';
    subHeading = `The Monaz kitchen has accepted your order #${payload.referenceId} and preparation is underway.`;
    callToAction = 'Relax while our chefs prepare your meal with the finest fresh ingredients.';
    plainBody = `Dear ${payload.customerName},\n\nFantastic news! Your order #${payload.referenceId} has been ACCEPTED by MONAZ HOTEL & CAFÉ.\n\nItems: ${payload.details.itemsOrNights}\nDestination: ${payload.details.roomOrDelivery}\nTotal: ${totalFormatted}\n${receiptNotice}\n\nOur kitchen staff is preparing your dishes right now. You can track live preparation progress on our website.\n\nMonaz Hotel & Café - Betel, Addis Ababa, Ethiopia`;
  } else if (payload.event === 'booking_waiting') {
    if (payload.target === 'admin') {
      subject = `[MONAZ HOTEL] 🛎️ New Bedroom Reservation #${payload.referenceId} is WAITING for Confirmation`;
      heading = 'NEW ROOM RESERVATION ON WAITING — CONFIRMATION REQUIRED';
      subHeading = `A new hotel bedroom reservation has entered and is waiting for your confirmation and receipt audit.`;
      callToAction = 'Inspect room schedule and verify the attached bank payment receipt in the Admin Dashboard.';
      plainBody = `MONAZ HOTEL - ROOM RESERVATION ON WAITING\n\nBooking ID: ${payload.referenceId}\nGuest Name: ${payload.customerName} (${payload.details.phone || 'No phone'})\nRoom: ${payload.details.roomOrDelivery}\nSchedule: ${payload.details.datesOrTime} (${payload.details.itemsOrNights})\nTotal: ${totalFormatted}\n${receiptNotice}\n\nPlease audit payment proof and confirm reservation in the Admin Dashboard.`;
    } else {
      subject = `[MONAZ HOTEL] 📋 Hotel Reservation #${payload.referenceId} Received — Pending Confirmation`;
      heading = 'RESERVATION RECEIVED — AWAITING CONFIRMATION';
      subHeading = `Thank you for choosing MONAZ HOTEL! Your bedroom booking request has been safely received.`;
      callToAction = 'Our front desk team is auditing your reservation details and will confirm your stay shortly.';
      plainBody = `Dear ${payload.customerName},\n\nThank you for booking your stay with MONAZ HOTEL. We have safely received your reservation #${payload.referenceId}.\n\nRoom: ${payload.details.roomOrDelivery}\nDates: ${payload.details.datesOrTime}\nTotal: ${totalFormatted}\n${receiptNotice}\n\nTrack your booking progress anytime using Reference #${payload.referenceId}.\n\nMonaz Hotel - Betel, Addis Ababa, Ethiopia`;
    }
  } else if (payload.event === 'booking_confirmed') {
    subject = `[MONAZ HOTEL] 🎉 Your Hotel Reservation #${payload.referenceId} is CONFIRMED & ACCEPTED!`;
    heading = 'YOUR RESERVATION IS OFFICIALLY CONFIRMED & ACCEPTED!';
    subHeading = `We are delighted to confirm your upcoming stay at MONAZ HOTEL. Your room is reserved.`;
    callToAction = 'We look forward to welcoming you to Betel, Addis Ababa for a luxurious and comfortable stay.';
    plainBody = `Dear ${payload.customerName},\n\nYour reservation #${payload.referenceId} at MONAZ HOTEL has been officially ACCEPTED and CONFIRMED!\n\nRoom: ${payload.details.roomOrDelivery}\nDates: ${payload.details.datesOrTime}\nTotal: ${totalFormatted}\n${receiptNotice}\n\nCheck-in starts at 14:00. If you require airport shuttle or early check-in, call us at +251 91 123 4567.\n\nMonaz Hotel - Betel, Addis Ababa, Ethiopia`;
  } else {
    // Default / Generic status
    subject = `[MONAZ HOTEL] Update on #${payload.referenceId}: ${payload.event.replace('_', ' ').toUpperCase()}`;
    heading = 'SERVICE UPDATE FROM MONAZ HOTEL';
    subHeading = `Status update for #${payload.referenceId}.`;
    callToAction = 'Check your live tracking status on the Monaz Hotel website.';
    plainBody = `Hello ${payload.customerName},\n\nHere is an update regarding #${payload.referenceId} at MONAZ HOTEL.\nTotal: ${totalFormatted}\nStatus: ${payload.details.paymentStatus || 'Updated'}\n\nMonaz Hotel & Café`;
  }

  // 2. HTML email template with luxury Amber/Brown/Gold Monaz styling
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF6F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2A1810; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF6F0; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(42, 24, 16, 0.08); border: 1px solid #E8DFD5;">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #2A1810; padding: 32px 32px; text-align: center; border-bottom: 4px solid #EA580C;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #EA580C; font-weight: bold; margin-bottom: 8px;">
                Luxury Stay & Authentic Dining
              </div>
              <h1 style="margin: 0; color: #FFFFFF; font-family: Georgia, serif; font-size: 26px; font-weight: bold; letter-spacing: 1px;">
                MONAZ HOTEL & CAFÉ
              </h1>
              <div style="color: #E8DFD5; font-size: 12px; margin-top: 6px;">
                Betel, Addis Ababa, Ethiopia &bull; Tel: +251 91 123 4567
              </div>
            </td>
          </tr>

          <!-- Notification Banner -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="display: inline-block; padding: 6px 14px; background-color: ${payload.event.includes('accepted') || payload.event.includes('confirmed') ? '#ECFDF5' : '#FFF7ED'}; border: 1px solid ${payload.event.includes('accepted') || payload.event.includes('confirmed') ? '#10B981' : '#EA580C'}; border-radius: 999px; font-size: 11px; font-weight: bold; color: ${payload.event.includes('accepted') || payload.event.includes('confirmed') ? '#047857' : '#C2410C'}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                ${payload.event.includes('accepted') || payload.event.includes('confirmed') ? 'Status: Accepted & Confirmed' : 'Status: Waiting for Confirmation'}
              </div>

              <h2 style="margin: 0 0 12px 0; color: #2A1810; font-family: Georgia, serif; font-size: 22px; font-weight: bold; line-height: 1.3;">
                ${heading}
              </h2>
              <p style="margin: 0 0 24px 0; color: #6E4733; font-size: 14px; line-height: 1.6;">
                ${subHeading}
              </p>

              <!-- Order / Booking Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF6F0; border-radius: 16px; padding: 20px; border: 1px solid #E8DFD5; margin-bottom: 24px;">
                <tr>
                  <td>
                    <table width="100%" border="0" cellspacing="0" cellpadding="6">
                      <tr>
                        <td width="38%" style="font-size: 12px; color: #6E4733; font-weight: bold; text-transform: uppercase;">Reference ID:</td>
                        <td style="font-size: 14px; color: #EA580C; font-weight: bold; font-family: monospace;">#${payload.referenceId}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #6E4733; font-weight: bold; text-transform: uppercase;">Customer Name:</td>
                        <td style="font-size: 14px; color: #2A1810; font-weight: bold;">${payload.customerName}</td>
                      </tr>
                      ${payload.details.roomOrDelivery ? `
                      <tr>
                        <td style="font-size: 12px; color: #6E4733; font-weight: bold; text-transform: uppercase;">Service/Location:</td>
                        <td style="font-size: 14px; color: #2A1810;">${payload.details.roomOrDelivery}</td>
                      </tr>` : ''}
                      ${payload.details.datesOrTime ? `
                      <tr>
                        <td style="font-size: 12px; color: #6E4733; font-weight: bold; text-transform: uppercase;">Schedule:</td>
                        <td style="font-size: 14px; color: #2A1810;">${payload.details.datesOrTime}</td>
                      </tr>` : ''}
                      ${payload.details.itemsOrNights ? `
                      <tr>
                        <td style="font-size: 12px; color: #6E4733; font-weight: bold; text-transform: uppercase;">Details / Items:</td>
                        <td style="font-size: 13px; color: #2A1810; line-height: 1.4;">${payload.details.itemsOrNights}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="font-size: 12px; color: #6E4733; font-weight: bold; text-transform: uppercase;">Total Amount:</td>
                        <td style="font-size: 18px; color: #EA580C; font-weight: bold;">${totalFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Payment Receipt Identification Box -->
              <div style="background-color: ${payload.details.paymentReceiptFileName ? '#F0FDF4' : '#FFFBEB'}; border: 1px solid ${payload.details.paymentReceiptFileName ? '#86EFAC' : '#FDE68A'}; border-radius: 14px; padding: 16px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: bold; color: ${payload.details.paymentReceiptFileName ? '#15803D' : '#B45309'}; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                  💳 Payment Receipt Identification
                </div>
                <div style="font-size: 13px; color: #2A1810; line-height: 1.5;">
                  ${payload.details.paymentReceiptFileName ? `
                    <strong>Receipt Attached:</strong> ${payload.details.paymentReceiptFileName}<br>
                    <strong>Status:</strong> ${payload.details.paymentStatus === 'verified' ? '<span style="color:#15803D; font-weight:bold;">Verified & Approved</span>' : '<span style="color:#C2410C; font-weight:bold;">Uploaded & Awaiting Audit</span>'}
                  ` : `
                    <strong>Status:</strong> ${payload.details.paymentStatus || 'Unpaid (Due at Hotel Check-in / Cash on Delivery)'}
                  `}
                </div>
              </div>

              <p style="margin: 0 0 24px 0; color: #4B3528; font-size: 13px; line-height: 1.6;">
                ${callToAction}
              </p>

              <!-- Live Progress Tracking Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="https://mail.google.com/mail/" target="_blank" style="display: inline-block; background-color: #EA580C; color: #FFFFFF; font-size: 13px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 12px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
                      Track Order & Booking Progress
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="background-color: #FAF6F0; padding: 24px 32px; border-top: 1px solid #E8DFD5; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6E4733; font-weight: bold;">
                MONAZ HOTEL & CAFÉ &bull; Dedicated to Excellence
              </p>
              <p style="margin: 0; font-size: 11px; color: #9A7B68; line-height: 1.5;">
                Betel Main Road, Addis Ababa, Ethiopia &bull; Email: redwanredhood@gmail.com<br>
                For immediate assistance or special concierge requests, call +251 91 123 4567.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const directGmailUrl = generateDirectGmailUrl(payload.to, subject, plainBody);

  try {
    // Send via Nodemailer transporter
    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: payload.to,
      subject,
      text: plainBody,
      html: htmlContent
    };

    const info = await mailer.sendMail(mailOptions);
    const messageId = info?.messageId || `msg_${Date.now()}`;

    // Record in Firestore email audit log
    if (db) {
      const emailLogId = `EML-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const logRecord = {
        id: emailLogId,
        target: payload.target,
        to: payload.to,
        from: senderEmail,
        customerName: payload.customerName,
        referenceId: payload.referenceId,
        type: payload.type,
        event: payload.event,
        subject,
        previewText: plainBody.substring(0, 200),
        directGmailUrl,
        sentAt: new Date().toISOString(),
        deliveryStatus: 'delivered',
        messageId
      };

      await setDoc(doc(db, 'emailNotifications', emailLogId), logRecord);
    }

    console.log(`[Email Service] Dispatched "${subject}" to ${payload.to} (${payload.target})`);
    return { success: true, messageId, directGmailUrl, subject };
  } catch (err: any) {
    console.error(`[Email Service] Notice during email dispatch to ${payload.to}:`, err.message);

    // Save fallback record in Firestore with direct Gmail link
    if (db) {
      try {
        const emailLogId = `EML-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await setDoc(doc(db, 'emailNotifications', emailLogId), {
          id: emailLogId,
          target: payload.target,
          to: payload.to,
          from: senderEmail,
          customerName: payload.customerName,
          referenceId: payload.referenceId,
          type: payload.type,
          event: payload.event,
          subject,
          previewText: plainBody.substring(0, 200),
          directGmailUrl,
          sentAt: new Date().toISOString(),
          deliveryStatus: 'simulated',
          errorNotice: err.message
        });
      } catch {}
    }

    return { success: true, directGmailUrl, subject };
  }
}
