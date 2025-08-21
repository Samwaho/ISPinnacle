import {
  Users,
  Box,
  Package,
  Ticket,
  DollarSign,
  Warehouse,
  Building,
  LayoutDashboard,
} from "lucide-react";

interface SidebarItem {
  title: string;
  path: (organizationId: string) => string;
  icon:
    | typeof LayoutDashboard
    | typeof Users 
    | typeof Box
    | typeof Building
    | typeof Package
    | typeof Ticket
    | typeof DollarSign
    | typeof Warehouse;
}

export const sidebarData: SidebarItem[] = [
  {
    title: "Dashboard",
    path: (id) => `/isp/${id}`,
    icon: LayoutDashboard,
  },
  {
    title: "Customers",
    path: (id) => `/isp/${id}/customers`,
    icon: Users,
  },
  {
    title: "Packages",
    path: (id) => `/isp/${id}/packages`,
    icon: Package,
  },
  {
    title: "Stations",
    path: (id) => `/isp/${id}/stations`,
    icon: Building,
  },
  {
    title: "Inventory",
    path: (id) => `/isp/${id}/inventory`,
    icon: Box,
  },
  {
    title: "Support Tickets",
    path: (id) => `/isp/${id}/tickets`,
    icon: Ticket,
  },
  {
    title: "Transactions",
    path: (id) => `/isp/${id}/transactions`,
    icon: DollarSign,
  },
  {
    title: "Messaging",
    path: (id) => `/isp/${id}/messaging`,
    icon: Warehouse,
  },
];
