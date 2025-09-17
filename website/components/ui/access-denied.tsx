"use client";

/**
 * AccessDenied Component
 * 
 * A reusable component for displaying access denied/permission error messages.
 * 
 * @example
 * // Basic usage
 * <AccessDenied />
 * 
 * @example
 * // Custom message with back button
 * <AccessDenied
 *   title="Permission Required"
 *   message="You need admin access to view this page."
 *   showBackButton={true}
 *   backButtonLabel="Go to Dashboard"
 *   backButtonLink="/dashboard"
 * />
 * 
 * @example
 * // Compact variant for inline use
 * <AccessDenied
 *   variant="compact"
 *   message="You don't have permission to edit this item."
 * />
 */

import { ShieldX, Lock } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  backButtonLabel?: string;
  backButtonLink?: string;
  icon?: "shield" | "lock";
  className?: string;
  variant?: "default" | "compact" | "full";
}

export const AccessDenied = ({
  title = "Access Denied",
  message = "You don't have permission to view this content.",
  showBackButton = false,
  backButtonLabel = "Go Back",
  backButtonLink = "/",
  icon = "shield",
  className = "",
  variant = "default",
}: AccessDeniedProps) => {
  const IconComponent = icon === "lock" ? Lock : ShieldX;

  const getVariantClasses = () => {
    switch (variant) {
      case "compact":
        return "py-6";
      case "full":
        return "min-h-[400px] py-16";
      default:
        return "py-12";
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${getVariantClasses()} ${className}`}>
      <div className="text-center max-w-md mx-auto">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
            <IconComponent className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>

        {showBackButton && (
          <Link href={backButtonLink}>
            <Button variant="gradient" className="w-full sm:w-auto">
              {backButtonLabel}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};
