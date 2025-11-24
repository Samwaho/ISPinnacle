"use client";
import { useState } from "react";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  Calendar,
  Edit,
  Network,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { OrganizationEditForm } from "./organization-edit-form";

interface OrganizationDetailsProps {
  organization: {
    id: string;
    name: string;
    email: string;
    phone: string;
    logo?: string | null;
    website?: string | null;
    description?: string | null;
    vpnSubnetCidr?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  canEdit?: boolean;
}

export const OrganizationDetails = ({ organization, canEdit = false }: OrganizationDetailsProps) => {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <OrganizationEditForm
        organization={organization}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Organization Details</h3>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Details
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Info Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="size-16">
                <AvatarImage src={organization.logo ?? ""} />
                <AvatarFallback className="text-lg">
                  {organization.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="text-xl font-semibold">{organization.name}</h4>
                {organization.description && (
                  <p className="text-muted-foreground mt-1">
                    {organization.description}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {organization.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">
                    {organization.phone}
                  </p>
                </div>
              </div>

              {organization.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Website</p>
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {organization.website}
                    </a>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Network className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">VPN Subnet</p>
                  <p className="text-sm text-muted-foreground">
                    {organization.vpnSubnetCidr || "Not set (uses shared default)"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metadata Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Created
              </p>
              <p className="text-sm">{formatDate(organization.createdAt)}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Last Updated
              </p>
              <p className="text-sm">{formatDate(organization.updatedAt)}</p>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Status
              </p>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
