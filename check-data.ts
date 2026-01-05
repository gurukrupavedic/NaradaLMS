import { db } from './server/db';
import { users, studentProgress, chapters } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkArjunProgress() {
  try {
    // Find Arjun Sharma
    const arjun = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.firstName, 'Arjun'),
    });

    if (!arjun) {
      console.log('Arjun not found');
      return;
    }

    console.log('\n=== Arjun Sharma ===');
    console.log('ID:', arjun.id);
    console.log('Name:', arjun.firstName, arjun.lastName);

    // Get student progress for this student
    const progress = await db.query.studentProgress.findMany({
      where: (sp, { eq }) => eq(sp.studentId, arjun.id),
    });

    console.log('\n=== Student Progress Records (Count):', progress.length, '===');
    
    // Get chapters and show with progress
    const allChapters = await db.query.chapters.findMany({
      orderBy: (c) => c.order,
    });
    
    console.log('\n=== Chapters with Progress ===');
    for (const chapter of allChapters.slice(0, 15)) {
      const prog = progress.find(p => p.chapterId === chapter.id);
      console.log(`CH${chapter.order}: ${chapter.title} - Proficiency: ${prog?.proficiencyLevel ?? 'NULL'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkArjunProgress();
