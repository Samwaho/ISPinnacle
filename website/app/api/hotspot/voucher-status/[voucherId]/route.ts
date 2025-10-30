import { NextRequest, NextResponse } from 'next/server';
import { appRouter } from '@/trpc/routers/_app';
import { createTRPCContext } from '@/trpc/init';
import { prisma } from '@/lib/db';

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const resolvedParams = context?.params ? await context.params : {};
    const rawVoucherId = resolvedParams.voucherId;
    const voucherId = Array.isArray(rawVoucherId) ? rawVoucherId[0] : rawVoucherId;
    const mode = request.nextUrl.searchParams.get('mode');

    if (!voucherId) {
      return NextResponse.json(
        { error: 'Voucher ID is required' },
        { status: 400 }
      );
    }

    if (mode === 'code') {
      const voucher = await prisma.hotspotVoucher.findFirst({
        where: {
          OR: [
            { voucherCode: voucherId },
            { id: voucherId },
          ],
        },
        include: {
          package: true,
          organization: true,
        },
      });

      if (!voucher) {
        return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
      }

      let remainingDuration: {
        milliseconds: number;
        hours: number;
        minutes: number;
        seconds: number;
      } | null = null;

      if (voucher.expiresAt) {
        const remainingMs = voucher.expiresAt.getTime() - Date.now();
        if (remainingMs > 0) {
          remainingDuration = {
            milliseconds: remainingMs,
            hours: Math.floor(remainingMs / (60 * 60 * 1000)),
            minutes: Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000)),
            seconds: Math.floor((remainingMs % (60 * 1000)) / 1000),
          };
        }
      }

      return NextResponse.json({
        voucher: {
          id: voucher.id,
          voucherCode: voucher.voucherCode,
          status: voucher.status,
          expiresAt: voucher.expiresAt,
          remainingDuration,
          package: voucher.package,
          organization: voucher.organization,
        },
      });
    }

    const ctx = await createTRPCContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hotspot.getVoucherStatus({ voucherId });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching voucher status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
