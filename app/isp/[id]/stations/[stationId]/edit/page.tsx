import React, { Suspense } from 'react'
import { StationForm } from '@/components/isp/station-form'
import { Skeleton } from '@/components/ui/skeleton'

function StationFormSkeleton() {
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
  )
}

const EditStationPage = () => {
  return (
    <Suspense fallback={<StationFormSkeleton />}>
      <div className="container mx-auto py-6">
        <StationForm mode="edit" />
      </div>
    </Suspense>
  )
}

export default EditStationPage
