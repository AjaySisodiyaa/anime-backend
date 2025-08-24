import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
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
    movie: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const movie = mongoose.model("Movie", movieSchema);

export default movie;
