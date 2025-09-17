"use client";
import React from "react";
import { CardWrapper } from "./card-wrapper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerSchema } from "@/schemas";
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
import { useTRPC } from "@/trpc/client";
import FormSuccess from "../FormSuccess";
import { FaUser } from "react-icons/fa";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

export const RegisterForm = () => {
  const t = useTRPC();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("invitation");
  const invitationEmail = searchParams.get("email");

  const {
    mutate: register,
    isPending,
    error,
    data,
  } = useMutation(t.user.register.mutationOptions());

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: invitationEmail || "",
      password: "",
      confirmPassword: "",
      name: "",
    },
    mode: "onBlur",
  });

  const onSubmit = (data: z.infer<typeof registerSchema>) => {
    // If there's an invitation token, include it in the registration
    if (invitationToken) {
      register({ ...data, invitationToken });
    } else {
      register(data);
    }
  };

  return (
    <CardWrapper
      headerLabel={invitationToken ? "Create Account & Accept Invitation" : "Create your account"}
      backButtonLabel="Already have an account?"
      backButtonLink="/auth/login"
      showSocial={!invitationToken} // Don't show social login if there's an invitation
      icon={<FaUser className="size-6 text-fuchsia-600" />}
    >
      {invitationToken && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            You&apos;re creating an account to accept an organization invitation.
          </p>
        </div>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4">
          <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="John Doe"
                      type="text"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
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
          </div>
          <FormSuccess message={data?.message ?? ""} />
          <FormError message={error?.message ?? ""} />
          <Button
            type="submit"
            variant="gradient"
            className="w-full cursor-pointer"
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending 
              ? invitationToken 
                ? "Creating account & accepting invitation..." 
                : "Creating account..."
              : invitationToken 
                ? "Create Account & Accept Invitation" 
                : "Create account"
            }
          </Button>
        </form>
      </Form>
    </CardWrapper>
  );
};
