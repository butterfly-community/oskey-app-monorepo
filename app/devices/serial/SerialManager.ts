import { ReqData, ResData } from "~/protocols/protobuf/ohw";
import { ethers } from "ethers";

export interface SerialProtocolConfig {
  readonly MAGIC: Uint8Array;
  readonly HEADER_LENGTH: 5;
  readonly LENGTH_BYTES: number;
  readonly MAX_LENGTH: number;
}

export interface SerialConfig {
  readonly PORT: SerialOptions;
  readonly PROTOCOL: SerialProtocolConfig;
}

export const DEFAULT_SERIAL_CONFIG: SerialConfig = {
  PORT: {
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
  },
  PROTOCOL: {
    // ₿ UTF-8: E2 82 BF
    MAGIC: new Uint8Array([0xe2, 0x82, 0xbf]),
    HEADER_LENGTH: 5,
    LENGTH_BYTES: 2,
    MAX_LENGTH: 12288 + 7,
  },
};

export class SerialManager {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private buffer: Uint8Array = new Uint8Array(0);
  private readonly config: SerialConfig;
  private messageHandler?: (data: ResData) => void;
  private readingStateHandler?: (reading: boolean) => void;

  constructor(config: SerialConfig = DEFAULT_SERIAL_CONFIG) {
    this.config = config;
  }

  onMessage(handler: (data: ResData) => void): void {
    this.messageHandler = handler;
  }

  onReadingState(handler: (reading: boolean) => void): void {
    this.readingStateHandler = handler;
  }

  async connect(): Promise<void> {
    if (!navigator.serial) {
      throw new Error("Not Support WebSerial API");
    }

    // Always disconnect previous connection before connecting
    await this.close();

    // Always request user to select port
    this.port = await navigator.serial.requestPort();

    await this.port.open(this.config.PORT);

    this.startReading();
  }

  async close(): Promise<void> {
    if (this.reader) {
      await this.reader.cancel().catch(() => {});
      this.reader?.releaseLock();
    }
    this.reader = null;
    if (this.port && this.port.readable) {
      await this.port.close().catch(() => {});
    }
    this.buffer = new Uint8Array(0);
  }

  private async startReading(): Promise<void> {
    if (!this.port?.readable) return;
    try {
      this.reader = this.port.readable.getReader();

      this.readingStateHandler?.(true);

      while (this.port.readable) {
        const { value, done } = await this.reader.read();
        if (done) break;

        const newBuffer = new Uint8Array(this.buffer.length + value.length);
        newBuffer.set(this.buffer);
        newBuffer.set(value, this.buffer.length);
        this.buffer = newBuffer;

        this.processBuffer();
      }
    } catch (error) {
      console.error("Read Port Error:", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      await this.close();
      this.readingStateHandler?.(false);
    }
  }

  private processBuffer(): void {
    while (this.buffer.length >= this.config.PROTOCOL.HEADER_LENGTH) {
      const magicMatch = this.arrayEquals(
        this.buffer.slice(0, this.config.PROTOCOL.MAGIC.length),
        this.config.PROTOCOL.MAGIC,
      );

      if (!magicMatch) {
        this.buffer = this.buffer.slice(1);
        continue;
      }

      const length = (this.buffer[3] << 8) | this.buffer[4];

      if (this.buffer.length < this.config.PROTOCOL.HEADER_LENGTH + length) {
        break;
      }

      const message = this.buffer.slice(
        this.config.PROTOCOL.HEADER_LENGTH,
        this.config.PROTOCOL.HEADER_LENGTH + length,
      );

      const data = ResData.fromBinary(message);
      console.log("Received:", data);
      this.messageHandler?.(data);

      this.buffer = this.buffer.slice(
        this.config.PROTOCOL.HEADER_LENGTH + length,
      );
    }
  }

  private arrayEquals(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.port?.writable) {
      throw new Error("Serial port is not writable");
    }
    const length = data.length;

    if (length > this.config.PROTOCOL.MAX_LENGTH) {
      throw new Error("Message too long");
    }

    const message = new Uint8Array(this.config.PROTOCOL.HEADER_LENGTH + length);

    message.set(this.config.PROTOCOL.MAGIC, 0);

    message[3] = (length >> 8) & 0xff;
    message[4] = length & 0xff;

    message.set(data, this.config.PROTOCOL.HEADER_LENGTH);

    try {
      const writer = this.port.writable.getWriter();
      try {
        const chunkSize = 4;
        for (let i = 0; i < message.length; i += chunkSize) {
          const chunk = message.slice(i, i + chunkSize);
          await writer.write(chunk);
          await writer.ready;
        }
        console.log("Sent:", message);
      } finally {
        writer.releaseLock();
      }
    } catch (error) {
      console.error("Write Port Error:", error);
      throw error;
    }
  }

  async sendProtobuf(data: ReqData): Promise<void> {
    try {
      console.log(data.payload);
      const bytes = ReqData.toBinary(data);
      await this.send(bytes);
    } catch (error) {
      console.error("Send Protobuf Error:", error);
    }
  }

  publicKeyToAddress(publicKey: Uint8Array): string {
    return ethers.computeAddress(ethers.hexlify(publicKey));
  }
}
