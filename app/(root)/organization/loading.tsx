import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const OrganizationCardSkeleton = () => {
  return (
    <Card className="min-w-80">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="size-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>

        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
};

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center mt-16">
      <div className="text-center mb-16">
        <div className="flex items-center justify-center mb-6">
          <Building2 className="h-12 w-12 text-primary mr-4" />
          <Skeleton className="h-12 w-64" />
        </div>
        <Skeleton className="h-6 w-96 mx-auto mb-8" />
        
        <div className="mt-8">
          <Button disabled className="bg-gradient-custom text-white hover:text-white cursor-pointer opacity-50">
            <Plus className="mr-2 h-4 w-4" /> Create Organization
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <OrganizationCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
