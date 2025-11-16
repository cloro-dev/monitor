"use client";
import { useState } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { OrganizationCreationModal } from "@/components/auth/organization-creation-modal";

export default function Page() {
    const [showOrgModal, setShowOrgModal] = useState(false);

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <SignupForm
                    onSuccess={() => setShowOrgModal(true)}
                />
            </div>
            <OrganizationCreationModal
                open={showOrgModal}
                onOpenChange={setShowOrgModal}
            />
        </div>
    );
}
