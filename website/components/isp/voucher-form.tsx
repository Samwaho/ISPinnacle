"use client";
import { useEffect } from "react";
import { Ticket, Loader2 } from "lucide-react";
import { FormWrapper } from "../FormWrapper";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import FormError from "../FormError";
import { Skeleton } from "../ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { voucherFormSchema } from "@/schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";

export const VoucherForm = () => {
  const t = useTRPC();
  const router = useRouter();
  const params = useParams();
  const organizationId = params.id as string;
  const queryClient = useQueryClient();

  const { data: packages, isPending: loadingPackages } = useQuery(
    t.packages.getPackages.queryOptions({ organizationId })
  );

  const hotspotPackages = (packages || []).filter((p) => p.type === "HOTSPOT");

  const { mutate: createVoucher, isPending: isCreating, error: createError } = useMutation(
    t.hotspot.createVoucher.mutationOptions({
      onSuccess: () => {
        toast.success("Voucher created successfully");
        queryClient.invalidateQueries({
          queryKey: t.hotspot.getVouchers.queryKey({ organizationId }),
        });
        router.push(`/isp/${organizationId}/vouchers`);
      },
    })
  );

  type VoucherFormData = z.infer<typeof voucherFormSchema>;

  const form = useForm({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: {
      packageId: "",
      phoneNumber: "",
      amount: 0,
    },
  });

  

  useEffect(() => {
    // Prefill amount from selected package
    const subscription = form.watch((values, { name }) => {
      if (name === "packageId") {
        const pkg = hotspotPackages.find((p) => p.id === values.packageId);
        if (pkg) {
          form.setValue("amount", pkg.price);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, hotspotPackages]);

  const onSubmit = (data: VoucherFormData) => {
    createVoucher({
      organizationId,
      ...data,
    });
  };

  return (
    <FormWrapper
      title="Create Voucher"
      description="Manually create a hotspot voucher for a customer"
      backButtonLabel="Back to Vouchers"
      backButtonLink={`/isp/${organizationId}/vouchers`}
      icon={<Ticket className="h-6 w-6" />}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormError message={createError?.message ?? ""} />

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="packageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package</FormLabel>
                  {loadingPackages ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a hotspot package" />
                      </SelectTrigger>
                      <SelectContent>
                        {hotspotPackages.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — KES {p.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="2547XXXXXXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (KES)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value ?? 0}
                      onChange={(e) => field.onChange((e.target as HTMLInputElement).valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" variant="gradient" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Voucher
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(`/isp/${organizationId}/vouchers`)}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </FormWrapper>
  );
};

export default VoucherForm;

