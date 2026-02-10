"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function HomeSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const booked = searchParams.get("booked") === "true";

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (booked) setVisible(true);
  }, [booked]);

  if (!booked || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    // remove the query param without a full reload
    router.replace("/", { scroll: false });
  };

  return (
    <div className="mb-6 rounded-2xl border border-gray-700 bg-gray-900 p-4 text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">You’re booked ✅</div>
          <div className="mt-1 text-sm text-gray-300">
            Thank you. Check your email for confirmation and next steps.
          </div>
        </div>

        <button
          onClick={dismiss}
          className="rounded-xl border border-gray-600 bg-black px-4 py-2 text-sm font-semibold text-white hover:border-gray-400"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
