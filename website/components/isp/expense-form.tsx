"use client";
import { useState, useEffect } from "react";
import {
  DollarSign,
  Calendar,
  FileText,
  RotateCcw,
  CheckCircle,
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
import { expenseSchema, updateExpenseSchema } from "@/schemas";
import { useForm } from "react-hook-form";
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

interface ExpenseFormProps {
  mode?: "create" | "edit";
}

export const ExpenseForm = ({ mode = "create" }: ExpenseFormProps) => {
  const t = useTRPC();
  const router = useRouter();
  const params = useParams();
  const organizationId = params.id as string;
  const expenseId = params.expenseId as string;
  const queryClient = useQueryClient();
  
  // Fetch expense data for edit mode
  const { data: expenseData, isLoading: isLoadingExpense, error: expenseError } = useQuery({
    ...t.expenses.getExpenseById.queryOptions({ 
      id: expenseId, 
      organizationId 
    }),
    enabled: mode === "edit" && !!expenseId,
  });

  const {
    mutate: createExpense,
    isPending: isCreating,
    error: createError,
  } = useMutation(t.expenses.createExpense.mutationOptions({
    onSuccess: () => {
      toast.success("Expense created successfully");
      queryClient.invalidateQueries({
        queryKey: t.expenses.getExpenses.queryKey({ organizationId }),
      });
      router.push(`/isp/${organizationId}/expenses`);
    }
  }));

  const {
    mutate: updateExpense,
    isPending: isUpdating,
    error: updateError,
  } = useMutation(t.expenses.updateExpense.mutationOptions({
    onSuccess: () => {
      toast.success("Expense updated successfully");
      queryClient.invalidateQueries({
        queryKey: t.expenses.getExpenses.queryKey({ organizationId }),
      });
      router.push(`/isp/${organizationId}/expenses`);
    }
  }));

  const form = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: "",
      description: "",
      amount: 0,
      date: new Date(),
      isRecurring: false,
      recurringInterval: 1,
      recurringIntervalType: "MONTHLY" as const,
      recurringStartDate: new Date(),
      recurringEndDate: undefined,
      isPaid: false,
      paidAt: undefined,
    },
  });

  // Update form when expense data is loaded
  useEffect(() => {
    if (expenseData && mode === "edit") {
      form.reset({
        name: expenseData.name,
        description: expenseData.description || "",
        amount: expenseData.amount,
        date: new Date(expenseData.date),
        isRecurring: expenseData.isRecurring,
        recurringInterval: expenseData.recurringInterval || 1,
        recurringIntervalType: expenseData.recurringIntervalType || "MONTHLY",
        recurringStartDate: expenseData.recurringStartDate ? new Date(expenseData.recurringStartDate) : new Date(),
        recurringEndDate: expenseData.recurringEndDate ? new Date(expenseData.recurringEndDate) : undefined,
        isPaid: expenseData.isPaid,
        paidAt: expenseData.paidAt ? new Date(expenseData.paidAt) : undefined,
      });
    }
  }, [expenseData, mode, form]);

  const isRecurring = form.watch("isRecurring");
  const isPaid = form.watch("isPaid");

  const onSubmit = (data: any) => {
    if (mode === "create") {
      createExpense({
        organizationId,
        ...data,
      });
    } else {
      updateExpense({
        id: expenseId,
        organizationId,
        ...data,
      });
    }
  };

  if (mode === "edit" && isLoadingExpense) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (mode === "edit" && expenseError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading expense: {expenseError.message}</p>
        <Button 
          variant="outline" 
          onClick={() => router.push(`/isp/${organizationId}/expenses`)}
          className="mt-4"
        >
          Back to Expenses
        </Button>
      </div>
    );
  }

  return (
    <FormWrapper
      title={mode === "create" ? "Create Expense" : "Edit Expense"}
      description={
        mode === "create" 
          ? "Add a new expense to track your organization's spending"
          : "Update the expense details"
      }
      backButtonLabel="Back to Expenses"
      backButtonLink={`/isp/${organizationId}/expenses`}
      icon={<DollarSign className="h-6 w-6" />}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormError message={createError?.message || updateError?.message} />
          
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Expense Name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Internet Bill" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Amount (KES)
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
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
                    placeholder="Optional description of the expense..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      {...field}
                      value={field.value ? field.value.toISOString().split('T')[0] : ''}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPaid"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Payment Status
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Mark as paid if this expense has been settled
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

          {isPaid && (
            <FormField
              control={form.control}
              name="paidAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      {...field}
                      value={field.value ? field.value.toISOString().split('T')[0] : ''}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="isRecurring"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Recurring Expense
                  </FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Enable if this expense repeats regularly
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

          {isRecurring && (
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="recurringInterval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurring Interval</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="1"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recurringIntervalType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interval Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select interval type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {isRecurring && (
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="recurringStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        {...field}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recurringEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        {...field}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isCreating || isUpdating}
              className="flex-1"
            >
              {(isCreating || isUpdating) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === "create" ? "Create Expense" : "Update Expense"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/isp/${organizationId}/expenses`)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </FormWrapper>
  );
};
