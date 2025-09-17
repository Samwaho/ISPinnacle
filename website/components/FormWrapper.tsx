import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface FormWrapperProps {
  children: React.ReactNode;
  title: string;
  backButtonLabel: string;
  backButtonLink: string;
  description?: string;
  showIcon?: boolean;
  icon?: React.ReactNode;
}

export const FormWrapper = ({
  children,
  title,
  backButtonLabel,
  backButtonLink,
  description,
  showIcon = true,
  icon,
}: FormWrapperProps) => {
  return (
    <Card className="">
      <CardHeader className="text-center pb-6">
        <div className="flex items-center justify-center mb-4">
          {showIcon && (
            <div className="bg-gradient-custom p-3 rounded-full">
              {icon || <Sparkles className="h-6 w-6 text-white" />}
            </div>
          )}
        </div>
        <CardTitle className="text-2xl font-bold text-gradient-custom">
          {title}
        </CardTitle>
        {description && (
          <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
      <CardFooter className="flex justify-center pt-6">
        <Button
          variant="outline"
          asChild
          className="group transition-all duration-300 hover:shadow-lg hover:scale-105"
        >
          <Link href={backButtonLink} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            {backButtonLabel}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
