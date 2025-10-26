"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/table/DataTable";
import { voucherColumns } from "@/components/isp/voucher-columns";
import { Ticket, Plus, CheckCircle2, Clock3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { AccessDenied } from "@/components/ui/access-denied";

const VouchersPage = () => {
  const { id } = useParams();
  const t = useTRPC();
  const organizationId = id as string;

  const queryClient = useQueryClient();

  const { data: userPermissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: organizationId })
  );

  const { data, isPending } = useQuery(
    t.hotspot.getVouchers.queryOptions({ organizationId })
  );

  const vouchers = data?.vouchers ?? [];

  const total = isPending ? 0 : vouchers.length;
  const active = isPending ? 0 : vouchers.filter(v => v.status === 'ACTIVE').length;
  const pending = isPending ? 0 : vouchers.filter(v => v.status === 'PENDING').length;

  const canView = userPermissions?.canViewPackages || false; // reuse package permission
  const canManage = userPermissions?.canManagePackages || false;

  const { mutate: updateStatus } = useMutation(
    t.hotspot.updateVoucherStatus.mutationOptions({
      onSuccess: () => {
        toast.success('Voucher status updated');
        queryClient.invalidateQueries({
          queryKey: t.hotspot.getVouchers.queryKey({ organizationId }),
        });
      },
      onError: (err) => toast.error(err.message || 'Failed to update'),
    })
  );

  const columns = voucherColumns({
    canManage,
    onUpdateStatus: (voucher, status) => {
      updateStatus({ voucherId: voucher.id, status });
    },
  });

  if (permissionsLoading) {
    return (
      <div className="flex flex-col gap-6 my-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-6 border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-8 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to view vouchers in this organization."
        showBackButton={true}
        backButtonLabel="Back to Organization"
        backButtonLink={`/organization/${organizationId}`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 my-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isPending ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-lg p-6 border">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Vouchers"
              value={total.toString()}
              icon={<Ticket className="h-5 w-5" />}
              color="blue"
              isClickable={false}
            />
            <StatCard
              title="Active"
              value={active.toString()}
              icon={<CheckCircle2 className="h-5 w-5" />}
              color="green"
              isClickable={false}
            />
            <StatCard
              title="Pending"
              value={pending.toString()}
              icon={<Clock3 className="h-5 w-5" />}
              color="yellow"
              isClickable={false}
            />
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Ticket className="h-5 w-5" /> Vouchers
        </h3>
        {canManage && (
          <Link href={`/isp/${organizationId}/vouchers/new`}>
            <Button variant="gradient">
              <Plus className="h-5 w-5" /> Create Voucher
            </Button>
          </Link>
        )}
      </div>

      {isPending ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-8 rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={vouchers.map((v) => ({
            id: v.id,
            voucherCode: v.voucherCode,
            packageName: v.package?.name || '',
            phoneNumber: v.phoneNumber,
            amount: v.amount,
            status: v.status,
            expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
            usedAt: v.usedAt ? new Date(v.usedAt) : null,
            lastUsedAt: v.lastUsedAt ? new Date(v.lastUsedAt) : null,
            createdAt: v.createdAt instanceof Date ? v.createdAt : new Date(v.createdAt),
          }))}
          filterPlaceholder="Search vouchers..."
        />
      )}
    </div>
  );
};

export default VouchersPage;
