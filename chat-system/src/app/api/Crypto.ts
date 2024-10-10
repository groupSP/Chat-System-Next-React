const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const binary = String.fromCharCode(...Array.from(new Uint8Array(buffer)));
  return btoa(binary);
};

const privateKeyToPEM = async (privateKey: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);

  const exportedAsBase64 = arrayBufferToBase64(exported);

  const pem = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64
    .match(/.{1,64}/g)
    ?.join("\n")}\n-----END PRIVATE KEY-----`;

  return pem;
};

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

function decryptAESKey(encryptedAESKey: string) {
  return crypto.privateDecrypt(
    {
      key: privateKey.current!, // Your private key
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encryptedAESKey, "base64")
  );
}

// Helper function to decrypt the message with AES
function decryptWithAES(encryptedMessage: string, aesKey: Buffer, iv: Buffer) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
  let decrypted = decipher.update(encryptedMessage, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// export const GenerateKeyPair = async (): CryptoKeyPair => {
//   return await window.crypto.subtle.generateKey(
//     {
//       name: "RSA-PSS", // Use RSA-PSS for signing
//       modulusLength: 2048,
//       publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
//       hash: { name: "SHA-256" }, // Use SHA-256 for hashing
//     },
//     true, // Keys should be extractable for exporting
//     ["sign", "verify"] // Use sign and verify instead of encrypt/decrypt
//   );
// };
