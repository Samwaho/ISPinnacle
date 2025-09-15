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

const kopoConfigSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  apiKey: z.string().min(1, "API Key is required"),
  tillNumber: z.string().min(1, "Till number is required"),
});

type KopoConfigFormData = z.infer<typeof kopoConfigSchema>;

interface KopokopoEditFormProps {
  organizationId: string;
  configuration: {
    id?: string;
    clientId: string;
    clientSecret: string;
    apiKey: string;
    tillNumber: string;
    updatedAt: Date;
  };
  onCancel: () => void;
}

export const KopokopoEditForm = ({
  organizationId,
  configuration,
  onCancel,
}: KopokopoEditFormProps) => {
  const t = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<KopoConfigFormData>({
    resolver: zodResolver(kopoConfigSchema),
    defaultValues: {
      clientId: configuration.clientId || "",
      clientSecret: configuration.clientSecret || "",
      apiKey: configuration.apiKey || "",
      tillNumber: configuration.tillNumber || "",
    },
  });

  const configureMutation = useMutation(
    t.kopokopo.configureKopokopo.mutationOptions({
      onSuccess: () => {
        toast.success("Kopo Kopo configuration updated successfully");
        queryClient.invalidateQueries({
          queryKey: t.kopokopo.getKopokopoConfiguration.queryKey({ organizationId }),
        });
        onCancel();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to configure Kopo Kopo");
      },
    })
  );

  const onSubmit = (data: KopoConfigFormData) => {
    configureMutation.mutate({
      organizationId,
      ...data,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Edit Kopo Kopo Configuration</h3>
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
            Kopo Kopo API Configuration
          </CardTitle>
          <CardDescription>
            Update your Kopo Kopo API credentials and settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your Kopo Kopo Client ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Secret</FormLabel>
                      <FormControl>
                        <Input type="password" showPasswordToggle placeholder="Enter your Client Secret" {...field} />
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
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your API Key (for webhook signature)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tillNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Till Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your Till Number (scope reference)" {...field} />
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

