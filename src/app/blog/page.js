import GhostAPI from '../api/ghost/ghost-api'

import Link from 'next/link';
import Image from 'next/image';

async function getPosts(){
    try {
      const postsData = await GhostAPI.posts.browse({include:'tags', filter: 'tag:theYouuProject'});
      return postsData;
    } catch (err) {
      console.error(err);
      throw err; // This will stop execution and show the error in Next.js
    }
  }

  const Blog = async () => {
    const postData = getPosts();
    const [posts] = await Promise.all([postData]);
    
    return (
        <div>
            <div className="relative flex flex-row font-bold py-2 px-4 sm:px-24 bg-youu-red">
                <div className='ml-2 sm:ml-0 flex justify-start items-center w-1/2 cursor-pointer text-white'>
                    <Link href='/'>TheYouuProject</Link>
                </div>             
                <div className='relative flex flex-wrap ml-auto sm:ml-auto text-white my-auto sm:w-auto place-items-center'>
                    <div className='text-xs text-center cursor-pointer px-6 p-1'> About </div>
                    <div className='flex gap-3'>
                        <div className='cursor-pointer text-black text-xs p-2 px-4 bg-white rounded-md hover:bg-black hover:text-white font-black'>
                        <Link href="/signup">Join</Link>
                        </div>
                        <div className='cursor-pointer text-xs p-2 hover:underline hover:text-black font-black'>
                        <Link href="/signup">Sign-In/Up</Link>
                        </div>
                    </div>
                </div>
            </div>
            <div className="">
                <div className='flex px-72 py-4 top-0 '>
                    <div className="">
                        {/*<Image src={'/mrPink.png'} width={75} height={75} alt='pinkLogo' className='rounded-full'/>*/}
                    </div>
                </div>
                <div className="flex flex-col place-content-center w-full h-64 sm:h-96  text-center font-extrabold">
                <div className="text-5xl sm:text-7xl">All Articles Protocols and Projects!</div>
                <div className="sm:text-2xl mx-10 sm:mx-40 pt-6 font-thin">Everything to make you better</div>
                <div>Coming Soon!</div>
                </div>        
            </div>
            <div>
                <div className="px-8 sm:px-14 py-10">
                    {posts.map((post) => (
                    <Link href={`/blog/${post.slug}/`}>
                        <div key={post.id} className="rounded-md shadow-xl shadow-bito-background-start hover:shadow-bito-background-end p-10 hover:bg-black hover:text-bito-background-end cursor-pointer">
                            <div className="font-black text-2xl py-2">{post.title}</div>
                            <p className="text-justify">{post.excerpt} ...</p>
                            <div className="flex text-slate-400 text-sm pt-4"><div>{new Date(post.published_at).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})}</div><div className="pl-2">{post.reading_time} min read</div></div>
                            </div>
                    </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Blog;