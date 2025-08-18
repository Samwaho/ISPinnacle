import { OrganizationForm } from '@/components/organization/organization-form'
import React from 'react'

const CreateOrganizationPage = () => {
  return (

      <div className="flex flex-col items-center justify-center min-h-screen py-8 md:py-16 px-4">
        <div className="w-full max-w-2xl">
          <OrganizationForm />
        </div>
      </div>
  )
}

export default CreateOrganizationPage