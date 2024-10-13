import CryptoJS from "crypto-js";
import JSEncrypt from "jsencrypt";
import NodeRSA from "node-rsa";
import crypto from "crypto";

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

// Encrypting message using AES
export const encryptAES = (message: string, secretKey: string): string => {
  const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();
  return encrypted;
};

// Decrypting message using AES
export const decryptAES = (
  encryptedMessage: string,
  secretKey: string
): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, secretKey);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return decrypted;
};

// Generate RSA key pair
export const generateRSAKeyPair = () => {
  const key = new NodeRSA({ b: 2048 });
  const publicKey = key.exportKey("public");
  const privateKey = key.exportKey("private");
  return { publicKey, privateKey };
};

// Encrypt AES key using RSA public key
export const encryptAESKeyWithRSA = (
  aesKey: string,
  publicKey: string
): string => {
  const key = new NodeRSA(publicKey);
  const encryptedAESKey = key.encrypt(aesKey, "base64");
  return encryptedAESKey;
};

// Decrypt AES key using RSA private key
export const decryptAESKeyWithRSA = (
  encryptedAESKey: string,
  privateKey: string
): string => {
  const key = new NodeRSA(privateKey);
  const decryptedAESKey = key.decrypt(encryptedAESKey, "utf8");
  return decryptedAESKey;
};

export const cryptoKeyToBase64 = async (key: CryptoKey): Promise<string> => {
  const exportedKey = await window.crypto.subtle.exportKey(
    "spki", // Use "spki" for public keys and "pkcs8" for private keys
    key
  );

  // Convert ArrayBuffer to Base64
  return arrayBufferToBase64(exportedKey);
};

export const decryptMessage = (
  privateKey: string,
  aesKey: string,
  text: string
) => {
  // Initialize JSEncrypt with the private RSA key
  const decryptor = new JSEncrypt();
  decryptor.setPrivateKey(privateKey);

  // Decrypt the AES key using the RSA private key
  const decryptedAESKeyHex = decryptor.decrypt(aesKey);
  if (!decryptedAESKeyHex) {
    throw new Error("Failed to decrypt AES key");
  }

  // Convert the AES key from Hex to a usable format for CryptoJS
  const parsedAesKey = CryptoJS.enc.Hex.parse(decryptedAESKeyHex);

  // Decrypt the actual message using the decrypted AES key
  const decryptedMessage = CryptoJS.AES.decrypt(text, parsedAesKey);
  const decryptedText = decryptedMessage.toString(CryptoJS.enc.Utf8);

  return decryptedText;
};

export const importPrivateKey = async (pem: string): Promise<CryptoKey> => {
  // Remove the PEM header and footer, and convert the base64 string to an ArrayBuffer
  if (!pem) {
    throw new Error("Invalid PEM string");
  }
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";

  if (pem.startsWith(pemHeader) && pem.endsWith(pemFooter)) {
    const pemContents = pem
      .replace(pemHeader, "") // Remove header
      .replace(pemFooter, "") // Remove footer
      .replace(/\s+/g, ""); // Remove newlines and spaces

    // Ensure the PEM contents is valid Base64
    try {
      const binaryDerString = window.atob(pemContents); // Decode the Base64 string
      const binaryDer = new Uint8Array(binaryDerString.length);

      for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
      }

      // Import the key into the Web Crypto API
      return window.crypto.subtle.importKey(
        "pkcs8", // Private key format
        binaryDer.buffer, // The ArrayBuffer of the key
        {
          name: "RSA-PSS", // Algorithm for signing
          hash: "SHA-256", // Hash algorithm
        },
        true, // Whether the key is extractable
        ["sign"] // Key usage
      );
    } catch (e) {
      throw new Error("Failed to decode Base64 PEM key content.");
    }
  } else {
    throw new Error("Invalid PEM format.");
  }
};
