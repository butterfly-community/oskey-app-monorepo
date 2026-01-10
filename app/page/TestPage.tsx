import { useEffect, useState, useCallback } from "react";
import type { MouseEvent } from "react";
import { SerialManager } from "~/devices/serial/SerialManager";
import {
  DerivePublicKeyRequest,
  InitWalletCustomRequest,
  InitWalletRequest,
  ReqData,
  SignEthRequest,
  VersionRequest,
} from "~/protocols/protobuf/ohw";
import { PasswordInput } from "~/components/PasswordInput";
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
export const initializedAtom = atom<boolean>(false);
export const signatureAtom = atom<string>("");
export const messageAtom = atom<string>("");
export const addressAtom = atom<string>("");
export const pathAtom = atom<string>("m/44'/60'/0'/0/0");
export const debugText = atom<string>("");
export const supportFeatureAtom = atom<Uint8Array>(new Uint8Array(16));

export function TestPage() {
  const [serialManager] = useState(() => new SerialManager());

  const [signature] = useAtom(signatureAtom);

  const [connected, setConnected] = useAtom(connectedAtom);

  const [message, setMessage] = useAtom(messageAtom);

  const [mnemonic, setMnemonic] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [confirmError, setConfirmError] = useState("");
  const [mnemonicErrors, setMnemonicErrors] = useState<string[]>([]);
  const [userActionPrompt, setUserActionPrompt] = useState<string | null>(null);
  const [address, setAddress] = useAtom(addressAtom);
  const clearUserActionPrompt = useCallback(
    () => setUserActionPrompt(null),
    [],
  );

  // Password validation and handling
  const handlePasswordChange = (value: string) => {
    setPassword(value);

    // Clear previous errors
    setPasswordErrors([]);
    setConfirmError("");

    // Validate password strength
    if (value) {
      const validation = validatePinStrength(value);
      if (!validation.isValid) {
        setPasswordErrors(validation.errors);
      }
    }

    // Reset confirm password if main password changes
    setConfirmPassword("");
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);

    // Clear confirm error when user starts typing
    if (confirmError) {
      setConfirmError("");
    }

    // Check if passwords match
    if (value && password !== value) {
      setConfirmError("PINs do not match");
    } else if (value && password === value) {
      setConfirmError("");
    }
  };

  // Mnemonic validation and handling
  const handleMnemonicChange = (value: string) => {
    setMnemonic(value);

    // Clear previous errors
    setMnemonicErrors([]);

    // Validate mnemonic if not empty
    if (value.trim()) {
      const validation = validateMnemonic(value);
      if (!validation.isValid) {
        setMnemonicErrors(validation.errors);
      }
    }
  };

  const isPasswordValid = password && validatePinStrength(password).isValid;
  const doPasswordsMatch =
    password && confirmPassword && password === confirmPassword;
  const isWalletPinReady = isPasswordValid && doPasswordsMatch;
  const isMnemonicValid = mnemonic.trim() && validateMnemonic(mnemonic).isValid;

  const [walletKitUri, setWalletKitUri] = useState("");
  const [initialized, setInitialized] = useAtom(initializedAtom);
  const [ohw, setOHW] = useState(false);
  const [version, SetVersion] = useState("");

  //  * The buffer content represents:
  //  * - buffer[0]: Secure Boot
  //  * - buffer[1]: Flash Encryption
  //  * - buffer[2]: Bootloader
  //  * - buffer[3]: Storage
  //  * - buffer[4]: Hardware Rng support
  //  * - buffer[5]: Display & Input support
  //  * - buffer[6]: User Key support
  //  *
  const [supportFeature, setSupportFeature] = useAtom(supportFeatureAtom);

  //  * The buffer content represents:
  //  * - buffer[0]: Storage Init
  //  * - buffer[1]: Lock status
  const [hardwareStatus, setHardwareStatus] = useState<Uint8Array>(
    new Uint8Array(16),
  );

  const [path, setPath] = useAtom(pathAtom);

  const [walletConnect, setWalletConnect] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [hasImported, setHasImported] = useState(false);

  const [activeSessions, setActiveSessions] = useState<SessionTypes.Struct[]>(
    [],
  );

  const { confirm, Dialog } = useConfirm();
  const { requestPin, PinDialog } = usePinInput();

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
      clearUserActionPrompt();
      switch (data.payload.oneofKind) {
        case "versionResponse": {
          const version = data.payload.versionResponse;

          const MINIMUM_VERSION = "0.4.0";

          if (!isVersionCompatible(version.version, MINIMUM_VERSION)) {
            const upgradeMessage = getVersionUpgradeMessage(
              version.version,
              MINIMUM_VERSION,
            );

            confirm(upgradeMessage).then((shouldGoToUpgrade) => {
              if (shouldGoToUpgrade) {
                window.open(
                  "https://github.com/butterfly-community/oskey-firmware/releases",
                  "_blank",
                );
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
          store.set(initializedAtom, version.features?.initialized ?? false);
          const mask = version.features?.supportMask ?? new Uint8Array(16);
          console.log("supportMask received:", mask);
          console.log("supportMask values:", Array.from(mask));
          setSupportFeature(mask);
          store.set(supportFeatureAtom, mask);

          if (version.features?.initialized) {
            setMnemonic(
              "Initialization has been completed. Scroll down to use more functions.",
            );
          }
          getStatus();
          break;
        }
        case "statusResponse": {
          const statusMask = data.payload.statusResponse.statusMask;
          setHardwareStatus(statusMask);

          const feature = store.get(supportFeatureAtom);

          // Check if Storage is supported but Storage Init failed
          const hasStorageSupport = feature[3] === 1;
          const isStorageInitialized = statusMask[0] === 1;

          console.log("StatusMask values:", Array.from(statusMask));
          console.log("Feature values:", Array.from(feature));

          if (hasStorageSupport && !isStorageInitialized) {
            const storageInitMessage =
              "Storage initialization failed!\n\n" +
              "Your device supports storage, but storage initialization has failed. " +
              "This may cause data loss after power off.\n\n" +
              "Please try the following steps:\n" +
              "1. Completely erase the flash memory before flashing firmware\n" +
              "2. Re-flash the firmware\n" +
              "3. Try initializing again\n\n" +
              "Would you like to go to the firmware flashing page?";

            confirm(storageInitMessage).then((shouldGoToFlash) => {
              if (shouldGoToFlash) {
                window.open(
                  "https://espressif.github.io/esptool-js/",
                  "_blank",
                );
              }
            });

            // Disconnect the device due to storage initialization failure
            serialManager.close();
            setOHW(false);
            setInitialized(false);
            return;
          }

          const isLocked = statusMask[1] === 1;

          if (store.get(initializedAtom) && isLocked) {
            const hasDisplayAndInput = feature[5] === 1;

            if (hasDisplayAndInput) {
              requestPin(true).then((shouldCheck) => {
                if (shouldCheck) {
                  checkUnlockStatus();
                }
              });
            } else {
              requestPin(false).then((result) => {
                if (typeof result === "string") {
                  sendUnlock(result);
                }
              });
            }
          } else if (store.get(initializedAtom) && !isLocked) {
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
        case "waitForUserActionResponse": {
          setUserActionPrompt(
            "Please confirm the action on the device screen or press the USER key to continue.",
          );
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
  }, [serialManager, clearUserActionPrompt]);

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

        const formatMessage = (msg: string) => {
          if (msg.length > 80) {
            return msg.replace(/(.{80})/g, "$1\n").replace(/\n /g, "\n");
          }
          return msg;
        };

        const formattedData = formatMessage(data);
        const message = "Do you agree sign message?" + "\n\n" + formattedData;

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

        if (!newData.gasLimit) {
          newData.gasLimit = ethers.toBigInt(21000);
        }

        if (!newData.gasPrice) {
          const feeData = await provider.getFeeData();
          newData.gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas;
        }

        const tx = Transaction.from(newData);

        const formatObject = (obj: object) => {
          return Object.entries(obj)
            .map(([key, value]) => {
              if (key === "data" || key === "to") {
                const strValue = String(value);
                if (strValue.length > 60) {
                  const chunks = strValue.match(/.{1,60}/g) || [strValue];
                  return `${key}:\n${chunks.join("\n")}\n`;
                }
                return `${key}:\n${value}\n`;
              }
              if (typeof value === "string" && value.startsWith("0x")) {
                const decimalValue = parseInt(value, 16);
                return `${key}:\n${decimalValue} (${value})\n`;
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

        const txResponse = await provider.broadcastTransaction(sig.serialized);

        console.log(txResponse);

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
    // Validate wallet PIN
    const pinValidation = validatePinStrength(password);
    if (!pinValidation.isValid) {
      alert("Invalid PIN: " + pinValidation.errors.join(", "));
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      alert("PINs do not match. Please confirm your PIN.");
      return;
    }

    const initRequest = ReqData.create({
      payload: {
        oneofKind: "initRequest",
        initRequest: InitWalletRequest.create({
          length: 24,
          pin: hashPassword(password),
        }),
      },
    });

    await serialManager.sendProtobuf(initRequest);
  };

  const initWalletCustom = async () => {
    // Validate mnemonic
    const mnemonicValidation = validateMnemonic(mnemonic);
    if (!mnemonicValidation.isValid) {
      alert("Invalid mnemonic: " + mnemonicValidation.errors.join(", "));
      return;
    }

    // Validate wallet PIN
    const pinValidation = validatePinStrength(password);
    if (!pinValidation.isValid) {
      alert("Invalid PIN: " + pinValidation.errors.join(", "));
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      alert("PINs do not match. Please confirm your PIN.");
      return;
    }

    const initRequest = ReqData.create({
      payload: {
        oneofKind: "initCustomRequest",
        initCustomRequest: InitWalletCustomRequest.create({
          words: mnemonic,
          pin: hashPassword(password),
        }),
      },
    });

    await serialManager.sendProtobuf(initRequest);
  };

  const handleGenerateClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.disabled = true;
    setHasGenerated(true);
    void initWallet();
  };

  const handleImportClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.disabled = true;
    setHasImported(true);
    void initWalletCustom();
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

  const getStatus = async () => {
    const statusRequest = ReqData.create({
      payload: {
        oneofKind: "statusRequest",
        statusRequest: {},
      },
    });
    await serialManager.sendProtobuf(statusRequest);
  };

  const hashPassword = (password: string) => {
    const salt = "&%OSKey1$!@";
    const pw = password + salt;
    const hash = ethers.sha256(ethers.toUtf8Bytes(pw));
    return ethers.getBytes(hash);
  };

  const sendUnlock = async (password: string) => {
    const unlockRequest = ReqData.create({
      payload: {
        oneofKind: "unlockRequest",
        unlockRequest: {
          hash: hashPassword(password),
        },
      },
    });
    await serialManager.sendProtobuf(unlockRequest);
  };

  const checkUnlockStatus = async () => {
    await getStatus();
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
      {PinDialog}
      <UserActionModal
        message={userActionPrompt}
        onDismiss={clearUserActionPrompt}
      />

      <div className="max-w-7xl mx-auto px-4">
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900"></h1>
          <div className="flex flex-col sm:flex-row gap-4">
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
              className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
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
        {/* <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl shadow-sm p-8 mb-8 border border-amber-200">
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
                      Without hardware RNG, mnemonic generation is not secure
                      enough
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <span className="text-amber-700">
                      Without screen/buttons, signatures cannot be manually
                      verified on device
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <span className="text-amber-700">
                      Without secure boot, firmware can be replaced
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
        </div> */}

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
                  <span className="text-gray-600 text-sm font-medium">
                    Support Features:
                  </span>
                  <div className="mt-2 space-y-2">
                    {[
                      { name: "Secure Boot", index: 0 },
                      // { name: "Flash Encryption", index: 1 },
                      { name: "Bootloader", index: 2 },
                      { name: "Storage", index: 3 },
                      { name: "Hardware Rng", index: 4 },
                      { name: "Display & Input", index: 5 },
                      { name: "User Key", index: 6 },
                    ].map(({ name, index }) => (
                      <div
                        key={name}
                        className="flex items-center justify-between text-xs"
                      >
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
                            {supportFeature[index] === 1
                              ? "Supported"
                              : "Not Supported"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Hardware Status Display */}
                  {initialized && (
                    <div className="mt-4">
                      <span className="text-gray-600 text-sm font-medium">
                        Hardware Status:
                      </span>
                      <div className="mt-2 space-y-2">
                        {[
                          { name: "Storage Init", index: 0, dependsOn: 3 }, // Storage Init depends on Storage support
                          { name: "Device Lock", index: 1 },
                        ].map(({ name, index, dependsOn }) => {
                          // If dependsOn is specified, check if the dependency is supported
                          const isDependencyMet =
                            dependsOn === undefined ||
                            supportFeature[dependsOn] === 1;
                          const statusValue = hardwareStatus[index];

                          // Special handling for Storage Init
                          let statusColor, statusText;
                          if (name === "Storage Init") {
                            if (!isDependencyMet) {
                              statusColor = "bg-gray-400";
                              statusText = "N/A (No Storage Support)";
                            } else if (statusValue === 1) {
                              statusColor = "bg-green-500";
                              statusText = "Initialized";
                            } else {
                              statusColor = "bg-red-500";
                              statusText = "Failed";
                            }
                          } else if (name === "Device Lock") {
                            statusColor =
                              statusValue === 1 ? "bg-red-500" : "bg-green-500";
                            statusText =
                              statusValue === 1 ? "Locked" : "Unlocked";
                          } else {
                            statusColor =
                              statusValue === 1 ? "bg-green-500" : "bg-red-500";
                            statusText = statusValue === 1 ? "OK" : "Error";
                          }

                          return (
                            <div
                              key={name}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-gray-600">{name}:</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${statusColor}`}
                                />
                                <span
                                  className={`font-medium ${
                                    name === "Storage Init" && !isDependencyMet
                                      ? "text-gray-600"
                                      : name === "Storage Init" &&
                                          statusValue !== 1 &&
                                          isDependencyMet
                                        ? "text-red-600"
                                        : name === "Device Lock" &&
                                            statusValue === 1
                                          ? "text-red-600"
                                          : "text-green-600"
                                  }`}
                                >
                                  {statusText}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!ohw && connected && (
                <div className="text-red-600 text-sm">
                  Missing OSKey firmware. Please{" "}
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
            {ohw && supportFeature[5] === 1 && !initialized ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-200 rounded-lg">
                    <svg
                      className="w-6 h-6 text-blue-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    Hardware Screen Detected
                  </h3>
                </div>
                <div className="space-y-3">
                  <p className="text-blue-800">
                    Your device has a display. Please use the hardware interface
                    to initialize your wallet for better security.
                  </p>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">
                      To initialize on hardware
                    </h4>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={getVersion}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Check Status
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {initialized ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                    Wallet initialization is complete. You can now manage your
                    wallet using the controls below.
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <PasswordInput
                          label="Wallet PIN (Password) *"
                          value={password}
                          onChange={handlePasswordChange}
                          disabled={
                            initialized || (ohw && supportFeature[5] === 1)
                          }
                          placeholder="Enter wallet PIN"
                          autoComplete="new-password"
                        />
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            PIN must be longer than 8 characters and contain
                            uppercase letters, lowercase letters, and numbers
                          </p>
                          {passwordErrors.length > 0 && (
                            <div className="mt-1 text-red-600 text-xs">
                              {passwordErrors.map((error, index) => (
                                <div key={index}>• {error}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Show confirm password field only when main password is valid */}
                      {isPasswordValid && (
                        <div>
                          <PasswordInput
                            label="Confirm Wallet PIN *"
                            value={confirmPassword}
                            onChange={handleConfirmPasswordChange}
                            disabled={
                              initialized || (ohw && supportFeature[5] === 1)
                            }
                            placeholder="Confirm wallet PIN"
                            autoComplete="new-password"
                          />
                          {confirmError && (
                            <div className="mt-1 text-red-600 text-xs">
                              • {confirmError}
                            </div>
                          )}
                          {doPasswordsMatch && (
                            <div className="mt-1 text-green-600 text-xs">
                              ✓ PINs match
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {isPasswordValid && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mnemonic
                          </label>
                          <textarea
                            className="w-full p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            rows={4}
                            value={mnemonic}
                            disabled={
                              initialized || (ohw && supportFeature[5] === 1)
                            }
                            onChange={(e) =>
                              handleMnemonicChange(e.target.value)
                            }
                            placeholder="Enter your 12+ word mnemonic phrase separated by spaces"
                          />
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              Enter at least 12 words separated by spaces. Only
                              letters are allowed.
                            </p>
                            {mnemonicErrors.length > 0 && (
                              <div className="mt-1 text-red-600 text-xs">
                                {mnemonicErrors.map((error, index) => (
                                  <div key={index}>• {error}</div>
                                ))}
                              </div>
                            )}
                            {isMnemonicValid && (
                              <div className="mt-1 text-green-600 text-xs">
                                ✓ Mnemonic phrase is valid (
                                {
                                  mnemonic
                                    .trim()
                                    .split(/\s+/)
                                    .filter((w) => w.length > 0).length
                                }{" "}
                                words)
                              </div>
                            )}
                          </div>
                        </div>

                        {!initialized && ohw && supportFeature[5] !== 1 && (
                          <div className="flex gap-4">
                            <button
                              onClick={handleImportClick}
                              disabled={
                                hasImported ||
                                !isWalletPinReady ||
                                !isMnemonicValid
                              }
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              Import
                            </button>
                            <button
                              onClick={handleGenerateClick}
                              disabled={hasGenerated || !isWalletPinReady}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              Generate
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
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
                  autoComplete="off"
                  data-form-type="other"
                  data-lpignore="true"
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

function UserActionModal({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 space-y-4 text-center">
          <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Device Action Required
            </h3>
            <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">
              {message}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Got it
          </button>
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
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex-1 overflow-auto">
          <p className="my-4 whitespace-pre-line break-words text-sm leading-relaxed">
            {message}
          </p>
        </div>
        <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, Dialog };
}

// PIN validation function
function validatePinStrength(pin: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (pin.length < 8) {
    errors.push("PIN must be longer than 8 characters");
  }

  if (!/[0-9]/.test(pin)) {
    errors.push("PIN must contain at least one number");
  }

  if (!/[a-z]/.test(pin)) {
    errors.push("PIN must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(pin)) {
    errors.push("PIN must contain at least one uppercase letter");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Mnemonic validation function
function validateMnemonic(mnemonic: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!mnemonic || mnemonic.trim() === "") {
    errors.push("Mnemonic phrase is required");
    return { isValid: false, errors };
  }

  // Check for only letters and spaces
  if (!/^[a-zA-Z\s]+$/.test(mnemonic.trim())) {
    errors.push("Mnemonic phrase can only contain letters and spaces");
  }

  // Split by whitespace and filter out empty strings
  const words = mnemonic
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length < 12) {
    errors.push(
      `Mnemonic phrase must contain at least 12 words (currently ${words.length})`,
    );
  }

  // Check if each word contains only letters
  words.forEach((word, index) => {
    if (!/^[a-zA-Z]+$/.test(word)) {
      errors.push(`Word ${index + 1} "${word}" contains invalid characters`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function usePinInput() {
  const [show, setShow] = useState(false);
  const [resolver, setResolver] = useState<(value: string | boolean) => void>();
  const [pin, setPin] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isCheckMode, setIsCheckMode] = useState(false);

  const requestPin = useCallback((checkMode: boolean = false) => {
    setPin("");
    setValidationErrors([]);
    setIsCheckMode(checkMode);
    setShow(true);
    return new Promise<string | boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    if (isCheckMode) {
      resolver?.(true);
      setShow(false);
    } else {
      const validation = validatePinStrength(pin);
      if (validation.isValid) {
        resolver?.(pin);
        setShow(false);
        setPin("");
        setValidationErrors([]);
      } else {
        setValidationErrors(validation.errors);
      }
    }
  };

  const PinDialog = show ? (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        {isCheckMode ? (
          <>
            <h3 className="text-lg font-semibold mb-4 text-center">
              Device Unlock Check
            </h3>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Please unlock your device using the hardware buttons, then click
              &quot;Check Status&quot; to verify.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Check Status
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-4 text-center">
              Enter PIN
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Please enter your device PIN to unlock
            </p>
            <div className="mb-6">
              <PasswordInput
                value={pin}
                onChange={(value) => {
                  setPin(value);
                  // Clear validation errors when user starts typing
                  if (validationErrors.length > 0) {
                    setValidationErrors([]);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirm();
                  }
                }}
                className="text-center text-lg border-2"
                placeholder="Enter PIN"
                maxLength={50}
                autoComplete="new-password"
                autoFocus={true}
              />
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-500">
                  PIN must be longer than 8 characters and contain uppercase
                  letters, lowercase letters, and numbers
                </p>
                {validationErrors.length > 0 && (
                  <div className="mt-2 text-red-600 text-xs">
                    {validationErrors.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Unlock
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  return { requestPin, PinDialog };
}
