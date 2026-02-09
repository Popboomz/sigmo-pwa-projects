"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { getDateKeySydney } from "@/lib/dateKey";
import type { DailyQuestionnaire } from "@/lib/questionnaire/types";
import {
  getOrCreateActiveRun,
  getOrCreateTodayQuestionnaire,
  submitTodayResponse,
} from "@/lib/questionnaire/store";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function TodayPage() {
  const router = useRouter();
  const dateKey = useMemo(() => getDateKeySydney(), []);
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState<DailyQuestionnaire | null>(null);

  const [answers, setAnswers] = useState<Record<string, 1 | 2 | 3 | 4 | 5>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (auth.currentUser) {
      setUid(auth.currentUser.uid);
      setAuthReady(true);
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;

    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const run = await getOrCreateActiveRun(uid, dateKey);
        const todayQ = await getOrCreateTodayQuestionnaire(uid, run, dateKey);
        setQ(todayQ);

        const init: Record<string, 1 | 2 | 3 | 4 | 5> = {};
        for (const qu of todayQ.questions) init[qu.id] = 3;
        setAnswers(init);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setMsg(`Load failed: ${e.message}`);
        } else {
          setMsg("Load failed: unknown error");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [uid, dateKey]);

  const setAnswer = (questionId: string, value: 1 | 2 | 3 | 4 | 5) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!uid || !q) return;

    setSubmitting(true);
    setMsg(null);

    try {
      const payloadAnswers = q.questions.map((qu) => ({
        questionId: qu.id,
        value: answers[qu.id] ?? 3,
      }));

      await submitTodayResponse({
        uid,
        runId: q.runId,
        dateKey: q.dateKey,
        dayIndex: q.dayIndex,
        answers: payloadAnswers,
        comment,
      });

      setMsg("Submitted");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setMsg(`Submit failed: ${e.message}`);
      } else {
        setMsg("Submit failed: unknown error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!authReady) {
    return (
      <main className="mx-auto max-w-md p-6">
        <div className="text-sm text-muted-foreground">Checking auth...</div>
      </main>
    );
  }

  if (!uid) {
    return (
      <main className="mx-auto max-w-md space-y-3 p-6">
        <h1 className="text-xl font-semibold">Today</h1>
        <div className="text-sm">Not signed in.</div>
        <Button onClick={() => router.push("/login")}>Back to login</Button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-md p-6">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </main>
    );
  }

  if (!q) {
    return (
      <main className="mx-auto max-w-md space-y-3 p-6">
        <h1 className="text-xl font-semibold">Today</h1>
        <div className="text-sm">No questionnaire available.</div>
        {msg ? <div className="whitespace-pre-wrap text-sm">{msg}</div> : null}
        <Button onClick={() => router.push("/login")}>Back to login</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-5 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Today Questionnaire</h1>
        <div className="space-x-2 text-xs text-muted-foreground">
          <span data-testid="dateKey">dateKey: {q.dateKey}</span>
          <span data-testid="dayIndex">dayIndex: {q.dayIndex}</span>
          <span data-testid="uid">uid: {uid ?? ""}</span>
          <span>engine: {q.engineVersion}</span>
        </div>
      </header>

      <section className="space-y-4">
        {q.questions.map((qu) => (
          <div key={qu.id} className="space-y-2 rounded-lg border p-3">
            <div className="text-sm font-medium">{qu.title}</div>
            <div className="grid grid-cols-5 gap-2">
              {qu.options.map((opt) => {
                const active = (answers[qu.id] ?? 3) === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAnswer(qu.id, opt.value)}
                    className={[
                      "rounded-md border px-2 py-2 text-xs",
                      active ? "bg-black text-white" : "bg-white",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <div className="text-sm font-medium">Optional comment</div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="你可以补充一两句具体情况（例如：粉尘来源、结团是否散、是否黏底）"
        />
      </section>

      <div className="space-y-2">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit"}
        </Button>
        {msg ? <div className="whitespace-pre-wrap text-sm">{msg}</div> : null}
      </div>
    </main>
  );
}
