import { LucideAlertCircle } from "lucide-react";
import React from "react";

interface FormErrorProps {
  message: string;
}
const FormError = ({ message }: FormErrorProps) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 bg-destructive/15 text-destructive rounded-md p-2">
      <LucideAlertCircle className="size-4" />
      <p className="text-sm">{message}</p>
    </div>
  );
};

export default FormError;
