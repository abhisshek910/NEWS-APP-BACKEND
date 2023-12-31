const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  description: String,
  imageUrl: String,
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  comments: [
    {
      name: String,
      email: String,
      comment: String,
    },
  ],
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
