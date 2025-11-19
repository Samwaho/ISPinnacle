"use client";

import * as React from "react";
import { Shield, ShieldOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

type DeviceSecretsDialogProps = {
  deviceId: string;
  organizationId: string;
  trigger?: React.ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const LabelValue = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="rounded-md bg-muted px-3 py-2 text-sm font-mono break-words border">{value ?? "\u2014"}</p>
  </div>
);

export const DeviceSecretsDialog = ({
  deviceId,
  organizationId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: DeviceSecretsDialogProps) => {
  const t = useTRPC();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const secretsQuery = t.devices.secrets.queryOptions({ id: deviceId, organizationId });
  const { data, isLoading, error, refetch } = useQuery({
    ...secretsQuery,
    enabled: open,
  });

  const triggerElement =
    trigger === undefined ? (
      <Button size="sm" variant="outline" className="whitespace-nowrap">
        <Shield className="h-4 w-4" />
        Secrets
      </Button>
    ) : (
      trigger
    );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {triggerElement ? <DialogTrigger asChild>{triggerElement}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Router Credentials & WireGuard Keys</DialogTitle>
          <DialogDescription>
            Passwords and keys are encrypted at rest. Rotate keys immediately if you suspect unauthorized access.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Failed to load secrets: {error.message}
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </div>
        )}
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : data ? (
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-2">RouterOS API</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <LabelValue label="Host / IP" value={data.routerOsHost} />
                  <LabelValue label="Port" value={data.routerOsPort} />
                  <LabelValue label="Username" value={data.routerOsUsername} />
                  <LabelValue label="Password" value={data.routerOsPassword ? "••••••••" : "Not set"} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">WireGuard</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <LabelValue label="VPN Address" value={`${data.vpnIpAddress}/${data.vpnCidr}`} />
                  <LabelValue label="Listen Port" value={data.wireguardListenPort} />
                  <LabelValue label="Public Key" value={data.wireguardPublicKey ?? "Pending"} />
                  <LabelValue
                    label="Private Key"
                    value={data.wireguardPrivateKey ?? "Managed on router"}
                  />
                  <LabelValue label="Preshared Key" value={data.wireguardPresharedKey} />
                  <LabelValue label="Endpoint" value={data.wireguardEndpoint} />
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <ShieldOff className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No secrets available for this device.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
