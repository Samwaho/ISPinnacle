import { NextRequest, NextResponse } from 'next/server';
import { appRouter } from '@/trpc/routers/_app';
import { createTRPCContext } from '@/trpc/init';

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

    if (!voucherId) {
      return NextResponse.json(
        { error: 'Voucher ID is required' },
        { status: 400 }
      );
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
