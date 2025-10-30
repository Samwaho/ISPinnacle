"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldOff, Mail } from "lucide-react";
import { verifyTwoFactorSchema } from "@/schemas";
import { useTRPC } from "@/trpc/client";
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
import FormError from "@/components/FormError";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const codeSchema = verifyTwoFactorSchema.pick({ code: true });

type TwoFactorAction = "enable" | "disable";

interface ProfileTwoFactorFormProps {
  isEnabled: boolean;
  email?: string | null;
}

export const ProfileTwoFactorForm = ({
  isEnabled,
  email,
}: ProfileTwoFactorFormProps) => {
  const t = useTRPC();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<TwoFactorAction | null>(
    null
  );

  const form = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      code: "",
    },
  });

  const {
    mutate: requestToken,
    isPending: isRequesting,
  } = useMutation(
    t.user.requestTwoFactor.mutationOptions({
      onSuccess: (_, variables) => {
        const action: TwoFactorAction = variables.enable ? "enable" : "disable";
        setPendingAction(action);
        toast.success(
          `Verification code sent. Check ${email ?? "your email"} to ${action} two-factor authentication.`
        );
      },
      onError: (mutationError) => {
        toast.error(mutationError.message);
      },
    })
  );

  const {
    mutate: verifyToken,
    isPending: isVerifying,
    error,
  } = useMutation(
    t.user.verifyTwoFactor.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        setPendingAction(null);
        form.reset();
        queryClient.invalidateQueries({
          queryKey: t.user.getProfile.queryKey(),
        });
      },
      onError: (mutationError) => {
        toast.error(mutationError.message);
      },
    })
  );

  useEffect(() => {
    form.reset({ code: "" });
    setPendingAction(null);
  }, [isEnabled, form]);

  const handleRequest = (action: TwoFactorAction) => {
    requestToken({ enable: action === "enable" });
  };

  const onSubmit = (values: z.infer<typeof codeSchema>) => {
    if (!pendingAction) {
      toast.error("Request a verification code before entering the code.");
      return;
    }

    verifyToken({
      code: values.code,
      enable: pendingAction === "enable",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
        <CardDescription>
          Add an extra layer of security by requiring a 6-digit code at sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium leading-none">Current status</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEnabled
                ? "Two-factor authentication is active."
                : "Two-factor authentication is not enabled."}
            </p>
          </div>
          <Badge
            variant={isEnabled ? "default" : "outline"}
            className={isEnabled ? "bg-emerald-500 text-white" : ""}
          >
            {isEnabled ? (
              <>
                <ShieldCheck className="size-3" /> Enabled
              </>
            ) : (
              <>
                <ShieldOff className="size-3" /> Disabled
              </>
            )}
          </Badge>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="gradient"
            className="min-w-36"
            onClick={() => handleRequest("enable")}
            disabled={isRequesting || isVerifying || isEnabled}
          >
            {isRequesting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Sending...
              </span>
            ) : (
              "Enable 2FA"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-w-36"
            onClick={() => handleRequest("disable")}
            disabled={isRequesting || isVerifying || !isEnabled}
          >
            Disable 2FA
          </Button>
        </div>

        {pendingAction && (
          <Alert>
            <Mail className="mt-1" />
            <AlertTitle>Check your email</AlertTitle>
            <AlertDescription>
              Enter the 6-digit code we sent to {email ?? "your inbox"} to{" "}
              {pendingAction} two-factor authentication.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification code</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="numeric"
                      placeholder="000000"
                      maxLength={6}
                      disabled={isVerifying}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormError message={error?.message ?? ""} />
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="gradient"
                disabled={isVerifying || !pendingAction}
                className="min-w-32"
              >
                {isVerifying ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Confirm"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
