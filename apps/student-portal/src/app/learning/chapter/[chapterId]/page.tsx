import LearnChapter from '@/components/learning/LearnChapter';

export default async function ChapterPage({ params }: { params: Promise<{ chapterId: string }> }) {
    const { chapterId } = await params;
    return <LearnChapter chapterId={Number(chapterId)} />;
}
