// routes/blogRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const multerS3 = require("multer-s3");
const aws = require("aws-sdk");
const Blog = require("../models/post");
const { default: mongoose } = require("mongoose");

const router = express.Router();

// Set up multer for image uploads
// const storage = multer.diskStorage({
//   destination: "./public/uploads/",
//   filename: (req, file, cb) => {
//     cb(
//       null,
//       file.fieldname + "-" + Date.now() + path.extname(file.originalname)
//     );
//   },
// });

// const upload = multer({ storage }).single("file");

router.use(express.json());
router.use(express.static("public"));

aws.config.update({
  accessKeyId: process.env.ID,
  secretAccessKey: process.env.key,
});

const s3 = new aws.S3();

const storage = multerS3({
  s3: s3,
  bucket: "dhaamkanews",
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

const upload = multer({ storage: storage }).single("file");

// Create a new blog post
router.post("/add-post", (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const { title, subtitle, description, tags } = req.body;
      const imageUrl = req.file.location;

      // Create a new Blog instance
      const newBlog = new Blog({
        title,
        subtitle,
        description,
        imageUrl,
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
      if (req.file) {
        post.imageUrl = req.file.location;
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
