"use client";
import {
  Edit,
  Loader2,
} from "lucide-react";
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
import { useTRPC } from "@/trpc/client";
import { updateOrganizationSchema } from "@/schemas";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "../ui/textarea";
import {
  FileUploaderMinimal,
} from "@uploadcare/react-uploader/next";
import "@uploadcare/react-uploader/core.css";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
// import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface OrganizationEditFormProps {
  organization: {
    id: string;
    name: string;
    email: string;
    phone: string;
    logo?: string | null;
    website?: string | null;
    description?: string | null;
    vpnSubnetCidr?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  onCancel: () => void;
}

export const OrganizationEditForm = ({ organization, onCancel }: OrganizationEditFormProps) => {
  const t = useTRPC();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  // const router = useRouter();
  const {
    mutate: updateOrganization,
    isPending,
    error,
  } = useMutation(t.organization.updateOrganization.mutationOptions({
    onSuccess: () => {
      toast.success("Organization updated successfully");
      queryClient.invalidateQueries({
        queryKey: t.organization.getOrganizationById.queryKey({ id: organization.id }),
      });
      onCancel();
    }
  }));

  const form = useForm<z.infer<typeof updateOrganizationSchema>>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      id: organization.id,
      name: organization.name,
      email: organization.email,
      phone: organization.phone,
      logo: organization.logo || "",
      website: organization.website || "",
      description: organization.description || "",
      vpnSubnetCidr: organization.vpnSubnetCidr || "",
    },
  });

  const onSubmit = (data: z.infer<typeof updateOrganizationSchema>) => {
    updateOrganization(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Edit Organization Details
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                <FormField
                  control={form.control}
                  name="vpnSubnetCidr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VPN Subnet (CIDR)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="10.20.0.0/24" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Devices will receive VPN IPs from this subnet. Leave blank to use the default pool.
                      </p>
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
                      <div className="space-y-4">
                        {field.value && (
                          <div className="flex items-center gap-4">
                            <Avatar className="size-16">
                              <AvatarImage src={field.value} />
                              <AvatarFallback>{organization.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <Badge variant="secondary">Current Logo</Badge>
                          </div>
                        )}
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
                      </div>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormError message={error?.message ?? ""} />
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="gradient"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Organization"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
