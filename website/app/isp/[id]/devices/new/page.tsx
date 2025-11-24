"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AccessDenied } from "@/components/ui/access-denied";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createDeviceSchema } from "@/schemas";
import type { z } from "zod";
import { DeviceFormFields } from "@/components/isp/devices/device-form-fields";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { OrganizationDeviceType } from "@/lib/generated/prisma";
import { ArrowLeft, Router } from "lucide-react";

type FormValues = z.input<typeof createDeviceSchema>;

const DeviceCreatePage = () => {
  const params = useParams<{ id: string }>();
  const organizationId = params.id as string;
  const router = useRouter();
  const t = useTRPC();
  const queryClient = useQueryClient();

  const { data: permissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: organizationId })
  );
  const canManageDevices = permissions?.canManageDevices ?? false;

  const {
    mutate: createDevice,
    isPending,
    error,
  } = useMutation(
    t.devices.create.mutationOptions({
      onSuccess: (res) => {
        toast.success("Device created successfully");
        queryClient.invalidateQueries({
          queryKey: t.devices.list.queryKey({ organizationId }),
        });
        router.push(`/isp/${organizationId}/devices?setupDeviceId=${res.device.id}`);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to create device");
      },
    })
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(createDeviceSchema),
    defaultValues: {
      organizationId,
      name: "",
      description: "",
      deviceType: OrganizationDeviceType.MIKROTIK,
      vendor: "MikroTik",
      model: "",
      serialNumber: "",
      routerOsPort: 8728,
      routerOsUsername: "admin",
      routerOsPassword: "",
      wireguardEndpoint: "",
      wireguardListenPort: 51820,
    },
  });

  const onSubmit = (values: FormValues) => {
    createDevice(values);
  };

  if (permissionsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!canManageDevices) {
    return (
      <AccessDenied
        title="Insufficient permissions"
        message="You are not authorized to add devices for this organization."
        backButtonLabel="Back to devices"
        backButtonLink={`/isp/${organizationId}/devices`}
        showBackButton
      />
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="link" className="w-fit px-0" onClick={() => router.push(`/isp/${organizationId}/devices`)}>
        <ArrowLeft className="h-4 w-4" />
        Back to devices
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Router className="h-5 w-5 text-primary" />
            Add Network Device
          </CardTitle>
          <CardDescription>Register a MikroTik router and provision VPN credentials automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <DeviceFormFields form={form} />
              {error && <p className="text-sm text-destructive">{error.message}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Create Device"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push(`/isp/${organizationId}/devices`)}>
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

export default DeviceCreatePage;
