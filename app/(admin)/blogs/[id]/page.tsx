import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import { getBlogById } from "@/lib/data/blogs";
import { BlogEditor } from "../_components/blog-editor";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const blog = await getBlogById(id);
  return { title: blog?.title ?? "Blog" };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) return null;
  if (!isAdmin(session.user.role)) redirect("/");

  const { id } = await params;
  const blog = await getBlogById(id);
  if (!blog) notFound();

  // Read-only roles can view the list but not the editor.
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
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Edit blog
      </h1>
      <BlogEditor blog={blog} />
    </div>
  );
}
