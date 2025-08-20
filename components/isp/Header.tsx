import React from "react";
import { ModeToggle } from "@/components/ModeToggle";
import Link from "next/link";
import { UserButton } from "@/components/UserButton";

const ISPHeader = ({
    organizationId,
    organizationName,
}: {
    organizationId: string;
    organizationName: string;
}) => {
  return (
    <div className="flex w-full items-center justify-between p-4">   
        <Link href={`/organization/${organizationId}`} className="text-2xl font-bold text-gradient-custom">{organizationName}</Link>
        <div className="flex items-center gap-2">
            <ModeToggle/>
           <UserButton/> 
        </div>
        
    </div>
  );
};

export default ISPHeader;
