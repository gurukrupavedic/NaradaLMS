import { db } from "../../server/db";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  audioFiles,
  chapters,
  mediaSegments,
  organizations,
  segmentMappings,
  textSegments,
  tracks,
  users,
} from "../../packages/types/src/schema";
import { contentStorage } from "../../server/modules/content-publishing";
import { mediaStorage } from "../../server/modules/media-pipeline/storage";
import { mediaRouter } from "../../server/routes/media.routes";
import { eq } from "drizzle-orm";

type Layer = {
  name?: string;
};

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    passed.push(name);
  } else {
    failed.push({ name, error: message ?? "Assertion failed" });
  }
}

function routerHasMiddleware(router: { stack?: Layer[] }, middlewareName: string) {
  return Boolean(router.stack?.some((layer) => layer.name === middlewareName));
}

async function createFixture() {
  const [slmtsOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, "slmts"))
    .limit(1);
  const [rrOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, "rr"))
    .limit(1);
  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "admin@example.com"))
    .limit(1);

  if (!slmtsOrg || !rrOrg || !adminUser) {
    throw new Error("Expected seeded organizations and admin user");
  }

  const suffix = Date.now();

  const [rrTrack] = await db
    .insert(tracks)
    .values({
      orgId: rrOrg.id,
      title: `RR media isolation ${suffix}`,
      description: "RR media isolation fixture",
      createdBy: adminUser.id,
      sortOrder: 9999,
    })
    .returning({ id: tracks.id });

  const [rrChapter] = await db
    .insert(chapters)
    .values({
      orgId: rrOrg.id,
      trackId: rrTrack.id,
      title: `RR chapter ${suffix}`,
      sortOrder: 1,
      status: "draft",
      content: {},
      createdBy: adminUser.id,
      updatedAt: new Date(),
    })
    .returning({ id: chapters.id });

  const [rrAudio] = await db
    .insert(audioFiles)
    .values({
      orgId: rrOrg.id,
      chapterId: rrChapter.id,
      filename: `rr-${suffix}.mp3`,
      displayName: `rr-${suffix}.mp3`,
      uploadedBy: adminUser.id,
    })
    .returning({ id: audioFiles.id });

  const [rrTextSegment] = await db
    .insert(textSegments)
    .values({
      orgId: rrOrg.id,
      chapterId: rrChapter.id,
      script: "te",
      startPosition: 0,
      endPosition: 8,
      order: 0,
      createdBy: adminUser.id,
    })
    .returning({ id: textSegments.id });

  const [rrMediaSegment] = await db
    .insert(mediaSegments)
    .values({
      orgId: rrOrg.id,
      audioFileId: rrAudio.id,
      startMs: 0,
      endMs: 1000,
      createdBy: adminUser.id,
    })
    .returning({ id: mediaSegments.id });

  const [rrMapping] = await db
    .insert(segmentMappings)
    .values({
      orgId: rrOrg.id,
      mediaSegmentId: rrMediaSegment.id,
      textSegmentId: rrTextSegment.id,
      createdBy: adminUser.id,
    })
    .returning({ id: segmentMappings.id });

  return {
    adminUserId: adminUser.id,
    slmtsOrgId: slmtsOrg.id,
    rrTrackId: rrTrack.id,
    rrChapterId: rrChapter.id,
    rrAudioId: rrAudio.id,
    rrMappingId: rrMapping.id,
    rrMediaSegmentId: rrMediaSegment.id,
    rrTextSegmentId: rrTextSegment.id,
  };
}

async function cleanupFixture(fixture: Awaited<ReturnType<typeof createFixture>>) {
  await db.delete(segmentMappings).where(eq(segmentMappings.id, fixture.rrMappingId));
  await db.delete(mediaSegments).where(eq(mediaSegments.id, fixture.rrMediaSegmentId));
  await db.delete(textSegments).where(eq(textSegments.id, fixture.rrTextSegmentId));
  await db.delete(audioFiles).where(eq(audioFiles.id, fixture.rrAudioId));
  await db.delete(chapters).where(eq(chapters.id, fixture.rrChapterId));
  await db.delete(tracks).where(eq(tracks.id, fixture.rrTrackId));
}

async function testMediaIsolation() {
  assert(
    routerHasMiddleware(mediaRouter as unknown as { stack?: Layer[] }, "requireOrgContext"),
    "media router enforces requireOrgContext"
  );

  const fixture = await createFixture();

  try {
    const wrongOrgAudioFiles = await (mediaStorage as any).getAudioFilesByChapter(
      fixture.rrChapterId,
      fixture.slmtsOrgId
    );
    assert(
      wrongOrgAudioFiles.length === 0,
      "audio list hides foreign-org rows",
      `Expected no audio rows for foreign org, got ${wrongOrgAudioFiles.length}`
    );

    const wrongOrgSegments = await (contentStorage as any).getSegmentsByChapter(
      fixture.rrChapterId,
      undefined,
      fixture.slmtsOrgId
    );
    assert(
      wrongOrgSegments.length === 0,
      "text segment list hides foreign-org rows",
      `Expected no text segments for foreign org, got ${wrongOrgSegments.length}`
    );

    const wrongOrgMappings = await (mediaStorage as any).getSegmentMappingsByAudioFile(
      fixture.rrAudioId,
      fixture.slmtsOrgId
    );
    assert(
      wrongOrgMappings.length === 0,
      "mapping list hides foreign-org rows",
      `Expected no mappings for foreign org, got ${wrongOrgMappings.length}`
    );

    let createdForeignTextSegmentId: number | null = null;
    try {
      const createdSegment = await (contentStorage as any).createTextSegment(
        {
          chapterId: fixture.rrChapterId,
          script: "te",
          startPosition: 10,
          endPosition: 20,
          createdBy: fixture.adminUserId,
        },
        fixture.slmtsOrgId
      );
      createdForeignTextSegmentId = createdSegment.id;
      assert(false, "text segment create rejects foreign chapter id");
    } catch {
      assert(true, "text segment create rejects foreign chapter id");
    }

    let createdForeignAudioId: number | null = null;
    try {
      const createdAudio = await (mediaStorage as any).createAudioFile(
        {
          chapterId: fixture.rrChapterId,
          filename: `foreign-${Date.now()}.mp3`,
          displayName: "foreign audio",
          uploadedBy: fixture.adminUserId,
        },
        fixture.slmtsOrgId
      );
      createdForeignAudioId = createdAudio.id;
      assert(false, "audio create rejects foreign chapter id");
    } catch {
      assert(true, "audio create rejects foreign chapter id");
    }

    let createdForeignMediaSegmentId: number | null = null;
    try {
      const createdMediaSegment = await (mediaStorage as any).createMediaSegment(
        {
          audioFileId: fixture.rrAudioId,
          startMs: 1100,
          endMs: 2100,
          createdBy: fixture.adminUserId,
        },
        fixture.slmtsOrgId
      );
      createdForeignMediaSegmentId = createdMediaSegment.id;
      assert(false, "media segment create rejects foreign audio id");
    } catch {
      assert(true, "media segment create rejects foreign audio id");
    }

    if (createdForeignMediaSegmentId) {
      await db.delete(mediaSegments).where(eq(mediaSegments.id, createdForeignMediaSegmentId));
    }

    if (createdForeignAudioId) {
      await db.delete(audioFiles).where(eq(audioFiles.id, createdForeignAudioId));
    }

    if (createdForeignTextSegmentId) {
      await db.delete(textSegments).where(eq(textSegments.id, createdForeignTextSegmentId));
    }

    const contentRoutesSource = readFileSync(
      join(process.cwd(), "server/routes/content.routes.ts"),
      "utf8"
    );
    assert(
      contentRoutesSource.includes(
        "mapping.audioFileId === audioFileId && mapping.textSegmentId === segmentId"
      ),
      "natural-key mapping route matches both audio and segment ids",
      "PATCH chapter mapping route should use both audioFileId and textSegmentId when selecting the target"
    );
  } finally {
    await cleanupFixture(fixture);
  }
}

await testMediaIsolation();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`layer3-pass-b-media-isolation: ${passed.length} assertions passed.`);
