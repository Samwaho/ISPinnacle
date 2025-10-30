"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import { updateProfileSchema } from "@/schemas";
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type UserProfile = inferRouterOutputs<AppRouter>["user"]["getProfile"];

interface ProfileDetailsFormProps {
  profile?: UserProfile;
}

export const ProfileDetailsForm = ({ profile }: ProfileDetailsFormProps) => {
  const t = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: profile?.name ?? "",
      image: profile?.image ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      name: profile?.name ?? "",
      image: profile?.image ?? "",
    });
  }, [profile, form]);

  const {
    mutate: updateProfile,
    isPending,
    error,
  } = useMutation(
    t.user.updateProfile.mutationOptions({
      onSuccess: () => {
        toast.success("Profile updated");
        queryClient.invalidateQueries({
          queryKey: t.user.getProfile.queryKey(),
        });
      },
      onError: (mutationError) => {
        toast.error(mutationError.message);
      },
    })
  );

  const onSubmit = (values: z.infer<typeof updateProfileSchema>) => {
    updateProfile({
      name: values.name.trim(),
      image: values.image?.trim() ?? "",
    });
  };

  const fallbackInitial = useMemo(() => {
    const base = (profile?.name ?? profile?.email ?? "?").trim();
    return (base.charAt(0) || "?").toUpperCase();
  }, [profile?.name, profile?.email]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={profile?.image ?? ""} alt={profile?.name ?? "Profile photo"} />
            <AvatarFallback className="bg-gradient-custom text-white font-semibold">
              {fallbackInitial}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-xl">Personal Information</CardTitle>
            <CardDescription>
              Update how your name and avatar appear across the platform.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Jane Doe"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <FormLabel>Email</FormLabel>
                <Input
                  value={profile?.email ?? ""}
                  disabled
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email changes are managed through your authentication provider.
                </p>
              </div>
            </div>
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.value)}
                      placeholder="https://example.com/avatar.png"
                      type="url"
                      disabled={isPending}
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
                disabled={isPending}
                className="min-w-32"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
