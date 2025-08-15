import { LucideCheckCircle } from "lucide-react";
import React from "react";

interface FormSuccessProps {
  message: string;
}
const FormSuccess = ({ message }: FormSuccessProps) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 bg-emerald-500/15 text-emerald-500 rounded-md p-2">
      <LucideCheckCircle className="size-4" />
      <p className="text-sm">{message}</p>
    </div>
  );
};

export default FormSuccess;
