import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function Page() {
  return (
    <div className="px-4 lg:px-6">
      <h1 className="text-lg font-medium">Account</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage your account settings and information.
      </p>
      <Separator className="mb-6" />

      <div className="space-y-8 lg:w-1/2">
        <div>
          <h2 className="text-base font-medium mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div className="grid gap-3">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                disabled
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                disabled
              />
            </div>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <h2 className="text-base font-medium mb-4">Account Actions</h2>
          <div className="space-y-4">
            <Button variant="outline" className="w-full" disabled>
              Change Password
            </Button>
            <Button variant="outline" className="w-full" disabled>
              Export Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}