"use client";
import { useState } from "react";
import { DateTime } from "luxon";
import { FormField, FormSubmission } from "@/lib/forms";

function safeJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s); } catch { return {}; }
}

export default function SubmissionsClient({
  form,
  submissions,
}: {
  form: { _id: string; title: string; fields: FormField[] };
  submissions: FormSubmission[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fields = (form.fields || []).filter(f => f.fieldType !== "section_header");

  if (submissions.length === 0) {
    return (
      <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
        <p className="text-white/30 text-sm">No submissions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {submissions.map(s => {
        const answers = safeJson(s.answersJson);
        const files = safeJson(s.filesJson) as Record<string, string[]>;
        const isOpen = expandedId === s._id;
        const date = DateTime.fromISO(s.submittedAt).toFormat("LLL d, yyyy 'at' h:mm a");

        // Build a preview from the first two non-empty answer values
        const preview = fields
          .slice(0, 2)
          .map(f => {
            const v = answers[f.id];
            return Array.isArray(v) ? v.join(", ") : String(v ?? "");
          })
          .filter(Boolean)
          .join(" · ");

        return (
          <div key={s._id} className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
            {/* Row */}
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : s._id)}
              className="flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-white/3 sm:px-5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white truncate">
                    {preview || "Submission"}
                  </span>
                </div>
                <div className="mt-0.5 break-words pr-2 text-xs text-white/30">
                  {date}{s.ipAddress ? ` · ${s.ipAddress}` : ""}
                </div>
              </div>
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                className={`shrink-0 text-white/25 transition-transform ${isOpen ? "rotate-90" : ""}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-white/8 px-4 py-4 sm:px-5">
                <div className="space-y-3 sm:hidden">
                  {(form.fields || []).map(field => {
                    if (field.fieldType === "section_header") {
                      return (
                        <div
                          key={field.id}
                          className="pt-2 text-xs font-medium uppercase tracking-widest text-white/30"
                        >
                          {field.label}
                        </div>
                      );
                    }
                    const raw = answers[field.id];
                    const fieldFiles = files[field.id];
                    const display = Array.isArray(raw)
                      ? raw.join(", ")
                      : raw !== undefined && raw !== null
                        ? String(raw)
                        : "";
                    return (
                      <div key={field.id} className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
                        <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-white/35">
                          {field.label}
                        </div>
                        <div className="break-words text-sm leading-relaxed text-white">
                          {display || <span className="text-white/20">—</span>}
                        </div>
                        {fieldFiles?.length ? (
                          <div className="mt-2 space-y-1">
                            {fieldFiles.map(url => (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block break-all text-xs text-sky-400 transition-colors hover:text-sky-300"
                              >
                                {url.split("/").pop() || url}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <table className="hidden w-full text-sm sm:table">
                  <tbody>
                    {(form.fields || []).map(field => {
                      if (field.fieldType === "section_header") {
                        return (
                          <tr key={field.id}>
                            <td
                              colSpan={2}
                              className="pt-4 pb-1 text-xs text-white/30 uppercase tracking-widest font-medium"
                            >
                              {field.label}
                            </td>
                          </tr>
                        );
                      }
                      const raw = answers[field.id];
                      const fieldFiles = files[field.id];
                      const display = Array.isArray(raw)
                        ? raw.join(", ")
                        : raw !== undefined && raw !== null
                          ? String(raw)
                          : "";
                      return (
                        <tr key={field.id} className="border-b border-white/5 last:border-0">
                          <td className="w-1/3 whitespace-nowrap py-2 pr-4 align-top text-xs text-white/40">
                            {field.label}
                          </td>
                          <td className="break-words py-2 align-top text-sm text-white">
                            {display || <span className="text-white/20">—</span>}
                            {fieldFiles?.length ? (
                              <div className="mt-1 space-y-0.5">
                                {fieldFiles.map(url => (
                                  <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block break-all text-xs text-sky-400 transition-colors hover:text-sky-300"
                                  >
                                    {url.split("/").pop() || url}
                                  </a>
                                ))}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
