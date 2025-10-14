"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/table/DataTable";
import { expenseColumns, ExpenseTableRow } from "@/components/isp/expense-columns";
import { DollarSign, Plus, CheckCircle, XCircle, RotateCcw, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { AccessDenied } from "@/components/ui/access-denied";

const ExpensesPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const t = useTRPC();
  const [, setSelectedExpenses] = React.useState<ExpenseTableRow[]>([]);
  const { data: expenses, isPending } = useQuery(
    t.expenses.getExpenses.queryOptions({ organizationId: id as string })
  );

  const { data: expenseStats, isPending: statsLoading } = useQuery(
    t.expenses.getExpenseStats.queryOptions({ organizationId: id as string })
  );

  const { data: userPermissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: id as string })
  );

  const queryClient = useQueryClient();

  // Check if user has permission to view expenses
  const canViewExpenses = userPermissions?.canViewExpenses || false;
  const canManageExpenses = userPermissions?.canManageExpenses || false;

  const {
    mutate: deleteExpense,
    isPending: isDeletingExpense,
  } = useMutation(
    t.expenses.deleteExpense.mutationOptions({
      onSuccess: () => {
        toast.success("Expense deleted successfully");
        queryClient.invalidateQueries({
          queryKey: t.expenses.getExpenses.queryKey({ organizationId: id as string }),
        });
        queryClient.invalidateQueries({
          queryKey: t.expenses.getExpenseStats.queryKey({ organizationId: id as string }),
        });
        setDeletingExpense(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete expense");
        setDeletingExpense(null);
      },
    })
  );

  const {
    mutate: markAsPaid,
  } = useMutation(
    t.expenses.markExpenseAsPaid.mutationOptions({
      onSuccess: () => {
        toast.success("Expense marked as paid successfully");
        queryClient.invalidateQueries({
          queryKey: t.expenses.getExpenses.queryKey({ organizationId: id as string }),
        });
        queryClient.invalidateQueries({
          queryKey: t.expenses.getExpenseStats.queryKey({ organizationId: id as string }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to mark expense as paid");
      },
    })
  );

  const [deletingExpense, setDeletingExpense] = React.useState<ExpenseTableRow | null>(null);

  const handleDeleteExpense = (expense: ExpenseTableRow) => {
    setDeletingExpense(expense);
  };

  const handleEditExpense = (expense: ExpenseTableRow) => {
    router.push(`/isp/${id}/expenses/${expense.id}/edit`);
  };

  const handleMarkAsPaid = (expense: ExpenseTableRow) => {
    markAsPaid({
      id: expense.id,
      organizationId: id as string,
    });
  };

  const columns = expenseColumns({
    onEditExpense: handleEditExpense,
    onDeleteExpense: handleDeleteExpense,
    onMarkAsPaid: handleMarkAsPaid,
    canManageExpenses,
  });

  // Show loading state while checking permissions
  if (permissionsLoading) {
    return (
      <div className="flex flex-col gap-6 my-8">
        {/* Stats Cards Loading */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-6 border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Header Loading */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Table Loading */}
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
          
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 my-8">
      {!canViewExpenses ? (
        <AccessDenied
          title="Access Denied"
          message="You don't have permission to view expenses in this organization."
          showBackButton={true}
          backButtonLabel="Back to Organization"
          backButtonLink={`/organization/${id}`}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {statsLoading ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-lg p-6 border">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-12" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <StatCard
                  title="Total Expenses"
                  value={expenseStats?.totalExpenses.toString() || "0"}
                  icon={<DollarSign className="h-5 w-5" />}
                  color="blue"
                  isClickable={false}
                />
                <StatCard
                  title="Paid Expenses"
                  value={expenseStats?.paidExpenses.toString() || "0"}
                  icon={<CheckCircle className="h-5 w-5" />}
                  color="green"
                  isClickable={false}
                />
                <StatCard
                  title="Unpaid Expenses"
                  value={expenseStats?.unpaidExpenses.toString() || "0"}
                  icon={<XCircle className="h-5 w-5" />}
                  color="red"
                  isClickable={false}
                />
                <StatCard
                  title="Recurring"
                  value={expenseStats?.recurringExpenses.toString() || "0"}
                  icon={<RotateCcw className="h-5 w-5" />}
                  color="purple"
                  isClickable={false}
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Total Amount"
              value={`KES ${(expenseStats?.totalAmount || 0).toLocaleString()}`}
              icon={<TrendingUp className="h-5 w-5" />}
              color="blue"
              isClickable={false}
            />
            <StatCard
              title="Paid Amount"
              value={`KES ${(expenseStats?.paidAmount || 0).toLocaleString()}`}
              icon={<CheckCircle className="h-5 w-5" />}
              color="green"
              isClickable={false}
            />
            <StatCard
              title="Unpaid Amount"
              value={`KES ${(expenseStats?.unpaidAmount || 0).toLocaleString()}`}
              icon={<XCircle className="h-5 w-5" />}
              color="red"
              isClickable={false}
            />
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Expenses
            </h3>
            {userPermissions?.canManageExpenses && !permissionsLoading && (
              <Link href={`/isp/${id}/expenses/new`}>
                <Button variant="gradient">
                  <Plus className="h-5 w-5" /> Add Expense
                </Button>
              </Link>
            )}
          </div>

          {isPending ? (
            <div className="space-y-3">
              {/* Table Header Skeleton */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
              
              {/* Table Rows Skeleton */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
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
              columns={columns}
              data={expenses?.map((expense) => ({
                id: expense.id,
                name: expense.name,
                description: expense.description,
                amount: expense.amount,
                date: expense.date instanceof Date ? expense.date : new Date(expense.date),
                isRecurring: expense.isRecurring,
                recurringInterval: expense.recurringInterval,
                recurringIntervalType: expense.recurringIntervalType,
                recurringStartDate: expense.recurringStartDate ? (expense.recurringStartDate instanceof Date ? expense.recurringStartDate : new Date(expense.recurringStartDate)) : null,
                recurringEndDate: expense.recurringEndDate ? (expense.recurringEndDate instanceof Date ? expense.recurringEndDate : new Date(expense.recurringEndDate)) : null,
                isPaid: expense.isPaid,
                paidAt: expense.paidAt ? (expense.paidAt instanceof Date ? expense.paidAt : new Date(expense.paidAt)) : null,
                createdAt: expense.createdAt instanceof Date ? expense.createdAt : new Date(expense.createdAt),
                updatedAt: expense.updatedAt instanceof Date ? expense.updatedAt : new Date(expense.updatedAt),
              })) ?? []}
              filterPlaceholder="Search expenses..."
              onRowSelectionChange={setSelectedExpenses}
            />
          )}
        </>
      )}

      {/* Delete Expense Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={() => {
          if (deletingExpense) {
            deleteExpense({
              id: deletingExpense.id,
              organizationId: id as string,
            });
          }
        }}
        title="Delete Expense"
        description={`Are you sure you want to delete the expense "${deletingExpense?.name}"? This action cannot be undone.`}
        isLoading={isDeletingExpense}
        variant="destructive"
      />
    </div>
  );
};

export default ExpensesPage;
