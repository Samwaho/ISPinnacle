"use client";
import React from "react";
import { CardWrapper } from "./card-wrapper";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { resetSchema } from "@/schemas";
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
import { FaLock } from "react-icons/fa";
import { Loader2 } from "lucide-react";

export const ResetForm = () => {
  const t = useTRPC();
  const {
    mutate: reset,
    isPending,
    error,
    data,
  } = useMutation(t.user.resetPassword.mutationOptions());
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
    },
    mode: "onBlur",
  });
  const onSubmit = (data: z.infer<typeof resetSchema>) => {
    reset(data);
  };
  return (
    <CardWrapper
      headerLabel="Reset your password"
      backButtonLabel="Back to login"
      backButtonLink="/auth/login"
      icon={<FaLock className="size-6 text-fuchsia-600" />}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4">
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
            {isPending ? "Sending reset link..." : "Send reset link"}
          </Button>
        </form>
      </Form>
    </CardWrapper>
  );
};
