"use client";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { OrganizationCreationForm } from "./organization-creation-form";

interface OrganizationCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationCreationModal({
  open,
  onOpenChange,
}: OrganizationCreationModalProps) {
  const router = useRouter();

  const handleSuccess = () => {
    // Close the modal
    onOpenChange(false);
    // Redirect to dashboard
    router.push("/dashboard");
  };

  // Prevent closing the modal until organization is created
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Don't allow closing when open (required modal)
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Welcome! Create Your Organization</SheetTitle>
          <SheetDescription>
            You need to create an organization to start using the dashboard.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <OrganizationCreationForm onSuccess={handleSuccess} />
        </div>
      </SheetContent>
    </Sheet>
  );
}