"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AccessDenied } from "@/components/ui/access-denied";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { DeviceSecretsDialog } from "@/components/isp/devices/device-secrets-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganizationDeviceStatus } from "@/lib/generated/prisma";
import type { RouterOsQueryResponse } from "@/lib/routeros-api";
import { getDeviceWebSocketUrl } from "@/lib/routeros-ws";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Gauge, Network, Pencil, RefreshCw, Router, Server, Trash2 } from "lucide-react";

const STATUS_LABELS: Record<OrganizationDeviceStatus, string> = {
  [OrganizationDeviceStatus.ONLINE]: "Online",
  [OrganizationDeviceStatus.OFFLINE]: "Offline",
  [OrganizationDeviceStatus.MAINTENANCE]: "Maintenance",
  [OrganizationDeviceStatus.UNKNOWN]: "Unknown",
};

const STATUS_STYLES: Record<OrganizationDeviceStatus, string> = {
  [OrganizationDeviceStatus.ONLINE]: "bg-emerald-100 text-emerald-700 border-transparent dark:bg-emerald-500/20 dark:text-emerald-100",
  [OrganizationDeviceStatus.OFFLINE]: "bg-rose-100 text-rose-700 border-transparent dark:bg-rose-500/20 dark:text-rose-100",
  [OrganizationDeviceStatus.MAINTENANCE]: "bg-amber-100 text-amber-700 border-transparent dark:bg-amber-500/20 dark:text-amber-100",
  [OrganizationDeviceStatus.UNKNOWN]: "bg-slate-100 text-slate-700 border-transparent dark:bg-slate-500/20 dark:text-slate-100",
};

const DeviceDetailPage = () => {
  const params = useParams<{ id: string; deviceId: string }>();
  const organizationId = params.id as string;
  const deviceId = params.deviceId as string;
  const router = useRouter();
  const t = useTRPC();
  const { data: permissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: organizationId })
  );
  const canView = permissions?.canViewDevices ?? false;
  const canManage = permissions?.canManageDevices ?? false;
  const wsUrl = React.useMemo(() => getDeviceWebSocketUrl(deviceId), [deviceId]);
  const insecureWsInSecurePage =
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    (wsUrl?.startsWith("ws://") ?? false);
  const deviceQuery = t.devices.get.queryOptions({ id: deviceId, organizationId });
  const {
    data: device,
    isPending: devicePending,
    refetch: refetchDevice,
  } = useQuery({
    ...deviceQuery,
    enabled: canView,
  });
  const {
    data: deviceSecrets,
  } = useQuery({
    ...t.devices.secrets.queryOptions({ id: deviceId, organizationId }),
    enabled: canManage,
  });
  const allowStreaming = Boolean(wsUrl && deviceSecrets?.routerOsPassword && !insecureWsInSecurePage);

  const [liveQuery, setLiveQuery] = React.useState<RouterOsQueryResponse | null>(null);
  const [liveQueryError, setLiveQueryError] = React.useState<string | null>(null);
  const inFlightRef = React.useRef(false);
  const websocketRef = React.useRef<WebSocket | null>(null);
  const seededInitialFetch = React.useRef(false);
  const [streamingActive, setStreamingActive] = React.useState(allowStreaming);
  const streamingBlockedRef = React.useRef(false);
  const [streamSession, setStreamSession] = React.useState(0);

  const { mutate: syncDevice, isPending: syncing } = useMutation(
    t.devices.fetchStatus.mutationOptions({
      onSuccess: (response) => {
        toast.success("Device synced successfully");
        setLiveQuery(response);
        setLiveQueryError(null);
        refetchDevice();
      },
      onError: (error) => {
        const message = error.message || "Failed to contact device";
        setLiveQueryError(message);
        toast.error(message);
      },
      onSettled: () => {
        inFlightRef.current = false;
      },
    })
  );

  const [showDelete, setShowDelete] = React.useState(false);
  const { mutate: deleteDevice, isPending: deleting } = useMutation(
    t.devices.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Device deleted");
        router.push(`/isp/${organizationId}/devices`);
      },
      onError: (error) => toast.error(error.message || "Failed to delete device"),
    })
  );

  const triggerLiveQuery = React.useCallback(() => {
    if (!device || inFlightRef.current || streamingActive) return;
    inFlightRef.current = true;
    syncDevice({ id: device.id, organizationId });
  }, [device, organizationId, streamingActive, syncDevice]);

  React.useEffect(() => {
    setStreamingActive(allowStreaming);
    streamingBlockedRef.current = false;
  }, [allowStreaming]);

  React.useEffect(() => {
    if (!device || seededInitialFetch.current) return;
    seededInitialFetch.current = true;
    syncDevice({ id: device.id, organizationId });
  }, [device, organizationId, syncDevice]);

  React.useEffect(() => {
    if (insecureWsInSecurePage) {
      setLiveQueryError("Live stream disabled on HTTPS because the WebSocket endpoint is not using WSS. Use manual refresh or configure WSS.");
      setStreamingActive(false);
      streamingBlockedRef.current = true;
    }
  }, [insecureWsInSecurePage]);

  React.useEffect(() => {
    if (!device || !wsUrl || streamingBlockedRef.current || !deviceSecrets?.routerOsPassword) return;

    const connect = () => {
      if (streamingBlockedRef.current) return;
      if (process.env.NODE_ENV !== "production") {
        console.info("[routeros] opening websocket", { deviceId: device.id, wsUrl });
      }
      let socket: WebSocket;
      try {
        socket = new WebSocket(wsUrl);
      } catch (error) {
        setLiveQueryError("WebSocket blocked by browser security. Use manual refresh or configure a secure (wss://) endpoint.");
        setStreamingActive(false);
        streamingBlockedRef.current = true;
        if (process.env.NODE_ENV !== "production") {
          console.warn("[routeros] websocket failed to open", { deviceId: device.id, error });
        }
        return;
      }
      websocketRef.current = socket;

      socket.onopen = () => {
        setLiveQueryError(null);
        setStreamingActive(true);
        streamingBlockedRef.current = false;
        if (process.env.NODE_ENV !== "production") {
          console.info("[routeros] websocket connected", { deviceId: device.id });
        }
        if (deviceSecrets?.routerOsPassword) {
          const handshake = {
            deviceId: device.id,
            address: device.routerOsHost,
            username: device.routerOsUsername,
            password: deviceSecrets.routerOsPassword,
            port: device.routerOsPort,
            useSsl: false,
            queries: ["systemResources", "interfaces", "pppActive", "hotspotActive"],
            intervalMs: 5000,
          };
          socket.send(JSON.stringify(handshake));
        }
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as
            | RouterOsQueryResponse
            | { type: string; message?: string; error?: string; results?: RouterOsQueryResponse };
          if ("type" in payload) {
            if (payload.type === "data" && payload.results) {
              setLiveQuery(payload.results as unknown as RouterOsQueryResponse);
              setLiveQueryError(null);
              setStreamingActive(true);
            } else if (payload.type === "error") {
              setLiveQueryError(payload.message || payload.error || "Streaming error");
            }
          } else {
            setLiveQuery(payload as RouterOsQueryResponse);
            setLiveQueryError(null);
            setStreamingActive(true);
          }
        } catch (err) {
          setLiveQueryError("Malformed data from device stream");
          if (process.env.NODE_ENV !== "production") {
            console.warn("[routeros] malformed websocket payload", { err, payload: event.data });
          }
        }
      };

      socket.onerror = () => {
        setLiveQueryError("WebSocket connection error");
        setStreamingActive(false);
        if (process.env.NODE_ENV !== "production") {
          console.warn("[routeros] websocket error", { deviceId: device.id });
        }
      };

      socket.onclose = (event) => {
        websocketRef.current = null;
        const reason = (event.reason || "").toLowerCase();
        const unauthorized = reason.includes("401") || reason.includes("unauthorized");
        if (process.env.NODE_ENV !== "production") {
          console.warn("[routeros] websocket closed", { deviceId: device.id, code: event.code, reason: event.reason, unauthorized });
        }
        streamingBlockedRef.current = true;
        const fallbackMessage = unauthorized
          ? "WebSocket auth failed; use manual refresh."
          : "Live stream unavailable; use manual refresh or retry.";
        setLiveQueryError(fallbackMessage);
        setStreamingActive(false);
      };
    };

    connect();

    return () => {
      streamingBlockedRef.current = true;
      setStreamingActive(false);
      setLiveQueryError(null);
      if (websocketRef.current) {
        websocketRef.current.onclose = null;
        websocketRef.current.close();
      }
    };
  }, [device, wsUrl, deviceSecrets, streamSession]);

  if (permissionsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!canView) {
    return (
      <AccessDenied
        title="Access restricted"
        message="You do not have permission to view router details."
        backButtonLabel="Back to devices"
        backButtonLink={`/isp/${organizationId}/devices`}
        showBackButton
      />
    );
  }

  if (devicePending) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!device) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device not found</CardTitle>
          <CardDescription>The device may have been deleted.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push(`/isp/${organizationId}/devices`)}>
            Back to devices
          </Button>
        </CardContent>
      </Card>
    );
  }

  const effectiveStatus = liveQuery
    ? OrganizationDeviceStatus.ONLINE
    : liveQueryError
      ? OrganizationDeviceStatus.OFFLINE
      : device.status;

  const lastSeen = liveQuery?.executedAt
    ? formatDistanceToNow(new Date(liveQuery.executedAt), { addSuffix: true })
    : device.lastSeenAt
      ? formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true })
      : "Never seen";
  const canRetryStream = allowStreaming && streamingBlockedRef.current;

  return (
    <div className="space-y-6">
      <Button
        variant="link"
        className="w-fit px-0"
        onClick={() => router.push(`/isp/${organizationId}/devices`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to devices
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Router className="h-6 w-6 text-primary" />
            {device.name}
          </CardTitle>
          <Badge className={STATUS_STYLES[effectiveStatus]}>
            {STATUS_LABELS[effectiveStatus]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Last seen {lastSeen}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={triggerLiveQuery}
            disabled={syncing}
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Refreshing..." : "Refresh now"}
          </Button>
          {canManage && (
            <DeviceSecretsDialog organizationId={organizationId} deviceId={device.id} />
          )}
          {canManage && (
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/isp/${organizationId}/devices/${device.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {canManage && (
            <Button size="sm" variant="destructive" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              Live device view
            </CardTitle>
            <CardDescription>
              {allowStreaming
                ? streamingActive
                  ? "Live stream via WebSocket to inspect resources, interfaces, and active sessions."
                  : "WebSocket unavailable, tap refresh for a manual pull."
                : "Manual refresh to pull live resources, interfaces, and session data."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {!streamingActive && (
              <Button
                size="sm"
                variant="outline"
                onClick={triggerLiveQuery}
                disabled={syncing}
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Contacting device..." : "Fetch now"}
              </Button>
            )}
            {canRetryStream && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  streamingBlockedRef.current = false;
                  setLiveQueryError(null);
                  setStreamSession((s) => s + 1);
                }}
              >
                Retry live stream
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {liveQueryError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to query device</AlertTitle>
              <AlertDescription>{liveQueryError}</AlertDescription>
            </Alert>
          ) : null}

          {liveQuery ? (
            <DeviceInsights query={liveQuery} />
          ) : (
            <OfflineNotice isLoading={syncing} />
          )}
        </CardContent>
      </Card>

      {canManage && (
        <DeleteConfirmationDialog
          isOpen={showDelete}
          onClose={() => setShowDelete(false)}
          onConfirm={() => deleteDevice({ id: device.id, organizationId })}
          title="Delete device?"
          description="This will remove the router record and revoke its VPN allocation."
          isLoading={deleting}
        />
      )}
    </div>
  );
};

export default DeviceDetailPage;

const formatBytes = (value: number | undefined) => {
  if (value === undefined || Number.isNaN(value)) return "-";
  if (value === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / Math.pow(1024, idx);
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[idx]}`;
};

const formatPercentage = (value: number | undefined) => {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${value.toFixed(0)}%`;
};

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const formatUptimeValue = (value: string | number | undefined) => {
  if (value === undefined || value === null) return "-";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "-";
    const seconds = Math.max(0, Math.floor(value));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return value || "-";
};

const DeviceInsights = ({ query }: { query: RouterOsQueryResponse }) => {
  const results = (query.results ?? {}) as Record<string, unknown>;
  const rawLogs = Array.isArray(query.rawResults) ? query.rawResults : [];
  const rawSystemResources = results["systemResources"];
  const systemResources = Array.isArray(rawSystemResources)
    ? ((rawSystemResources[0] ?? {}) as Record<string, unknown>)
    : ((rawSystemResources ?? {}) as Record<string, unknown>);
  const interfaces = Array.isArray(results["interfaces"])
    ? (results["interfaces"] as Record<string, unknown>[])
    : [];
  const pppActive = Array.isArray(results["pppActive"])
    ? (results["pppActive"] as Record<string, unknown>[])
    : [];
  const hotspotActive = Array.isArray(results["hotspotActive"])
    ? (results["hotspotActive"] as Record<string, unknown>[])
    : [];
  const cpuLoad = toNumber(systemResources["cpu-load"] ?? systemResources["cpuLoad"]);
  const cpuName = (systemResources["cpu"] ?? systemResources["cpuName"]) as string | undefined;
  const cpuCount = toNumber(systemResources["cpu-count"] ?? systemResources["cpuCount"]);
  const cpuFrequency = toNumber(systemResources["cpu-frequency"] ?? systemResources["cpuFrequency"]);
  const architecture = (systemResources["architecture-name"] ?? systemResources["architectureName"]) as string | undefined;
  const totalMemory = toNumber(systemResources["total-memory"] ?? systemResources["totalMemory"]);
  const freeMemory = toNumber(systemResources["free-memory"] ?? systemResources["freeMemory"]);
  const usedMemory = totalMemory !== undefined && freeMemory !== undefined ? totalMemory - freeMemory : undefined;
  const memoryPercent =
    totalMemory && usedMemory !== undefined ? Math.min(100, (usedMemory / totalMemory) * 100) : undefined;
  const totalHdd = toNumber(systemResources["total-hdd-space"] ?? systemResources["totalHddSpace"]);
  const freeHdd = toNumber(systemResources["free-hdd-space"] ?? systemResources["freeHddSpace"]);
  const usedHdd = totalHdd !== undefined && freeHdd !== undefined ? totalHdd - freeHdd : undefined;
  const hddPercent = totalHdd && usedHdd !== undefined ? Math.min(100, (usedHdd / totalHdd) * 100) : undefined;
  const uptime = (systemResources["uptime"] ?? systemResources["uptimeSeconds"]) as string | number | undefined;
  const board = (systemResources["board-name"] ?? systemResources["boardName"] ?? systemResources["platform"]) as
    | string
    | undefined;
  const version = (systemResources["version"] ?? systemResources["routerOsVersion"]) as string | undefined;

  const totalRx = interfaces.reduce((acc, item) => acc + (toNumber(item["rx-byte"] ?? item["rxBytes"]) ?? 0), 0);
  const totalTx = interfaces.reduce((acc, item) => acc + (toNumber(item["tx-byte"] ?? item["txBytes"]) ?? 0), 0);

  const executedAt = query.executedAt ? new Date(query.executedAt) : null;
  const executedLabel = executedAt ? formatDistanceToNow(executedAt, { addSuffix: true }) : "Just now";
  const defaultTab = interfaces.length > 0 ? "interfaces" : pppActive.length > 0 ? "ppp" : "hotspot";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Server className="h-4 w-4" />
            System resources
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>CPU load</span>
              <span className="font-medium">{formatPercentage(cpuLoad)}</span>
            </div>
            <Progress value={cpuLoad ?? 0} />
            <div className="flex items-center justify-between text-sm">
              <span>Memory</span>
              <span className="font-medium">
                {formatBytes(usedMemory)} / {formatBytes(totalMemory)}
              </span>
            </div>
            <Progress value={memoryPercent ?? 0} />
            <p className="text-xs text-muted-foreground">
              {board ? `${board}` : "-"} {version ? `| v${version}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Uptime: {typeof uptime === "number" ? `${Math.floor(uptime / 3600)}h` : uptime || "-"}
            </p>
            <p className="text-xs text-muted-foreground">Last queried {executedLabel}</p>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Server className="h-4 w-4" />
            CPU / Platform
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>CPU</span>
              <span className="font-medium">{cpuName ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cores</span>
              <span className="font-medium">{cpuCount ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Frequency</span>
              <span className="font-medium">
                {cpuFrequency ? `${cpuFrequency} MHz` : "-"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Arch: {architecture ?? "-"}</p>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Network className="h-4 w-4" />
            Traffic totals
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>RX</span>
              <span className="font-medium">{formatBytes(totalRx)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>TX</span>
              <span className="font-medium">{formatBytes(totalTx)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Aggregated across all interfaces</p>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Server className="h-4 w-4" />
            Storage
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Used</span>
              <span className="font-medium">
                {formatBytes(usedHdd)} / {formatBytes(totalHdd)}
              </span>
            </div>
            <Progress value={hddPercent ?? 0} />
            <p className="text-xs text-muted-foreground">
              Free: {formatBytes(freeHdd)}
            </p>
          </div>
        </div>

      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">Interfaces & sessions</p>
          <p className="text-xs text-muted-foreground">
            Live data from RouterOS; totals refresh with streaming or manual pulls.
          </p>
        </div>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full overflow-x-auto sm:w-fit">
            <TabsTrigger value="interfaces">Interfaces ({interfaces.length})</TabsTrigger>
            <TabsTrigger value="ppp">PPP Active ({pppActive.length})</TabsTrigger>
            <TabsTrigger value="hotspot">Hotspot Active ({hotspotActive.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="interfaces" className="mt-4">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">RX</TableHead>
                    <TableHead className="text-right">TX</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interfaces.map((iface, idx) => {
                    const name = (iface["name"] ?? iface["interface"]) as string | undefined;
                    const type = (iface["type"] ?? iface["interface-type"]) as string | undefined;
                    const running = (iface["running"] ?? iface["active"]) as boolean | string | undefined;
                    const rxBytes = toNumber(iface["rx-byte"] ?? iface["rxBytes"]);
                    const txBytes = toNumber(iface["tx-byte"] ?? iface["txBytes"]);
                    const isRunning = running === true || running === "true" || running === "running";
                    return (
                      <TableRow key={name ?? type ?? idx}>
                        <TableCell className="font-medium">{name ?? "Interface"}</TableCell>
                        <TableCell>{type ?? "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={isRunning ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}
                          >
                            {isRunning ? "Running" : "Idle"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatBytes(rxBytes)}</TableCell>
                        <TableCell className="text-right">{formatBytes(txBytes)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {interfaces.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No interfaces returned from the device.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="ppp" className="mt-4">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Remote address</TableHead>
                    <TableHead>Caller ID</TableHead>
                    <TableHead className="text-right">Uptime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pppActive.map((session, idx) => {
                    const user = (session["name"] ?? session["user"]) as string | undefined;
                    const service = (session["service"] ?? session["type"]) as string | undefined;
                    const address = (session["address"] ?? session["remote-address"]) as string | undefined;
                    const callerId = (session["caller-id"] ?? session["callerId"]) as string | undefined;
                    const uptime = formatUptimeValue(
                      (session["uptime"] ?? session["uptime-seconds"]) as string | number | undefined
                    );
                    return (
                      <TableRow key={user ?? callerId ?? address ?? idx}>
                        <TableCell className="font-medium">{user ?? "PPP user"}</TableCell>
                        <TableCell>{service ?? "-"}</TableCell>
                        <TableCell>{address ?? "-"}</TableCell>
                        <TableCell>{callerId ?? "-"}</TableCell>
                        <TableCell className="text-right">{uptime}</TableCell>
                      </TableRow>
                    );
                  })}
                  {pppActive.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No active PPP sessions reported.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="hotspot" className="mt-4">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>MAC</TableHead>
                    <TableHead>Login by</TableHead>
                    <TableHead className="text-right">Usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotspotActive.map((session, idx) => {
                    const user = (session["user"] ?? session["name"]) as string | undefined;
                    const address = (session["address"] ?? session["active-address"]) as string | undefined;
                    const mac = (session["mac-address"] ?? session["macAddress"]) as string | undefined;
                    const loginBy = (session["login-by"] ?? session["loginBy"]) as string | undefined;
                    const bytesIn = toNumber(session["bytes-in"] ?? session["bytesIn"]);
                    const bytesOut = toNumber(session["bytes-out"] ?? session["bytesOut"]);
                    return (
                      <TableRow key={user ?? mac ?? address ?? idx}>
                        <TableCell className="font-medium">{user ?? "Hotspot user"}</TableCell>
                        <TableCell>{address ?? "-"}</TableCell>
                        <TableCell>{mac ?? "-"}</TableCell>
                        <TableCell>{loginBy ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          {formatBytes(bytesIn)} / {formatBytes(bytesOut)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {hotspotActive.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No active hotspot sessions reported.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Device logs (latest)</p>
          <p className="text-xs text-muted-foreground">
            {rawLogs.length > 0 ? `${rawLogs.length} command${rawLogs.length === 1 ? "" : "s"}` : "No logs"}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2 max-h-80 overflow-y-auto text-sm font-mono">
          {rawLogs.length === 0 ? (
            <p className="text-muted-foreground">No log output returned from device.</p>
          ) : (
            rawLogs.slice(-20).map((log, idx) => (
              <div key={idx} className="border-b last:border-b-0 border-border/50 pb-2 last:pb-0">
                <p className="font-semibold">{(log as { command?: string }).command ?? "command"}</p>
                <pre className="whitespace-pre-wrap break-all text-xs">
                  {JSON.stringify((log as { result?: unknown }).result ?? log, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const OfflineNotice = ({ isLoading }: { isLoading: boolean }) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
    {isLoading ? "Fetching live data from device..." : "Device is offline or not responding."}
  </div>
);
