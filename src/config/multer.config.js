import fs from "fs";
import { diskStorage } from "multer";
import multer from "multer";
import { fileTypeFromFile } from "file-type";

export const cloudUpload = (types = ["image/png", "image/jpeg", "application/pdf"]) => {
  const storage = diskStorage({});

  // Step 1: Basic MIME check via client header (fast, not secure alone)
  const fileFilter = (req, file, cb) => {
    if (!types.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"), false);
    }
    cb(null, true);
  };

  const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

  // Step 2: Return a middleware wrapper that also does magic-byte validation after upload
  return {
    single: (fieldName) => async (req, res, next) => {
      upload.single(fieldName)(req, res, async (err) => {
        if (err) return next(err);
        if (req.file) {
          const detected = await fileTypeFromFile(req.file.path);
          if (!detected || !types.includes(detected.mime)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: "Invalid file content type" });
          }
        }
        next();
      });
    }
  };
};