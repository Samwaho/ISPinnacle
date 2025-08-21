"use client";
import React, { useEffect } from 'react'
import { CardWrapper } from './card-wrapper'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '../ui/button'
import { AlertTriangle, Mail, Lock, Link } from 'lucide-react'
import { AccessDenied } from '../ui/access-denied'

export const ErrorCard = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");
  const oauthEmail = searchParams.get("email");
  const oauthProvider = searchParams.get("provider") || "google";
  const [countdown, setCountdown] = React.useState(3);

  // Auto-redirect to account linking page for OAuth errors if email is available
  // This is now handled at the page level, but keeping for fallback
  useEffect(() => {
    if (error === "OAuthAccountNotLinked" && oauthEmail) {
      // Countdown timer
      const countdownTimer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            router.push(`/auth/link-account?email=${oauthEmail}&provider=${oauthProvider}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownTimer);
    }
  }, [error, oauthEmail, oauthProvider, router]);

  const getErrorContent = () => {
    switch (error) {
      case "OAuthAccountNotLinked":
        return {
          title: "Account Already Exists",
          description: "An account with this email already exists using a different sign-in method.",
          icon: <AlertTriangle className="h-8 w-8 text-orange-500" />,
                  solutions: [
          {
            title: "Sign in with your password",
            description: "If you created your account with email and password, use that method instead.",
            action: "Go to Login",
            href: "/auth/login",
            icon: <Lock className="h-4 w-4" />
          },
                     {
             title: "Link your accounts",
             description: "Link your existing account with your Google account for easier sign-in.",
             action: "Link Accounts",
             href: `/auth/link-account?email=${oauthEmail}&provider=${oauthProvider}`,
             icon: <Link className="h-4 w-4" />
           },
          {
            title: "Reset your password",
            description: "If you forgot your password, you can reset it using your email.",
            action: "Reset Password",
            href: "/auth/reset",
            icon: <Mail className="h-4 w-4" />
          }
        ]
        };
      case "AccessDenied":
        return {
          title: "Access Denied",
          description: "You don't have permission to access this resource.",
          icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
          solutions: [],
          useAccessDeniedComponent: true
        };
      case "Verification":
        return {
          title: "Email Verification Required",
          description: "Please verify your email address before signing in.",
          icon: <Mail className="h-8 w-8 text-blue-500" />,
          solutions: []
        };
      default:
        return {
          title: "Something went wrong",
          description: "An unexpected error occurred. Please try again.",
          icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
          solutions: []
        };
    }
  };

  const errorContent = getErrorContent();

  return (
    <CardWrapper 
      headerLabel={errorContent.title} 
      backButtonLabel="Back to Login" 
      backButtonLink="/auth/login"
    >
      {errorContent.useAccessDeniedComponent ? (
        <AccessDenied
          title={errorContent.title}
          message={errorContent.description}
          showBackButton={true}
          backButtonLabel="Back to Login"
          backButtonLink="/auth/login"
          icon="lock"
        />
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4">
          {errorContent.icon}
          <p className="text-sm text-muted-foreground text-center">
            {errorContent.description}
          </p>
         
         {error === "OAuthAccountNotLinked" && oauthEmail && countdown > 0 && (
           <div className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-md flex items-center justify-between">
             <span>Redirecting to account linking page in {countdown} seconds...</span>
             <Button
               variant="ghost"
               size="sm"
               className="text-xs h-6 px-2 ml-2"
               onClick={() => router.push(`/auth/link-account?email=${oauthEmail}&provider=${oauthProvider}`)}
             >
               Skip
             </Button>
           </div>
         )}
        
        {errorContent.solutions.length > 0 && (
          <div className="w-full space-y-3 mt-6">
            <h3 className="text-sm font-medium text-center">What would you like to do?</h3>
            {errorContent.solutions.map((solution, index) => (
              <div key={index} className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-start space-x-3">
                  {solution.icon}
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{solution.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {solution.description}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-3"
                  asChild
                >
                  <a href={solution.href}>{solution.action}</a>
                </Button>
              </div>
            ))}
          </div>
        )}
        </div>
      )}
    </CardWrapper>
  )
}
