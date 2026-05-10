"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Users } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";

type JoinState = "idle" | "joining" | "success" | "error";

export default function SplitJoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { acceptSplitInvite } = useAppContext();

  const groupId = searchParams.get("g") || "";
  const inviteId = searchParams.get("i") || "";

  const [state, setState] = useState<JoinState>("idle");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!groupId || !inviteId) return;

    let cancelled = false;
    (async () => {
      setState("joining");
      setError("");
      try {
        await acceptSplitInvite(groupId, inviteId);
        if (cancelled) return;
        setState("success");
        router.replace(`/split?groupId=${encodeURIComponent(groupId)}`);
      } catch (e) {
        if (cancelled) return;
        setState("error");
        setError((e as Error)?.message || "Could not join group.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [acceptSplitInvite, groupId, inviteId, router]);

  return (
    <>
      <PageHeader title="Join Split Group" description="Accept an invite and join the group." icon={Users} />

      <Card className="shadow-lg max-w-xl">
        <CardHeader>
          <CardTitle>Joining…</CardTitle>
          <CardDescription>
            {groupId && inviteId
              ? "We’re validating your invite and adding you to the group."
              : "Invite link is missing required parameters."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "joining" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing invite…
            </div>
          ) : null}

          {state === "error" ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <p className="font-medium text-destructive">Could not join</p>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/split">Go to Split</Link>
            </Button>
            <Button
              onClick={() => router.replace(`/split?groupId=${encodeURIComponent(groupId)}`)}
              disabled={!groupId}
            >
              Open group
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

