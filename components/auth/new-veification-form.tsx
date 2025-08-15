"use client";
import { CardWrapper } from "./card-wrapper";
import { BeatLoader } from "react-spinners";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import FormError from "../FormError";
import FormSuccess from "../FormSuccess";

export const NewVerificationForm = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const t = useTRPC();
  const { mutate: verifyEmail, isPending, error, data } = useMutation(
    t.user.verifyEmail.mutationOptions()
  );

  const verify = useCallback(() => {
    if (!token) return;
    verifyEmail({ token });
  }, [token, verifyEmail]);

  useEffect(() => {
    verify();
  }, [verify]);

  return (
    <CardWrapper
      headerLabel="Verify your email"
      backButtonLabel="Back to login"
      backButtonLink="/auth/login"
    >
      {isPending && (
        <div className="flex flex-col items-center justify-center">
          <BeatLoader color="#000" size={15} />
          <p className="text-sm text-gray-500">
            We are verifying your email. This may take a few seconds.
          </p>
        </div>
      )}
      {error && <FormError message={error.message} />}
      
      {data?.success && <FormSuccess message={data.message} />}
    </CardWrapper>
  );
};
