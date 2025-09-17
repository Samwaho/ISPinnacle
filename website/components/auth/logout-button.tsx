"use client";
import { signOut } from "next-auth/react";
import { Button } from "../ui/button";

interface LogoutButtonProps {
    children: React.ReactNode;
}

export const LogoutButton = ({ children }: LogoutButtonProps) => {
  return (
    <Button className="w-full h-8 bg-transparent border border-red-500 hover:bg-red-50 dark:hover:bg-transparent dark:hover:border-red-300 text-red-500 cursor-pointer" onClick={() => signOut()}>
      {children}
    </Button>
  );
};
