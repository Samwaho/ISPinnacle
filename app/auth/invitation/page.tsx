"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CardWrapper } from "@/components/auth/card-wrapper";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail, UserPlus } from "lucide-react";

const InvitationPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTRPC();
  
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [userExists, setUserExists] = React.useState<boolean | null>(null);

  const { data: userExistsData } = useQuery(
    t.user.checkUserExists.queryOptions({ email: email || "" })
  );

  // Update userExists state when data changes
  React.useEffect(() => {
    if (userExistsData) {
      setUserExists(userExistsData.exists);
    }
  }, [userExistsData]);

  const {
    mutate: acceptInvitation,
    isPending: isAccepting,
  } = useMutation(
    t.user.acceptInvitation.mutationOptions({
      onSuccess: (data) => {
        toast.success("Invitation accepted successfully!");
        setIsProcessing(true);
        // Redirect to the organization page after a short delay
        setTimeout(() => {
          router.push(`/organization/${data.organization.id}`);
        }, 2000);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to accept invitation");
        setIsProcessing(false);
      },
    })
  );

  const {
    mutate: rejectInvitation,
    isPending: isRejecting,
  } = useMutation(
    t.user.rejectInvitation.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation rejected");
        setIsProcessing(true);
        // Redirect to home page after a short delay
        setTimeout(() => {
          router.push("/");
        }, 2000);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to reject invitation");
        setIsProcessing(false);
      },
    })
  );

  const handleAccept = () => {
    if (!token || !email) {
      toast.error("Invalid invitation link");
      return;
    }
    acceptInvitation({ token, email });
  };

  const handleReject = () => {
    if (!token || !email) {
      toast.error("Invalid invitation link");
      return;
    }
    rejectInvitation({ token, email });
  };

  const handleRegister = () => {
    if (!token || !email) {
      toast.error("Invalid invitation link");
      return;
    }
    // Redirect to register page with invitation token
    router.push(`/auth/register?invitation=${token}&email=${encodeURIComponent(email)}`);
  };

  const handleLogin = () => {
    if (!token || !email) {
      toast.error("Invalid invitation link");
      return;
    }
    // Redirect to login page with invitation token
    router.push(`/auth/login?invitation=${token}&email=${encodeURIComponent(email)}`);
  };

  if (!token || !email) {
    return (
      <CardWrapper
        headerLabel="Invalid Invitation"
        backButtonLabel="Back to home"
        backButtonLink="/"
        icon={<XCircle className="h-6 w-6 text-red-500" />}
      >
        <div className="flex flex-col items-center justify-center space-y-4 p-6">
          <XCircle className="h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold text-center">
            Invalid Invitation Link
          </h2>
          <p className="text-center text-muted-foreground">
            This invitation link is invalid or has expired. Please contact the organization administrator for a new invitation.
          </p>
        </div>
      </CardWrapper>
    );
  }

  if (isProcessing) {
    return (
      <CardWrapper
        headerLabel="Processing Invitation"
        backButtonLabel="Back to home"
        backButtonLink="/"
        icon={<Loader2 className="h-6 w-6 text-blue-500" />}
      >
        <div className="flex flex-col items-center justify-center space-y-4 p-6">
          <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
          <h2 className="text-xl font-semibold text-center">
            Processing Your Invitation
          </h2>
          <p className="text-center text-muted-foreground">
            Please wait while we process your invitation...
          </p>
        </div>
      </CardWrapper>
    );
  }

  // Show loading state while checking if user exists
  if (userExists === null) {
    return (
      <CardWrapper
        headerLabel="Checking Account"
        backButtonLabel="Back to home"
        backButtonLink="/"
        icon={<Loader2 className="h-6 w-6 text-blue-500" />}
      >
        <div className="flex flex-col items-center justify-center space-y-4 p-6">
          <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
          <h2 className="text-xl font-semibold text-center">
            Checking Your Account
          </h2>
          <p className="text-center text-muted-foreground">
            Please wait while we verify your account status...
          </p>
        </div>
      </CardWrapper>
    );
  }

  // If user doesn't exist, show registration/login options
  if (!userExists) {
    return (
      <CardWrapper
        headerLabel="Create Account"
        backButtonLabel="Back to home"
        backButtonLink="/"
        icon={<UserPlus className="h-6 w-6 text-blue-500" />}
      >
        <div className="flex flex-col items-center justify-center space-y-6 p-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">You&apos;ve Been Invited!</h2>
            <p className="text-muted-foreground">
              You&apos;ve been invited to join an organization on RentSys.
            </p>
            <p className="text-sm text-muted-foreground">
              Email: <span className="font-medium">{email}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              To accept this invitation, you need to create an account first.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-sm">
            <Button
              onClick={handleRegister}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create Account
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?
            </div>
            
            <Button
              onClick={handleLogin}
              variant="outline"
              className="flex-1"
            >
              Sign In
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground max-w-md">
            <p>
              After creating your account or signing in, you&apos;ll be automatically added to the organization with your assigned role.
            </p>
          </div>
        </div>
      </CardWrapper>
    );
  }

  // User exists, show accept/reject options
  return (
    <CardWrapper
      headerLabel="Organization Invitation"
      backButtonLabel="Back to home"
      backButtonLink="/"
      icon={<Mail className="h-6 w-6 text-blue-500" />}
    >
      <div className="flex flex-col items-center justify-center space-y-6 p-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">You&apos;ve Been Invited!</h2>
          <p className="text-muted-foreground">
            You&apos;ve been invited to join an organization on RentSys.
          </p>
          <p className="text-sm text-muted-foreground">
            Email: <span className="font-medium">{email}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Button
            onClick={handleAccept}
            disabled={isAccepting || isRejecting}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isAccepting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Accept Invitation
          </Button>
          
          <Button
            onClick={handleReject}
            disabled={isAccepting || isRejecting}
            variant="outline"
            className="flex-1"
          >
            {isRejecting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Decline
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground max-w-md">
          <p>
            By accepting this invitation, you&apos;ll be added to the organization and will have access to its resources based on your assigned role.
          </p>
        </div>
      </div>
    </CardWrapper>
  );
};

export default InvitationPage;
