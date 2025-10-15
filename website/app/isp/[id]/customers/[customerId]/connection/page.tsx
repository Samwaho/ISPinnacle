"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessDenied } from "@/components/ui/access-denied";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, HardDrive, Timer, Wifi } from "lucide-react";

function formatBytes(bytes: bigint | number | null | undefined): string {
  const n = typeof bytes === "bigint" ? Number(bytes) : bytes ?? 0;
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let idx = 0;
  let val = n;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val.toFixed(1)} ${units[idx]}`;
}

function formatDuration(seconds: number | null | undefined): string {
  const s = seconds ?? 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = Math.floor(s % 60);
  const parts = [] as string[];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${rem}s`);
  return parts.join(" ");
}

const ConnectionPage = () => {
  const { id, customerId } = useParams();
  const t = useTRPC();

  const { data: perms, isLoading: permsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: id as string })
  );

  const { data: customer, isPending: customerPending } = useQuery(
    t.customer.getCustomerById.queryOptions({ id: customerId as string, organizationId: id as string })
  );

  const { data: connection, isPending } = useQuery({
    ...t.customer.getCustomerConnection.queryOptions({ customerId: customerId as string, organizationId: id as string }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const canView = perms?.canViewCustomers || false;

  if (permsLoading) {
    return (
      <div className="flex flex-col gap-6 my-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
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

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20 ml-auto" />
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
        message="You don't have permission to view customers in this organization."
        showBackButton={true}
        backButtonLabel="Back to Customers"
        backButtonLink={`/isp/${id}/customers`}
      />
    );
  }

  const status = (connection?.sessionStatus || customer?.connectionStatus || "OFFLINE") as "ONLINE" | "OFFLINE" | "EXPIRED";
  const statusColor = status === "ONLINE" ? "green" : status === "EXPIRED" ? "red" : "orange";
  const statusClasses =
    status === "ONLINE"
      ? "bg-green-100 text-green-700 border-green-200"
      : status === "EXPIRED"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-orange-200 text-orange-800 border-orange-200";

  return (
    <div className="flex flex-col gap-6 my-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-3">
          <Wifi className="h-5 w-5" /> Connection • {customerPending ? <Skeleton className="h-5 w-40" /> : customer?.name}
          <Badge variant="outline" className={`ml-2 ${statusClasses}`}>
            {status}
          </Badge>
        </h3>
        <Button asChild variant="outline" size="sm">
          <Link href={`/isp/${id}/customers`}>Back to Customers</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isPending ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-6 border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Session Duration"
              value={formatDuration(connection?.currentSessionDuration || 0)}
              icon={<Timer className="h-5 w-5" />}
              color={statusColor}
              isClickable={false}
            />
            <StatCard
              title="Current Download"
              value={formatBytes(connection?.currentInputOctets)}
              icon={<HardDrive className="h-5 w-5" />}
              color="blue"
              isClickable={false}
            />
            <StatCard
              title="Current Upload"
              value={formatBytes(connection?.currentOutputOctets)}
              icon={<HardDrive className="h-5 w-5" />}
              color="indigo"
              isClickable={false}
            />
            <StatCard
              title="Total Online Time"
              value={formatDuration(connection?.totalSessionTime || 0)}
              icon={<CalendarClock className="h-5 w-5" />}
              color="purple"
              isClickable={false}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">NAS IP Address</div>
                <div>{connection?.nasIpAddress || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">NAS Port</div>
                <div>{connection?.nasPort || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Framed IP Address</div>
                <div>{connection?.framedIpAddress || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Calling Station ID</div>
                <div>{connection?.callingStationId || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Called Station ID</div>
                <div>{connection?.calledStationId || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Connection Type</div>
                <div>{connection?.connectionType || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Current Session Start</div>
                <div>{connection?.currentSessionStartTime ? new Date(connection.currentSessionStartTime).toLocaleString() : "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Session Stop</div>
                <div>{connection?.lastSessionStopTime ? new Date(connection.lastSessionStopTime).toLocaleString() : "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Update</div>
                <div>{connection?.lastUpdateTime ? new Date(connection.lastUpdateTime).toLocaleString() : "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Terminate Cause</div>
                <div>{connection?.lastTerminateCause || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Service Type</div>
                <div>{connection?.serviceType || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Framed Protocol</div>
                <div>{connection?.framedProtocol || "-"}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage Totals</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total Download</div>
                <div>{formatBytes(connection?.totalInputOctets)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Upload</div>
                <div>{formatBytes(connection?.totalOutputOctets)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Packets In</div>
                <div>{String(connection?.totalInputPackets ?? 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Packets Out</div>
                <div>{String(connection?.totalOutputPackets ?? 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Sessions</div>
                <div>{String(connection?.totalSessions ?? 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Session Duration</div>
                <div>{formatDuration(connection?.lastSessionDuration || 0)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectionPage;

