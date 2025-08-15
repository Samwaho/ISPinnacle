"use client";
import React from "react";
import { CardWrapper } from "./card-wrapper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { newPasswordSchema } from "@/schemas";
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
import { useSearchParams } from "next/navigation";
import { FaLock } from "react-icons/fa";
import { Loader2 } from "lucide-react";

export const NewPasswordForm = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const t = useTRPC();
  const {
    mutate: newPassword,
    isPending,
    error,
    data,
  } = useMutation(t.user.newPassword.mutationOptions());
  const form = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      token: token ?? "",
    },
    mode: "onBlur",
  });
  const onSubmit = (data: z.infer<typeof newPasswordSchema>) => {
    newPassword(data);
  };
  return (
    <CardWrapper
      headerLabel="Set your new password"
      backButtonLabel="Back to login"
      backButtonLink="/auth/login"
      icon={<FaLock className="size-6 text-fuchsia-600" />}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4">
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
          <FormError message={error?.message ?? ""} />
          <FormSuccess message={data?.message ?? ""} />
          <Button
            type="submit"
            variant="gradient"
            className="w-full cursor-pointer"
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? "Setting new password..." : "Set new password"}
          </Button>
        </form>
      </Form>
    </CardWrapper>
  );
};
