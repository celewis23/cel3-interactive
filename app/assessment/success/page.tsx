// app/assessment/success/page.tsx
import Link from "next/link";
import { stripe } from "@/lib/stripe";
import AssessmentBookingForm from "@/components/assessment/AssessmentBookingForm";

export default async function AssessmentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return (
      <main className="min-h-screen mx-auto max-w-screen px-6 py-16 bg-black text-white">
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-semibold">Payment not found</h1>
            <p className="mt-3 text-white/50">
            We couldn’t confirm your checkout session. Please return to the assessment page and try again.
            </p>
            <Link className="mt-6 inline-block underline" href="/assessment">
            Back to Assessment
            </Link>
        </div>
      </main>
    );
  }

  const session = await stripe.checkout.sessions.retrieve(session_id);

  const paid =
    session.payment_status === "paid" &&
    (session.status === "complete" || session.status === "open");

  if (!paid) {
    return (
      <main className="mx-auto max-w-screen px-6 py-16 bg-black text-white">
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-semibold">Payment not completed</h1>
            <p className="mt-3 text-slate-700">
            Your payment wasn’t completed. If this was a mistake, you can try again.
            </p>
            <Link className="mt-6 inline-block underline" href="/assessment">
            Back to Assessment
            </Link>
        </div>
      </main>
    );
  }

  const customerEmail =
    session.customer_details?.email || session.customer_email || "";

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight">
            Payment confirmed ✅
          </h1>
          <p className="mt-3 text-lg text-slate-700">
            Next step: book your Digital Systems Assessment and share a quick overview of what you want to improve.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold">Book your assessment</h2>
            <p className="mt-2 text-slate-700">
              This form notifies us and starts scheduling. Your existing fit questions can remain your qualifier.
            </p>

            <div className="mt-6">
              <AssessmentBookingForm defaultEmail={customerEmail} />
            </div>

            <p className="mt-6 text-sm text-slate-600">
              Fit questions (if needed):{" "}
              <Link className="underline" href="/fit">
                cel3interactive.com/fit
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
