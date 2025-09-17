import React from 'react'
import { FcGoogle } from 'react-icons/fc'
import { Button } from '../ui/button'
import { signIn, signOut } from 'next-auth/react'
import { DEFAULT_REDIRECT_URL } from '@/routes'


const Social = () => {
  const handleGoogleSignIn = async () => {
    // First sign out to clear any existing session
    await signOut({ redirect: false });
    
    // Then sign in with Google
    await signIn("google", {
      callbackUrl: DEFAULT_REDIRECT_URL,
      prompt: "select_account", // Force account selection
    });
  };

  const handleGoogleSignInWithErrorHandling = async () => {
    try {
      await handleGoogleSignIn();
    } catch (error: unknown) {
      // If we get an OAuthAccountNotLinked error, redirect to account linking
      if (error && typeof error === 'object' && 'error' in error && error.error === "OAuthAccountNotLinked") {
        // We can't get the email here, but we can redirect to a page that will handle it
        window.location.href = "/auth/link-account";
      }
    }
  };
  return (
    <div className="flex flex-row items-center w-full">
        <Button variant="gradient2" size="lg" className="w-full cursor-pointer" onClick={handleGoogleSignInWithErrorHandling}>
            <FcGoogle className="size-5" />
            <span className="text-sm">Google</span>
        </Button>
    </div>
  )
}

export default Social