"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/table/DataTable";
import {
  expenseColumns,
  ExpenseTableRow,
} from "@/components/isp/expense-columns";
import {
  recurringTemplateColumns,
  RecurringTemplateRow,
} from "@/components/isp/recurring-template-columns";
import { RecurringTemplateForm } from "@/components/isp/recurring-template-form";
import {
  DollarSign,
  Plus,
  CheckCircle,
  XCircle,
  RotateCcw,
  TrendingUp,
  RefreshCcw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { AccessDenied } from "@/components/ui/access-denied";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const normalizeDate = (value?: Date | string | null) =>
  value ? (value instanceof Date ? value : new Date(value)) : undefined;

const pluralize = (count: number, noun: string, suffix = "s") =>
  `${count} ${noun}${count === 1 ? "" : suffix}`;

const ExpensesPage = () => {
  const params = useParams<{ id: string }>();
  const organizationId = params.id;
  const router = useRouter();
  const t = useTRPC();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState<"expenses" | "templates">(
    "expenses"
  );
  const [templateDialogOpen, setTemplateDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] =
    React.useState<RecurringTemplateRow | null>(null);
  const [deletingExpense, setDeletingExpense] =
    React.useState<ExpenseTableRow | null>(null);
  const [deletingTemplate, setDeletingTemplate] =
    React.useState<RecurringTemplateRow | null>(null);

  const { data: userPermissions, isLoading: permissionsLoading } = useQuery({
    ...t.organization.getUserPermissions.queryOptions({
      id: organizationId,
    }),
    enabled: !!organizationId,
  });

  const canViewExpenses = !!userPermissions?.canViewExpenses;
  const canManageExpenses = !!userPermissions?.canManageExpenses;

  const invalidateExpenseQueries = React.useCallback(async () => {
    if (!organizationId) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: t.expenses.getExpenses.queryKey({ organizationId }),
      }),
      queryClient.invalidateQueries({
        queryKey: t.expenses.getExpenseStats.queryKey({ organizationId }),
      }),
      queryClient.invalidateQueries({
        queryKey: t.expenses.getRecurringExpenseTemplates.queryKey({
          organizationId,
        }),
      }),
    ]);
  }, [organizationId, queryClient, t]);

  const { data: expenses, isPending: expensesLoading } = useQuery({
    ...t.expenses.getExpenses.queryOptions({ organizationId }),
    enabled: !!organizationId && canViewExpenses,
  });

  const { data: expenseStats, isPending: statsLoading } = useQuery({
    ...t.expenses.getExpenseStats.queryOptions({ organizationId }),
    enabled: !!organizationId && canViewExpenses,
  });

  const { data: recurringTemplates, isPending: templatesLoading } = useQuery({
    ...t.expenses.getRecurringExpenseTemplates.queryOptions({
      organizationId,
    }),
    enabled: !!organizationId && canViewExpenses,
  });

  const expenseRows = React.useMemo<ExpenseTableRow[]>(() => {
    if (!expenses) return [];
    return expenses.map((expense) => {
      const date = normalizeDate(expense.date) ?? new Date();
      return {
        id: expense.id,
        name: expense.name,
        description: expense.description,
        amount: expense.amount,
        date,
        isRecurring: expense.isRecurring ?? false,
        recurringInterval: expense.recurringInterval ?? undefined,
        recurringIntervalType: expense.recurringIntervalType ?? undefined,
        recurringStartDate: normalizeDate(expense.recurringStartDate) ?? null,
        recurringEndDate: normalizeDate(expense.recurringEndDate) ?? null,
        isPaid: expense.isPaid ?? false,
        paidAt: normalizeDate(expense.paidAt) ?? null,
        createdAt: normalizeDate(expense.createdAt) ?? new Date(),
        updatedAt: normalizeDate(expense.updatedAt) ?? new Date(),
        templateId: expense.template?.id ?? null,
        templateName: expense.template?.name ?? null,
      };
    });
  }, [expenses]);

  const templateRows = React.useMemo<RecurringTemplateRow[]>(() => {
    if (!recurringTemplates) return [];
    return recurringTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      amount: template.amount,
      interval: template.interval,
      intervalType: template.intervalType,
      startDate: normalizeDate(template.startDate) ?? new Date(),
      nextRunDate: normalizeDate(template.nextRunDate) ?? new Date(),
      endDate: normalizeDate(template.endDate),
      autoMarkAsPaid: template.autoMarkAsPaid,
      lastGeneratedAt: normalizeDate(template.lastGeneratedAt),
      isActive: template.isActive,
      stats: template.stats,
      recentExpenses: template.recentExpenses.map((expense) => ({
        ...expense,
        date: normalizeDate(expense.date) ?? new Date(),
      })),
    }));
  }, [recurringTemplates]);

  const deleteExpenseMutation = useMutation(
    t.expenses.deleteExpense.mutationOptions({
      onSuccess: async () => {
        await invalidateExpenseQueries();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete expense");
      },
    })
  );

  const markExpenseAsPaidMutation = useMutation(
    t.expenses.markExpenseAsPaid.mutationOptions({
      onSuccess: async () => {
        await invalidateExpenseQueries();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to mark expense as paid");
      },
    })
  );

  const toggleTemplateMutation = useMutation(
    t.expenses.toggleRecurringExpenseTemplate.mutationOptions({
      onSuccess: async () => {
        await invalidateExpenseQueries();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update schedule");
      },
    })
  );

  const deleteTemplateMutation = useMutation(
    t.expenses.deleteRecurringExpenseTemplate.mutationOptions({
      onSuccess: async () => {
        await invalidateExpenseQueries();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete template");
      },
    })
  );

  const processTemplatesMutation = useMutation(
    t.expenses.processRecurringExpenseTemplates.mutationOptions({
      onSuccess: async (data) => {
        await invalidateExpenseQueries();
        const message =
          data.generatedExpenses > 0
            ? `Generated ${pluralize(
                data.generatedExpenses,
                "expense"
              )} across ${pluralize(data.processedTemplates, "schedule")}.`
            : "No schedules were due this cycle.";
        toast.success(message);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to process schedules");
      },
    })
  );

  const handleEditExpense = React.useCallback(
    (expense: ExpenseTableRow) => {
      router.push(`/isp/${organizationId}/expenses/${expense.id}/edit`);
    },
    [organizationId, router]
  );

  const handleDeleteExpense = React.useCallback(
    (expense: ExpenseTableRow) => {
      setDeletingExpense(expense);
    },
    []
  );

  const confirmDeleteExpense = React.useCallback(async () => {
    if (!deletingExpense) return;
    try {
      await deleteExpenseMutation.mutateAsync({
        id: deletingExpense.id,
        organizationId,
      });
      toast.success(`Deleted expense "${deletingExpense.name}"`);
    } catch {
      // handled in onError
    } finally {
      setDeletingExpense(null);
    }
  }, [deleteExpenseMutation, deletingExpense, organizationId]);

  const handleMarkAsPaid = React.useCallback(
    async (expense: ExpenseTableRow) => {
      try {
        await markExpenseAsPaidMutation.mutateAsync({
          id: expense.id,
          organizationId,
        });
        toast.success(`Marked "${expense.name}" as paid`);
      } catch {
        // handled in onError
      }
    },
    [markExpenseAsPaidMutation, organizationId]
  );

  const handleCreateTemplate = React.useCallback(() => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  }, []);

  const handleEditTemplate = React.useCallback((template: RecurringTemplateRow) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  }, []);

  const handleToggleTemplate = React.useCallback(
    async (template: RecurringTemplateRow) => {
      try {
        await toggleTemplateMutation.mutateAsync({
          id: template.id,
          organizationId,
          isActive: !template.isActive,
        });
        toast.success(
          !template.isActive
            ? `Activated "${template.name}"`
            : `Paused "${template.name}"`
        );
      } catch {
        // handled in onError
      }
    },
    [organizationId, toggleTemplateMutation]
  );

  const requestDeleteTemplate = React.useCallback(
    (template: RecurringTemplateRow) => {
      setDeletingTemplate(template);
    },
    []
  );

  const confirmDeleteTemplate = React.useCallback(async () => {
    if (!deletingTemplate) return;
    try {
      await deleteTemplateMutation.mutateAsync({
        id: deletingTemplate.id,
        organizationId,
      });
      toast.success(`Deleted template "${deletingTemplate.name}"`);
    } catch {
      // handled in onError
    } finally {
      setDeletingTemplate(null);
    }
  }, [deleteTemplateMutation, deletingTemplate, organizationId]);

  const handleProcessTemplate = React.useCallback(
    async (template: RecurringTemplateRow) => {
      try {
        await processTemplatesMutation.mutateAsync({
          organizationId,
          templateIds: [template.id],
        });
      } catch {
        // handled in onError
      }
    },
    [organizationId, processTemplatesMutation]
  );

  const handleProcessAll = React.useCallback(async () => {
    try {
      await processTemplatesMutation.mutateAsync({
        organizationId,
      });
    } catch {
      // handled in onError
    }
  }, [organizationId, processTemplatesMutation]);

  const expenseTableColumns = React.useMemo(
    () =>
      expenseColumns({
        onEditExpense: canManageExpenses ? handleEditExpense : undefined,
        onDeleteExpense: canManageExpenses ? handleDeleteExpense : undefined,
        onMarkAsPaid: canManageExpenses ? handleMarkAsPaid : undefined,
        canManageExpenses,
      }),
    [canManageExpenses, handleDeleteExpense, handleEditExpense, handleMarkAsPaid]
  );

  const templateTableColumns = React.useMemo(
    () =>
      recurringTemplateColumns({
        onEdit: canManageExpenses ? handleEditTemplate : undefined,
        onToggle: canManageExpenses ? handleToggleTemplate : undefined,
        onDelete: canManageExpenses ? requestDeleteTemplate : undefined,
        onProcess: canManageExpenses ? handleProcessTemplate : undefined,
      }),
    [
      canManageExpenses,
      handleEditTemplate,
      handleToggleTemplate,
      requestDeleteTemplate,
      handleProcessTemplate,
    ]
  );

  if (permissionsLoading) {
    return (
      <div className="flex flex-col gap-6 my-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-card rounded-lg p-6 border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-card rounded-lg p-6 border space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!canViewExpenses) {
    return (
      <div className="my-8">
        <AccessDenied
          title="Access Denied"
          message="You don't have permission to view expenses in this organization."
          showBackButton
          backButtonLabel="Back to Organization"
          backButtonLink={`/organization/${organizationId}`}
        />
      </div>
    );
  }

  const recurringTemplateStats = expenseStats?.recurringTemplates ?? {
    active: 0,
    inactive: 0,
  };

  return (
    <div className="flex flex-col gap-6 my-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-card rounded-lg p-6 border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Total Expenses"
              value={expenseStats?.totalExpenses?.toString() ?? "0"}
              icon={<DollarSign className="h-5 w-5" />}
              color="blue"
              isClickable={false}
            />
            <StatCard
              title="Paid Expenses"
              value={expenseStats?.paidExpenses?.toString() ?? "0"}
              icon={<CheckCircle className="h-5 w-5" />}
              color="green"
              isClickable={false}
            />
            <StatCard
              title="Unpaid Expenses"
              value={expenseStats?.unpaidExpenses?.toString() ?? "0"}
              icon={<XCircle className="h-5 w-5" />}
              color="red"
              isClickable={false}
            />
            <StatCard
              title="Recurring Entries"
              value={expenseStats?.recurringExpenses?.toString() ?? "0"}
              icon={<RotateCcw className="h-5 w-5" />}
              color="purple"
              isClickable={false}
            />
            <StatCard
              title="Active Schedules"
              value={recurringTemplateStats.active.toString()}
              icon={<RefreshCcw className="h-5 w-5" />}
              color="orange"
              isClickable={false}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {statsLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-card rounded-lg p-6 border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Total Amount"
              value={`KES ${(expenseStats?.totalAmount ?? 0).toLocaleString()}`}
              icon={<TrendingUp className="h-5 w-5" />}
              color="blue"
              isClickable={false}
            />
            <StatCard
              title="Paid Amount"
              value={`KES ${(expenseStats?.paidAmount ?? 0).toLocaleString()}`}
              icon={<CheckCircle className="h-5 w-5" />}
              color="green"
              isClickable={false}
            />
            <StatCard
              title="Unpaid Amount"
              value={`KES ${(expenseStats?.unpaidAmount ?? 0).toLocaleString()}`}
              icon={<XCircle className="h-5 w-5" />}
              color="red"
              isClickable={false}
            />
          </>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "expenses" | "templates")}
        className="space-y-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-fit">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="templates">Recurring Templates</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            {activeTab === "expenses" ? (
              canManageExpenses && (
                <Link href={`/isp/${organizationId}/expenses/new`}>
                  <Button variant="gradient" className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add Expense
                  </Button>
                </Link>
              )
            ) : (
              canManageExpenses && (
                <>
                  <Button
                    variant="secondary"
                    className="flex items-center gap-2"
                    onClick={handleProcessAll}
                    disabled={
                      processTemplatesMutation.isPending ||
                      templatesLoading ||
                      templateRows.length === 0
                    }
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {processTemplatesMutation.isPending
                      ? "Processing..."
                      : "Run schedules"}
                  </Button>
                  <Button
                    variant="gradient"
                    className="flex items-center gap-2"
                    onClick={handleCreateTemplate}
                  >
                    <Plus className="h-5 w-5" />
                    New Template
                  </Button>
                </>
              )
            )}
          </div>
        </div>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Expenses
            </h3>
          </div>

          {expensesLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-6 w-16 rounded" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            <DataTable
              columns={expenseTableColumns}
              data={expenseRows}
              filterPlaceholder="Search expenses..."
              enableRowSelection={false}
            />
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Recurring Templates
            </h3>
          </div>

          {templatesLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            <DataTable
              columns={templateTableColumns}
              data={templateRows}
              filterPlaceholder="Search templates..."
              enableRowSelection={false}
            />
          )}
        </TabsContent>
      </Tabs>

      <DeleteConfirmationDialog
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={confirmDeleteExpense}
        title="Delete Expense"
        description={`Are you sure you want to delete the expense "${deletingExpense?.name}"? This action cannot be undone.`}
        isLoading={deleteExpenseMutation.isPending}
        variant="destructive"
      />

      <DeleteConfirmationDialog
        isOpen={!!deletingTemplate}
        onClose={() => setDeletingTemplate(null)}
        onConfirm={confirmDeleteTemplate}
        title="Delete Recurring Template"
        description={`Delete the recurring template "${deletingTemplate?.name}"? Existing expenses remain, but the schedule will be removed.`}
        isLoading={deleteTemplateMutation.isPending}
        variant="destructive"
      />

      <Dialog
        open={templateDialogOpen}
        onOpenChange={(open) => {
          setTemplateDialogOpen(open);
          if (!open) {
            setEditingTemplate(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl border-none bg-transparent p-0">
          <RecurringTemplateForm
            organizationId={organizationId}
            mode={editingTemplate ? "edit" : "create"}
            template={editingTemplate}
            onSuccess={() => {
              setTemplateDialogOpen(false);
              setEditingTemplate(null);
            }}
            onCancel={() => {
              setTemplateDialogOpen(false);
              setEditingTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpensesPage;
