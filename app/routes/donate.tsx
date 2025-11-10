import { useEffect, useRef, useState } from "react";

import { Layout } from "../components/Layout";

const DONATION_ADDRESS = "0x4353E0142e7ED4550e572210A0cdA0034d47a9F6";

const fundingAreas = [
  {
    title: "Firmware & Security Audits",
    description:
      "Support embedded firmware, reference hardware, client integrations, and the audits that keep every release verifiable.",
  },
  {
    title: "Reference Hardware & Tooling",
    description:
      "Maintain dev kits, measurement equipment, and build pipelines that let new contributors get productive fast.",
  },
  {
    title: "Documentation & Community",
    description:
      "Produce multilingual docs, content, and events that welcome more builders into the OSKey ecosystem.",
  },
];

export function meta() {
  return [
    { title: "Support OSKey | Donate" },
    {
      name: "description",
      content: "Donate digital assets to help the OSKey open-source key infrastructure grow.",
    },
  ];
}

export default function Donate() {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!copied) {
      return;
    }

    resetTimerRef.current = setTimeout(() => setCopied(false), 2500);

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, [copied]);

  async function handleCopy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(DONATION_ADDRESS);
      setCopied(true);
    } catch (error) {
      console.error("Failed to copy donation address", error);
      setCopied(false);
    }
  }

  return (
    <Layout>
      <section className="relative isolate overflow-hidden bg-[#f5f5f7] px-6 py-24 text-gray-900">
        <div className="absolute inset-x-0 -top-60 -z-10 flex justify-center">
          <div className="h-[520px] w-[820px] rounded-full bg-gradient-to-r from-[#d7e1ff] via-[#f0d9ff] to-[#ffd6e0] blur-3xl opacity-70" />
        </div>

        <div className="container mx-auto max-w-5xl space-y-16">
          <div className="space-y-6 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">
              Support OSKey
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
              Donate to keep the OSKey open-source key infrastructure thriving.
            </h1>
            <p className="text-lg leading-relaxed text-gray-600">
              OSKey is maintained by a global group of contributors. Sending any on-chain asset to the address
              below directly funds firmware, reference designs, documentation, and community programs that keep OSKey
              moving forward.
            </p>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/95 p-8 shadow-[0_35px_120px_-60px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">
                  Donation Address
                </p>
                <p className="mt-3 font-mono text-lg text-gray-900 break-all">
                  {DONATION_ADDRESS}
                </p>
                <p className="mt-3 text-sm text-gray-600">
                  Send any EVM-compatible asset here to fuel long-term OSKey development.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
                >
                  {copied ? "Address copied" : "Copy address"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-4 w-4"
                  >
                    <path d="M8 8h10v12H8z" />
                    <path d="M6 16H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <span className={`text-xs ${copied ? "text-green-600" : "text-gray-500"}`} aria-live="polite">
                  {copied ? "Thanks for the support! Paste it into your wallet." : "Click to copy and paste the address in your wallet."}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
              What donations power
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              {fundingAreas.map((area) => (
                <article
                  key={area.title}
                  className="rounded-2xl border border-white/60 bg-white/90 p-6 text-left shadow-[0_25px_90px_-60px_rgba(15,23,42,0.4)]"
                >
                  <h3 className="text-lg font-semibold text-gray-900">{area.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{area.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-dashed border-gray-300 bg-white/70 p-8 text-center text-sm text-gray-600">
            <p>
              Thank you for supporting OSKey. Every contribution sustains the open-source OSKey ecosystem.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
