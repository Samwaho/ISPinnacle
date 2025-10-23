import { NextRequest, NextResponse } from 'next/server';
import { appRouter } from '@/trpc/routers/_app';
import { createTRPCContext } from '@/trpc/init';

export async function GET(
  request: NextRequest,
  { params }: { params: { voucherId: string } }
) {
  try {
    const ctx = await createTRPCContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.hotspot.getVoucherStatus({ voucherId: params.voucherId });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching voucher status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
