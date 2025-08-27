import mongoose from "mongoose";

const PopularMovieSchema = new mongoose.Schema(
  {
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie", // references your existing Movie collection
      required: true,
      unique: true,
    },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    rating: { type: Number, default: 0 }, // avg rating
  },
  { timestamps: true }
);

export default mongoose.model("PopularMovie", PopularMovieSchema);
