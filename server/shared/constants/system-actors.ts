export const CURRICULUM_IMPORT_ACTOR_ID = "00000000-0000-0000-0000-000000000001";
export const CURRICULUM_IMPORT_ACTOR_EMAIL = "curriculum-seed@internal";

export const CURRICULUM_IMPORT_ACTOR_PROFILE = {
  id: CURRICULUM_IMPORT_ACTOR_ID,
  email: CURRICULUM_IMPORT_ACTOR_EMAIL,
  firstName: "Curriculum",
  lastName: "Import",
  roles: ["admin"] as string[],
  status: "active" as const,
};
