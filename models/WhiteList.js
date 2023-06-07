const mongoose = require("mongoose");

const whitelistSchema = new mongoose.Schema({
  userList: [
    {
      userName: { type: String, default: "" },
      userLastName: { type: String, default: "" },
      userAddress: { type: String, default: "" },
      userEmail: { type: String, default: "" },
    },
  ],
});

const Product = mongoose.model("WhiteList", whitelistSchema);

module.exports.WhiteList = WhiteList;
