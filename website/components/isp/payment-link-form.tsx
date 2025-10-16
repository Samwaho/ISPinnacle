"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ExternalLink, CreditCard, Loader2, CheckCircle } from "lucide-react";

const paymentLinkSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
});

type PaymentLinkFormData = z.infer<typeof paymentLinkSchema>;

interface PaymentLinkFormProps {
  organizationId: string;
  customerId: string;
  customerName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const PaymentLinkForm = ({ 
  organizationId, 
  customerId, 
  customerName,
  trigger,
  open,
  onOpenChange
}: PaymentLinkFormProps) => {
  const t = useTRPC();
  const [isOpen, setIsOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isDialogOpen = open !== undefined ? open : isOpen;
  const setIsDialogOpen = onOpenChange || setIsOpen;
  const [paymentLink, setPaymentLink] = useState<{
    token: string;
    amount: number;
    description: string;
    customer: { 
      name: string; 
      email?: string | null; 
      phone?: string | null;
      pppoeUsername?: string | null;
      hotspotUsername?: string | null;
    };
    organization: { name: string };
    createdAt: Date;
  } | null>(null);

  const form = useForm<PaymentLinkFormData>({
    resolver: zodResolver(paymentLinkSchema),
    defaultValues: {
      amount: 0,
      description: "",
    },
  });

  const {
    mutate: createPaymentLink,
    isPending: isCreating,
  } = useMutation(
    t.customer.createPaymentLink.mutationOptions({
      onSuccess: (data) => {
        console.log("Payment link created successfully:", data);
        setPaymentLink(data.paymentLink);
        toast.success("Payment link created successfully!");
      },
      onError: (error) => {
        console.error("Failed to create payment link:", error);
        toast.error(error.message || "Failed to create payment link");
      },
    })
  );

  const onSubmit = (data: PaymentLinkFormData) => {
    createPaymentLink({
      organizationId,
      customerId,
      amount: data.amount,
      description: data.description,
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Payment link copied to clipboard!");
    } catch {
      toast.error("Failed to copy payment link");
    }
  };

  const openPaymentLink = (token: string) => {
    const url = `${window.location.origin}/payment/${token}`;
    window.open(url, '_blank');
  };

  const resetForm = () => {
    form.reset();
    setPaymentLink(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <CreditCard className="h-4 w-4 mr-2" />
            Create Payment Link
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Create Payment Link
          </DialogTitle>
          <DialogDescription>
            Create a payment link for {customerName}
          </DialogDescription>
        </DialogHeader>

        {!paymentLink ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (KES)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1000"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Payment for internet services"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Payment Link...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Create Payment Link
                  </>
                )}
              </Button>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Payment Link Created
                </CardTitle>
                <CardDescription>
                  Share this link with the customer to collect payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Payment Link</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${window.location.origin}/payment/${paymentLink.token}`}
                      readOnly
                      className="text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`${window.location.origin}/payment/${paymentLink.token}`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPaymentLink(paymentLink.token)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Payment Details</Label>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">KES {paymentLink.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Description:</span>
                      <span className="font-medium">{paymentLink.description}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="font-medium">{paymentLink.customer.name}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                onClick={resetForm}
                variant="outline"
                className="flex-1 cursor-pointer"
              >
                Create Another
              </Button>
              <Button
                onClick={() => handleOpenChange(false)}
                className="flex-1 cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
