import { NextApiRequest, NextApiResponse } from "next";
import NodeRSA from "node-rsa";
import CryptoJS from "crypto-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("------------Request received------------");

  if (req.method === "POST") {
    const { action, message, encryptedAESKey, iv, publicKey, privateKey } =
      req.body;

    if (action === "generateKeyPair") {
      const key = new NodeRSA({ b: 2048 });

      // Export the public key in SPKI format and the private key in PKCS#8 format
      const publicKey = key.exportKey("pkcs8-public-pem");
      const privateKey = key.exportKey("pkcs8-private-pem");

      return res.status(200).json({ publicKey, privateKey });
    }

    // Encrypt a message using AES, and encrypt AES key using RSA public key
    if (action === "encryptMessage") {
      try {
        // Generate a random AES key for the session
        const aesKey = CryptoJS.lib.WordArray.random(16).toString(); // Generate a random AES key (in Hex format)
        console.log("Generated AES Key:", aesKey);

        // Encrypt the message with AES key
        const encryptedMessage = CryptoJS.AES.encrypt(
          message,
          aesKey
        ).toString();
        console.log("Encrypted Message:", encryptedMessage);

        // Encrypt the AES key using the recipient's RSA public key
        const rsa = new NodeRSA();
        rsa.importKey(publicKey, "pkcs8-public-pem"); // Use the provided public key
        const encryptedAESKey = rsa.encrypt(aesKey, "base64"); // Encrypt AES key
        console.log("Encrypted AES Key:", encryptedAESKey);

        return res.status(200).json({ encryptedMessage, encryptedAESKey });
      } catch (error) {
        // Type assertion for error
        if (error instanceof Error) {
          console.error("Error during encryption:", error.message);
          return res
            .status(500)
            .json({ message: "Encryption failed", error: error.message });
        } else {
          console.error("Unknown error during encryption:", error);
          return res.status(500).json({ message: "Unknown encryption error" });
        }
      }
    }

    // Decrypt a message using RSA private key to decrypt AES key first
    if (action === "decryptMessage") {
      try {
        // Decrypt the AES key using the recipient's RSA private key
        const rsa = new NodeRSA();
        rsa.importKey(privateKey, "pkcs8-private-pem"); // Import the provided private key
        const decryptedAESKey = rsa.decrypt(encryptedAESKey, "utf8"); // Decrypt AES key
        console.log("Decrypted AES Key:", decryptedAESKey);

        // Decrypt the message using the decrypted AES key
        const decryptedMessage = CryptoJS.AES.decrypt(
          message,
          decryptedAESKey
        ).toString(CryptoJS.enc.Utf8);
        console.log("Decrypted Message:", decryptedMessage);

        return res.status(200).json({ decryptedMessage });
      } catch (error) {
        // Type assertion for error
        if (error instanceof Error) {
          console.error("Error during decryption:", error.message);
          return res
            .status(500)
            .json({ message: "Decryption failed", error: error.message });
        } else {
          console.error("Unknown error during decryption:", error);
          return res.status(500).json({ message: "Unknown decryption error" });
        }
      }
    }
  }

  // If the method is not POST, return 405 Method Not Allowed
  return res.status(405).json({ message: "Method Not Allowed" });
}
