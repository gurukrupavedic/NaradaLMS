import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../../server/db";
import { batchService } from "../../server/modules/batch-cohort";
import { contentService } from "../../server/modules/content-publishing";
import { CURRICULUM_IMPORT_ACTOR_PROFILE } from "../../server/shared/constants/system-actors";
import { organizations, users } from "@narada/types";

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    passed.push(name);
  } else {
    failed.push({ name, error: message ?? "Assertion failed" });
  }
}

async function ensureUser(input: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}) {
  await db
    .insert(users)
    .values({
      id: input.id,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      provider: "local",
      roles: input.roles,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
}

async function run() {
  const unique = Date.now();

  await ensureUser({
    id: CURRICULUM_IMPORT_ACTOR_PROFILE.id,
    email: CURRICULUM_IMPORT_ACTOR_PROFILE.email,
    firstName: CURRICULUM_IMPORT_ACTOR_PROFILE.firstName ?? "Curriculum",
    lastName: CURRICULUM_IMPORT_ACTOR_PROFILE.lastName ?? "Importer",
    roles: ["admin", "instructor"],
  });

  const rrStudentId = `rr-student-${unique}`;
  await ensureUser({
    id: rrStudentId,
    email: `rr-student+${unique}@test.local`,
    firstName: "RR",
    lastName: "Student",
    roles: ["student"],
  });

  const [slmtsOrg] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, "slmts"))
    .limit(1);
  const [rrOrg] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, "rr"))
    .limit(1);

  if (!slmtsOrg || !rrOrg) {
    throw new Error("Expected seeded slmts and rr organizations");
  }

  const slmtsTrack = await contentService.createTrack({
    orgId: slmtsOrg.id,
    title: `SLMTS Pass A Track ${unique}`,
    description: "Scoped to SLMTS",
    createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id,
  });
  const rrTrack = await contentService.createTrack({
    orgId: rrOrg.id,
    title: `RR Pass A Track ${unique}`,
    description: "Scoped to RR",
    createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id,
  });

  const slmtsChapter = await contentService.createChapter({
    orgId: slmtsOrg.id,
    trackId: slmtsTrack.id,
    title: `SLMTS Chapter ${unique}`,
    createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id,
    content: { en: "SLMTS chapter" },
  });
  const rrChapter = await contentService.createChapter({
    orgId: rrOrg.id,
    trackId: rrTrack.id,
    title: `RR Chapter ${unique}`,
    createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id,
    content: { en: "RR chapter" },
  });

  const slmtsTracks = await contentService.listTracks(slmtsOrg.id);
  const rrTracks = await contentService.listTracks(rrOrg.id);
  assert(
    slmtsTracks.some((track) => track.id === slmtsTrack.id),
    "SLMTS track list includes SLMTS track"
  );
  assert(
    !slmtsTracks.some((track) => track.id === rrTrack.id),
    "SLMTS track list excludes RR track"
  );
  assert(
    rrTracks.some((track) => track.id === rrTrack.id),
    "RR track list includes RR track"
  );
  assert(
    !rrTracks.some((track) => track.id === slmtsTrack.id),
    "RR track list excludes SLMTS track"
  );

  const rrTrackFromSlmts = await contentService.getTrack(rrTrack.id, slmtsOrg.id);
  const slmtsChapters = await contentService.getChaptersByTrack(slmtsTrack.id, slmtsOrg.id);
  const rrChaptersFromSlmts = await contentService.getChaptersByTrack(rrTrack.id, slmtsOrg.id);
  assert(rrTrackFromSlmts === null, "cross-org track lookup collapses to null");
  assert(
    slmtsChapters.some((chapter) => chapter.id === slmtsChapter.id),
    "SLMTS chapter list includes SLMTS chapter"
  );
  assert(
    rrChaptersFromSlmts.length === 0,
    "SLMTS chapter list excludes RR chapters"
  );

  const rrBatch = await batchService.createBatch({
    orgId: rrOrg.id,
    batchCode: `RR-${unique}`,
    batchName: `RR Batch ${unique}`,
    trackId: rrTrack.id,
    primaryInstructorId: CURRICULUM_IMPORT_ACTOR_PROFILE.id,
    createdBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id,
  });

  await batchService.addEnrollment({
    orgId: rrOrg.id,
    batchId: rrBatch.id,
    studentId: rrStudentId,
    enrolledBy: CURRICULUM_IMPORT_ACTOR_PROFILE.id,
  });

  const slmtsBatches = await batchService.listBatchesPaginated(100, 0, slmtsOrg.id);
  const rrBatches = await batchService.listBatchesPaginated(100, 0, rrOrg.id);
  assert(
    !slmtsBatches.items.some((batch) => batch.id === rrBatch.id),
    "SLMTS batch list excludes RR batch"
  );
  assert(
    rrBatches.items.some((batch) => batch.id === rrBatch.id),
    "RR batch list includes RR batch"
  );

  const rrBatchFromSlmts = await batchService.getBatch(rrBatch.id, slmtsOrg.id);
  const rrEnrollments = await batchService.listEnrollments(rrBatch.id, rrOrg.id);
  const slmtsEnrollments = await batchService.listEnrollments(rrBatch.id, slmtsOrg.id);
  assert(rrBatchFromSlmts === null, "cross-org batch lookup collapses to null");
  assert(
    rrEnrollments.some((enrollment) => enrollment.studentId === rrStudentId),
    "RR enrollment list includes RR student"
  );
  assert(
    slmtsEnrollments.length === 0,
    "SLMTS enrollment list excludes RR enrollment"
  );

  const rrLearningTracks = await contentService.listTracks(rrOrg.id);
  assert(
    rrLearningTracks.some((track) => track.id === rrTrack.id) &&
      !rrLearningTracks.some((track) => track.id === slmtsTrack.id),
    "learning-facing scoped track list stays org isolated"
  );

  if (failed.length > 0) {
    console.error("Failed:", failed);
    process.exit(1);
  }

  console.log(`layer3-pass-a-isolation: ${passed.length} assertions passed.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
