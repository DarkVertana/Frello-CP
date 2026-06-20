import { redirect } from "next/navigation";

// No marketing homepage — Frello opens straight on the login screen.
export default function Home() {
  redirect("/login");
}
