import { useEffect, useState, useCallback } from "react";
import { SerialManager } from "~/devices/serial/SerialManager";
import {
  DerivePublicKeyRequest,
  InitWalletCustomRequest,
  InitWalletRequest,
  ReqData,
  SignEthRequest,
  VersionRequest,
} from "~/protocols/protobuf/ohw";
import { ethers } from "ethers";
import "web-serial-polyfill";
import { serial } from "web-serial-polyfill";
import { isVersionCompatible, getVersionUpgradeMessage } from "~/utils/version";

import { Core } from "@walletconnect/core";
import { WalletKit, type WalletKitTypes } from "@reown/walletkit";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import type { SessionTypes } from "@walletconnect/types";

import { atom, getDefaultStore, useAtom } from "jotai";
import { Transaction } from "ethers";

const core = new Core({
  projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
});

const metadata = {
  name: "OSKey",
  description: "WalletKit",
  url: "https://www.oskey.xyz/test",
  icons: ["https://avatars.githubusercontent.com/u/122866640"],
};

const walletKit = await WalletKit.init({
  core,
  metadata,
});

const store = getDefaultStore();

export const connectedAtom = atom<boolean>(false);
export const signatureAtom = atom<string>("");
export const messageAtom = atom<string>("");
export const addressAtom = atom<string>("");
export const pathAtom = atom<string>("m/44'/60'/0'/0/0");
export const debugText = atom<string>("");

export function TestPage() {
  const [serialManager] = useState(() => new SerialManager());

  const [signature] = useAtom(signatureAtom);

  const [connected, setConnected] = useAtom(connectedAtom);

  const [message, setMessage] = useAtom(messageAtom);

  const [mnemonic, setMnemonic] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useAtom(addressAtom);

  const [walletKitUri, setWalletKitUri] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [ohw, setOHW] = useState(false);
  const [version, SetVersion] = useState("");

  //  * The buffer content represents:
  //  * - buffer[0]: Secure Boot
  //  * - buffer[1]: Flash Encryption
  //  * - buffer[2]: Bootloader
  //  * - buffer[3]: Storage Init
  //  * - buffer[4]: Hardware Rng support
  //  * - buffer[5]: Display & Input support
  //  * - buffer[6]: User Key support
  //  *
  const [supportFeature, setSupportFeature] = useState<Uint8Array>(
    new Uint8Array(16),
  );
  const [path, setPath] = useAtom(pathAtom);

  const [walletConnect, setWalletConnect] = useState(false);

  const [activeSessions, setActiveSessions] = useState<SessionTypes.Struct[]>(
    [],
  );

  const { confirm, Dialog } = useConfirm();

  useEffect(() => {
    updateActiveSessions().catch(console.error);
  }, [walletConnect]);

  const updateActiveSessions = async () => {
    try {
      const sessions = walletKit.getActiveSessions();
      const validSessions = [];

      for (const session of Object.values(sessions)) {
        try {
          if (session && session.peer && session.topic) {
            validSessions.push(session as SessionTypes.Struct);
          }
        } catch (error) {
          console.warn(`Session ${session?.topic} appears invalid:`, error);
        }
      }
      setActiveSessions(validSessions);
      console.log(
        `Refreshed sessions: ${validSessions.length} active sessions found`,
      );
    } catch (error) {
      console.error("Failed to refresh active sessions:", error);
      setActiveSessions([]);
    }
  };

  const handleDisconnect = async (topic: string) => {
    try {
      await walletKit.disconnectSession({
        topic: topic,
        reason: getSdkError("USER_DISCONNECTED"),
      });
    } catch (error) {
      console.error("disconnect fail:", error);
    } finally {
      updateActiveSessions().catch(console.error);
    }
  };

  useEffect(() => {
    updateActiveSessions().catch(console.error);
  }, []);

  useEffect(() => {
    serialManager.onMessage((data) => {
      console.log(data.payload);
      switch (data.payload.oneofKind) {
        case "versionResponse": {
          const version = data.payload.versionResponse;
          
          const MINIMUM_VERSION = "0.2.3";
          
          if (!isVersionCompatible(version.version, MINIMUM_VERSION)) {
            const upgradeMessage = getVersionUpgradeMessage(version.version, MINIMUM_VERSION);
            
            confirm(
              upgradeMessage
            ).then((shouldGoToUpgrade) => {
              if (shouldGoToUpgrade) {
                window.open("https://github.com/butterfly-community/oskey-firmware/releases", "_blank");
              }
            });
            serialManager.close();
            setOHW(false);
            setInitialized(false);
            return;
          }
          
          setOHW(true);
          SetVersion(version.version);
          setInitialized(version.features?.initialized ?? false);
          const mask = version.features?.supportMask ?? new Uint8Array(16);
          console.log("supportMask received:", mask);
          console.log("supportMask values:", Array.from(mask));
          setSupportFeature(mask);

          if (version.features?.initialized) {
            setMnemonic(
              "Initialization has been completed. Scroll down to use more functions.",
            );
            derivePublicKey();
            initWalletKitEvent();
          }

          break;
        }
        case "initWalletResponse": {
          const init = data.payload.initWalletResponse;
          setInitialized(true);
          setMnemonic(init.mnemonic ?? "");
          derivePublicKey();
          initWalletKitEvent();
          break;
        }
        case "derivePublicKeyResponse": {
          const pk = data.payload.derivePublicKeyResponse.publicKey;
          setAddress(serialManager.publicKeyToAddress(pk));
          break;
        }
        case "signResponse": {
          const signature = data.payload.signResponse.signature;
          const hash = data.payload.signResponse.preHash;
          // const recoveryId = data.payload.signResponse.recoveryId;
          const public_key = data.payload.signResponse.publicKey;

          let signature_with_id = "";

          signature_with_id = ethers.hexlify(signature) + "1b";

          const check1 = ethers.recoverAddress(hash, signature_with_id);

          if (check1 == serialManager.publicKeyToAddress(public_key)) {
            store.set(signatureAtom, ethers.hexlify(signature_with_id));
            return;
          }

          signature_with_id = ethers.hexlify(signature) + "1c";

          const check2 = ethers.recoverAddress(hash, signature_with_id);

          if (check2 == serialManager.publicKeyToAddress(public_key)) {
            store.set(signatureAtom, ethers.hexlify(signature_with_id));
            return;
          }

          break;
        }
        default:
          console.log("Error Data");
      }
    });

    serialManager.onReadingState((reading) => {
      setConnected(reading);
    });

    return () => {
      serialManager.close();
    };
  }, [serialManager]);

  const initWalletKitEvent = async () => {
    console.log("walletconnect", "init");

    walletKit?.off("session_proposal", onSessionProposal);
    walletKit?.off("session_request", onSessionRequest);

    store.set(signatureAtom, "");
    store.set(messageAtom, "");
    store.set(debugText, "");

    walletKit?.on("session_proposal", onSessionProposal);
    walletKit?.on("session_request", onSessionRequest);
  };

  const cleanupInvalidSessions = async () => {
    try {
      console.log("Refreshing WalletConnect sessions...");
      await updateActiveSessions();
      const sessions = walletKit.getActiveSessions();
      if (Object.keys(sessions).length === 0) {
        console.log("No sessions found, clearing local state");
        setActiveSessions([]);
      }
      console.log("Session refresh completed");
    } catch (error) {
      console.error("Error refreshing sessions:", error);
      setActiveSessions([]);
    }
  };

  async function onSessionRequest(event: WalletKitTypes.SessionRequest) {
    const { topic, params, id } = event;
    try {
      console.log("event", event);
      if (params.request.method == "personal_sign") {
        const requestParamsMessage = params.request.params[0];
        const data = ethers.toUtf8String(requestParamsMessage);

        const message = "Do you agree sign message?" + "\n\n" + data;

        // alert(message);
        if (!(await confirm(message))) {
          const response = {
            id,
            error: getSdkError("USER_REJECTED"),
            jsonrpc: "2.0",
          };
          await walletKit.respondSessionRequest({ topic, response });
          return;
        }

        store.set(messageAtom, data);
        store.set(debugText, message);
        store.set(signatureAtom, "");

        await new Promise((resolve) => setTimeout(resolve, 1000));

        signEthEip191();

        let mark = 0;

        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (store.get(signatureAtom) != "" || mark > 120) {
            break;
          }
          mark = mark + 1;
        }

        if (store.get(signatureAtom) == "") {
          alert("Sign Timeout");
          const response = {
            id,
            error: getSdkError("USER_REJECTED"),
            jsonrpc: "2.0",
          };
          await walletKit.respondSessionRequest({ topic, response });
          return;
        }

        const response = {
          id,
          result: store.get(signatureAtom),
          jsonrpc: "2.0",
        };

        console.log("sign", store.get(signatureAtom));

        await walletKit.respondSessionRequest({ topic, response });
      }
      if (params.request.method == "eth_sendTransaction") {
        const { from, ...newData } = params.request.params[0];

        if (from.toLowerCase() != store.get(addressAtom).toLowerCase()) {
          alert("Address not this use path! please check!");
          const response = {
            id,
            error: getSdkError("UNAUTHORIZED_METHOD"),
            jsonrpc: "2.0",
          };
          await walletKit.respondSessionRequest({ topic, response });
          return;
        }

        const provider = ethers.getDefaultProvider(
          parseInt(params.chainId.substring(7)),
          {
            infura: import.meta.env.VITE_INFURA_ID,
            exclusive: "infura",
          },
        );

        if (!newData.chainId) {
          newData.chainId = parseInt(params.chainId.substring(7));
        }

        if (!newData.nonce) {
          const nonce = await provider.getTransactionCount(
            store.get(addressAtom),
            "latest",
          );
          newData.nonce = nonce;
        }

        const feeData = await provider.getFeeData();

        if (!newData.gasLimit) {
          newData.gasLimit = ethers.toBigInt(21000);
        }

        if (!newData.gasPrice) {
          newData.gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas;
        }

        const tx = Transaction.from(newData);

        const formatObject = (obj: object) => {
          return Object.entries(obj)
            .map(([key, value]) => {
              if (key === "data" || key === "to") {
                return `${key}:\n${value}\n`;
              }
              if (typeof value === "string" && value.startsWith("0x")) {
                const decimalValue = parseInt(value, 16);
                return `${key}:\n${decimalValue}\n`;
              }
              return `${key}:\n${value}\n`;
            })
            .join("\n");
        };

        const message =
          "Do you agree sign transaction?" + "\n\n" + formatObject(newData);

        // alert(message);
        if (!(await confirm(message))) {
          const response = {
            id,
            error: getSdkError("USER_REJECTED"),
            jsonrpc: "2.0",
          };
          await walletKit.respondSessionRequest({ topic, response });
          return;
        }

        const unsignedHash = tx.unsignedHash;

        store.set(messageAtom, unsignedHash);
        store.set(debugText, message);
        store.set(signatureAtom, "");

        await new Promise((resolve) => setTimeout(resolve, 1000));

        signEthEip2930(tx);

        let mark = 0;

        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (store.get(signatureAtom) != "" || mark > 120) {
            break;
          }
          mark = mark + 1;
        }

        if (store.get(signatureAtom) == "") {
          alert("Sign Timeout");
          const response = {
            id,
            error: getSdkError("USER_REJECTED"),
            jsonrpc: "2.0",
          };
          await walletKit.respondSessionRequest({ topic, response });
          return;
        }

        const sig = Transaction.from({
          ...newData,
          signature: store.get(signatureAtom),
        });

        // const provider = new ethers.JsonRpcProvider(
        //   "https://sepolia.infura.io/v3/" + import.meta.env.VITE_INFURA_ID,
        // );
        const txResponse = await provider.broadcastTransaction(sig.serialized);

        console.log(txResponse);

        // const receipt = await txResponse.wait();

        // console.log(receipt);

        const response = {
          id,
          result: txResponse.hash,
          jsonrpc: "2.0",
        };

        await walletKit.respondSessionRequest({ topic, response });
      }
    } catch (err) {
      alert(err);
      try {
        const response = {
          id,
          error: getSdkError("USER_REJECTED"),
          jsonrpc: "2.0",
        };
        await walletKit.respondSessionRequest({ topic, response });
      } catch (responseErr) {
        console.error("Failed to send error response:", responseErr);
      }
    }
  }

  async function onSessionProposal({
    id,
    params,
  }: WalletKitTypes.SessionProposal) {
    try {
      console.log(params);
      let chains = ["eip155:1"];

      if (params.requiredNamespaces?.eip155?.chains) {
        chains = [...chains, ...params.requiredNamespaces.eip155.chains];
      }

      if (params.optionalNamespaces?.eip155?.chains) {
        chains = [...chains, ...params.optionalNamespaces.eip155.chains];
      }
      chains = Array.from(new Set(chains));
      const approvedNamespaces = buildApprovedNamespaces({
        proposal: params,
        supportedNamespaces: {
          eip155: {
            chains,
            methods: [
              "personal_sign",
              "eth_sendTransaction",
              "eth_signTransaction",
              "eth_sign",
              // "eth_signTypedData",
            ],
            events: ["accountsChanged", "chainChanged"],
            accounts: chains.map(
              (chain) => `${chain}:${store.get(addressAtom)}`,
            ),
          },
        },
      });

      const message =
        "Do you agree link ohw?" +
        "\n\n" +
        params.proposer.metadata.name +
        "\n" +
        params.proposer.metadata.url +
        "\n";

      if (!(await confirm(message))) {
        await walletKit?.rejectSession({
          id: id,
          reason: getSdkError("USER_REJECTED"),
        });
        return;
      }

      await walletKit?.approveSession({
        id,
        namespaces: approvedNamespaces,
      });

      await updateActiveSessions();
    } catch (err) {
      console.log("err", err);
      await walletKit?.rejectSession({
        id: id,
        reason: getSdkError("USER_REJECTED"),
      });
    }
  }

  const handleConnect = async () => {
    if (!navigator.serial) {
      Object.defineProperty(navigator, "serial", {
        value: serial,
        configurable: true,
        writable: true,
      });
    }
    if (!navigator.serial || !navigator.usb) {
      alert(
        "Web Serial API is only supported in Chrome/Edge browsers. Please switch to Chrome or Edge to use this feature.",
      );
      return;
    }
    if (connected) {
      await serialManager.close();
      setOHW(false);
      setInitialized(false);
    } else {
      await serialManager.connect();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await getVersion();
    }
  };

  const getVersion = async () => {
    const versionRequest = ReqData.create({
      payload: {
        oneofKind: "versionRequest",
        versionRequest: VersionRequest.create({}),
      },
    });

    await serialManager.sendProtobuf(versionRequest);
  };

  const initWallet = async () => {
    const initRequest = ReqData.create({
      payload: {
        oneofKind: "initRequest",
        initRequest: InitWalletRequest.create({
          length: 24,
          password: password,
        }),
      },
    });

    await serialManager.sendProtobuf(initRequest);
  };

  const initWalletCustom = async () => {
    if (!mnemonic) {
      alert("Please enter both mnemonic and password");
      return;
    }
    const initRequest = ReqData.create({
      payload: {
        oneofKind: "initCustomRequest",
        initCustomRequest: InitWalletCustomRequest.create({
          words: mnemonic,
          password: password,
        }),
      },
    });

    await serialManager.sendProtobuf(initRequest);
  };

  const derivePublicKey = async () => {
    const initRequest = ReqData.create({
      payload: {
        oneofKind: "derivePublicKeyRequest",
        derivePublicKeyRequest: DerivePublicKeyRequest.create({
          path: path,
        }),
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await serialManager.sendProtobuf(initRequest);
  };

  const signEthEip191 = async () => {
    const message = store.get(messageAtom);
    console.log("message", message);

    const signRequest = ReqData.create({
      payload: {
        oneofKind: "signEthRequest",
        signEthRequest: SignEthRequest.create({
          id: 0,
          path: store.get(pathAtom),
          tx: {
            oneofKind: "eip191",
            eip191: {
              message: message,
            },
          },
        }),
      },
    });
    await serialManager.sendProtobuf(signRequest);
  };

  const signEthEip2930 = async (tx: Transaction) => {
    const signRequest = ReqData.create({
      payload: {
        oneofKind: "signEthRequest",
        signEthRequest: SignEthRequest.create({
          id: 0,
          path: store.get(pathAtom),
          tx: {
            oneofKind: "eip2930",
            eip2930: {
              chainId: tx.chainId ?? 1,
              nonce: BigInt(tx.nonce) ?? 0,
              to: tx.to ?? "",
              value: ethers.toBeHex(tx.value),
              gasLimit: BigInt(tx.gasLimit) ?? 21000n,
              gasPrice: ethers.toBigInt(tx.gasPrice ?? 0n).toString(),
              input: ethers.getBytes(tx.data),
            },
          },
        }),
      },
    });
    await serialManager.sendProtobuf(signRequest);
  };

  const walletKitConnect = async () => {
    await walletKit?.pair({ uri: walletKitUri });
    setWalletConnect(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {Dialog}

      <div className="max-w-7xl mx-auto px-4">
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">OSKey Hardware Wallet</h1>
          <div className="flex gap-4">
            <button
              onClick={() =>
                window.open("https://espressif.github.io/esptool-js/", "_blank")
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Flash Firmware
            </button>
            <button
              onClick={handleConnect}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                connected
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-600 hover:bg-gray-700"
              } text-white transition-colors`}
            >
              <div
                className={`w-2 h-2 rounded-full ${connected ? "bg-green-200" : "bg-gray-300"}`}
              />
              <span>{connected ? "Connected" : "Connect"}</span>
            </button>
          </div>
        </div>

        {/* Warning Card */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl shadow-sm p-8 mb-8 border border-amber-200">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-200 rounded-lg">
                <svg
                  className="w-6 h-6 text-amber-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-amber-900">
                Security Precautions
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-white bg-opacity-50 rounded-lg p-5 border border-amber-200">
                <h3 className="text-lg font-semibold text-amber-800 mb-3">
                  Please check the device status
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <span className="text-amber-700">
                      Without hardware RNG, mnemonic generation is not secure enough
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <span className="text-amber-700">
                      Without screen/buttons, signatures cannot be manually verified on device
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <span className="text-amber-700">
                      Without secure boot and flash encryption, firmware and storage are not secure
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <span className="text-amber-700">
                      Without storage support, data will be lost after power off
                    </span>
                  </li>
                </ul>
              </div>

              {/* <div className="bg-white bg-opacity-50 rounded-lg p-5 border border-amber-200">
                <h3 className="text-lg font-semibold text-amber-800 mb-3">
                  Development Board Status
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <span className="text-amber-700">
                      Current OHW development board is running without security
                      locks or SE security components enabled.{" "}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <span className="text-amber-700">
                      Stay tuned for upcoming tutorials on chip security locking
                      and high-security hardware wallet solutions.
                    </span>
                  </li>
                </ul>
              </div> */}
            </div>

            <div className="mt-6 text-center">
              <a
                href="https://github.com/butterfly-community/oskey-firmware/tree/master/doc/start"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors duration-200 group"
              >
                <span className="font-medium">View Documentation</span>
                <svg
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Device Status Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Device Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">OSKey Status:</span>
                <div>
                  {ohw ? (
                    <span className="text-green-600">
                      OK Version: {version}
                    </span>
                  ) : (
                    <span className="text-red-600">Not Found</span>
                  )}
                </div>
              </div>
              
              {ohw && (
                <div className="mt-4">
                  <span className="text-gray-600 text-sm font-medium">Support Features:</span>
                  <div className="mt-2 space-y-2">
                    {[
                      { name: "Secure Boot", index: 0 },
                      { name: "Flash Encryption", index: 1 },
                      { name: "Bootloader", index: 2 },
                      { name: "Storage Init", index: 3 },
                      { name: "Hardware Rng", index: 4 },
                      { name: "Display & Input", index: 5 },
                      { name: "User Key", index: 6 },
                    ].map(({ name, index }) => (
                      <div key={name} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{name}:</span>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              supportFeature[index] === 1 
                                ? "bg-green-500" 
                                : "bg-red-500"
                            }`}
                          />
                          <span
                            className={`font-medium ${
                              supportFeature[index] === 1 
                                ? "text-green-600" 
                                : "text-red-600"
                            }`}
                          >
                            {supportFeature[index] === 1 ? "Supported" : "Not Supported"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!ohw && connected && (
                <div className="text-red-600 text-sm">
                  Missing ohw firmware. Please{" "}
                  <a
                    href="https://github.com/butterfly-community/oskey-firmware"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    check the manual
                  </a>
                  !
                </div>
              )}
            </div>
          </div>

          {/* Wallet Initialization Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">
              Wallet Initialization
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mnemonic
                </label>
                <textarea
                  className="w-full p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  value={mnemonic}
                  disabled={initialized}
                  onChange={(e) => setMnemonic(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salt Passphrase (Optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Leave blank if unsure.
                </p>
                <input
                  type="password"
                  className="w-full p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={password}
                  disabled={initialized}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {!initialized && ohw && (
                <div className="flex gap-4">
                  <button
                    onClick={initWalletCustom}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Import
                  </button>
                  <button
                    onClick={initWallet}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Generate
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Address Management Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Address Management</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Derivation Path
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                />
              </div>
              {initialized && (
                <button
                  onClick={derivePublicKey}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get Address
                </button>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg bg-gray-50"
                  value={address}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Signing Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Message Signing</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  className="w-full p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              {initialized && (
                <button
                  onClick={signEthEip191}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign Message
                </button>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signature
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg bg-gray-50"
                  value={signature}
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>

        {/* WalletConnect Card */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">WalletConnect</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WalletConnect URI
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  className="flex-1 p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={walletKitUri}
                  onChange={(e) => setWalletKitUri(e.target.value)}
                />
                {address && walletKitUri && (
                  <button
                    onClick={walletKitConnect}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {walletConnect ? "Re Add" : "Add"}
                  </button>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Active Sessions</h3>
              {activeSessions.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-gray-500">No active sessions</div>
                  <button
                    onClick={cleanupInvalidSessions}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Refresh Sessions
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeSessions.map((session) => (
                    <div key={session.topic} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {session.peer.metadata.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Topic: {session.topic.slice(0, 10)}...
                          </div>
                          <div className="text-sm text-gray-500">
                            URL: {session.peer.metadata.url}
                          </div>
                          <div className="text-sm text-gray-500">
                            Chains:{" "}
                            {session.namespaces.eip155.chains?.join(", ")}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDisconnect(session.topic)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={async () => {
                      for (const session of activeSessions) {
                        await handleDisconnect(session.topic);
                      }
                    }}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Disconnect All
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function useConfirm() {
  const [show, setShow] = useState(false);
  const [resolver, setResolver] = useState<(value: boolean) => void>();
  const [message, setMessage] = useState("");

  const confirm = useCallback((message: string) => {
    setMessage(message);
    setShow(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    resolver?.(true);
    setShow(false);
  };

  const handleCancel = () => {
    resolver?.(false);
    setShow(false);
  };

  const Dialog = show ? (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
        <p className="my-4 whitespace-pre-line">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={handleCancel} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, Dialog };
}
