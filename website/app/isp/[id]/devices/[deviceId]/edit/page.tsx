"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AccessDenied } from "@/components/ui/access-denied";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateDeviceSchema } from "@/schemas";
import type { z } from "zod";
import { DeviceFormFields } from "@/components/isp/devices/device-form-fields";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft, Router } from "lucide-react";

type FormValues = z.input<typeof updateDeviceSchema>;

const DeviceEditPage = () => {
  const params = useParams<{ id: string; deviceId: string }>();
  const organizationId = params.id as string;
  const deviceId = params.deviceId as string;
  const router = useRouter();
  const t = useTRPC();

  const { data: permissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: organizationId })
  );
  const canManageDevices = permissions?.canManageDevices ?? false;

  const deviceQuery = t.devices.get.queryOptions({ id: deviceId, organizationId });
  const {
    data: device,
    isPending: devicePending,
  } = useQuery({
    ...deviceQuery,
    enabled: canManageDevices,
  });

  const {
    mutate: updateDevice,
    isPending,
    error,
  } = useMutation(
    t.devices.update.mutationOptions({
      onSuccess: () => {
        toast.success("Device updated successfully");
        router.push(`/isp/${organizationId}/devices/${deviceId}`);
      },
      onError: (err) => toast.error(err.message || "Failed to update device"),
    })
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(updateDeviceSchema),
    defaultValues: {
      id: deviceId,
      organizationId,
      name: device?.name ?? "",
      description: device?.description ?? "",
      deviceType: device?.deviceType ?? "MIKROTIK",
      vendor: device?.vendor ?? "",
      model: device?.model ?? "",
      serialNumber: device?.serialNumber ?? "",
      routerOsPort: device?.routerOsPort ?? 8728,
      routerOsUsername: device?.routerOsUsername ?? "",
      routerOsPassword: "",
      wireguardEndpoint: device?.wireguardEndpoint ?? "",
      wireguardListenPort: device?.wireguardListenPort ?? undefined,
    },
    values: device
      ? {
          id: deviceId,
          organizationId,
          name: device.name,
          description: device.description ?? "",
          deviceType: device.deviceType,
          vendor: device.vendor ?? "",
          model: device.model ?? "",
          serialNumber: device.serialNumber ?? "",
          routerOsPort: device.routerOsPort,
          routerOsUsername: device.routerOsUsername,
          routerOsPassword: "",
          wireguardEndpoint: device.wireguardEndpoint ?? "",
          wireguardListenPort: device.wireguardListenPort ?? undefined,
        }
      : undefined,
  });

  const onSubmit = (values: FormValues) => {
    updateDevice(values);
  };

  if (permissionsLoading || devicePending) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!canManageDevices) {
    return (
      <AccessDenied
        title="Insufficient permissions"
        message="You cannot edit devices for this organization."
        backButtonLabel="Back to devices"
        backButtonLink={`/isp/${organizationId}/devices`}
        showBackButton
      />
    );
  }

  if (!device) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device not found</CardTitle>
          <CardDescription>The device may have been removed.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push(`/isp/${organizationId}/devices`)}>
            Back to devices
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="link" className="w-fit px-0" onClick={() => router.push(`/isp/${organizationId}/devices/${deviceId}`)}>
        <ArrowLeft className="h-4 w-4" />
        Back to device
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Router className="h-5 w-5 text-primary" />
            Edit Device
          </CardTitle>
          <CardDescription>Update RouterOS or WireGuard configuration for this router.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <DeviceFormFields form={form} passwordOptional />
              {error && <p className="text-sm text-destructive">{error.message}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/isp/${organizationId}/devices/${deviceId}`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceEditPage;
