"use client";
import { useEffect } from "react";
import {
  Package,
  DollarSign,
  Wifi,
  Globe,
  Loader2,
  Zap,
  Users,
  Network,
} from "lucide-react";
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
import { Skeleton } from "../ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { packageSchema } from "@/schemas";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { toast } from "sonner";

interface PackageFormProps {
  mode?: "create" | "edit";
}

export const PackageForm = ({ mode = "create" }: PackageFormProps) => {
  const t = useTRPC();
  const router = useRouter();
  const params = useParams();
  const organizationId = params.id as string;
  const packageId = params.packageId as string;
  const queryClient = useQueryClient();
  
  // Fetch package data for edit mode
  const { data: packageData, isLoading: isLoadingPackage, error: packageError } = useQuery({
    ...t.packages.getPackageById.queryOptions({ 
      id: packageId, 
      organizationId 
    }),
    enabled: mode === "edit" && !!packageId,
  });

  console.log("Query state:", { 
    mode, 
    packageId, 
    organizationId, 
    packageData, 
    isLoadingPackage, 
    packageError,
    enabled: mode === "edit" && !!packageId 
  });
  
  const {
    mutate: createPackage,
    isPending: isCreating,
    error: createError,
  } = useMutation(t.packages.createPackage.mutationOptions({
    onSuccess: () => {
      toast.success("Package created successfully");
      // Invalidate packages queries using TRPC's type-safe queryKey
      queryClient.invalidateQueries({
        queryKey: t.packages.getPackages.queryKey({ organizationId }),
      });
      router.push(`/isp/${organizationId}/packages`);
    }
  }));

  const {
    mutate: updatePackage,
    isPending: isUpdating,
    error: updateError,
  } = useMutation(t.packages.updatePackage.mutationOptions({
    onSuccess: () => {
      toast.success("Package updated successfully");
      // Invalidate packages queries using TRPC's type-safe queryKey
      queryClient.invalidateQueries({
        queryKey: t.packages.getPackages.queryKey({ organizationId }),
      });
      router.push(`/isp/${organizationId}/packages`);
    },
    onError: (error) => {
      console.error("Update package error:", error);
      toast.error(error.message || "Failed to update package");
    }
  }));
  
  const form = useForm({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      duration: 1,
      durationType: "MONTH" as const,
      type: "PPPOE" as const,
      addressPool: "",
      maxDevices: undefined,
      downloadSpeed: 0,
      uploadSpeed: 0,
      burstDownloadSpeed: undefined,
      burstUploadSpeed: undefined,
      burstThresholdDownload: undefined,
      burstThresholdUpload: undefined,
      burstDuration: undefined,
      isActive: true,
    },
  });

  // Update form when package data is loaded
  useEffect(() => {
    console.log("useEffect triggered:", { mode, packageData, packageId, organizationId });
    if (mode === "edit" && packageData) {
      console.log("Resetting form with package data:", packageData);
      form.reset({
        name: packageData.name,
        description: packageData.description || "",
        price: packageData.price,
        duration: packageData.duration,
        durationType: packageData.durationType,
        type: packageData.type,
        addressPool: packageData.addressPool,
        maxDevices: packageData.maxDevices || undefined,
        downloadSpeed: packageData.downloadSpeed,
        uploadSpeed: packageData.uploadSpeed,
        burstDownloadSpeed: packageData.burstDownloadSpeed || undefined,
        burstUploadSpeed: packageData.burstUploadSpeed || undefined,
        burstThresholdDownload: packageData.burstThresholdDownload || undefined,
        burstThresholdUpload: packageData.burstThresholdUpload || undefined,
        burstDuration: packageData.burstDuration || undefined,
        isActive: packageData.isActive,
      });
    }
  }, [packageData, mode, form, packageId, organizationId]);
  
  const onSubmit = (data: z.infer<typeof packageSchema>) => {
    console.log("Form submitted:", { mode, data, packageId, organizationId });
    if (mode === "edit") {
      console.log("Updating package with:", { ...data, id: packageId, organizationId });
      updatePackage({
        ...data,
        id: packageId,
        organizationId,
      });
    } else {
      console.log("Creating package with:", { ...data, organizationId });
      createPackage({
        ...data,
        organizationId,
      });
    }
  };

  const packageTypes = [
    { value: "PPPOE", label: "PPPoE", icon: <Wifi className="h-4 w-4" /> },
    { value: "HOTSPOT", label: "Hotspot", icon: <Globe className="h-4 w-4" /> },
  ];

  const durationTypes = [
    { value: "MINUTE", label: "Minutes" },
    { value: "HOUR", label: "Hours" },
    { value: "DAY", label: "Days" },
    { value: "WEEK", label: "Weeks" },
    { value: "MONTH", label: "Months" },
    { value: "YEAR", label: "Years" },
  ];

  const isPending = isCreating || isUpdating;
  const error = createError || updateError;

  if (mode === "edit" && isLoadingPackage) {
    return (
      <div className="container mx-auto py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header Loading */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="h-4 w-96" />
          </div>

          {/* Form Loading */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              
              {/* Pricing & Duration */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Submit Button */}
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (mode === "edit" && packageError) {
    return (
      <div className="container mx-auto py-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Package</h2>
              <p className="text-red-600 mb-4">{packageError.message}</p>
              <Button 
                onClick={() => router.push(`/isp/${organizationId}/packages`)}
                variant="outline"
              >
                Back to Packages
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FormWrapper
      title={mode === "edit" ? "Edit Package" : "Create Package"}
      backButtonLabel="Back to Packages"
      backButtonLink={`/isp/${organizationId}/packages`}
      description={
        mode === "edit" 
          ? "Update package information and settings."
          : "Add a new package to your organization to offer internet services to customers."
      }
      showIcon={true}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Basic Information
            </h3>
            
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter package name" />
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
                      <Textarea 
                        {...field} 
                        placeholder="Describe the package, its features, or any additional details..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Pricing & Duration */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing & Duration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <FormField
                 control={form.control}
                 name="price"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Price ($)</FormLabel>
                     <FormControl>
                       <Input 
                         {...field} 
                         type="number" 
                         step="0.01" 
                         min="0"
                         placeholder="0.00"
                         value={field.value || ""}
                         onChange={(e) => {
                           const value = e.target.value;
                           field.onChange(value === "" ? 0 : parseFloat(value) || 0);
                         }}
                       />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
              
                             <FormField
                 control={form.control}
                 name="duration"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Duration</FormLabel>
                     <FormControl>
                       <Input 
                         {...field} 
                         type="number" 
                         min="1"
                         placeholder="1"
                         value={field.value || ""}
                         onChange={(e) => {
                           const value = e.target.value;
                           field.onChange(value === "" ? 1 : parseInt(value) || 1);
                         }}
                       />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
              
              <FormField
                control={form.control}
                name="durationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration Type</FormLabel>
                    <Select
                      key={`duration-type-${field.value ?? "none"}`}
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {durationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Package Type & Configuration */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Network className="h-5 w-5" />
              Package Type & Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package Type</FormLabel>
                      <Select
                        key={`package-type-${field.value ?? "none"}`}
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select package type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {packageTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                {type.icon}
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="addressPool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Pool</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 192.168.1.0/24" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                                 <FormField
                   control={form.control}
                   name="maxDevices"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Max Devices (Optional)</FormLabel>
                       <FormControl>
                         <Input 
                           {...field} 
                           type="number" 
                           min="1"
                           placeholder="Unlimited"
                           value={field.value || ""}
                           onChange={(e) => {
                             const value = e.target.value;
                             field.onChange(value === "" ? undefined : parseInt(value) || undefined);
                           }}
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
              </div>
              
              <div className="space-y-4">
                                 <FormField
                   control={form.control}
                   name="downloadSpeed"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Download Speed (Mbps)</FormLabel>
                       <FormControl>
                         <Input 
                           {...field} 
                           type="number" 
                           min="1"
                           placeholder="100"
                           value={field.value || ""}
                           onChange={(e) => {
                             const value = e.target.value;
                             field.onChange(value === "" ? 0 : parseInt(value) || 0);
                           }}
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                
                                 <FormField
                   control={form.control}
                   name="uploadSpeed"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Upload Speed (Mbps)</FormLabel>
                       <FormControl>
                         <Input 
                           {...field} 
                           type="number" 
                           min="1"
                           placeholder="50"
                           value={field.value || ""}
                           onChange={(e) => {
                             const value = e.target.value;
                             field.onChange(value === "" ? 0 : parseInt(value) || 0);
                           }}
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
              </div>
            </div>
          </div>

          {/* Burst Settings (Optional) */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Burst Settings (Optional)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                                 <FormField
                   control={form.control}
                   name="burstDownloadSpeed"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Burst Download Speed (Mbps)</FormLabel>
                       <FormControl>
                         <Input 
                           {...field} 
                           type="number" 
                           min="1"
                           placeholder="200"
                           value={field.value || ""}
                           onChange={(e) => {
                             const value = e.target.value;
                             field.onChange(value === "" ? undefined : parseInt(value) || undefined);
                           }}
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                
                                 <FormField
                   control={form.control}
                   name="burstUploadSpeed"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Burst Upload Speed (Mbps)</FormLabel>
                       <FormControl>
                         <Input 
                           {...field} 
                           type="number" 
                           min="1"
                           placeholder="100"
                           value={field.value || ""}
                           onChange={(e) => {
                             const value = e.target.value;
                             field.onChange(value === "" ? undefined : parseInt(value) || undefined);
                           }}
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
              </div>
              
              <div className="space-y-4">
                                 <FormField
                   control={form.control}
                   name="burstThresholdDownload"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Burst Threshold Download (Mbps)</FormLabel>
                       <FormControl>
                         <Input 
                           {...field} 
                           type="number" 
                           min="1"
                           placeholder="150"
                           value={field.value || ""}
                           onChange={(e) => {
                             const value = e.target.value;
                             field.onChange(value === "" ? undefined : parseInt(value) || undefined);
                           }}
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                
                                 <FormField
                   control={form.control}
                   name="burstThresholdUpload"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Burst Threshold Upload (Mbps)</FormLabel>
                       <FormControl>
                         <Input 
                           {...field} 
                           type="number" 
                           min="1"
                           placeholder="75"
                           value={field.value || ""}
                           onChange={(e) => {
                             const value = e.target.value;
                             field.onChange(value === "" ? undefined : parseInt(value) || undefined);
                           }}
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                
                                 <FormField
                   control={form.control}
                   name="burstDuration"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Burst Duration (seconds)</FormLabel>
                       <FormControl>
                         <Input 
                           {...field} 
                           type="number" 
                           min="1"
                           placeholder="30"
                           value={field.value || ""}
                           onChange={(e) => {
                             const value = e.target.value;
                             field.onChange(value === "" ? undefined : parseInt(value) || undefined);
                           }}
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Status
            </h3>
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Package</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable this package for customer subscriptions
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
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
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {mode === "edit" ? "Updating Package" : "Creating Package"}
                </span>
              </>
            ) : (
              mode === "edit" ? "Update Package" : "Create Package"
            )}
          </Button>
        </form>
      </Form>
    </FormWrapper>
  );
};
