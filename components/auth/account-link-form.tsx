"use client";
import React, { useState } from "react";
import { CardWrapper } from "./card-wrapper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import FormSuccess from "../FormSuccess";
import { Loader2, Link, AlertTriangle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

const accountLinkSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const AccountLinkForm = () => {
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  
  const oauthProvider = searchParams.get("provider") || "Google";
  const oauthEmail = searchParams.get("email");

  const form = useForm<z.infer<typeof accountLinkSchema>>({
    resolver: zodResolver(accountLinkSchema),
    defaultValues: {
      email: oauthEmail || "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof accountLinkSchema>) => {
    setIsPending(true);
    setError("");
    setSuccess("");

    try {
      // First, verify the credentials
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please check your credentials.");
        return;
      }

      // If credentials are valid, proceed with OAuth linking
      await signIn("google", {
        callbackUrl: "/auth/link-success",
        prompt: "select_account",
      });
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <CardWrapper
      headerLabel={oauthEmail ? `Link ${oauthProvider} to ${oauthEmail}` : `Link ${oauthProvider} Account`}
      backButtonLabel="Back to Login"
      backButtonLink="/auth/login"
      icon={<Link className="size-6 text-blue-600" />}
    >
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Link {oauthProvider} Account
            </p>
                         <p className="text-xs text-blue-700 mt-1">
               {oauthEmail ? (
                 <>
                   We found an existing account with email <strong>{oauthEmail}</strong>. Enter your password to link it with your {oauthProvider} account.
                 </>
               ) : (
                 <>
                   Enter your email and password to link your existing account with your {oauthProvider} account.
                 </>
               )}
             </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Only show email field if we don't have it from URL params */}
          {!oauthEmail && (
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
          )}
          
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

          <FormError message={error} />
          <FormSuccess message={success} />
          
          <Button
            type="submit"
            variant="gradient"
            className="w-full cursor-pointer"
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            {isPending ? "Linking Account..." : `Link with ${oauthProvider}`}
          </Button>
        </form>
      </Form>
    </CardWrapper>
  );
};
