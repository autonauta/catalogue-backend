const jwt = require("jsonwebtoken");
const config = require("config");

function auth(req, res, next) {
  const token = req.header("xAuthToken");
  if (!token)
    return res
      .status(401)
      .send({ error: true, message: "Acces denied, no token provided." });
  console.log("From auth: ", token);
  try {
    const decoded = jwt.verify(token, config.get("jwtPrivateKey"));
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send({ error: true, message: ex });
  }
}

module.exports = auth;
