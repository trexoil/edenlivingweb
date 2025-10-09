"use client"

import dynamic from "next/dynamic";
import AuthDebug from "@/components/debug/AuthDebug";

// Dynamic import with ssr: false is only allowed in Client Components
const FCMInit = dynamic(() => import("@/components/push/FCMInit"), { ssr: false });

export default function ClientProviders() {
  return (
    <>
      <FCMInit />
      <AuthDebug />
    </>
  );
}
