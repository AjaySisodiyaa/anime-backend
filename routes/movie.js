import dotenv from "dotenv";
dotenv.config();
import express from "express";
const Router = express.Router();
import Movie from "../models/Movie.js";
import { v2 as cloudinary } from "cloudinary";
import { searchMovieByTitle, normalizeMovie } from "../services/tmdb.js";
import slugify from "slugify";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

cloudinary.api
  .ping()
  .then((res) => console.log("Cloudinary OK:", res))
  .catch((err) => console.error("Cloudinary FAIL:", err));

Router.get("/tag/:tag", async (req, res) => {
  try {
    const movies = await Movie.find({ tags: req.params.tag });
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get movie by slug
Router.get("/:slug", async (req, res) => {
  try {
    const movie = await Movie.findOne({ slug: req.params.slug });
    if (!movie) return res.status(404).json({ message: "Movie not found" });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// create a new movie
Router.post("/", async (req, res) => {
  try {
    if (!req.body.title || !req.files?.image || !req.body.movie) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // upload image to Cloudinary
    const image = await cloudinary.uploader.upload(
      req.files.image.tempFilePath,
      { resource_type: "image" }
    );

    const movie = new Movie({
      title: req.body.title,
      image: image.secure_url,
      imageId: image.public_id,
      movie: req.body.movie,
      description: req.body.description || "",
      tags: req.body.tags ? req.body.tags.split(",").map((t) => t.trim()) : [],
      releaseDate: req.body.releaseDate || null,
    });
    await movie.save();
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Auto-create from TMDB by title (no manual typing) */
Router.post("/auto", async (req, res) => {
  try {
    const { title, language = "en-IN", region = "IN" } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const tm = await searchMovieByTitle(title, { language, region });
    if (!tm) return res.status(404).json({ error: "No movie found on TMDB" });

    const norm = await normalizeMovie(tm, language);

    // Prevent duplicates by slug (your model will set the slug from title)
    const willSlug = slugify(norm.title, { lower: true, strict: true });
    const existing = await Movie.findOne({ slug: willSlug });
    if (existing)
      return res
        .status(409)
        .json({ error: "Movie already exists", movie: existing });

    const movie = new Movie({
      title: norm.title,
      description: norm.description,
      image: norm.image,
      movie: req.body.movie || "", // your stream URL if you have one
      tags: norm.tags,
      releaseDate: norm.releaseDate || new Date(),
    });

    await movie.save();
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get all movie
Router.get("/", async (req, res) => {
  try {
    const movie = await Movie.find({}).sort({ updatedAt: -1 });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get a single movie
Router.get("/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// add episode
Router.patch("/movie/:id", async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: "Movie ID is required" });
    }
    const movie = await Movie.findById(req.params.id);

    if (!req.body.movie) {
      return res.status(400).json({ error: "Episode is required" });
    }
    movie.movie = req.body.movie;

    await movie.save();
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// edit image
Router.patch("/image/:id", async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: "Movie ID is required" });
    }
    const movie = await Movie.findById(req.params.id);
    if (!req.files.image) {
      return res.status(400).json({ error: "Image is required" });
    }
    await cloudinary.uploader.destroy(movie.imageId);
    const image = await cloudinary.uploader.upload(
      req.files.image.tempFilePath,
      { resource_type: "image" }
    );
    movie.image = image.secure_url;
    movie.imageId = image.public_id;

    await movie.save();
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// edit title
Router.patch("/title/:id", async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: "Movie ID is required" });
    }
    const movie = await Movie.findById(req.params.id);

    if (!req.body.title) {
      return res.status(400).json({ error: "Title is required" });
    }
    movie.title = req.body.title;
    await movie.save();
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// delete movie
Router.delete("/:movieId", async (req, res) => {
  try {
    if (!req.params.movieId) {
      return res.status(400).json({ error: "Movie ID is required" });
    }
    const movie = await Movie.findById(req.params.movieId);
    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }
    await cloudinary.uploader.destroy(movie.imageId);
    await Movie.findByIdAndDelete(req.params.movieId);
    await movie.save();
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default Router;
