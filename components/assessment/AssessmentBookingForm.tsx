"use client";

import { useMemo, useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export default function AssessmentBookingForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string>("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("defaultEmail");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [goal, setGoal] = useState("");

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length >= 2 &&
      email.trim().includes("@") &&
      goal.trim().length >= 10 &&
      state !== "submitting"
    );
  }, [fullName, email, goal, state]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setState("submitting");

    try {
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, company, website, goal }),
      });

      const data = (await res.json()) as { ok: boolean; message?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      setState("success");
    } catch (err: any) {
      setError(err?.message || "Failed to submit. Please try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <p className="font-semibold text-green-900">Request received ✅</p>
        <p className="mt-1 text-sm text-green-800">
          You’ll get an email shortly with next steps to schedule your assessment.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Full name" required>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          placeholder="Clarence Lewis"
          autoComplete="name"
        />
      </Field>

      <Field label="Email" required>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          placeholder="you@business.com"
          autoComplete="email"
        />
      </Field>

      <Field label="Company (optional)">
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          placeholder="CEL3 Interactive"
          autoComplete="organization"
        />
      </Field>

      <Field label="Website or link (optional)">
        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          placeholder="https://example.com"
          autoComplete="url"
        />
      </Field>

      <Field label="What do you want to improve?" required>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="min-h-[110px] w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          placeholder="Example: I need a faster website and want to automate client intake + follow-ups."
        />
      </Field>

      {state === "error" ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "submitting" ? "Submitting..." : "Book Your Assessment"}
      </button>

      <p className="text-xs text-slate-500">
        Note: Payment collection can be connected next (Stripe link, invoice, or checkout).
      </p>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required ? <span className="text-slate-400">*</span> : null}
      </span>
      {children}
    </label>
  );
}
