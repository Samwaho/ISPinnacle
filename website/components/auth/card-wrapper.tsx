import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import Social from "./social";
import { Button } from "../ui/button";
import Link from "next/link";

interface CardWrapperProps {
  children: React.ReactNode;
  headerLabel: string;
  backButtonLabel: string;
  backButtonLink: string;
  showSocial?: boolean;
  icon?: React.ReactNode;
  showForgotPassword?: boolean;
}

export const CardWrapper = ({
  children,
  headerLabel,
  backButtonLabel,
  backButtonLink,
  showSocial,
  icon,
  showForgotPassword,
}: CardWrapperProps) => {
  return (
    <Card className="w-full max-w-md ">
      <CardHeader>
        <div className="flex flex-col gap-2 items-center justify-center w-full">
          <div className="rounded-full bg-fuchsia-100 p-2">{icon}</div>

          <h2 className="text-3xl font-bold tracking-tight">{headerLabel}</h2>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
      <CardFooter>
        <div className="flex items-center justify-center gap-2 w-full">
          {showForgotPassword && (
            <Button variant="link" className="text-fuchsia-500" asChild>
              <Link href="/auth/reset">Forgot password?</Link>
            </Button>
          )}
          <Button variant="link" className="text-fuchsia-500" asChild>
            <Link href={backButtonLink}>{backButtonLabel}</Link>
          </Button>
        </div>
      </CardFooter>
      {showSocial && (
        <CardFooter className="flex flex-col gap-2">
          <div className="relative pb-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>
          <Social />
        </CardFooter>
      )}
    </Card>
  );
};
