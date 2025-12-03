import { Organization } from "@/lib/generated/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Calendar, Mail, Phone, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface OrganizationCardProps {
  organization: Organization;
}

export const OrganizationCard = ({ organization }: OrganizationCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="size-12">
              <AvatarImage
                src={organization.logo || undefined}
                alt={organization.name}
                className=""
              />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(organization.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                {organization.name}
              </CardTitle>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>Created {formatDate(organization.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col space-y-4">
        <div className="flex flex-1 flex-col space-y-4">
          {organization.description && (
            <CardDescription className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {organization.description}
            </CardDescription>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Mail className="h-4 w-4" />
              <span>{organization.email}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Phone className="h-4 w-4" />
              <span>{organization.phone}</span>
            </div>
            {organization.website && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Globe className="h-4 w-4" />
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline transition-colors"
                >
                  {organization.website}
                </a>
              </div>
            )}
          </div>
        </div>

        <Link href={`/organization/${organization.id}`}>
          <Button variant="gradient2" className="w-full">
            View Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
