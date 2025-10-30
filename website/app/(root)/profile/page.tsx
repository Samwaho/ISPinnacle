import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-hooks";
import { caller } from "@/trpc/server";
import ProfilePageClient from "./profile-page-client";

const ProfilePage = async () => {
  const sessionUser = await getCurrentUser();

  if (!sessionUser) {
    redirect("/auth/login");
  }

  const profile = await caller.user.getProfile();

  return <ProfilePageClient initialProfile={profile} />;
};

export default ProfilePage;
