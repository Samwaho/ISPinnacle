import ISPHeader from "@/components/isp/Header";
import Sidebar from "@/components/sidebar/Sidebar";
import MobileSidebar from "@/components/sidebar/MobileSidebar";
import { Separator } from "@/components/ui/separator";
import { caller } from "@/trpc/server";

export default async function ISPLayout({
  children,
  params,
}: LayoutProps<"/isp/[id]">) {
  const { id: organizationId } = await params;
  let organization;
  try {
    organization = await caller.organization.getOrganizationById({ id: organizationId });
  } catch (error) {
    console.error('Failed to fetch organization:', error);
    organization = null;
  }
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden lg:block lg:w-[18%] xl:w-[14%] lg:fixed lg:top-4 lg:left-4 lg:h-screen">
        <Sidebar organizationId={organizationId} />
      </aside>

      {/* Main Content */}
      <main className="w-full lg:w-[82%] xl:w-[86%] lg:ml-[18%] xl:ml-[14%]">
        <div className="p-2 sm:p-4 md:p-6">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="lg:hidden">
              <MobileSidebar organizationId={organizationId} />
            </div>
            <div className="flex-1">
              <ISPHeader organizationId={organizationId} organizationName={organization?.name ?? "ISPinnacle"} />
            </div>
          </div>
          <Separator className="bg-slate-300 dark:bg-slate-800" />
          <div className="mt-1 sm:mt-4">{children}</div>
        </div>
      </main>
    </div>
  );
}
