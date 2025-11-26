"use client";
// import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FormWrapper } from "../FormWrapper";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { organizationSchema } from "@/schemas";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "../ui/textarea";
import { FileUploaderMinimal } from "@uploadcare/react-uploader/next";
import "@uploadcare/react-uploader/core.css";
import { useTheme } from "next-themes";
import { toast } from "sonner";

export const OrganizationForm = () => {
  const t = useTRPC();
  const { theme } = useTheme();
  // const router = useRouter();
  const queryClient = useQueryClient();
  const {
    mutate: createOrganization,
    isPending,
    error,
  } = useMutation(t.organization.createOrganization.mutationOptions({
    onSuccess: () => {
      toast.success("Organization created successfully");
      // Invalidate organizations list using TRPC's type-safe queryKey
      queryClient.invalidateQueries({
        queryKey: t.organization.getMyOrganizations.queryKey(),
      });
    }
  }));
  const form = useForm<z.input<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      logo: "",
      website: "",
      description: "",
    },
  });
  const onSubmit = (data: z.input<typeof organizationSchema>) => {
    createOrganization(data);
  };

  return (
    <FormWrapper
      title="Create Organization"
      backButtonLabel="Back to Organizations"
      backButtonLink="/organization"
      description="Set up your organization profile to get started with team collaboration and project management."
      showIcon={true}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Organization Name" />
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+254 700 000 000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://example.com"
                        type="url"
                      />
                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>
            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo</FormLabel>
                  <FormControl>
                    <FileUploaderMinimal
                      sourceList="local, camera, facebook, gdrive"
                      classNameUploader={
                        theme === "dark" ? "uc-dark" : "uc-light"
                      }
                      pubkey={
                        process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || ""
                      }
                      onCommonUploadSuccess={(e) => {
                        if (e.successEntries && e.successEntries.length > 0) {
                          const uploadedUrl = e.successEntries[0].cdnUrl;
                          field.onChange(uploadedUrl);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Description" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormError message={error?.message ?? ""} />
          <Button
            type="submit"
            variant="gradient"
            disabled={isPending}
            className="w-full"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Create Organization"
            )}
          </Button>
        </form>
      </Form>
    </FormWrapper>
  );
};
