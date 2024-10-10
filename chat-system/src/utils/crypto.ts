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

export const importRSAPublicKey = async (pem: string): Promise<CryptoKey> => {
  const binaryDer = base64ToArrayBuffer(pem);

  return window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP", // Use RSA-OAEP for encryption
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
};

export const encryptAES = async (
  message: string,
  aesKey: CryptoKey,
  iv: Uint8Array
): Promise<string> => {
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv, // Initialization vector
    },
    aesKey,
    encodedMessage
  );

  // Convert ciphertext to Base64
  return arrayBufferToBase64(ciphertext);
};

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

export const encryptAESKeyWithRSA = async (
  aesKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<string> => {
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  const encryptedKey = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    recipientPublicKey,
    rawAesKey
  );

  return arrayBufferToBase64(encryptedKey);
};

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

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
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

// Helper to generate random bytes
export const randomBytes = (size: number): Uint8Array => {
  const array = new Uint8Array(size);
  window.crypto.getRandomValues(array);
  return array;
};

// Function to encrypt data with AES (AES-GCM mode)
export const encryptWithAES = async (
  data: string,
  aesKey: CryptoKey,
  iv: Uint8Array
): Promise<string> => {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv, // Initialization vector
    },
    aesKey,
    encodedData
  );

  return arrayBufferToBase64(encrypted); // Convert encrypted ArrayBuffer to Base64
};

// Function to generate RSA key pair (for encryption using RSA-OAEP)
export const generateRSAKeyPair = async (): Promise<CryptoKeyPair> => {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: { name: "SHA-256" }, // Use SHA-256 for hashing
    },
    true, // Keys should be extractable for exporting
    ["encrypt", "decrypt"] // For encrypting and decrypting
  );
};

// // Convert ArrayBuffer to Base64
// const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
//   const binary = String.fromCharCode(...new Uint8Array(buffer));
//   return btoa(binary);
// };

export const decryptAESKey = async (
  encryptedAESKey: string,
  privateKey: CryptoKey
): Promise<ArrayBuffer> => {
  const encryptedKeyArray = base64ToArrayBuffer(encryptedAESKey);

  // Decrypt the AES key using RSA-OAEP
  return await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey, // RSA private key
    encryptedKeyArray // Encrypted AES key
  );
};

export const decryptWithAES = async (
  encryptedMessage: string,
  encryptedAESKey: string, // Base64 encoded AES key, encrypted with RSA
  iv: string, // Base64 encoded Initialization Vector
  privateKey: CryptoKey // RSA private key to decrypt the AES key
): Promise<string> => {
  // 1. Decode the Base64-encoded IV
  const ivArray = base64ToArrayBuffer(iv);

  // 2. Decode the Base64-encoded encrypted message
  const encryptedMessageArray = base64ToArrayBuffer(encryptedMessage);

  // 3. Decrypt the AES key using the recipient's RSA private key
  const decryptedAESKeyBuffer = await decryptAESKey(
    encryptedAESKey,
    privateKey
  );

  // 4. Import the decrypted AES key for AES-GCM decryption
  const aesKey = await window.crypto.subtle.importKey(
    "raw", // Importing the raw AES key
    decryptedAESKeyBuffer, // The decrypted AES key buffer
    "AES-GCM", // Algorithm used
    false, // Non-extractable
    ["decrypt"] // Usage for decryption
  );

  // 5. Decrypt the message using AES-GCM
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivArray, // Initialization Vector
    },
    aesKey, // The decrypted AES key
    encryptedMessageArray // The AES-encrypted message
  );

  // 6. Convert the decrypted ArrayBuffer to a string (message)
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
};
