import React from 'react'
import { CardWrapper } from './card-wrapper'

export const ErrorCard = () => {
  return (
    <CardWrapper headerLabel="Something went wrong" backButtonLabel="Back" backButtonLink="/auth/login">
        <div className="flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold">Error</h1>
            <p className="text-sm text-gray-500">Please try again</p>
        </div>
    </CardWrapper>
  )
}
