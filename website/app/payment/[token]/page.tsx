"use client";

import * as React from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CardWrapper } from "@/components/auth/card-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, CreditCard, Phone, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const phoneSchema = z.object({
  phoneNumber: z.string().regex(/^254\d{9}$/, "Phone number must be in format 254XXXXXXXXX"),
});

type PhoneFormData = z.infer<typeof phoneSchema>;

const PaymentLinkPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const t = useTRPC();
  
  const token = params?.token as string;

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [paymentInitiated, setPaymentInitiated] = React.useState(false);

  const form = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  // Get payment link details
  const { data: paymentLinkData, isLoading: isLoadingPaymentLink, error } = useQuery(
    t.customer.getPaymentLink.queryOptions({ token })
  );

  // Debug logging
  React.useEffect(() => {
    console.log("Token:", token);
    console.log("Payment link data:", paymentLinkData);
    console.log("Error:", error);
  }, [token, paymentLinkData, error]);

  const {
    mutate: processPayment,
    isPending: isProcessingPayment,
  } = useMutation(
    t.customer.processPaymentLink.mutationOptions({
      onSuccess: (data) => {
        toast.success("Payment initiated successfully! Please check your phone for the M-Pesa prompt.");
        setPaymentInitiated(true);
        setIsProcessing(true);
        // Don't redirect immediately - wait for actual payment completion
        // The success page should only be shown after M-Pesa callback confirms payment
      },
      onError: (error) => {
        toast.error(error.message || "Failed to initiate payment");
        setIsProcessing(false);
      },
    })
  );

  const onSubmit = (data: PhoneFormData) => {
    if (!token) {
      toast.error("Invalid payment link");
      return;
    }
    processPayment({ token, phoneNumber: data.phoneNumber });
  };

  if (!token) {
    return (
      <CardWrapper
        headerLabel="Invalid Payment Link"
        backButtonLabel="Back to home"
        backButtonLink="/"
        icon={<XCircle className="h-6 w-6 text-red-500" />}
      >
        <div className="flex flex-col items-center justify-center space-y-4 p-6">
          <XCircle className="h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold text-center">
            Invalid Payment Link
          </h2>
          <p className="text-center text-muted-foreground">
            This payment link is invalid or has expired. Please contact the organization for a new payment link.
          </p>
        </div>
      </CardWrapper>
    );
  }

  if (isLoadingPaymentLink) {
    return (
      <CardWrapper
        headerLabel="Loading Payment Details"
        backButtonLabel="Back to home"
        backButtonLink="/"
        icon={<Loader2 className="h-6 w-6 text-blue-500" />}
      >
        <div className="flex flex-col items-center justify-center space-y-4 p-6">
          <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
          <h2 className="text-xl font-semibold text-center">
            Loading Payment Details
          </h2>
          <p className="text-center text-muted-foreground">
            Please wait while we load the payment information...
          </p>
        </div>
      </CardWrapper>
    );
  }

  if (isProcessing) {
    return (
      <CardWrapper
        headerLabel="Payment Initiated"
        backButtonLabel="Back to home"
        backButtonLink="/"
        icon={<Loader2 className="h-6 w-6 text-blue-500" />}
      >
        <div className="flex flex-col items-center justify-center space-y-4 p-6">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h2 className="text-xl font-semibold text-center">
            Payment Initiated Successfully!
          </h2>
          <p className="text-center text-muted-foreground">
            Please check your phone for the M-Pesa prompt and enter your PIN to complete the payment.
          </p>
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md max-w-sm">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Important:</strong> Your payment will be confirmed once you complete the M-Pesa transaction on your phone.
            </p>
          </div>
        </div>
      </CardWrapper>
    );
  }

  if (error) {
    return (
      <CardWrapper
        headerLabel="Error Loading Payment Link"
        backButtonLabel="Back to home"
        backButtonLink="/"
        icon={<XCircle className="h-6 w-6 text-red-500" />}
      >
        <div className="flex flex-col items-center justify-center space-y-4 p-6">
          <XCircle className="h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold text-center">
            Error Loading Payment Link
          </h2>
          <p className="text-center text-muted-foreground">
            {error.message || "Failed to load payment link details. Please try again or contact support."}
          </p>
          <div className="text-xs text-muted-foreground">
            Token: {token}
          </div>
        </div>
      </CardWrapper>
    );
  }

  if (!paymentLinkData?.paymentLink) {
    return (
      <CardWrapper
        headerLabel="Payment Link Not Found"
        backButtonLabel="Back to home"
        backButtonLink="/"
        icon={<XCircle className="h-6 w-6 text-red-500" />}
      >
        <div className="flex flex-col items-center justify-center space-y-4 p-6">
          <XCircle className="h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold text-center">
            Payment Link Not Found
          </h2>
          <p className="text-center text-muted-foreground">
            This payment link has expired or has already been used. Please contact the organization for a new payment link.
          </p>
          <div className="text-xs text-muted-foreground">
            Token: {token}
          </div>
        </div>
      </CardWrapper>
    );
  }

  const { paymentLink } = paymentLinkData;

  return (
    <CardWrapper
      headerLabel="Payment"
      backButtonLabel="Back to home"
      backButtonLink="/"
      icon={<CreditCard className="h-6 w-6 text-blue-500" />}
    >
      <div className="flex flex-col items-center justify-center space-y-6 p-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Payment Request</h2>
          <p className="text-muted-foreground">
            Complete your payment using M-Pesa
          </p>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
            <CardDescription>
              Review the payment information below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Organization:</span>
                <span className="text-sm font-medium">{paymentLink.organization.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Customer:</span>
                <span className="text-sm font-medium">{paymentLink.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Description:</span>
                <span className="text-sm font-medium">{paymentLink.description}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-semibold">Amount:</span>
                <span className="text-lg font-bold text-green-600">
                  KES {paymentLink.amount.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Enter Phone Number
            </CardTitle>
            <CardDescription>
              Enter your M-Pesa registered phone number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="254XXXXXXXXX"
                  {...form.register("phoneNumber")}
                  className={form.formState.errors.phoneNumber ? "border-red-500" : ""}
                />
                {form.formState.errors.phoneNumber && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {form.formState.errors.phoneNumber.message}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> Enter your phone number in the format 254XXXXXXXXX (e.g., 254712345678)
                </p>
              </div>

              <Button
                type="submit"
                disabled={isProcessingPayment}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Initiating Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay with M-Pesa
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

                 <div className="text-center text-sm text-muted-foreground max-w-md">
           <p>
             By clicking &quot;Pay with M-Pesa&quot;, you will receive an STK push notification on your phone. 
             Please enter your M-Pesa PIN to complete the payment.
           </p>
         </div>
      </div>
    </CardWrapper>
  );
};

export default PaymentLinkPage;
