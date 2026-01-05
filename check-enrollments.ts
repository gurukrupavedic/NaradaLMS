import { db } from './server/db';
import { enrollments, batches, tracks } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkArjunEnrollments() {
  try {
    // Find Arjun
    const arjun = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.firstName, 'Arjun'),
    });

    if (!arjun) {
      console.log('Arjun not found');
      return;
    }

    console.log('\n=== Arjun Sharma ===');
    console.log('ID:', arjun.id);

    // Get enrollments
    const studentEnrollments = await db.query.enrollments.findMany({
      where: (e, { eq }) => eq(e.studentId, arjun.id),
      with: {
        batch: {
          with: {
            track: true,
          },
        },
      },
    });

    console.log('\n=== Enrollments (Count):', studentEnrollments.length, '===');
    
    for (const enrollment of studentEnrollments) {
      console.log('\nBatch:', enrollment.batch.code, '-', enrollment.batch.name);
      console.log('Track:', enrollment.batch.track?.title || 'NO TRACK');
      console.log('Track ID:', enrollment.batch.trackId);
      console.log('Status:', enrollment.status);
    }

    // Get all tracks
    const allTracks = await db.query.tracks.findMany({
      orderBy: (t) => t.order,
    });

    console.log('\n=== All Tracks in Database (Count):', allTracks.length, '===');
    for (const track of allTracks) {
      console.log(`Track ${track.order}: ${track.title}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkArjunEnrollments();
