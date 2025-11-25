"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeBlock } from "@/components/ui/code-block";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AccessDenied } from "@/components/ui/access-denied";
import { Wrench } from "lucide-react";

const DeviceSetupPage = () => {
  const params = useParams<{ id: string; deviceId: string }>();
  const organizationId = params.id as string;
  const deviceId = params.deviceId as string;
  const router = useRouter();
  const t = useTRPC();

  const { data: permissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: organizationId })
  );
  const canViewDevices = permissions?.canViewDevices ?? false;
  const canManageDevices = permissions?.canManageDevices ?? false;

  const deviceQuery = t.devices.get.queryOptions({ id: deviceId, organizationId });
  const {
    data: device,
    isPending: devicePending,
    error: deviceError,
  } = useQuery({
    ...deviceQuery,
    enabled: canViewDevices,
  });

  const secretsQuery = t.devices.secrets.queryOptions({ id: deviceId, organizationId });
  const {
    data: secrets,
    isLoading: secretsLoading,
    error: secretsError,
    refetch: refetchSecrets,
  } = useQuery({
    ...secretsQuery,
    enabled: canManageDevices,
  });

  const [publicKeyInput, setPublicKeyInput] = React.useState("");

  React.useEffect(() => {
    if (secrets?.wireguardPublicKey) {
      setPublicKeyInput(secrets.wireguardPublicKey);
    }
  }, [secrets?.wireguardPublicKey]);

  const { mutate: submitPublicKey, isPending: submittingPublicKey } = useMutation(
    t.devices.submitPublicKey.mutationOptions({
      onSuccess: () => {
        toast.success("Public key saved. Provisioning VPN peer now.");
        refetchSecrets();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save public key");
      },
    })
  );

  const handlePublicKeySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!publicKeyInput.trim()) {
      return;
    }

    submitPublicKey({
      id: deviceId,
      organizationId,
      wireguardPublicKey: publicKeyInput.trim(),
    });
  };

  if (permissionsLoading || devicePending) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!canViewDevices) {
    return (
      <AccessDenied
        title="Insufficient permissions"
        message="You do not have access to view devices for this organization."
        backButtonLabel="Back to organization"
        backButtonLink={`/isp/${organizationId}`}
        showBackButton
      />
    );
  }

  if (deviceError || !device) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
        <Button variant="link" className="w-fit px-0" onClick={() => router.back()}>
          Back
        </Button>
        <div className="rounded-lg border bg-destructive/5 p-4 text-destructive">
          Unable to load device details. {deviceError?.message ?? "Device not found."}
        </div>
      </div>
    );
  }

  if (!canManageDevices) {
    return (
      <AccessDenied
        title="Management access required"
        message="You need device management permissions to run setup instructions."
        backButtonLabel="Back to devices"
        backButtonLink={`/isp/${organizationId}/devices`}
        showBackButton
      />
    );
  }

  const listenPort = secrets?.wireguardListenPort ?? device.wireguardListenPort ?? 51820;
  const hasPublicKey = Boolean(secrets?.wireguardPublicKey);
  const serverPublicKey = process.env.NEXT_PUBLIC_ROUTEROS_SERVER_PUBLIC_KEY;
  const serverEndpoint = process.env.NEXT_PUBLIC_ROUTEROS_SERVER_ENDPOINT;
  const serverEndpointPort = process.env.NEXT_PUBLIC_ROUTEROS_SERVER_PORT || "13231";
  const centralManagementHost = "10.20.249.250/32";
  const vpnIpOctets = device.vpnIpAddress.split(".").map((value) => Number.parseInt(value, 10));
  const orgSubnetAllowed =
    vpnIpOctets.length === 4 && vpnIpOctets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
      ? `${vpnIpOctets[0]}.${vpnIpOctets[1]}.${vpnIpOctets[2]}.0/24`
      : null;
  const peerAllowedAddresses = [orgSubnetAllowed, centralManagementHost].filter(Boolean).join(",");

  const wgInterfaceCommand = `/interface/wireguard/add name=wg-vpn listen-port=${listenPort}`;
  const readPublicKeyCommand = `/interface/wireguard/print detail where name=wg-vpn`;

  const peerCommand = [
    `/interface/wireguard/peers/add`,
    `interface=wg-vpn`,
    serverPublicKey
      ? `public-key="${serverPublicKey}"`
      : `public-key="<SERVER_PUBLIC_KEY>"`,
    `allowed-address=${peerAllowedAddresses || centralManagementHost}`,
    serverEndpoint
      ? `endpoint-address=${serverEndpoint}`
      : `endpoint-address=<SERVER_ENDPOINT>`,
    serverEndpointPort
      ? `endpoint-port=${serverEndpointPort}`
      : `endpoint-port=<SERVER_PORT>`,
    secrets?.wireguardPresharedKey
      ? `preshared-key="${secrets.wireguardPresharedKey}"`
      : `preshared-key="<PASTE_PRESHARED_KEY>"`,
    `persistent-keepalive=25`,
  ]
    .filter(Boolean)
    .join(" \\\n  ");

  const addressCommand = `/ip/address/add address=${device.vpnIpAddress}/24 interface=wg-vpn`;
  const routeCommand = `/ip/route/add dst-address=${centralManagementHost} gateway=wg-vpn`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <Button variant="link" className="w-fit px-0" onClick={() => router.push(`/isp/${organizationId}/devices`)}>
          Back to devices
        </Button>
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Wrench className="h-6 w-6 text-primary" />
            Setup {device.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Follow these steps on the MikroTik router to complete the VPN provisioning.
          </p>
        </div>
      </div>

      <section className="rounded-lg border bg-muted/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Device</p>
            <p className="text-base font-semibold">{device.name}</p>
            <p className="text-xs text-muted-foreground">
              VPN IP {device.vpnIpAddress}/{device.vpnCidr}
            </p>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="rounded-full border bg-background/80 px-3 py-1 font-medium">
              Listen Port {listenPort}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                hasPublicKey
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100"
                  : "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-50"
              }`}
            >
              {hasPublicKey ? "Public key received" : "Public key pending"}
            </span>
          </div>
        </div>
      </section>

      {secretsError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load WireGuard secrets. {secretsError.message}
        </div>
      )}

      {secretsLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="space-y-5">
          <ol className="space-y-5">
            <li className="relative w-full overflow-hidden rounded-lg border bg-background p-4 pl-6 pt-6 shadow-sm sm:pl-8 sm:pt-4">
              <span className="absolute left-4 top-2 flex h-8 w-8 items-center justify-center rounded-full border bg-background text-sm font-semibold text-primary sm:left-0 sm:top-4 sm:-translate-x-1/2">
                1
              </span>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">Create the WireGuard interface</p>
                  <p className="text-xs text-muted-foreground">
                    Run this once to add a dedicated interface for the ISP tunnel.
                  </p>
                </div>
                <CodeBlock text={wgInterfaceCommand} />
              </div>
            </li>

            <li className="relative w-full overflow-hidden rounded-lg border bg-background p-4 pl-6 pt-6 shadow-sm sm:pl-8 sm:pt-4">
              <span className="absolute left-4 top-2 flex h-8 w-8 items-center justify-center rounded-full border bg-background text-sm font-semibold text-primary sm:left-0 sm:top-4 sm:-translate-x-1/2">
                2
              </span>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">Copy & submit the router public key</p>
                  <p className="text-xs text-muted-foreground">
                    Print the interface details, then paste its public key here.
                  </p>
                </div>
                <CodeBlock text={readPublicKeyCommand} />
                <form className="space-y-2 rounded-lg border bg-muted/10 p-3" onSubmit={handlePublicKeySubmit}>
                  <label className="text-xs font-medium text-muted-foreground">
                    Paste the <code>public-key</code> value from RouterOS
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={publicKeyInput}
                      onChange={(event) => setPublicKeyInput(event.target.value)}
                      placeholder="fzvs05rovSGjITNAFGHuaYHuPu6fwvgMmQ0GkKmJ+EE="
                      className="font-mono text-sm"
                    />
                    <Button type="submit" disabled={!publicKeyInput.trim() || submittingPublicKey}>
                      {submittingPublicKey ? "Submitting..." : hasPublicKey ? "Resubmit Key" : "Submit Public Key"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We use this key to register the device on the central VPN automatically.
                  </p>
                </form>
              </div>
            </li>

            <li className="relative w-full overflow-hidden rounded-lg border bg-background p-4 pl-6 pt-6 shadow-sm sm:pl-8 sm:pt-4">
              <span className="absolute left-4 top-2 flex h-8 w-8 items-center justify-center rounded-full border bg-background text-sm font-semibold text-primary sm:left-0 sm:top-4 sm:-translate-x-1/2">
                3
              </span>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">Add the central peer</p>
                  <p className="text-xs text-muted-foreground">
                    Connect the router to the ISP WireGuard hub with the generated preshared key and restrict traffic to your org subnet and the hub address.
                  </p>
                </div>
                <CodeBlock text={peerCommand} />
                <p className="text-xs text-muted-foreground">
                  Allowed addresses:{` `}
                  <code>{orgSubnetAllowed || "10.20.org-subnet.0/24"}</code>
                  {`, `}
                  <code>{centralManagementHost}</code>.
                </p>
                <p className="text-xs text-muted-foreground">
                  Keys are wrapped in quotes so RouterOS accepts <code>+</code> and <code>=</code> characters. Paste the snippet as-is (each line ends with <code>\</code>) or run it on a single line.
                </p>
                {(!serverPublicKey || !serverEndpoint) && (
                  <p className="text-xs text-destructive">
                    Set NEXT_PUBLIC_ROUTEROS_SERVER_PUBLIC_KEY and NEXT_PUBLIC_ROUTEROS_SERVER_ENDPOINT env values to auto-fill these commands.
                  </p>
                )}
              </div>
            </li>

            <li className="relative w-full overflow-hidden rounded-lg border bg-background p-4 pl-6 pt-6 shadow-sm sm:pl-8 sm:pt-4">
              <span className="absolute left-4 top-2 flex h-8 w-8 items-center justify-center rounded-full border bg-background text-sm font-semibold text-primary sm:left-0 sm:top-4 sm:-translate-x-1/2">
                4
              </span>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">Assign the VPN address</p>
                  <p className="text-xs text-muted-foreground">
                    Tie the allocated /24 address to the WireGuard interface so routing works immediately.
                  </p>
                </div>
                <CodeBlock text={addressCommand} />
              </div>
            </li>

            <li className="relative w-full overflow-hidden rounded-lg border bg-background p-4 pl-6 pt-6 shadow-sm sm:pl-8 sm:pt-4">
              <span className="absolute left-4 top-2 flex h-8 w-8 items-center justify-center rounded-full border bg-background text-sm font-semibold text-primary sm:left-0 sm:top-4 sm:-translate-x-1/2">
                5
              </span>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">Add routes for the hub</p>
                  <p className="text-xs text-muted-foreground">
                    Point traffic for the hub IP through the WireGuard interface you just created (wg-vpn unless you renamed it).
                  </p>
                </div>
                <CodeBlock text={routeCommand} />
              </div>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default DeviceSetupPage;
