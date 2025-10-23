import { NextRequest, NextResponse } from 'next/server';
import { appRouter } from '@/trpc/routers/_app';
import { createTRPCContext } from '@/trpc/init';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const ctx = await createTRPCContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.hotspot.purchaseVoucher(body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating voucher:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}