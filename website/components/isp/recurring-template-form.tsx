"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  interval: z.number().int().positive("Interval must be at least 1"),
  intervalType: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  startDate: z.date(),
  nextRunDate: z.date().optional(),
  endDate: z.date().optional(),
  autoMarkAsPaid: z.boolean(),
  isActive: z.boolean().optional(),
});

type RecurringTemplateFormValues = z.infer<typeof formSchema>;

export interface RecurringTemplateFormProps {
  organizationId: string;
  mode?: "create" | "edit";
  template?: {
    id: string;
    name: string;
    description?: string | null;
    amount: number;
    interval: number;
    intervalType: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    startDate: Date;
    nextRunDate: Date;
    endDate?: Date | null;
    autoMarkAsPaid: boolean;
    isActive: boolean;
  } | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const RecurringTemplateForm = ({
  organizationId,
  mode = "create",
  template,
  onSuccess,
  onCancel,
}: RecurringTemplateFormProps) => {
  const t = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<RecurringTemplateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      amount: 0,
      interval: 1,
      intervalType: "MONTHLY",
      startDate: new Date(),
      nextRunDate: new Date(),
      endDate: undefined,
      autoMarkAsPaid: false,
      isActive: true,
    },
  });

  useEffect(() => {
    if (mode === "edit" && template) {
      form.reset({
        name: template.name,
        description: template.description ?? "",
        amount: template.amount,
        interval: template.interval,
        intervalType: template.intervalType,
        startDate: new Date(template.startDate),
        nextRunDate: new Date(template.nextRunDate),
        endDate: template.endDate ? new Date(template.endDate) : undefined,
        autoMarkAsPaid: template.autoMarkAsPaid,
        isActive: template.isActive,
      });
    } else if (mode === "create") {
      const now = new Date();
      form.reset({
        name: "",
        description: "",
        amount: 0,
        interval: 1,
        intervalType: "MONTHLY",
        startDate: now,
        nextRunDate: now,
        endDate: undefined,
        autoMarkAsPaid: false,
        isActive: true,
      });
    }
  }, [mode, template, form]);

  const { mutateAsync: createTemplate, isPending: isCreating } = useMutation(
    t.expenses.createRecurringExpenseTemplate.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: t.expenses.getRecurringExpenseTemplates.queryKey({ organizationId }),
          }),
          queryClient.invalidateQueries({
            queryKey: t.expenses.getExpenseStats.queryKey({ organizationId }),
          }),
          queryClient.invalidateQueries({
            queryKey: t.expenses.getExpenses.queryKey({ organizationId }),
          }),
        ]);
      },
    })
  );

  const { mutateAsync: updateTemplate, isPending: isUpdating } = useMutation(
    t.expenses.updateRecurringExpenseTemplate.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: t.expenses.getRecurringExpenseTemplates.queryKey({ organizationId }),
          }),
          queryClient.invalidateQueries({
            queryKey: t.expenses.getExpenseStats.queryKey({ organizationId }),
          }),
          queryClient.invalidateQueries({
            queryKey: t.expenses.getExpenses.queryKey({ organizationId }),
          }),
        ]);
      },
    })
  );

  const onSubmit = async (values: RecurringTemplateFormValues) => {
    try {
      if (mode === "edit" && template) {
        await updateTemplate({
          id: template.id,
          organizationId,
          name: values.name,
          description: values.description,
          amount: values.amount,
          interval: values.interval,
          intervalType: values.intervalType,
          startDate: values.startDate,
          nextRunDate: values.nextRunDate,
          endDate: values.endDate,
          autoMarkAsPaid: values.autoMarkAsPaid,
          isActive: values.isActive,
        });
        toast.success("Recurring template updated");
      } else {
        await createTemplate({
          organizationId,
          name: values.name,
          description: values.description,
          amount: values.amount,
          interval: values.interval,
          intervalType: values.intervalType,
          startDate: values.startDate,
          nextRunDate: values.nextRunDate,
          endDate: values.endDate,
          autoMarkAsPaid: values.autoMarkAsPaid,
        });
        toast.success("Recurring template created");
      }
      onSuccess?.();
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save recurring template"
      );
    }
  };

  const isSubmitting = isCreating || isUpdating;
  const showActiveToggle = mode === "edit";

  return (
    <div className="bg-card rounded-xl border shadow-sm p-6">
      <div className="mb-6 space-y-1">
        <h2 className="text-xl font-semibold">
          {mode === "edit"
            ? "Update Recurring Expense Template"
            : "Create Recurring Expense Template"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Define automated recurring expenses and let the platform generate instances on schedule.
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Office Internet"
                      {...field}
                    />
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
                  <FormLabel>Amount (KES)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={field.value ?? 0}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value) || 0)
                      }
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
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Add context for the finance team"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 md:grid-cols-3">
            <FormField
              control={form.control}
              name="interval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interval</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      value={field.value ?? 1}
                      onChange={(event) =>
                        field.onChange(parseInt(event.target.value, 10) || 1)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="intervalType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interval Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cadence" />
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

            <FormField
              control={form.control}
              name="autoMarkAsPaid"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-end">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-sm font-medium">
                        Auto-mark as paid
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Mark generated expenses as paid instantly
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? field.value.toISOString().split("T")[0] : ""}
                      onChange={(event) =>
                        field.onChange(new Date(event.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nextRunDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Run</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? field.value.toISOString().split("T")[0] : ""}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value
                            ? new Date(event.target.value)
                            : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? field.value.toISOString().split("T")[0] : ""}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value
                            ? new Date(event.target.value)
                            : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {showActiveToggle && (
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-sm font-medium">
                        Active
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Disable to pause automatic generation
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === "edit" ? "Save Changes" : "Create Template"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
