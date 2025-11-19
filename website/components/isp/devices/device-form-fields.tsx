"use client";

import * as React from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrganizationDeviceType } from "@/lib/generated/prisma";
import type { UseFormReturn, FieldValues, Path } from "react-hook-form";

type DeviceFormValues = FieldValues & {
  routerOsPort?: number | null;
  wireguardListenPort?: number | null;
  routerOsPassword?: string | null;
  deviceType?: OrganizationDeviceType;
};

type DeviceFormFieldsProps<TFormValues extends DeviceFormValues> = {
  form: UseFormReturn<TFormValues>;
  passwordOptional?: boolean;
};

const deviceTypeOptions: { value: OrganizationDeviceType; label: string }[] = [
  { value: OrganizationDeviceType.MIKROTIK, label: "MikroTik RouterOS" },
  { value: OrganizationDeviceType.OTHER, label: "Other" },
];

const numberChangeHandler =
  (onChange: (value: number | undefined) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (!raw) {
      onChange(undefined);
      return;
    }
    const numeric = Number(raw);
    onChange(Number.isFinite(numeric) ? numeric : undefined);
  };

export const DeviceFormFields = <TFormValues extends DeviceFormValues>({
  form,
  passwordOptional = false,
}: DeviceFormFieldsProps<TFormValues>) => {
  const RequiredMark = () => <span className="text-destructive ml-1">*</span>;

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Fields marked with <RequiredMark /> are required. RouterOS management IP will be assigned automatically.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name={"name" as Path<TFormValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Device Name
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Main POP Router" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"deviceType" as Path<TFormValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a device type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {deviceTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name={"description" as Path<TFormValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder="Where is this device installed? What does it serve?" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name={"vendor" as Path<TFormValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vendor</FormLabel>
              <FormControl>
                <Input {...field} placeholder="MikroTik" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"model" as Path<TFormValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model</FormLabel>
              <FormControl>
                <Input {...field} placeholder="RB4011iGS+" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"serialNumber" as Path<TFormValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Serial Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="XXXX-XXXX" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <FormField
          control={form.control}
          name={"routerOsPort" as Path<TFormValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                RouterOS API Port
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value ?? ""}
                  onChange={numberChangeHandler(field.onChange)}
                  placeholder="8728"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name={"routerOsUsername" as Path<TFormValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                RouterOS Username
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="admin" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"routerOsPassword" as Path<TFormValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                RouterOS Password{" "}
                {passwordOptional ? "(leave blank to keep current)" : <RequiredMark />}
              </FormLabel>
              <FormControl>
                <Input type="password" {...field} placeholder="••••••••" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
};
