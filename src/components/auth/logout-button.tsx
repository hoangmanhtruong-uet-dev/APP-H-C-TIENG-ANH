"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

function SubmitLogout({ className }: { className?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="ghost"
      className={cn("w-full justify-start", className)}
      disabled={pending}
    >
      <LogOut aria-hidden="true" size={18} strokeWidth={1.8} />
      {pending ? "Đang đăng xuất…" : "Đăng xuất"}
    </Button>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logoutAction}>
      <SubmitLogout className={className} />
    </form>
  );
}
