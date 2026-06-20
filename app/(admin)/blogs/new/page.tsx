import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import { BlogEditor } from "../_components/blog-editor";

export const metadata: Metadata = { title: "New blog" };
export const dynamic = "force-dynamic";

export default async function NewBlogPage() {
  const session = await getSession();
  if (!session) return null;
  if (!isAdmin(session.user.role)) redirect("/");
  if (!canManage(session.user.role)) redirect("/blogs");

  return (
    <div className="space-y-6">
      <Link
        href="/blogs"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Blogs
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">New blog</h1>
      <BlogEditor />
    </div>
  );
}
