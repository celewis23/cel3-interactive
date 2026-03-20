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
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white truncate">
                    {preview || "Submission"}
                  </span>
                </div>
                <div className="text-xs text-white/30 mt-0.5">
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
              <div className="border-t border-white/8 px-5 py-4">
                <table className="w-full text-sm">
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
                          <td className="py-2 pr-4 text-white/40 text-xs align-top w-1/3 whitespace-nowrap">
                            {field.label}
                          </td>
                          <td className="py-2 text-white text-sm align-top">
                            {display || <span className="text-white/20">—</span>}
                            {fieldFiles?.length ? (
                              <div className="mt-1 space-y-0.5">
                                {fieldFiles.map(url => (
                                  <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-xs text-sky-400 hover:text-sky-300 transition-colors"
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
