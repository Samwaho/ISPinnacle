"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import { useTRPC } from "@/trpc/client";
import { ProfileDetailsForm } from "@/components/profile/profile-details-form";
import { ProfilePasswordForm } from "@/components/profile/profile-password-form";
import { ProfileTwoFactorForm } from "@/components/profile/profile-two-factor-form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type UserProfile = inferRouterOutputs<AppRouter>["user"]["getProfile"];

interface ProfilePageClientProps {
  initialProfile: UserProfile;
}

const ProfilePageClient = ({ initialProfile }: ProfilePageClientProps) => {
  const t = useTRPC();

  const {
    data: profile,
    isPending,
  } = useQuery({
    ...t.user.getProfile.queryOptions(),
    initialData: initialProfile,
    staleTime: 30_000,
  });

  const headerSubtitle = useMemo(() => {
    if (!profile) return "Manage your personal information and security settings.";
    return `Manage ${profile.name ? `${profile.name}'s` : "your"} personal information and security settings.`;
  }, [profile]);

  return (
    <div className="py-10 space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Account settings</h1>
          {profile && (
            <Badge variant="outline" className="uppercase tracking-wide">
              {profile.role.toLowerCase()}
            </Badge>
          )}
        </div>
        <p className="mt-2 text-muted-foreground">{headerSubtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.75fr_1fr]">
        <ProfileDetailsForm profile={profile ?? initialProfile} />
        <ProfilePasswordForm
          hasPassword={profile?.hasPassword ?? initialProfile.hasPassword}
          email={profile?.email ?? initialProfile.email}
        />
      </div>

      <Separator />

      <ProfileTwoFactorForm
        isEnabled={profile?.isTwoFactorEnabled ?? initialProfile.isTwoFactorEnabled}
        email={profile?.email ?? initialProfile.email}
      />

      {isPending && !profile && (
        <p className="text-sm text-muted-foreground">
          Loading the latest profile information...
        </p>
      )}
    </div>
  );
};

export default ProfilePageClient;
