const mongoose = require("mongoose");

const mountainSchema = new mongoose.Schema(
  {
    name: { type: String },
    location: { type: String },
    altitude: { type: Number },
    lat: { type: Number },
    lng: { type: Number },
    ascent_date: { type: String },
    img: { type: String },
    img_real: { type: String },
    img_route: { type: String },
    distance: { type: Number },
    ascent_elevation: { type: Number },
    ascent_time: { type: Number },
    descent_time: { type: Number },
    equipment: {
      first_layer_up: {
        type: {
          type: String,
          enum: ["Ligera", "Impermeable", "Rompevientos", "N/A"],
          default: "N/A",
        },
        img: { type: String },
      },
      second_layer_up: {
        type: {
          type: String,
          enum: ["Polar", "Pluma", "Softshell", "N/A"],
          default: "N/A",
        },
        img: { type: String },
      },
      third_layer_up: {
        type: {
          type: String,
          enum: ["HardShell", "Pluma Gorda", "Poncho", "N/A"],
          default: "N/A",
        },
        img: { type: String },
      },
      first_layer_down: {
        type: {
          type: String,
          enum: ["Licra", "Térmico", "Algodón", "N/A"],
          default: "N/A",
        },
        img: { type: String },
      },
      second_layer_down: {
        type: {
          type: String,
          enum: ["Polar", "Pantalón Montaña", "Softshell", "N/A"],
          default: "N/A",
        },
        img: { type: String },
      },
      third_layer_down: {
        type: {
          type: String,
          enum: ["HardShell", "Impermeable", "N/A"],
          default: "N/A",
        },
        img: { type: String },
      },
      weatherproof_jacket: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
      weatherproof_pants: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
      weatherproof_boots: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
      first_layer_gloves: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
      second_layer_gloves: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
      face_cover: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
      sun_glasses: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
      helmet: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
      crampons: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
      piolet: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
      poles: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
      backpack: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
      sleeping: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
      head_lamp: {
        use: { type: Boolean, default: false },
        img: { type: String },
      },
    },
    training: {
      upper: [
        {
          type: { type: String, required: true }, // nombre del ejercicio (referenciado desde el doc de training)
          video: { type: String, default: "" }, // puede ser una URL o ID de video en el futuro
        },
      ],
      lower: [
        {
          type: { type: String, required: true },
          video: { type: String, default: "" },
        },
      ],
      aerobics: [
        {
          type: { type: String, required: true },
          video: { type: String, default: "" },
        },
      ],
    },
    today_weather: {
      airTemperature: { type: Number },
      cloudCover: { type: Number },
      humidity: { type: Number },
      precipitation: { type: Number },
      snow: { type: Number },
      windDirection: { type: Number },
      windSpeed: { type: Number },
      time: { type: String },
    },
    ascent_weather: {
      airTemperature: { type: Number },
      cloudCover: { type: Number },
      humidity: { type: Number },
      precipitation: { type: Number },
      snow: { type: Number },
      windDirection: { type: Number },
      windSpeed: { type: Number },
      time: { type: String },
    },
  },
  { timestamps: true }
);

const Mountain = mongoose.model("Mountain", mountainSchema);

module.exports.Mountain = Mountain;
