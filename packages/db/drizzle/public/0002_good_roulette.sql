DROP INDEX "member_organizationId_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "member_organizationId_userId_uidx" ON "member" USING btree ("organizationId","userId");