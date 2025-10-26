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

    // KopoKopo may send different structures; normalize common fields
    const eventType: string | undefined = body.event_type || body.eventType || body.type;
    const resource = body.resource || body.data || {};
    const metadata = body.metadata || resource.metadata || {};
    const embedded = body._embedded || {};

    // Success indicator and core fields
    const status: string = (resource.status || body.status || '').toString().toUpperCase();
    const amountRaw = resource.amount || resource.value || body.amount || 0;
    const amount = typeof amountRaw === 'string' ? parseFloat(amountRaw) : Number(amountRaw || 0);
    const tillNumber: string = resource.till_number || resource.tillNumber || metadata.till_number || '';
    const transactionId: string = resource.id || resource.transaction_id || metadata.transaction_id || metadata.reference || '';
    const phoneRaw = embedded.customer?.phone_number || resource.phone_number || resource.msisdn || metadata.msisdn || '';
    const phoneNumber = String(phoneRaw || '');
    const reference: string = metadata.reference || metadata.account_reference || metadata.ref || '';

    if (!tillNumber) {
      return NextResponse.json({ success: false, message: 'Missing till number' }, { status: 400 });
    }

    if (!amount || Number.isNaN(amount)) {
      return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
    }

    const isSuccess = status === 'SUCCESS' || /success/i.test(eventType || '') || /paid|complete/i.test(status);

    if (!isSuccess) {
      console.log('K2 Callback not success; storing for audit');
      try {
        await storeKopoKopoTransaction(
          transactionId || `K2-${Date.now()}`,
          amount,
          new Date(),
          tillNumber,
          phoneNumber,
          phoneNumber,
          reference || '',
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
        new Date(),
        tillNumber,
        phoneNumber,
        phoneNumber,
        voucher?.voucherCode || reference || '',
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
        const usageExpiry = updated.lastUsedAt ? 
          new Date(updated.lastUsedAt.getTime() + /* default hours */ 60 * 60 * 1000) :
          new Date(updated.expiresAt || new Date());
        const expiry = usageExpiry.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
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
      } catch (err) {
        console.error('Failed to process PPPoE payment via K2:', err);
        // continue
      }
    }

    return NextResponse.json({ success: true, message: 'K2 callback processed' });
  } catch (error) {
    console.error('Error processing K2 callback:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'K2 callback endpoint active', timestamp: new Date().toISOString() });
}
