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
    const rawOrgId = resolvedParams.orgId;
    const orgId = Array.isArray(rawOrgId) ? rawOrgId[0] : rawOrgId;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const ctx = await createTRPCContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.hotspot.getOrganization({ orgId });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
