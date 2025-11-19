import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import React from "react";
import { caller } from "@/trpc/server";
import { OrganizationCard } from "@/components/organization/organization-card";

const OrganizationPage = async () => {
  const organizations = await caller.organization.getMyOrganizations();
  return (
    <div className="container mx-auto flex flex-col items-center px-6 py-16">
      <div className="text-center mb-16 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-gradient-custom">
          Your Organizations
        </h1>
        <p className="text-xl text-muted-foreground">
          Manage your organizations and team collaborations
        </p>

        <div className="mt-8">
          <Link href="/organization/create">
            <Button className="bg-gradient-custom text-white hover:text-white cursor-pointer">
              <Plus className="mr-2 h-4 w-4" /> Create Organization
            </Button>
          </Link>
        </div>
      </div>
      {organizations.length === 0 ? (
        <div className="text-center py-16 w-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 max-w-md mx-auto">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Organizations Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Get started by creating your first organization to collaborate
              with your team.
            </p>
            <Link href="/organization/create">
              <Button className="" variant="gradient2">
                <Plus className="mr-2 h-4 w-4" /> Create Your First Organization
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 w-full">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {organizations.map((organization) => (
              <OrganizationCard
                key={organization.id}
                organization={organization}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationPage;
