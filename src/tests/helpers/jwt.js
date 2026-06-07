import jwt from "jsonwebtoken";
import config from "../../config/index.js";

export const generateTestToken = (user) => {
  return jwt.sign(
    { userId: user._id.toString(), type: "access", role: user.role },
    config.jwt.secret,
    { expiresIn: "1h" }
  );
};
