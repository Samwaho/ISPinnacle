"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { changePasswordSchema } from "@/schemas";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ProfilePasswordFormProps {
  hasPassword: boolean;
  email?: string | null;
}

export const ProfilePasswordForm = ({
  hasPassword,
  email,
}: ProfilePasswordFormProps) => {
  const t = useTRPC();

  const form = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const {
    mutate: changePassword,
    isPending,
    error,
  } = useMutation(
    t.user.changePassword.mutationOptions({
      onSuccess: () => {
        toast.success("Password updated");
        form.reset();
      },
      onError: (mutationError) => {
        toast.error(mutationError.message);
      },
    })
  );

  const onSubmit = (values: z.infer<typeof changePasswordSchema>) => {
    changePassword(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Change Password</CardTitle>
        <CardDescription>
          Use a strong password with a mix of letters, numbers, and symbols.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasPassword && (
          <Alert className="mb-6">
            <AlertTitle>Password not set</AlertTitle>
            <AlertDescription>
              Your account currently uses a social sign-in. Request a reset link
              to set a password that you can use alongside single sign-on.
            </AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      showPasswordToggle
                      placeholder="********"
                      disabled={isPending || !hasPassword}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      showPasswordToggle
                      placeholder="********"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      showPasswordToggle
                      placeholder="********"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormError message={error?.message ?? ""} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="link"
                className="px-0 text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link href="/auth/reset">
                  Forgot password?
                </Link>
              </Button>
              <Button
                type="submit"
                variant="gradient"
                disabled={isPending || !hasPassword}
                className="min-w-40"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  "Update password"
                )}
              </Button>
            </div>
          </form>
        </Form>
        {email && (
          <p className="mt-4 text-xs text-muted-foreground">
            Reset emails are sent to <span className="font-medium">{email}</span>.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
