"use client";
import React, { useState } from "react";
import { CardWrapper } from "./card-wrapper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSchema } from "@/schemas";
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
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_REDIRECT_URL } from "@/routes";
import { useTRPC } from "@/trpc/client";
import FormSuccess from "../FormSuccess";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../ui/input-otp";
import { FaLock } from "react-icons/fa";
import { Loader2, AlertTriangle } from "lucide-react";
import { useSession } from "next-auth/react";

export const LoginForm = () => {
  const t = useTRPC();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  const invitationToken = searchParams.get("invitation");
  const invitationEmail = searchParams.get("email");
  const oauthError = searchParams.get("error");

  const {
    mutate: login,
    isPending,
    error,
    data,
  } = useMutation(
    t.user.login.mutationOptions({
      onSuccess: async (data) => {
        if (data?.verifyEmail || data?.twoFactorEnabled) {
          setTwoFactorEnabled(data?.twoFactorEnabled ?? false);
          return;
        }
        // Update the session to reflect the new login state
        await updateSession();
        
        // If there's an invitation token, redirect to accept it
        if (invitationToken) {
          router.push(`/auth/invitation?token=${invitationToken}&email=${invitationEmail}`);
        } else {
          router.push(DEFAULT_REDIRECT_URL);
        }
      },
    })
  );
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: invitationEmail || "",
      password: "",
      twoFactorToken: "",
    },
    mode: "onBlur",
  });
  
  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    login(data);
  };
  
  return (
    <CardWrapper
      headerLabel={invitationToken ? "Sign in to Accept Invitation" : "Sign into your account"}
      backButtonLabel="Don't have an account?"
      backButtonLink="/auth/register"
      showSocial={!invitationToken} // Don't show social login if there's an invitation
      icon={<FaLock className="size-6 text-fuchsia-600" />}
      showForgotPassword
    >
      {invitationToken && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            You&apos;re signing in to accept an organization invitation.
          </p>
        </div>
      )}
      
      {oauthError === "OAuthAccountNotLinked" && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
                             <p className="text-sm font-medium text-orange-800">
                 OAuth Sign-in Issue
               </p>
               <p className="text-xs text-orange-700 mt-1">
                 This email is registered with a password. You can sign in with your password below or link your Google account for easier sign-in.
               </p>
              <div className="mt-3 flex space-x-2">
                                 <Button
                   variant="outline"
                   size="sm"
                   className="text-xs h-8"
                   asChild
                 >
                   <a href="/auth/link-account">Link Google Account</a>
                 </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => router.push("/auth/reset")}
                >
                  Reset Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4">
            {twoFactorEnabled ? (
              <div className="w-full flex flex-col">
                <FormField
                  control={form.control}
                  name="twoFactorToken"
                  render={({ field }) => (
                    <FormItem className="">
                      <FormLabel className="text-center text-lg font-bold">
                        Enter 2FA code
                      </FormLabel>
                      <FormControl>
                        <InputOTP maxLength={6} {...field} disabled={isPending}>
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSeparator />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="mail@example.com"
                          type="email"
                          disabled={isPending || !!invitationEmail} // Disable if email is pre-filled from invitation
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="********"
                          type="password"
                          showPasswordToggle
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>

          <FormError message={error?.message ?? ""} />
          <FormSuccess message={data?.message ?? ""} />
          <Button
            type="submit"
            variant="gradient"
            className="w-full cursor-pointer"
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending && !twoFactorEnabled
              ? invitationToken 
                ? "Signing in & accepting invitation..."
                : "Logging in..."
              : isPending && twoFactorEnabled
              ? "Verifying..."
              : twoFactorEnabled
              ? "Verify"
              : invitationToken
              ? "Sign in & Accept Invitation"
              : "Login"}
          </Button>
        </form>
      </Form>
    </CardWrapper>
  );
};
