const jwt = require("jsonwebtoken");

const Auth = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"];
    const token = accessToken && accessToken.split(" ")[1];
    if (!token) {
      return res.status(401).send("There is no token");
    }
    const secret = req.originalUrl.includes("refresh")
      ? process.env.REFRESH_SECRET
      : process.env.ACCESS_SECRET;

    jwt.verify(token, secret, (err, user) => {
      if (err && err.name === "TokenExpiredError") {
        return res.status(403).send("Token expired");
      }
      if (err) {
        return res.status(401).send("Invalid token");
      }
      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(500).send("Unauthorized");
  }
};
module.exports = Auth;
