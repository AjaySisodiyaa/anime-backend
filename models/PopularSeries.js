import mongoose from "mongoose";

const PopularSeriesSchema = new mongoose.Schema(
  {
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series", // references your existing Series collection
      required: true,
      unique: true,
    },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("PopularSeries", PopularSeriesSchema);
