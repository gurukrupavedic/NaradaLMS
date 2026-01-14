import Image from "next/image";
import { notFound } from "next/navigation";

import TiptapRenderer from "@/components/tiptap-renderer/server-renderer";
import postService from "@/services/post";

import PostContent from "../../components/shared/post-content";
import PostHeader from "../../components/shared/post-header";
import PostSharing from "../../components/shared/post-sharing";
import PostToc from "../../components/shared/post-toc";
import PostReadingProgress from "../../components/shared/reading-progress";

export default async function PostPage() {
  const post = await postService.get();

  if (!post) return notFound();

  return (
    <article className="py-10 px-6 flex flex-col items-center">
      <PostReadingProgress />
      <PostHeader
        title={post.title}
        author={post.author}
        createdAt={post.createdAt}
        readingTime={post.readingTime}
        cover={post.cover}
      />
      <div className="grid grid-cols-1 w-full lg:w-auto lg:grid-cols-[minmax(auto,256px)_minmax(720px,1fr)_minmax(auto,256px)] gap-6 lg:gap-12">
        <PostSharing />
        <PostContent>
          <TiptapRenderer>{post.html}</TiptapRenderer>
        </PostContent>
        <PostToc />
      </div>
      <Image
        src={"/doraemon.png"}
        width={350}
        height={350}
        alt=""
        className="mx-auto mt-20"
      />
    </article>
  );
}
