"use client";
import { useEffect } from "react";
import {
  User,
  Package,
  Loader2,
  Wifi,
  Globe,
  Clock,
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
import { customerSchema } from "@/schemas";
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
// import { Switch } from "../ui/switch";
import { toast } from "sonner";

interface CustomerFormProps {
  mode?: "create" | "edit";
}

export const CustomerForm = ({ mode = "create" }: CustomerFormProps) => {
  const t = useTRPC();
  const router = useRouter();
  const params = useParams();
  const organizationId = params.id as string;
  const customerId = params.customerId as string;
  const queryClient = useQueryClient();
  
  // Fetch customer data for edit mode
  const { data: customerData, isLoading: isLoadingCustomer, error: customerError } = useQuery({
    ...t.customer.getCustomerById.queryOptions({ 
      id: customerId, 
      organizationId 
    }),
    enabled: mode === "edit" && !!customerId,
  });

  // Fetch stations and packages for dropdowns
  const { data: stations } = useQuery(
    t.stations.getStations.queryOptions({ organizationId })
  );

  const { data: packages } = useQuery(
    t.packages.getPackages.queryOptions({ organizationId })
  );

  console.log("Query state:", { 
    mode, 
    customerId, 
    organizationId, 
    customerData, 
    isLoadingCustomer, 
    customerError,
    enabled: mode === "edit" && !!customerId 
  });
  
  const {
    mutate: createCustomer,
    isPending: isCreating,
    error: createError,
  } = useMutation(t.customer.createCustomer.mutationOptions({
    onSuccess: () => {
      toast.success("Customer created successfully");
      // Invalidate customers queries using TRPC's type-safe queryKey
      queryClient.invalidateQueries({
        queryKey: t.customer.getCustomers.queryKey({ organizationId }),
      });
      router.push(`/isp/${organizationId}/customers`);
    }
  }));

  const {
    mutate: updateCustomer,
    isPending: isUpdating,
    error: updateError,
  } = useMutation(t.customer.updateCustomer.mutationOptions({
    onSuccess: () => {
      toast.success("Customer updated successfully");
      // Invalidate customers queries using TRPC's type-safe queryKey
      queryClient.invalidateQueries({
        queryKey: t.customer.getCustomers.queryKey({ organizationId }),
      });
      router.push(`/isp/${organizationId}/customers`);
    },
    onError: (error) => {
      console.error("Update customer error:", error);
      toast.error(error.message || "Failed to update customer");
    }
  }));
  
  const form = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      expiryDate: undefined,
      pppoeUsername: "",
      pppoePassword: "",
      status: "ACTIVE" as const,
      stationId: "none",
      packageId: "none",
    },
  });

  // Update form when customer data is loaded
  useEffect(() => {
    console.log("useEffect triggered:", { mode, customerData, customerId, organizationId });
    if (mode === "edit" && customerData) {
      console.log("Resetting form with customer data:", customerData);
      form.reset({
        name: customerData.name,
        email: customerData.email || "",
        phone: customerData.phone || "",
        address: customerData.address || "",
        expiryDate: customerData.expiryDate || undefined,
        pppoeUsername: customerData.pppoeUsername || "",
        pppoePassword: customerData.pppoePassword || "",
        status: customerData.status,
        stationId: customerData.stationId || "none",
        packageId: customerData.packageId || "none",
      });
    }
  }, [customerData, mode, form, customerId, organizationId]);
  
  const onSubmit = (data: z.infer<typeof customerSchema>) => {
    // Convert "none" values back to undefined for API
    const processedData = {
      ...data,
      stationId: data.stationId === "none" ? undefined : data.stationId,
      packageId: data.packageId === "none" ? undefined : data.packageId,
    };
    
    console.log("Form submitted:", { mode, processedData, customerId, organizationId });
    if (mode === "edit") {
      console.log("Updating customer with:", { ...processedData, id: customerId, organizationId });
      updateCustomer({
        ...processedData,
        id: customerId,
        organizationId,
      });
    } else {
      console.log("Creating customer with:", { ...processedData, organizationId });
      createCustomer({
        ...processedData,
        organizationId,
      });
    }
  };

  const statusOptions = [
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "EXPIRED", label: "Expired" },
  ];

  const isPending = isCreating || isUpdating;
  const error = createError || updateError;

  if (mode === "edit" && isLoadingCustomer) {
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
              
              {/* Contact Info */}
              <div className="space-y-4">
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
            
            {/* Submit Button */}
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (mode === "edit" && customerError) {
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
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Customer</h2>
              <p className="text-red-600 mb-4">{customerError.message}</p>
              <Button 
                onClick={() => router.push(`/isp/${organizationId}/customers`)}
                variant="outline"
              >
                Back to Customers
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FormWrapper
      title={mode === "edit" ? "Edit Customer" : "Create Customer"}
      backButtonLabel="Back to Customers"
      backButtonLink={`/isp/${organizationId}/customers`}
      description={
        mode === "edit" 
          ? "Update customer information and settings."
          : "Add a new customer to your organization to provide internet services."
      }
      showIcon={true}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter customer's full name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter phone number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="Enter email address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Enter customer's address..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Service Assignment */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Service Assignment
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="stationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Station (Optional)</FormLabel>
                    <Select key={`station-${stations?.length ?? 0}-${field.value ?? 'none'}`} onValueChange={(v) => field.onChange(v)} value={field.value ?? 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a station" />
                        </SelectTrigger>
                      </FormControl>
                                             <SelectContent>
                         <SelectItem value="none">No station assigned</SelectItem>
                         {stations?.map((station) => (
                           <SelectItem key={station.id} value={station.id}>
                             {station.name}
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
                name="packageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package (Optional)</FormLabel>
                    <Select key={`package-${packages?.length ?? 0}-${field.value ?? 'none'}`} onValueChange={(v) => field.onChange(v)} value={field.value ?? 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a package" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                                                 <SelectItem value="none">No package assigned</SelectItem>
                        {packages?.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            <div className="flex items-center gap-2">
                              {pkg.type === "PPPOE" ? (
                                <Wifi className="h-4 w-4" />
                              ) : (
                                <Globe className="h-4 w-4" />
                              )}
                              {pkg.name} - ${pkg.price}
                            </div>
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

          {/* Credentials */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Service Credentials (Optional)
            </h3>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <h4 className="text-md font-medium flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  PPPoE Credentials
                </h4>
                
                <FormField
                  control={form.control}
                  name="pppoeUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PPPoE Username</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter PPPoE username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pppoePassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PPPoE Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" showPasswordToggle placeholder="Enter PPPoE password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
            </div>
          </div>

          {/* Status & Expiry */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Status & Expiry
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
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
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="date"
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? new Date(value) : undefined);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                  {mode === "edit" ? "Updating Customer" : "Creating Customer"}
                </span>
              </>
            ) : (
              mode === "edit" ? "Update Customer" : "Create Customer"
            )}
          </Button>
        </form>
      </Form>
    </FormWrapper>
  );
};
