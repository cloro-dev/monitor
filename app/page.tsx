import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user?.id) {
    redirect("/prompts");
  }

  // Show landing page for unauthenticated users
  redirect("/login");
}
