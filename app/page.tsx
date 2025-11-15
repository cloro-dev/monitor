import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Welcome to Monitor</h1>
          <p className="text-muted-foreground">
            Your application monitoring dashboard
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Link href="/login">
              <Button className="w-full">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" className="w-full">
                Create Account
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline underline-offset-4 hover:text-primary">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
