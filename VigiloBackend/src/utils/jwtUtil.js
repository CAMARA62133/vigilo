import jwt from "jsonwebtoken";
import ms from "ms";

const createToken = (id) => {
  return jwt.sign(
    {
      id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.INACTIVITY_TIME },
  );
};

const getCookieOptions = () => ({
  httpOnly: true,
  maxAge: ms(process.env.MAX_AGE),
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});

export { createToken, getCookieOptions };
