// routes/blogRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const Blog = require("../models/post");
const { default: mongoose } = require("mongoose");

const router = express.Router();

router.use(express.json());
router.use(express.static("public"));

// Cloudflare R2 Configuration
const CLOUDFLARE_ACCOUNT_ID = "3d4fbc0a711746976d879d5d0b4a76af";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "dhaamkanews";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// R2 Public URL (set this after enabling public access on your bucket)
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const storage = multerS3({
  s3: s3Client,
  bucket: R2_BUCKET_NAME,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    cb(
      null,
      "uploads/" +
        file.fieldname +
        "-" +
        Date.now() +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage }).fields([
  { name: "image", maxCount: 1 },
  { name: "Video", maxCount: 1 },
]);

// Create a new blog post
router.post("/add-post", (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const { title, subtitle, description, tags } = req.body;

      // Construct public URLs for R2
      const getPublicUrl = (file) => {
        if (!file) return null;
        // R2 doesn't return location like S3, so we construct the URL
        return R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${file.key}` : file.location || `${R2_BUCKET_NAME}/${file.key}`;
      };

      const imageUrl =
        req.files && req.files["image"] ? getPublicUrl(req.files["image"][0]) : null;
      const videoUrl =
        req.files && req.files["Video"] ? getPublicUrl(req.files["Video"][0]) : null;

      // Create a new Blog instance
      const newBlog = new Blog({
        title,
        subtitle,
        description,
        imageUrl,
        videoUrl,
        tags,
      });

      // Save the blog post to the database
      const savedBlog = await newBlog.save();

      res.json(savedBlog);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

router.put("/update-post", (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const { title, subtitle, description, tags, id } = req.body;

      // Construct public URLs for R2
      const getPublicUrl = (file) => {
        if (!file) return null;
        return R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${file.key}` : file.location || `${R2_BUCKET_NAME}/${file.key}`;
      };

      // Find the post by ID
      const post = await Blog.findById(id);

      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Update post details
      post.title = title || post.title;
      post.subtitle = subtitle || post.subtitle;
      post.description = description || post.description;
      post.tags = tags || post.tags;

      // Update image if a new file is provided
      if (req.files && req.files["image"]) {
        post.imageUrl = getPublicUrl(req.files["image"][0]);
      }

      // Update video if a new file is provided
      if (req.files && req.files["Video"]) {
        post.videoUrl = getPublicUrl(req.files["Video"][0]);
      }

      // Save the updated post
      const updatedPost = await post.save();

      res.json(updatedPost);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// Retrieve all blog posts in descending order of creation date
router.get("/all-post", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/all-postss", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 }).limit(5);
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/all-postsss", async (req, res) => {
  try {
    const blogs = await Blog.find({}).sort({ createdAt: -1 }).limit(6).lean();

    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/all-postse", async (req, res) => {
  try {
    const { lastPostId, limit = 6 } = req.query;

    let query = {};
    if (lastPostId) {
      query = { _id: { $lt: lastPostId } };
    }
    const blogs = await Blog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/all-postsese", async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    const limit = 6;

    const blogs = await Blog.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/post/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(
      new mongoose.Types.ObjectId(req.params.id)
    );
    if (!blog) {
      return res.status(404).json({ error: "Blog post not found" });
    }
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/post/add-comment/:id", async (req, res) => {
  const postId = req.params.id;
  const { name, email, comment } = req.body;

  try {
    // Find the post by ID
    const post = await Blog.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Add a new comment to the post
    post.comments.push({ name, email, comment });

    // Save the updated post
    const updatedPost = await post.save();

    res.json(updatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/post/:id", async (req, res) => {
  try {
    const blog = await Blog.findOneAndDelete({ _id: req.params.id });
    console.log(blog);
    if (!blog) {
      return res.status(404).json({ error: "Blog post not found" });
    }
    return res.json({
      message: "Post is successfully deleted",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
