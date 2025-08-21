"use client";
import { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  FileText,
  Home,
  Building,
  Briefcase,
  Loader2,
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
import { stationSchema, updateStationSchema } from "@/schemas";
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
import { toast } from "sonner";

interface StationFormProps {
  mode?: "create" | "edit";
}

export const StationForm = ({ mode = "create" }: StationFormProps) => {
  const t = useTRPC();
  const router = useRouter();
  const params = useParams();
  const organizationId = params.id as string;
  const stationId = params.stationId as string;
  const queryClient = useQueryClient();
  
  // Fetch station data for edit mode
  const { data: stationData, isLoading: isLoadingStation, error: stationError } = useQuery({
    ...t.stations.getStationById.queryOptions({ 
      id: stationId, 
      organizationId 
    }),
    enabled: mode === "edit" && !!stationId,
  });

  console.log("Query state:", { 
    mode, 
    stationId, 
    organizationId, 
    stationData, 
    isLoadingStation, 
    stationError,
    enabled: mode === "edit" && !!stationId 
  });
  
  const {
    mutate: createStation,
    isPending: isCreating,
    error: createError,
  } = useMutation(t.stations.createStation.mutationOptions({
    onSuccess: () => {
      toast.success("Station created successfully");
      // Invalidate stations queries using TRPC's type-safe queryKey
      queryClient.invalidateQueries({
        queryKey: t.stations.getStations.queryKey({ organizationId }),
      });
      router.push(`/isp/${organizationId}/stations`);
    }
  }));

  const {
    mutate: updateStation,
    isPending: isUpdating,
    error: updateError,
  } = useMutation(t.stations.updateStation.mutationOptions({
    onSuccess: () => {
      toast.success("Station updated successfully");
      // Invalidate stations queries using TRPC's type-safe queryKey
      queryClient.invalidateQueries({
        queryKey: t.stations.getStations.queryKey({ organizationId }),
      });
      router.push(`/isp/${organizationId}/stations`);
    },
    onError: (error) => {
      console.error("Update station error:", error);
      toast.error(error.message || "Failed to update station");
    }
  }));
  
  const form = useForm({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      type: "APARTMENT" as const,
    },
  });

  // Update form when station data is loaded
  useEffect(() => {
    console.log("useEffect triggered:", { mode, stationData, stationId, organizationId });
    if (mode === "edit" && stationData) {
      console.log("Resetting form with station data:", stationData);
      form.reset({
        name: stationData.name,
        description: stationData.description || "",
        location: stationData.location || "",
        type: stationData.type,
      });
    }
  }, [stationData, mode, form, stationId, organizationId]);
  
  const onSubmit = (data: { 
    name: string; 
    description?: string; 
    location?: string; 
    type: "APARTMENT" | "HOUSE" | "OFFICE" | "OTHER";
  }) => {
    console.log("Form submitted:", { mode, data, stationId, organizationId });
    if (mode === "edit") {
      console.log("Updating station with:", { ...data, id: stationId, organizationId });
      updateStation({
        ...data,
        id: stationId,
        organizationId,
      });
    } else {
      console.log("Creating station with:", { ...data, organizationId });
      createStation({
        ...data,
        organizationId,
      });
    }
  };

  const stationTypes = [
    { value: "APARTMENT", label: "Apartment", icon: <Home className="h-4 w-4" /> },
    { value: "HOUSE", label: "House", icon: <Building2 className="h-4 w-4" /> },
    { value: "OFFICE", label: "Office", icon: <Briefcase className="h-4 w-4" /> },
    { value: "OTHER", label: "Other", icon: <Building className="h-4 w-4" /> },
  ];

  const isPending = isCreating || isUpdating;
  const error = createError || updateError;

  if (mode === "edit" && isLoadingStation) {
    return (
      <div className="container mx-auto py-6">
        <div className="max-w-2xl mx-auto">
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
            <div className="space-y-4">
              {/* Name Field */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              {/* Type and Location Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              
              {/* Description Field */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
            
            {/* Submit Button */}
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (mode === "edit" && stationError) {
    return (
      <div className="container mx-auto py-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Station</h2>
              <p className="text-red-600 mb-4">{stationError.message}</p>
              <Button 
                onClick={() => router.push(`/isp/${organizationId}/stations`)}
                variant="outline"
              >
                Back to Stations
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FormWrapper
      title={mode === "edit" ? "Edit Station" : "Create Station"}
      backButtonLabel="Back to Stations"
      backButtonLink={`/isp/${organizationId}/stations`}
      description={
        mode === "edit" 
          ? "Update station information and settings."
          : "Add a new station to your organization to manage customer locations and network infrastructure."
      }
      showIcon={true}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Station Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter station name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Station Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select station type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stationTypes.map((type) => (
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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter location address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe the station, its purpose, or any additional details..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
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
                  {mode === "edit" ? "Updating Station" : "Creating Station"}
                </span>
              </>
            ) : (
              mode === "edit" ? "Update Station" : "Create Station"
            )}
          </Button>
        </form>
      </Form>
    </FormWrapper>
  );
};
