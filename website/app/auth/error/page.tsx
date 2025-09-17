import { ErrorCard } from '@/components/auth/error-card'
import { redirect } from 'next/navigation'
import React from 'react'

interface ErrorPageProps {
  searchParams: {
    error?: string;
    email?: string;
    provider?: string;
  };
}

const ErrorPage = ({ searchParams }: ErrorPageProps) => {
  // For OAuthAccountNotLinked errors, redirect to account linking page
  if (searchParams.error === "OAuthAccountNotLinked") {
    const email = searchParams.email;
    const provider = searchParams.provider || "google";
    
    // Always redirect to account linking page, even without email
    // The form will handle the case where email is missing
    redirect(`/auth/link-account?provider=${provider}${email ? `&email=${email}` : ''}`);
  }

  return <ErrorCard />;
};

export default ErrorPage;