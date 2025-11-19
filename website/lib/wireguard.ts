import nacl from "tweetnacl";
import { randomBytes } from "crypto";

export type WireguardKeyPair = {
  privateKey: string;
  publicKey: string;
};

const clampPrivateKey = (key: Uint8Array) => {
  key[0] &= 248;
  key[31] &= 127;
  key[31] |= 64;
  return key;
};

export const generateWireguardKeyPair = (): WireguardKeyPair => {
  const privateKeyRaw = clampPrivateKey(new Uint8Array(randomBytes(32)));
  const publicKeyRaw = nacl.scalarMult.base(privateKeyRaw);

  return {
    privateKey: Buffer.from(privateKeyRaw).toString("base64"),
    publicKey: Buffer.from(publicKeyRaw).toString("base64"),
  };
};

export const generatePresharedKey = (): string => {
  return Buffer.from(randomBytes(32)).toString("base64");
};
