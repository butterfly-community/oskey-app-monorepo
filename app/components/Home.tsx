import { useState } from "react";

const signatureHighlights = [
  {
    eyebrow: "Trustless by design",
    title: "Authentically open",
    description:
      "Schematics, firmware, and reference flows are public so every component can be audited, forked, and improved by the community.",
  },
  {
    eyebrow: "Chip freedom",
    title: "Choose your silicon",
    description:
      "Support spans 10+ manufacturers and more than 200 chips, giving makers the freedom to build on the hardware they already love.",
  },
  {
    eyebrow: "Ready to ship",
    title: "Secure from day one",
    description:
      "Keys never leave the device. Offline mnemonic generation and signing keep your credentials sealed inside the hardware wallet you control.",
  },
];

const capabilityCards = [
  {
    title: "Mnemonic on Chip",
    description:
      "Native BIP39 implementation with exhaustive unit tests, ensuring entropy lives inside the MCU boundary.",
  },
  {
    title: "Deterministic Wallets",
    description:
      "Full BIP32 derivation pipeline for multi-chain accounts, ready for production-grade signing flows.",
  },
  {
    title: "Resource Conscious",
    description:
      "Optimised for constrained devices — the entry configuration runs on a $0.3 MCU without compromising security.",
  },
];

const baseBoards = [
  {
    name: "ESP32 C3 DevKitM",
    architecture: "RISC-V",
    manufacturer: "Espressif",
    image:
      "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/board/esp32-c3-devkitm-1-v1-isometric.png",
    alt: "ESP32 C3 DevKitM development board",
  },
  {
    name: "Raspberry Pi Pico",
    architecture: "Arm Cortex-M0",
    manufacturer: "Raspberry Pi",
    image:
      "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/board/pico-board.png",
    alt: "Raspberry Pi Pico board",
  },
  {
    name: "Nucleo F401RE",
    architecture: "Arm Cortex-M4",
    manufacturer: "STMicroelectronics",
    image:
      "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/board/nucleo_f401re.jpg",
    alt: "ST Nucleo F401RE board",
  },
  {
    name: "nRF52840-MDK",
    architecture: "Arm Cortex-M4",
    manufacturer: "Nordic Semiconductor",
    image:
      "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/board/mdk52840-cover.png",
    alt: "nRF52840-MDK development board",
  },
];

const premiumBoards = [
  {
    name: "Lichuang ESP32-S3",
    description:
      "2-inch touch display and rich peripherals for a complete wallet journey.",
    image:
      "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/board/lichuang_esp32_s3.jpg",
    alt: "Lichuang ESP32-S3 board with display",
  },
  {
    name: "STM32H747I Discovery",
    description:
      "4-inch panel, dual cores, and pro-grade performance for demanding security scenarios.",
    image:
      "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/board/stm32h747i_disco.jpg",
    alt: "STM32H747I Discovery evaluation kit",
  },
];

const demoSteps = [
  {
    step: "Boot screen",
    subtext: "",
    shots: [
      {
        id: "demo-1a",
        label: "Boot logo",
        caption: "OSKey boot logo displayed as the device powers on.",
        image:
          "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/demo/demo-1a.jpg",
        alt: "",
      },
      {
        id: "demo-1b",
        label: "Init menu",
        caption: "Choose to generate a new mnemonic or import an existing one.",
        image:
          "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/demo/demo-1b.jpg",
        alt: "",
      },
    ],
  },
  {
    step: "Generate mnemonic",
    subtext: "",
    shots: [
      {
        id: "demo-2a",
        label: "Choose generate",
        caption: "Select mnemonic creation from the on-device menu.",
        image:
          "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/demo/demo-2a.jpg",
        alt: "",
      },
      {
        id: "demo-2b",
        label: "Words displayed",
        caption: "Review freshly generated BIP39 words on-screen.",
        image:
          "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/demo/demo-2b.jpg",
        alt: "",
      },
      {
        id: "demo-2c",
        label: "Word verification",
        caption: "Confirm each word before locking them into secure storage.",
        image:
          "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/demo/demo-2c.jpg",
        alt: "",
      },
    ],
  },
  {
    step: "Custom generate mnemonic",
    subtext: "",
    shots: [
      {
        id: "demo-2a-custom",
        label: "Start custom flow",
        caption: "Kick off custom generation with user-supplied entropy.",
        image:
          "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/demo/demo-2a.jpg",
        alt: "",
      },
      {
        id: "demo-3a",
        label: "Capture entropy",
        caption: "Capture manual randomness with guided prompts.",
        image:
          "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/demo/demo-3a.jpg",
        alt: "",
      },
      {
        id: "demo-3b",
        label: "Finalize mnemonic",
        caption: "Review and confirm the blended entropy output.",
        image:
          "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/demo/demo-3b.jpg",
        alt: "",
      },
    ],
  },
  {
    step: "Import mnemonic",
    subtext: "",
    shots: [
      {
        id: "demo-4a",
        label: "Secure import",
        caption: "Enter existing words through the secure keypad interface.",
        image:
          "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/demo/demo-4a.jpg",
        alt: "",
      },
    ],
  },
  {
    step: "Index",
    subtext: "",
    shots: [
      {
        id: "demo-4b",
        label: "Account index",
        caption: "Browse derived accounts after initialization and imports.",
        image:
          "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/demo/demo-4b.jpg",
        alt: "",
      },
    ],
  },
  {
    step: "Sign",
    subtext: "",
    shots: [
      {
        id: "demo-5a",
        label: "Message signatures",
        caption: "EIP191, Message signatures",
        image:
          "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/demo/demo-5a.jpg",
        alt: "",
      },
      {
        id: "demo-5b",
        label: "Transaction signatures",
        caption: "Transaction signatures",
        image:
          "https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/demo/demo-5b.jpg",
        alt: "",
      },
    ],
  },
];

type DemoShot = (typeof demoSteps)[number]["shots"][number] & {
  step: string;
};

export function Home() {
  const [activeShot, setActiveShot] = useState<DemoShot | null>(null);

  return (
    <div className="relative isolate overflow-hidden bg-[#f5f5f7] text-gray-900">
      <div className="absolute inset-x-0 -top-40 -z-10 flex justify-center">
        <div className="h-[520px] w-[920px] rounded-full bg-gradient-to-r from-[#d7e1ff] via-[#f0d9ff] to-[#ffd6e0] blur-3xl opacity-70" />
      </div>

      <section className="container mx-auto px-6 pb-28 pt-36">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Build the most trusted key in your digital life.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-600 sm:text-xl">
            OSKey is a community-built, fully open hardware platform. Assemble
            it yourself, audit every line, and keep your credentials anchored in
            silicon you control.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href="https://github.com/butterfly-community/oskey-firmware/tree/master/doc/start"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-gray-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-black"
            >
              Explore Quick Start
            </a>
            <a
              href="https://github.com/butterfly-community/oskey-firmware"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-gray-900 px-8 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-900 hover:text-white"
            >
              View on GitHub
            </a>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-5xl rounded-[10px] border border-white/40 bg-white/80 p-12 shadow-[0_35px_120px_-60px_rgba(15,23,42,0.45)] backdrop-blur-lg">
          <div className="grid gap-10 md:grid-cols-3">
            {signatureHighlights.map((highlight) => (
              <div key={highlight.title} className="text-left">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                  {highlight.eyebrow}
                </p>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">
                  {highlight.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {highlight.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/60 bg-white/80 py-28">
        <div className="container mx-auto px-6">
          <div className="grid gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-8">
              <p className="text-xs uppercase tracking-[0.35em] text-gray-400">
                Why OSKey
              </p>
              <h2 className="text-4xl font-semibold text-gray-900">
                More than a wallet. It is open infrastructure for a verifiable
                digital identity.
              </h2>
              <p className="text-lg leading-relaxed text-gray-600">
                Firmware, libraries, and hardware references work together to
                help you bridge the physical and digital worlds securely. Tailor
                your build, extend with wireless or display modules, and stay in
                control of the supply chain.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                <span className="rounded-full border border-gray-200 px-4 py-2">
                  Community maintained
                </span>
                <span className="rounded-full border border-gray-200 px-4 py-2">
                  Auditable from chip to cloud
                </span>
                <span className="rounded-full border border-gray-200 px-4 py-2">
                  Vendor independent
                </span>
              </div>
            </div>
            <div className="rounded-[10px] border border-gray-200 bg-white p-10 shadow-[0_25px_90px_-40px_rgba(15,23,42,0.4)]">
              <h3 className="text-xl font-semibold text-gray-900">
                Security engineered into the firmware
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-gray-600">
                The core OSKey firmware is tuned for constrained environments
                without compromising on cryptographic assurance. Every release
                is validated through community-reviewed test suites.
              </p>
              <ul className="mt-8 space-y-4">
                {capabilityCards.map((card) => (
                  <li
                    key={card.title}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {card.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      {card.description}
                    </p>
                  </li>
                ))}
              </ul>
              <a
                href="https://github.com/butterfly-community/oskey-lib-wallets"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-900 transition hover:gap-3"
              >
                Inspect core libraries
                <span aria-hidden>→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-28">
        <div className="mb-14 max-w-3xl space-y-4 text-left">
          <p className="text-xs uppercase tracking-[0.35em] text-gray-400">
            Hardware lineup
          </p>
          <h2 className="text-4xl font-semibold text-gray-900">
            Bring your own development board — or pick a curated starting point.
          </h2>
          <p className="text-lg leading-relaxed text-gray-600">
            OSKey runs on hundreds of boards across architectures. Start with
            our recommended kits for instant testing, then scale into premium
            displays and touch-first experiences as your project evolves.
          </p>
        </div>
        <div className="space-y-14">
          <div className="space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
              Base experience
            </h3>
            <p className="text-sm leading-relaxed text-gray-600">
              Four officially supported boards span three architectures and
              manufacturers, underscoring OSKey’s vendor independence.
            </p>
            <p className="text-sm leading-relaxed text-gray-600">
              More than 300 additional boards from 10+ chip makers are already
              supported across the firmware (
              <a
                href="https://docs.zephyrproject.org/latest/boards/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-gray-900"
              >
                Supported Boards
              </a>
              ).
            </p>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {baseBoards.map((board) => (
                <article
                  key={board.name}
                  className="group flex flex-col gap-3 rounded-[10px] border border-white/60 bg-white/90 p-4 shadow-[0_32px_96px_-70px_rgba(15,23,42,0.5)] backdrop-blur transition hover:-translate-y-1"
                >
                  <figure className="relative flex h-32 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-gray-50 to-gray-100">
                    <img
                      src={board.image}
                      alt={board.alt}
                      loading="lazy"
                      className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
                    />
                  </figure>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">
                      {board.name}
                    </h4>
                    <p className="mt-2 text-xs text-gray-600">
                      {board.architecture}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {board.manufacturer}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
              Full experience
            </h3>
            <p className="text-sm leading-relaxed text-gray-600">
              Built on the same infrastructure yet equipped with display and
              touch modules, enabling fully offline initialization and on-device
              transaction parsing.
            </p>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {premiumBoards.map((board) => (
                <article
                  key={board.name}
                  className="group flex flex-col gap-3 rounded-[10px] border border-white/60 bg-white/90 p-4 shadow-[0_32px_96px_-70px_rgba(15,23,42,0.5)] backdrop-blur transition hover:-translate-y-1"
                >
                  <figure className="relative flex h-32 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-gray-50 to-gray-100">
                    <img
                      src={board.image}
                      alt={board.alt}
                      loading="lazy"
                      className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
                    />
                  </figure>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">
                      {board.name}
                    </h4>
                    <p className="mt-2 text-xs leading-relaxed text-gray-600">
                      {board.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-28">
        <div className="mb-14 max-w-3xl space-y-4 text-left">
          <p className="text-xs uppercase tracking-[0.35em] text-gray-400">
            Real-world workflow
          </p>
          <h2 className="text-4xl font-semibold text-gray-900">
            Real hardware captures that showcase OSKey in action.
          </h2>
          <p className="text-lg leading-relaxed text-gray-600">
            These photos are direct device shots demonstrating core
            capabilities—from the guided setup to BIP39 generation, custom
            entropy, and BIP32 account indexing. Click any label to open the
            corresponding hardware demo.
          </p>
        </div>
        <div className="space-y-8">
          {demoSteps.map((group) => (
            <div key={group.step} className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
                {group.step}
              </p>
              <div className="flex flex-wrap gap-3">
                {group.shots.map((shot) => (
                  <button
                    type="button"
                    key={shot.id}
                    onClick={() => setActiveShot({ ...shot, step: group.step })}
                    className="group inline-flex items-center gap-3 rounded-full border border-gray-900 px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-900 hover:text-white"
                  >
                    <span>{shot.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-b from-white via-[#f0f2ff] to-white py-28">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
              Join the community
            </p>
            <h2 className="mt-6 text-4xl font-semibold text-gray-900">
              Contribute firmware, design hardware, and refine the open wallet
              stack.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-gray-600">
              Get pre-built firmware or compile locally, share improvements with
              the community, and help shape the next generation of verifiable
              hardware wallets.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a
                href="https://github.com/butterfly-community/oskey-firmware/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-gray-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-black"
              >
                Get Firmware Builds
              </a>
              <a
                href="https://github.com/butterfly-community/oskey-firmware/tree/master/doc/start/Compile.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-gray-900 px-8 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-900 hover:text-white"
              >
                Build Locally
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-gray-400">
            Powered by
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-gray-900">
            Built with support from open communities.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            OSKey evolves alongside partners who champion transparent tooling
            and collaborative hardware innovation.
          </p>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <a
            href="https://www.gccofficial.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-28 items-center justify-center rounded-[10px] border border-white/60 bg-white/90 p-6 shadow-[0_30px_90px_-70px_rgba(15,23,42,0.5)] backdrop-blur transition hover:-translate-y-1"
          >
            <img
              src="https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/GCC_logo.png"
              alt="GCC logo"
              loading="lazy"
              className="h-auto w-full max-w-[220px] object-contain"
            />
          </a>
          <a
            href="https://openbuild.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-28 items-center justify-center rounded-[10px] border border-white/60 bg-white/90 p-6 shadow-[0_30px_90px_-70px_rgba(15,23,42,0.5)] backdrop-blur transition hover:-translate-y-1"
          >
            <img
              src="https://raw.githubusercontent.com/butterfly-community/oskey-firmware/master/doc/image/OpenBuild_logo.png"
              alt="OpenBuild Community logo"
              loading="lazy"
              className="h-12 w-full max-w-[220px] object-contain"
            />
          </a>
        </div>
      </section>

      {activeShot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-preview-title"
          onClick={() => setActiveShot(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-[12px] bg-white shadow-[0_40px_120px_-60px_rgba(0,0,0,0.7)]"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={activeShot.image}
              alt={activeShot.alt}
              className="h-auto w-full object-cover"
              loading="lazy"
            />
            <div className="space-y-3 p-6">
              <h3
                id="demo-preview-title"
                className="text-xl font-semibold text-gray-900"
              >
                {activeShot.step}
              </h3>
              <p className="text-sm font-medium text-gray-700">
                {activeShot.label}
              </p>
              <p className="text-sm leading-relaxed text-gray-600">
                {activeShot.caption}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveShot(null)}
                  className="inline-flex items-center justify-center rounded-full border border-gray-900 px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-900 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
