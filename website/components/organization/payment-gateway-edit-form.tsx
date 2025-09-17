"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, CheckCircle, X } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const mpesaConfigSchema = z.object({
  consumerKey: z.string().min(1, "Consumer key is required"),
  consumerSecret: z.string().min(1, "Consumer secret is required"),
  shortCode: z.string().min(1, "Short code is required"),
  passKey: z.string().min(1, "Pass key is required"),
  transactionType: z.enum(["PAYBILL", "BUYGOODS"]),
});

type MpesaConfigFormData = z.infer<typeof mpesaConfigSchema>;

interface PaymentGatewayEditFormProps {
  organizationId: string;
  configuration: {
    id?: string;
    consumerKey: string;
    consumerSecret: string;
    shortCode: string;
    passKey: string;
    transactionType: "PAYBILL" | "BUYGOODS";
    updatedAt: Date;
  };
  onCancel: () => void;
}

export const PaymentGatewayEditForm = ({ 
  organizationId, 
  configuration, 
  onCancel 
}: PaymentGatewayEditFormProps) => {
  const t = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<MpesaConfigFormData>({
    resolver: zodResolver(mpesaConfigSchema),
    defaultValues: {
      consumerKey: configuration.consumerKey || "",
      consumerSecret: configuration.consumerSecret || "",
      shortCode: configuration.shortCode || "",
      passKey: configuration.passKey || "",
      transactionType: configuration.transactionType || "PAYBILL",
    },
  });

  const configureMpesaMutation = useMutation(
    t.mpesa.configureMpesa.mutationOptions({
      onSuccess: () => {
        toast.success("M-Pesa configuration updated successfully");
        queryClient.invalidateQueries({
          queryKey: t.mpesa.getMpesaConfiguration.queryKey({ organizationId }),
        });
        onCancel();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to configure M-Pesa");
      },
    })
  );

  const onSubmit = (data: MpesaConfigFormData) => {
    configureMpesaMutation.mutate({
      organizationId,
      ...data,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Edit M-Pesa Configuration</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            M-Pesa API Configuration
          </CardTitle>
          <CardDescription>
            Update your M-Pesa API credentials and settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="consumerKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consumer Key</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your M-Pesa consumer key"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="consumerSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consumer Secret</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          showPasswordToggle
                          placeholder="Enter your M-Pesa consumer secret"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shortCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your M-Pesa short code"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pass Key</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          showPasswordToggle
                          placeholder="Enter your M-Pesa pass key"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="transactionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PAYBILL">PayBill</SelectItem>
                        <SelectItem value="BUYGOODS">Buy Goods</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={configureMpesaMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {configureMpesaMutation.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Save Configuration
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
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
