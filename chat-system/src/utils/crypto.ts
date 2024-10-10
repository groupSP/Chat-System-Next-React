// src/utils/crypto.ts

/**
 * crypto.ts
 *
 * This module provides cryptographic functions for the chat system,
 * including AES encryption/decryption and RSA encryption for key exchange.
 */

export async function generateRandomBytes(length: number): Promise<Uint8Array> {
  const randomBytes = new Uint8Array(length);
  window.crypto.getRandomValues(randomBytes);
  return randomBytes;
}

export async function importRSAPublicKey(pem: string): Promise<CryptoKey> {
  // Fetch the binary data from the PEM string
  const binaryDer = pemToArrayBuffer(pem);

  return window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

export async function encryptAES(
  message: string,
  aesKey: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    encodedMessage
  );

  // Convert ciphertext to Base64
  return arrayBufferToBase64(ciphertext);
}

export async function decryptAES(
  ciphertext: string,
  aesKey: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    ciphertextBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

export async function encryptAESKeyWithRSA(
  aesKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<string> {
  // Export the AES key to raw format
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // Encrypt the AES key with RSA-OAEP
  const encryptedKey = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    recipientPublicKey,
    rawAesKey
  );

  // Convert encrypted key to Base64
  return arrayBufferToBase64(encryptedKey);
}

export async function importRSAPrivateKey(pem: string): Promise<CryptoKey> {
  const binaryDer = pemToArrayBuffer(pem);

  return window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

export async function decryptAESKeyWithRSA(
  encryptedAESKey: string,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const encryptedKeyBuffer = base64ToArrayBuffer(encryptedAESKey);

  // Decrypt the AES key using RSA-OAEP
  const decryptedAesKeyBuffer = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    encryptedKeyBuffer
  );

  // Import the decrypted AES key
  return window.crypto.subtle.importKey(
    "raw",
    decryptedAesKeyBuffer,
    {
      name: "AES-GCM",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Helper functions

function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Remove the PEM header and footer
  const b64Lines = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const binaryString = window.atob(b64Lines);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// AES Key Generation
export async function generateAESKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256, // 256-bit AES key
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export const SignMessage = async (
  data: any,
  counter: number,
  privateKey: CryptoKey
): Promise<string> => {
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(JSON.stringify({ data, counter }));

  const signature = await window.crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    privateKey,
    encodedMessage
  );

  return arrayBufferToBase64(signature);
};

// Function to verify signature using RSA-PSS
export async function verifySignature(
  data: any,
  counter: number,
  signature: string,
  publicKey: CryptoKey
): Promise<boolean> {
  const encoder = new TextEncoder();
  const dataToVerify = JSON.stringify({ data, counter });
  const encoded = encoder.encode(dataToVerify);

  const signatureBuffer = base64ToArrayBuffer(signature);

  return window.crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    publicKey,
    signatureBuffer,
    encoded
  );
}
