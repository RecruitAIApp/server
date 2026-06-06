import fs from "fs";
import multer, { diskStorage } from "multer";
import { fileTypeFromFile } from "file-type";

const PDF_MIME = "application/pdf";
const MAX_CV_BYTES = 5 * 1024 * 1024;
const AVATAR_MIMES = ["image/jpeg", "image/png", "image/webp"];

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!AVATAR_MIMES.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, or WEBP images are allowed."), false);
    }
    cb(null, true);
  },
});


export const cvPdfUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_CV_BYTES,
  },

  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== PDF_MIME) {
      return cb(new Error("Only PDF files are allowed."), false);
    }

    cb(null, true);
  },
});

// Generic Cloud Upload
export const cloudUpload = (
  types = [
    "image/png",
    "image/jpeg",
    "application/pdf",
    "application/msword",
  ]
) => {
  const storage = diskStorage({});

  /**
   * Step 1:
   * Fast MIME validation from client headers
   */
  const fileFilter = (_req, file, cb) => {
    if (!types.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"), false);
    }

    cb(null, true);
  };

  const upload = multer({
    storage,
    fileFilter,

    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  /**
   * Step 2:
   * Secure magic-byte validation
   */
  return {
    single: (fieldName) => async (req, res, next) => {
      upload.single(fieldName)(req, res, async (err) => {
        if (err) return next(err);

        try {
          if (req.file) {
            const detected = await fileTypeFromFile(req.file.path);

            if (!detected || !types.includes(detected.mime)) {
              fs.unlinkSync(req.file.path);

              return res.status(400).json({
                success: false,
                message: "Invalid file content type",
              });
            }
          }

          next();
        } catch (error) {
          next(error);
        }
      });
    },
  };
};