import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { signOut } from "next-auth/react";
import { Button } from "./ui/button";
import { LoginButton } from "./auth/login-button";
import { Separator } from "./ui/separator";
import Link from "next/link";
import { Building2, User } from "lucide-react";

export const UserButton = () => {
  const user = useCurrentUser();

  if (!user) {
    return (
      <LoginButton>
        <Button variant="gradient">Sign in</Button>
      </LoginButton>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer">
          <AvatarImage src={user?.image ?? ""} />
          <AvatarFallback className="text-sm font-semibold text-center uppercase bg-gradient-custom text-white">
            {user?.name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-4">
        <div className="mb-3">
          <p className="font-semibold text-foreground">{`${user.name}`}</p>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        </div>
        <Separator className="my-2" />
        <DropdownMenuItem>
          <Link href="/profile" className="w-full flex items-center gap-2">
            <User className="size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/organization" className="w-full flex items-center gap-2">
            <Building2 className="size-4" />
            Organization
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Button className="w-full h-8 bg-transparent border border-red-500 hover:bg-red-50 dark:hover:bg-transparent dark:hover:border-red-300 text-red-500 cursor-pointer" onClick={() => signOut()}>
            Log out
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
