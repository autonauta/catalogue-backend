const mongoose = require("mongoose");

const whitelistSchema = new mongoose.Schema({
  userList: [
    {
      userName: { type: String, default: "" },
      userLastName: { type: String, default: "" },
      userAddress: { type: Object, default: {} },
      userEmail: { type: String, default: "" },
    },
  ],
});

const WhiteList = mongoose.model("WhiteList", whitelistSchema);

module.exports.WhiteList = WhiteList;
