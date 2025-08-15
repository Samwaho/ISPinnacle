import MaxWidthWrapper from "@/components/MaxWidthWrapper";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MaxWidthWrapper className="flex items-center justify-center h-screen">
      {children}
    </MaxWidthWrapper>
  );
}
