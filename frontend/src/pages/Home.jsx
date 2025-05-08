import Hero from '@/components/Hero'
import React from 'react'
import { blogJson } from './Blog'
import BlogCard from '@/components/blogCard'
import Newsletter from '@/components/Newsletter'
import RecentBlog from '@/components/RecentBlog'
import PopularAuthors from '@/components/PopularAuthors'

const Home = () => {
  return (
    <div className='pt-20'>
      <Hero/>
      <RecentBlog/>
      <PopularAuthors/>
    </div>
  )
}

export default Home
