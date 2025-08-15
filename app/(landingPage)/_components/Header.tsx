import React from "react";
import { ModeToggle } from "@/components/ModeToggle";
import Link from "next/link";
import { UserButton } from "@/components/UserButton";

const Header = () => {
  return (
    <div className="flex w-full max-w-7xl items-center justify-between p-4">   
        <Link href="/" className="text-2xl font-bold text-gradient-custom">ISPinnacle</Link>
        <div className="flex items-center gap-2">
            <ModeToggle/>
           <UserButton/> 
        </div>
        
    </div>
  );
};

export default Header;
