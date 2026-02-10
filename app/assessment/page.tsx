// app/assessment/page.tsx
import Link from "next/link";
import AssessmentBookingForm from "@/components/assessment/AssessmentBookingForm";
import AssessmentPaymentCard from "@/components/assessment/AssessmentPayCard";

export const metadata = {
  title: "Digital Systems Assessment | CEL3 Interactive",
  description:
    "Start with clarity. Book a Digital Systems Assessment to review your website, tools, and workflows.",
};

export default function AssessmentPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="space-y-4">
          <p className="text-sm font-semibold tracking-wide text-white/50">
            A MOMENT OF CLARITY
          </p>

          <h1 className="text-4xl font-semibold tracking-tight">
            Start With a Digital Systems Assessment
          </h1>

          <p className="max-w-2xl text-lg text-white/50">
            Get clarity on what to fix, improve, or build next before committing
            to a full project.
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          {/* Left: Offer + copy */}
          <div className="space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-semibold text-[rgb(var(--accent))]">What this is</h2>
              <p className="mt-3 text-slate-700">
                Before investing time or money into new technology, it’s important
                to understand what’s actually working, what isn’t, and where improvements
                will make the biggest impact.
              </p>
              <p className="mt-3 text-slate-700">
                The <span className="font-semibold">Digital Systems Assessment</span> is a
                focused, one-on-one session designed to review your current website, tools,
                and workflows and provide clear, actionable next steps.
              </p>
              <p className="mt-3 text-slate-700">
                This is the starting point for working with CEL3 Interactive.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold">What’s included</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-white/50">
                <li>Review of your current website or digital presence</li>
                <li>Review of existing tools, systems, or workflows</li>
                <li>Identification of inefficiencies, gaps, or blockers</li>
                <li>Recommendations for improvements or new solutions</li>
                <li>A clear roadmap outlining next steps</li>
              </ul>
              <p className="mt-4 text-white/50">
                You’ll leave the session with clarity on what to do now, what to do later,
                and what to avoid.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold">Who this is for</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-white/50">
                <li>Business owners or founders</li>
                <li>Companies planning a new website or application</li>
                <li>Teams dealing with manual or inefficient processes</li>
                <li>Businesses unsure what technology investment makes sense next</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold">Investment</h2>
              <p className="mt-2 text-3xl font-semibold">$150</p>
              <p className="mt-2 text-white/50">
                One-time Digital Systems Assessment. No long-term commitment required.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-semibold text-[rgb(var(--accent))]">How it works</h2>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-slate-700">
                <li>Submit the booking request</li>
                <li>Complete your existing fit questions (if you haven’t already)</li>
                <li>Meet for a focused strategy session</li>
                <li>Receive clear recommendations and next steps</li>
              </ol>

              <p className="mt-4 text-slate-700">
                If it makes sense to move forward, we’ll discuss next steps. If not,
                you’ll still walk away with valuable direction.
              </p>

              {/* If you already have a fit page, change this link */}
              <p className="mt-4 text-sm text-slate-600">
                Already have fit questions? Great. If you need them, link them here:{" "}
                <Link className="underline" href="/fit">
                  /fit
                </Link>
              </p>
            </div>
          </div>

          {/* Right: Booking form */}
          <div className="rounded-2xl p-6 lg:sticky lg:top-6 lg:h-fit">
            <h2 className="text-xl font-semibold">Book your assessment</h2>
            <p className="mt-2 text-white/50">
              This is a paid strategy session designed to provide real direction,
              not a sales pitch.
            </p>

            <div className="mt-6">
              <AssessmentPaymentCard />
            </div>

            <p className="mt-4 text-xs text-white/50">
              By submitting, you agree to be contacted by CEL3 Interactive about your request.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
