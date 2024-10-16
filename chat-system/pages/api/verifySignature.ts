import type { NextApiRequest, NextApiResponse } from "next";
import { createVerify, constants } from "crypto";

type Data = {
  message: string;
};

interface VerifyRequestBody {
  data: any;
  signature: string;
  publicKeyBase64: string;
}

// Convert Base64-encoded public key directly to a Buffer
function convertBase64ToBuffer(base64Key: string): Buffer {
  return Buffer.from(base64Key, "base64");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST requests are allowed" });
  }

  const { data, signature, publicKeyBase64 }: VerifyRequestBody = req.body;

  if (!data || !signature || !publicKeyBase64) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    // Directly convert the Base64 public key to a buffer
    const publicKeyBuffer = convertBase64ToBuffer(publicKeyBase64);

    // Convert signature from Base64 to Buffer
    const signatureBuffer = Buffer.from(signature, "base64");

    // Create a verifier for RSA-SHA256
    const verifier = createVerify("SHA256");
    verifier.update(JSON.stringify(data));
    verifier.end();

    // Use raw SPKI (or DER) format key without PEM headers
    const isValid = verifier.verify(
      {
        key: publicKeyBuffer, // Use the raw public key buffer
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32,
      },
      signatureBuffer
    );

    if (isValid) {
      return res.status(200).json({ message: "Signature is valid" });
    } else {
      return res.status(400).json({ message: "Invalid signature" });
    }
  } catch (error) {
    console.error("Error verifying signature:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
