import React from "react";
import { CardWrapper } from "@/components/auth/card-wrapper";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_REDIRECT_URL } from "@/routes";

const LinkSuccessPage = () => {
  return (
    <CardWrapper
      headerLabel="Account Linked Successfully!"
      backButtonLabel="Back to Login"
      backButtonLink="/auth/login"
      icon={<CheckCircle className="size-6 text-green-600" />}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Your accounts are now linked!
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            You can now sign in using either your email/password or your Google account.
          </p>
        </div>
        
        <div className="w-full space-y-3 mt-6">
          <Button 
            variant="gradient" 
            className="w-full" 
            asChild
          >
            <a href={DEFAULT_REDIRECT_URL}>
              Continue to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </CardWrapper>
  );
};

export default LinkSuccessPage;
