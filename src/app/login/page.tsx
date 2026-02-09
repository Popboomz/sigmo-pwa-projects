"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAnonymously } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleAnonLogin = async () => {
    setLoading(true);
    setErr(null);

    try {
      const cred = await signInAnonymously(auth);
      const uid = cred.user.uid;
      await cred.user.getIdToken();

      await setDoc(
        doc(db, "users", uid),
        {
          createdAt: serverTimestamp(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
          authProvider: "anonymous",
        },
        { merge: true }
      );

      router.push("/today");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">Login</h1>
      <p className="text-sm text-muted-foreground">
        Migration phase: anonymous sign-in.
      </p>

      <Button onClick={handleAnonLogin} disabled={loading}>
        {loading ? "Signing in..." : "Continue"}
      </Button>

      {err ? <div className="whitespace-pre-wrap text-sm text-red-600">{err}</div> : null}
    </main>
  );
}
