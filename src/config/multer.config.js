import multer, { diskStorage } from "multer";

export const cloudUpload = (types = ["image/png", "image/jpeg" , "application/pdf" , "application/msword" ]) => {
  try {
    const storage = diskStorage({});

    const fileFilter = (req, file, cb) => {
      if (!types.includes(file.mimetype)) {
        return cb(new Error("invalid type format"), false);
      }
      cb(null, true);
    };
    return multer({ storage, fileFilter });
  } catch (error) {
    console.log(error.message);
  }
};