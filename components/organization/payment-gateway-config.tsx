"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Settings, CheckCircle, AlertCircle, Globe, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PaymentGatewayEditForm } from "./payment-gateway-edit-form";

const mpesaConfigSchema = z.object({
  consumerKey: z.string().min(1, "Consumer key is required"),
  consumerSecret: z.string().min(1, "Consumer secret is required"),
  shortCode: z.string().min(1, "Short code is required"),
  passKey: z.string().min(1, "Pass key is required"),
  transactionType: z.enum(["PAYBILL", "BUYGOODS"]),
});

type MpesaConfigFormData = z.infer<typeof mpesaConfigSchema>;

interface PaymentGatewayConfigProps {
  organizationId: string;
}

export const PaymentGatewayConfig = ({ organizationId }: PaymentGatewayConfigProps) => {
  const t = useTRPC();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: mpesaConfig, isLoading } = useQuery(
    t.mpesa.getMpesaConfiguration.queryOptions({ organizationId })
  );

  const { data: organization } = useQuery(
    t.organization.getOrganizationById.queryOptions({ id: organizationId })
  );

  const updatePaymentGatewayMutation = useMutation(
    t.organization.updatePaymentGateway.mutationOptions({
      onSuccess: () => {
        toast.success("Payment gateway updated successfully");
        queryClient.invalidateQueries({
          queryKey: t.organization.getOrganizationById.queryKey({ id: organizationId }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update payment gateway");
      },
    })
  );

  const registerC2BUrlsMutation = useMutation(
    t.mpesa.registerC2BUrls.mutationOptions({
      onSuccess: () => {
        toast.success("C2B callback URLs registered successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to register C2B callback URLs");
      },
    })
  );

  const handleRegisterC2BUrls = () => {
    registerC2BUrlsMutation.mutate({
      organizationId,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (isEditing) {
    return (
      <PaymentGatewayEditForm
        organizationId={organizationId}
        configuration={mpesaConfig?.configuration || {
          id: "",
          consumerKey: "",
          consumerSecret: "",
          shortCode: "",
          passKey: "",
          transactionType: "PAYBILL",
          updatedAt: new Date(),
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Payment Gateway Configuration</h3>
        {mpesaConfig?.configuration && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Configuration
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Gateway Selection Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Gateway
            </CardTitle>
            <CardDescription>
              Select and configure your preferred payment gateway for processing customer payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-green-600" />
                  <span className="font-medium">M-Pesa</span>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Mobile money payments via Safaricom
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={organization?.paymentGateway === "MPESA"}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updatePaymentGatewayMutation.mutate({
                      organizationId,
                      paymentGateway: "MPESA",
                    });
                  }
                }}
                disabled={updatePaymentGatewayMutation.isPending}
              />
              <Label className="text-sm">
                {updatePaymentGatewayMutation.isPending ? "Updating..." : "Enable M-Pesa"}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mpesaConfig?.configuration ? (
              <>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Active</span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Short Code</p>
                    <p className="text-sm">{mpesaConfig.configuration.shortCode}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Transaction Type</p>
                    <p className="text-sm capitalize">{mpesaConfig.configuration.transactionType.toLowerCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                    <p className="text-sm">{new Date(mpesaConfig.configuration.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <Separator />

                {mpesaConfig.configuration.transactionType === "PAYBILL" && (
                  <Button 
                    onClick={handleRegisterC2BUrls}
                    disabled={registerC2BUrlsMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 w-full"
                  >
                    {registerC2BUrlsMutation.isPending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                    Register C2B URLs
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Not Configured</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  M-Pesa is selected but not yet configured. Please configure your API credentials.
                </p>
                <Button 
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="flex items-center gap-2 w-full"
                >
                  <Settings className="h-4 w-4" />
                  Configure M-Pesa
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* C2B URL Registration Info */}
      {mpesaConfig?.configuration?.transactionType === "PAYBILL" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              C2B Callback URLs
            </CardTitle>
            <CardDescription>
              Register callback URLs to receive payment notifications from M-Pesa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Required for PayBill Transactions</span>
              </div>
              <p className="text-sm text-muted-foreground">
                C2B (Customer-to-Business) callback URLs allow M-Pesa to notify your system when payments are received. 
                This is required for PayBill transactions to work properly.
              </p>
              {/* <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">Callback URLs will be registered:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Confirmation URL: <code className="bg-background px-1 rounded">{process.env.CALLBACK_URL}/api/mpesa/c2b/confirmation</code></li>
                  <li>• Validation URL: <code className="bg-background px-1 rounded">{process.env.CALLBACK_URL}/api/mpesa/c2b/validation</code></li>
                </ul>
              </div> */}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Guide */}
      <Card>
        <CardHeader>
          <CardTitle>M-Pesa Setup Guide</CardTitle>
          <CardDescription>
            Follow these steps to get your M-Pesa API credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Register for M-Pesa API</p>
                <p className="text-muted-foreground">
                  Visit the Safaricom Developer Portal and register for M-Pesa API access
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Get API Credentials</p>
                <p className="text-muted-foreground">
                  Obtain your Consumer Key, Consumer Secret, Short Code, and Pass Key
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Configure Settings</p>
                <p className="text-muted-foreground">
                  Enter your credentials in the configuration form above
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Register C2B URLs (PayBill Only)</p>
                <p className="text-muted-foreground">
                  If using PayBill, register callback URLs to receive payment notifications
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                5
              </div>
              <div>
                <p className="font-medium">Test Integration</p>
                <p className="text-muted-foreground">
                  Use the sandbox environment to test your integration before going live
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
