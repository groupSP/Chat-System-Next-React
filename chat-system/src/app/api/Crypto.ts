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
