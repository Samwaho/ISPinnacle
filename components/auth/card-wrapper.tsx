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
}

export const CardWrapper = ({
  children,
  headerLabel,
  backButtonLabel,
  backButtonLink,
  showSocial,
}: CardWrapperProps) => {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-center w-full">
          <h2 className="text-2xl font-bold">{headerLabel}</h2>
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      {showSocial && (
        <CardFooter>
          <Social />
        </CardFooter>
      )}
      <CardFooter>
        <Button variant="link" className="w-full text-center" asChild>
          <Link href={backButtonLink}>{backButtonLabel}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
