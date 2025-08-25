import mongoose from "mongoose";
import slugify from "slugify";

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
    description: {
      type: String,
    },
    slug: { type: String, unique: true }, // SEO-friendly URL
    releaseDate: { type: Date },
    tags: [{ type: String }], // 👈 Array of tags
  },
  {
    timestamps: true,
  }
);

movieSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const movie = mongoose.model("Movie", movieSchema);

export default movie;
