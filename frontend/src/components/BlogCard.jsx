import React from 'react'
import { Button } from './ui/button'
import { useNavigate } from 'react-router-dom'

const BlogCard = ({ blog }) => {
    const navigate = useNavigate()

    // Safely handle missing dates
    const date = blog.createdAt ? new Date(blog.createdAt) : new Date()
    const formattedDate = date.toLocaleDateString("en-GB")

    // Safely get author name
    const authorName = blog.author?.firstName
        ? `${blog.author.firstName} ${blog.author.lastName || ''}`
        : "Unknown Author"

    return (
        <div className="bg-white dark:bg-gray-800 dark:border-gray-600 p-5 rounded-2xl shadow-lg border hover:scale-105 transition-all">
            {blog.thumbnail && (
                <img src={blog.thumbnail} alt={blog.title || 'Blog Image'} className='rounded-lg' />
            )}
            <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
                By {authorName} | {blog.category || "Uncategorized"} | {formattedDate}
            </p>
            <h2 className="text-xl font-semibold mt-1">{blog.title}</h2>
            {blog.subtitle && <h3 className='text-gray-500 mt-1'>{blog.subtitle}</h3>}
            <Button onClick={() => navigate(`/blogs/${blog._id}`)} className="mt-4 px-4 py-2 rounded-lg text-sm">
                Read More
            </Button>
        </div>
    )
}

export default BlogCard
