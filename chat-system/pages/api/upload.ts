import { NextApiRequest, NextApiResponse } from "next";
import multer from "multer";
import path from "path";

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "public/uploads")); // Absolute path to the uploads folder
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Save the file with its original name
  },
});

const upload = multer({ storage });

// Disable body parsing by Next.js (required for `multer` to work)
export const config = {
  api: {
    bodyParser: false,
  },
};

// Multer middleware wrapper
const uploadMiddleware = upload.single("file"); // 'file' is the form field name

// Utility to run Multer as middleware
async function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method === "POST") {
      // Run the Multer middleware to handle file upload
      await runMiddleware(req, res, uploadMiddleware);

      // Access the uploaded file from `req.file`
      const uploadedFile = (req as any).file;

      if (!uploadedFile) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("Uploaded file:", uploadedFile);

      // Construct the download URL based on the file path
      const filePath = `/uploads/${uploadedFile.originalname}`;
      const downloadUrl = `${req.headers.origin}${filePath}`;

      // Respond with success and the download link
      return res.status(200).json({
        message: "File uploaded successfully",
        // file: uploadedFile,
        fileLink: downloadUrl, // Include download URL
      });
    } else {
      return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({ message: "Failed to upload file", error });
  }
};
