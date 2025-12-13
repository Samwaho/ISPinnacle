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
import { Settings, CheckCircle, X } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const jengaConfigSchema = z.object({
  merchantCode: z.string().min(1, "Merchant code is required"),
  apiKey: z.string().min(1, "API key is required"),
  apiSecret: z.string().min(1, "API secret is required"),
});

type JengaConfigFormData = z.infer<typeof jengaConfigSchema>;

interface JengaEditFormProps {
  organizationId: string;
  configuration: {
    id?: string;
    merchantCode: string;
    apiKey: string;
    apiSecret: string;
    updatedAt: Date;
  };
  onCancel: () => void;
}

export const JengaEditForm = ({
  organizationId,
  configuration,
  onCancel,
}: JengaEditFormProps) => {
  const t = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<JengaConfigFormData>({
    resolver: zodResolver(jengaConfigSchema),
    defaultValues: {
      merchantCode: configuration.merchantCode || "",
      apiKey: configuration.apiKey || "",
      apiSecret: configuration.apiSecret || "",
    },
  });

  const configureMutation = useMutation(
    t.jenga.configureJenga.mutationOptions({
      onSuccess: () => {
        toast.success("Jenga configuration updated successfully");
        queryClient.invalidateQueries({
          queryKey: t.jenga.getJengaConfiguration.queryKey({ organizationId }),
        });
        onCancel();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to configure Jenga");
      },
    })
  );

  const onSubmit = (data: JengaConfigFormData) => {
    configureMutation.mutate({
      organizationId,
      ...data,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Edit Jenga Configuration</h3>
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
            Jenga PGW Configuration
          </CardTitle>
          <CardDescription>
            Add your Jenga Payment Gateway credentials to enable Equity checkout and payment links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="merchantCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Merchant Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Jenga merchant code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key (client id)</FormLabel>
                      <FormControl>
                        <Input placeholder="Client/API key from Jenga HQ" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apiSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Secret</FormLabel>
                      <FormControl>
                        <Input type="password" showPasswordToggle placeholder="Client/API secret" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={configureMutation.isPending} className="flex items-center gap-2">
                  {configureMutation.isPending ? (
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
