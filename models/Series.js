import mongoose from "mongoose";
import slugify from "slugify";

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
    description: { type: String },
    slug: { type: String, unique: true },
    tags: [{ type: String }], // 👈 Array of tags
    releaseDate: { type: Date }, // 👈 added like movieSchema
  },
  {
    timestamps: true,
  }
);

seriesSchema.index({ title: "text", description: "text", tags: "text" });

seriesSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const series = mongoose.model("Series", seriesSchema);

export default series;
