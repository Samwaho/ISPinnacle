"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
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
import { FileUploaderMinimal } from "@uploadcare/react-uploader/next";
import "@uploadcare/react-uploader/core.css";
import { useTheme } from "next-themes";

type UserProfile = inferRouterOutputs<AppRouter>["user"]["getProfile"];

interface ProfileDetailsFormProps {
  profile?: UserProfile;
}

export const ProfileDetailsForm = ({ profile }: ProfileDetailsFormProps) => {
  const t = useTRPC();
  const queryClient = useQueryClient();
  const { theme } = useTheme();

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

  const nameValue = form.watch("name");
  const fallbackInitial = ((nameValue ?? profile?.email ?? "?").trim().charAt(0) || "?").toUpperCase();
  const watchedImage = form.watch("image");

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={watchedImage || profile?.image || ""} alt={profile?.name ?? "Profile photo"} />
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
                  <FormLabel>Avatar</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {(field.value || profile?.image) && (
                        <div className="flex items-center justify-between gap-4 rounded-md border border-dashed border-muted p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-12">
                              <AvatarImage src={field.value || profile?.image || ""} alt="Avatar preview" />
                              <AvatarFallback className="bg-gradient-custom text-white font-semibold">
                                {fallbackInitial}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">Preview</p>
                              <p className="text-xs text-muted-foreground">
                                This is how your profile photo will appear.
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => field.onChange("")}
                            disabled={isPending}
                            className="gap-1"
                          >
                            <Trash2 className="size-3.5" />
                            Remove
                          </Button>
                        </div>
                      )}
                      <FileUploaderMinimal
                        sourceList="local, camera, facebook, gdrive"
                        classNameUploader={theme === "dark" ? "uc-dark" : "uc-light"}
                        pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || ""}
                        fileTypes="image/*"
                        onCommonUploadSuccess={(result) => {
                          if (result.successEntries?.length) {
                            const uploadedUrl = result.successEntries[0].cdnUrl;
                            field.onChange(uploadedUrl);
                          }
                        }}
                        onCommonUploadError={() => {
                          toast.error("We couldn't upload that image. Please try again.");
                        }}
                      />
                    </div>
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
