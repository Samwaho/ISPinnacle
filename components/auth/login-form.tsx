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
import { useRouter } from "next/navigation";
import { DEFAULT_REDIRECT_URL } from "@/routes";
import { useTRPC } from "@/trpc/client";
import FormSuccess from "../FormSuccess";
import Link from "next/link";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../ui/input-otp";
import { FaLock } from "react-icons/fa";
import { Loader2 } from "lucide-react";

export const LoginForm = () => {
  const t = useTRPC();
  const router = useRouter();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const {
    mutate: login,
    isPending,
    error,
    data,
  } = useMutation(
    t.user.login.mutationOptions({
      onSuccess: (data) => {
        if (data?.verifyEmail || data?.twoFactorEnabled) {
          setTwoFactorEnabled(data?.twoFactorEnabled ?? false);
          return;
        }
        router.push(DEFAULT_REDIRECT_URL);
      },
    })
  );
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
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
      headerLabel="Sign into your account"
      backButtonLabel="Don't have an account?"
      backButtonLink="/auth/register"
      showSocial
      icon={<FaLock className="size-6 text-fuchsia-600" />}
      showForgotPassword
    >
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
                          disabled={isPending}
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
              ? "Logging in..."
              : isPending && twoFactorEnabled
              ? "Verifying..."
              : twoFactorEnabled
              ? "Verify"
              : "Login"}
          </Button>
        </form>
      </Form>
    </CardWrapper>
  );
};
