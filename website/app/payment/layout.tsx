import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment - ISPinnacle",
  description: "Complete your payment securely",
};

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
