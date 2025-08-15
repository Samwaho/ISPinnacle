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
  return (
    <div className="flex flex-row items-center w-full">
        <Button variant="outline" size="lg" className="w-full cursor-pointer" onClick={handleGoogleSignIn}>
            <FcGoogle className="size-5" />
            <span className="text-sm">Continue with Google</span>
        </Button>
    </div>
  )
}

export default Social