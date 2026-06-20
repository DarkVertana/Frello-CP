import {
  CreditCard,
  History,
  Home,
  Package,
  Settings,
  ShoppingCart,
  Sprout,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/rbac";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Allowed roles. Both roles see every item; write actions inside each page
   *  gate further on `canManage`. */
  roles: readonly Role[];
};

const ALL_STAFF = ["admin", "viewer"] as const;

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, roles: ALL_STAFF },
  { href: "/users", label: "Users", icon: Users, roles: ALL_STAFF },
  { href: "/products", label: "Products", icon: Package, roles: ALL_STAFF },
  { href: "/categories", label: "Categories", icon: Tag, roles: ALL_STAFF },
  { href: "/orders", label: "Orders", icon: ShoppingCart, roles: ALL_STAFF },
  { href: "/consultations", label: "Consultations", icon: Sprout, roles: ALL_STAFF },
  { href: "/payments", label: "Payments", icon: CreditCard, roles: ALL_STAFF },
  { href: "/audit", label: "Audit log", icon: History, roles: ALL_STAFF },
  { href: "/settings", label: "Settings", icon: Settings, roles: ALL_STAFF },
];

export function navForRole(role: string | null | undefined): NavItem[] {
  if (!role) return [];
  return NAV.filter((item) => (item.roles as readonly string[]).includes(role));
}
