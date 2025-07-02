const mongoose = require("mongoose");

const trainingSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["upper", "lower", "aerobics"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    video: {
      type: String,
      default: "", // En un futuro aquí se puede guardar la URL del video
    },
  },
  { timestamps: true }
);

const Training = mongoose.model("Training", trainingSchema);

module.exports.Training = Training;
