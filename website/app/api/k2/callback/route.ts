import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { storeKopoKopoTransaction, processCustomerPayment } from '@/lib/server-hooks';
import { TransactionSource } from '@/lib/generated/prisma';
import { SmsService } from '@/lib/sms';

// Kopo Kopo webhook for Incoming Payments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    console.log('K2 Callback received:', JSON.stringify(body, null, 2));

    // Normalize common sections from Kopo Kopo payload
    const data = body.data ?? {};
    const attributes = data.attributes ?? body.attributes ?? {};
    const event = attributes.event ?? body.event ?? {};
    const resource =
      event.resource ??
      attributes.resource ??
      body.resource ??
      {};
    const metadata =
      attributes.metadata ??
      event.metadata ??
      resource.metadata ??
      body.metadata ??
      {};
    const embedded = body._embedded ?? {};

    const eventType: string | undefined =
      body.event_type ||
      body.eventType ||
      body.type ||
      event.type;

    // Success indicator and core fields
    const statusString =
      attributes.status ||
      resource.status ||
      body.status ||
      '';
    const status = statusString.toString().toUpperCase();

    const extractAmount = (value: unknown): number => {
      if (value == null) return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return parseFloat(value);
      if (typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
        return extractAmount((value as Record<string, unknown>).value);
      }
      return 0;
    };

    const amount = (() => {
      const primary = extractAmount(resource.amount);
      if (primary) return primary;
      const secondary = extractAmount(attributes.amount ?? body.amount);
      return secondary;
    })();

    const tillNumber: string =
      resource.till_number ||
      resource.tillNumber ||
      metadata.till_number ||
      metadata.tillNumber ||
      '';

    const transactionId: string =
      data.id ||
      resource.id ||
      metadata.transaction_id ||
      metadata.reference ||
      '';

    const phoneRaw =
      resource.sender_phone_number ||
      resource.phone_number ||
      metadata.phone_number ||
      metadata.msisdn ||
      embedded.customer?.phone_number ||
      '';
    const phoneNumber = String(phoneRaw || '');

    const referenceRaw: string =
      metadata.reference ||
      resource.reference ||
      metadata.account_reference ||
      metadata.ref ||
      '';
    const reference = typeof referenceRaw === 'string' ? referenceRaw.trim() : '';

    const transactionTime =
      attributes.initiation_time ||
      resource.transaction_time ||
      resource.origination_time ||
      body.timestamp ||
      new Date().toISOString();
    const transactionDateTime = isNaN(Date.parse(transactionTime))
      ? new Date()
      : new Date(transactionTime);

    const payerName =
      [resource.sender_first_name, resource.sender_middle_name, resource.sender_last_name]
        .filter(Boolean)
        .join(' ')
        .trim() || phoneNumber;

    if (!tillNumber) {
      console.error('K2 Callback missing till number', { transactionId, metadata, resource });
      return NextResponse.json({ success: false, message: 'Missing till number' }, { status: 400 });
    }

    if (!amount || Number.isNaN(amount)) {
      console.error('K2 Callback invalid amount', { transactionId, amount, resource });
      return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
    }

    const isSuccess = status === 'SUCCESS' || /success/i.test(eventType || '') || /paid|complete/i.test(status);

    if (!isSuccess) {
      console.log('K2 Callback not success; storing for audit');
      try {
        await storeKopoKopoTransaction(
          transactionId || `K2-${Date.now()}`,
          amount,
          transactionDateTime,
          tillNumber,
          payerName,
          phoneNumber,
          reference || transactionId || '',
          transactionId || '',
          0,
          TransactionSource.OTHER
        );
      } catch (e) {
        console.error('Failed to store failed K2 transaction:', e);
      }
      return NextResponse.json({ success: true, message: 'Callback processed (non-success status)' });
    }

    // Attempt to resolve voucher by reference first (we pre-store voucher.id in reference)
    const voucher = await prisma.hotspotVoucher.findFirst({
      where: {
        OR: [
          { id: reference },
          { paymentReference: reference },
          { voucherCode: reference },
        ],
      },
    });

    try {
      await storeKopoKopoTransaction(
        transactionId || `K2-${Date.now()}`,
        amount,
        transactionDateTime,
        tillNumber,
        payerName,
        phoneNumber,
        voucher?.voucherCode || reference || transactionId || '',
        transactionId || '',
        0,
        voucher ? TransactionSource.HOTSPOT : TransactionSource.PPPOE
      );
      console.log('K2 transaction stored');
    } catch (e) {
      console.error('Error storing K2 transaction:', e);
      // continue
    }

    if (voucher) {
      // Activate voucher
      const updated = await prisma.hotspotVoucher.update({
        where: { id: voucher.id },
        data: {
          status: 'ACTIVE',
          paymentGateway: 'KOPOKOPO',
          paymentReference: transactionId || reference,
        },
        include: {
          package: true,
          organization: true,
        }
      });

      // Try to send voucher SMS
      try {
        const org = await prisma.organization.findUnique({ where: { id: updated.organizationId }, select: { name: true } });
        const pkg = updated.package;
        const expiryDate = updated.expiresAt ? new Date(updated.expiresAt) : new Date();
        const expiry = expiryDate.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        await SmsService.sendTemplateSms({
          organizationId: updated.organizationId,
          templateName: 'hotspot_voucher',
          phoneNumber: updated.phoneNumber,
          variables: {
            voucherCode: updated.voucherCode,
            packageName: pkg?.name || 'Hotspot Package',
            amount: String(pkg?.price ?? ''),
            expiryDate: expiry,
            organizationName: org?.name || 'ISPinnacle',
          }
        });
      } catch (smsErr) {
        console.error('Failed to send K2 voucher SMS:', smsErr);
      }

      return NextResponse.json({ success: true, message: 'Voucher payment processed', voucherId: voucher.id });
    }

    // Otherwise, treat reference as PPPoE username for customer payment
    if (reference) {
      try {
        await processCustomerPayment(reference, amount);
        console.log('Processed PPPoE payment via K2', { reference, amount, transactionId });
      } catch (err) {
        console.error('Failed to process PPPoE payment via K2:', err);
        // continue
      }
    }

    return NextResponse.json({
      success: true,
      message: 'K2 callback processed',
      transactionId: transactionId || null,
    });
  } catch (error) {
    console.error('Error processing K2 callback:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'K2 callback endpoint active', timestamp: new Date().toISOString() });
}
