import mongoose from "mongoose";

const seriesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    imageId: {
      type: String,
    },
    episode: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const user = mongoose.model("Series", seriesSchema);

export default user;
