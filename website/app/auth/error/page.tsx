import { ErrorCard } from '@/components/auth/error-card'
import { redirect } from 'next/navigation'
import React from 'react'

interface ErrorPageProps {
  searchParams: Promise<{
    error?: string;
    email?: string;
    provider?: string;
  }>;
}

const ErrorPage = async ({ searchParams }: ErrorPageProps) => {
  const resolved = await searchParams;

  // For OAuthAccountNotLinked errors, redirect to account linking page
  if (resolved.error === "OAuthAccountNotLinked") {
    const email = resolved.email;
    const provider = resolved.provider || "google";

    // Always redirect to account linking page, even without email
    // The form will handle the case where email is missing
    redirect(`/auth/link-account?provider=${provider}${email ? `&email=${email}` : ''}`);
  }

  return <ErrorCard />;
};

export default ErrorPage;