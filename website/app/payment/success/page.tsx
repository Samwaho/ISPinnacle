"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { CardWrapper } from "@/components/auth/card-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Home, Receipt } from "lucide-react";

const PaymentSuccessPage = () => {
  const searchParams = useSearchParams();
  const checkoutRequestId = searchParams.get("checkoutRequestId");

  return (
    <CardWrapper
      headerLabel="Payment Successful"
      backButtonLabel="Back to home"
      backButtonLink="/"
      icon={<CheckCircle className="h-6 w-6 text-green-500" />}
    >
      <div className="flex flex-col items-center justify-center space-y-6 p-6">
                 <div className="text-center space-y-2">
           <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
           <h2 className="text-2xl font-bold">Payment Completed!</h2>
           <p className="text-muted-foreground">
             Your M-Pesa payment has been successfully processed and confirmed
           </p>
         </div>

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment Details
            </CardTitle>
                         <CardDescription>
               Your M-Pesa payment has been confirmed
             </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
                             <div className="flex justify-between">
                 <span className="text-sm text-muted-foreground">Status:</span>
                 <span className="text-sm font-medium text-green-600">Payment Confirmed</span>
               </div>
              {checkoutRequestId && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reference:</span>
                  <span className="text-sm font-medium">{checkoutRequestId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Method:</span>
                <span className="text-sm font-medium">M-Pesa</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Button
            onClick={() => window.location.href = "/"}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Home className="h-4 w-4 mr-2" />
            Return to Home
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground max-w-md">
          <p>
            You will receive a confirmation SMS from M-Pesa shortly. 
            Please keep this reference number for your records.
          </p>
        </div>
      </div>
    </CardWrapper>
  );
};

export default PaymentSuccessPage;
