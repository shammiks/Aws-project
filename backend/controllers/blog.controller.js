import { Blog } from "../models/blog.model.js";
import Comment from "../models/comment.model.js";
import { uploadFileToS3, deleteFileFromS3 } from "../utils/s3.js";

export const createBlog = async (req, res) => {
    try {
        const { title, category } = req.body;
        if (!title || !category) {
            return res.status(400).json({ message: "Blog title and category is required." });
        }

        const blog = await Blog.create({
            title,
            category,
            author: req.id
        });

        return res.status(201).json({
            success: true,
            blog,
            message: "Blog Created Successfully."
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to create blog" });
    }
};

export const updateBlog = async (req, res) => {
    try {
        const blogId = req.params.blogId;
        const { title, subtitle, description, category } = req.body;
        const file = req.file;

        let blog = await Blog.findById(blogId).populate("author");
        if (!blog) {
            return res.status(404).json({ message: "Blog not found!" });
        }

        let thumbnailUrl = blog.thumbnail; // retain old if not replaced

        if (file) {
            const newThumbnailUrl = await uploadFileToS3(file);
            thumbnailUrl = newThumbnailUrl;
        }

        const updateData = {
            title,
            subtitle,
            description,
            category,
            author: req.id,
            thumbnail: thumbnailUrl
        };

        blog = await Blog.findByIdAndUpdate(blogId, updateData, { new: true });

        res.status(200).json({ success: true, message: "Blog updated successfully", blog });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating blog", error: error.message });
    }
};

export const getAllBlogs = async (_, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'firstName lastName photoUrl' })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: { path: 'userId', select: 'firstName lastName photoUrl' }
            });
        res.status(200).json({ success: true, blogs });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching blogs", error: error.message });
    }
};

export const getPublishedBlog = async (_, res) => {
    try {
        const blogs = await Blog.find({ isPublished: true }).sort({ createdAt: -1 })
            .populate({ path: "author", select: "firstName lastName photoUrl" })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: { path: 'userId', select: 'firstName lastName photoUrl' }
            });
        if (!blogs) return res.status(404).json({ message: "Blog not found" });
        return res.status(200).json({ success: true, blogs });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to get published blogs" });
    }
};

export const togglePublishBlog = async (req, res) => {
    try {
        const { blogId } = req.params;
        const blog = await Blog.findById(blogId);
        if (!blog) return res.status(404).json({ message: "Blog not found!" });

        blog.isPublished = !blog.isPublished;
        await blog.save();

        const statusMessage = blog.isPublished ? "Published" : "Unpublished";
        return res.status(200).json({ success: true, message: `Blog is ${statusMessage}` });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to update status" });
    }
};

export const getOwnBlogs = async (req, res) => {
    try {
        const userId = req.id;
        if (!userId) return res.status(400).json({ message: "User ID is required." });

        const blogs = await Blog.find({ author: userId })
            .populate({ path: 'author', select: 'firstName lastName photoUrl' })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: { path: 'userId', select: 'firstName lastName photoUrl' }
            });

        if (!blogs) return res.status(404).json({ message: "No blogs found.", blogs: [], success: false });

        return res.status(200).json({ blogs, success: true });
    } catch (error) {
        res.status(500).json({ message: "Error fetching blogs", error: error.message });
    }
};

export const deleteBlog = async (req, res) => {
    try {
        const blogId = req.params.id;
        const authorId = req.id;
        const blog = await Blog.findById(blogId);
        if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

        if (blog.author.toString() !== authorId) {
            return res.status(403).json({ success: false, message: 'Unauthorized to delete this blog' });
        }

        await Blog.findByIdAndDelete(blogId);
        await Comment.deleteMany({ postId: blogId });

        res.status(200).json({ success: true, message: "Blog deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting blog", error: error.message });
    }
};

export const likeBlog = async (req, res) => {
    try {
        const blogId = req.params.id;
        const likeUserId = req.id;
        const blog = await Blog.findById(blogId).populate({ path: 'likes' });
        if (!blog) return res.status(404).json({ message: 'Blog not found', success: false });

        await blog.updateOne({ $addToSet: { likes: likeUserId } });
        await blog.save();

        return res.status(200).json({ message: 'Blog liked', blog, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to like blog' });
    }
};

export const dislikeBlog = async (req, res) => {
    try {
        const blogId = req.params.id;
        const userId = req.id;
        const blog = await Blog.findById(blogId);
        if (!blog) return res.status(404).json({ message: 'Post not found', success: false });

        await blog.updateOne({ $pull: { likes: userId } });
        await blog.save();

        return res.status(200).json({ message: 'Blog disliked', blog, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to dislike blog' });
    }
};

export const getMyTotalBlogLikes = async (req, res) => {
    try {
        const userId = req.id;
        const myBlogs = await Blog.find({ author: userId }).select("likes");
        const totalLikes = myBlogs.reduce((acc, blog) => acc + (blog.likes?.length || 0), 0);

        res.status(200).json({
            success: true,
            totalBlogs: myBlogs.length,
            totalLikes,
        });
    } catch (error) {
        console.error("Error getting total blog likes:", error);
        res.status(500).json({ success: false, message: "Failed to fetch total blog likes" });
    }
};
