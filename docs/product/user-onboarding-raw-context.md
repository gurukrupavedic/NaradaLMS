# User Onboarding — Raw Context & Narrative Notes

**Purpose:** Personal reference preserving the original explanations, evolving ideas, and clarifications shared during product discovery. This is **not** the formal specification — see [user-onboarding-feature-memo.md](./user-onboarding-feature-memo.md) for the structured future-state spec.

**Status:** Reference archive (conversation-derived)

---

## Why this document exists

The formal feature memo distills decisions into sections stakeholders can review. This document keeps the **story, nuance, and reasoning** in freer prose — how things work today off-system, what hurt about the current LMS slice, how thinking shifted (for example from parent–child accounts to generic **manages / managed-by**), and the product intent as it was explained conversationally before implementation planning.

**Terminology (aligned with the feature memo):** The system entity is **enrollment-period** (many per org over time; one active at a time). Avoid calling it “the period” in new writing. Status values on that entity include **Draft**, **batch-enrollment**, **review-period**, and **Completed**. The student **Enrollment** page and batch **enrollment** records are separate ideas.

---

## What we have in the LMS today (starting point)

So far we built **user registration only**, and it is quite simple: user registers with email and password, gets approved, logs in successfully. To ease things we also added provisioning for Google sign-in. That is a thin slice of a much larger operational reality.

The **complete user onboarding journey** we care about is really three processes together: **Student Registration**, **Enrollment**, and **Batch assignment**. The memo and future build target that whole arc; the app today only covers “account exists and membership approved.”

---

## How onboarding works today (without the LMS)

Pathasalas allow new student registrations **three times a year**. During each **registration window** (about three weeks), a WhatsApp post is broadcast on the pathasala announcements channel. Existing students help spread the message. The post links to a **Google Form** people fill out.

When the registration window closes, the admin team reviews registrations. For **SLMTS**, each student is vetted to satisfy needed criteria. That vetting process will **stay manual forever** in spirit — phone calls, judgment, references — even when intake moves into NaradaLMS.

Final candidates are added to each org’s WhatsApp communication group. Further information about batches is posted there.

The admin team also identifies who can instruct at each pathasala — existing members plus newly interested instructors. Instructors (new or existing) provide **time slot availability**. From that list we pick a **primary instructor** and one or two **secondary instructors** and create a batch. Each batch runs **two classes per week**. Class timing follows the **primary instructor’s slot**. Batch times are **fixed** and do not change once set.

After batches and slots are finalized, another **Google Form** goes out for newly registered candidates to opt into their choice. That link is posted on the announcements WhatsApp group again. We keep about **12–15 members per batch**. When a batch hits 15, admins talk to candidates personally to work out other batches until everyone new is placed. That assignment phase takes about **one to two weeks**.

Separate WhatsApp groups are created per batch. Students assigned to a batch and that batch’s instructors are added. An **orientation** date is decided — mostly on a weekend — and classes start the following week on a **dedicated Zoom link** at the batch’s time slot.

Both pathasalas are open to students **age six and up**. When creating batches we try to separate **kids vs adult** batches based on who registered — not a very hard rule. When a batch starts we try to have kid batches and adult batches and assign accordingly. For kids we usually invite **parents** into the batch WhatsApp group. A parent and child can be in **different batches** and even **different pathasalas**.

WhatsApp community traffic (for example SLMTS Vedam announcements) reinforces the rhythm: registration links (SLMTS and RR forms), “new batches update” posts explaining that teacher slots finalize first, then a student time-slot selection form, orientation within about two weeks, and classes starting once a batch has at least **12** students with a **cap around 15**. People ask in the group for registration links; invite links add members — it is informal but structured by habit.

---

## Organizations, windows, and who can register where

For now there are only **two pathasalas** (SLMTS and RR in NaradaLMS), but we may add more. Another org is in talks but nothing is finalized.

Registration windows are **synchronized today**, but the product should eventually allow each pathasala to run on **its own cadence**.

All **three annual windows** follow the **same overall playbook** for every pathasala: announce → form → review → vetting → comms → batches → preference form → assignment. Form fields and vetting details may differ per org, but we do not want to reinvent the flow for each new pathasala.

**Both SLMTS and RR** use manual vetting. We do not need the system to implement vetting logic — vetting means admins verify submitted information and decide whether to admit someone, often including phone calls to the student and **reference contacts** listed on the form.

We **do not stop anyone** from registering at both pathasalas. Same cycle or different cycles is fine if they pass each org’s vetting.

Each Google Form submission is **one student only** — not multiple children in one submission.

---

## The registration forms (what we collect today)

We attached the real **SLMTS** and **RR** registration PDFs as baselines for future in-app forms.

**SLMTS (Veda / foundational)** emphasizes Brahmin gruhastas and brahmacharis who completed Upanayanam, guru–shishya parampara, quarterly or batch-of-12 starts, semester structure, Telugu medium, and detailed eligibility questions. Fields include student name, birth year, WhatsApp country code and phone, residence timezone (India IST, US zones, other), city, **mandatory pathasala reference** (name and phone), adult vs child under 16, gotram rules for married vs brahmachari students, upanayanam year, veda shaka, languages spoken and read, job, parent names if under 18, father’s role helping homework for kids under 13, proficiency, motivations, and lifestyle commitment questions (priority of vedic learning, traditional dress, no meat/alcohol/smoking, etc.). Email is on the Google Form today even though operationally we leaned on phone/WhatsApp.

**RR (Stotra Paatham)** has its own framing: tracks about 10–12 weeks, English/Telugu/Sanskrit, batches every 3–4 months, gotram, languages, adult over 14 vs child under 14, parent help categories for young children, proficiency tiers based on stotra length, weekly commitment (attendance + optional practice/exams vs attendance only), and reference person details.

These differences matter: the LMS registration questionnaire should be **common core + org-specific**, not one identical form.

---

## People on the form — who matters

We honestly do not police who types the form. We care about **whose name is the student** on the submission, and we vet **that student**.

For kids, **parents usually** fill the form. If the kid is old enough to fill it themselves we do not stop them. For all communication (including when a batch is full and admins negotiate), the team uses the **phone number on the form**.

Historically we were **not** using email operationally for WhatsApp-era workflows, though the Google Forms collect it. The future LMS registration will require **both phone and email**, with **verification** (at least one verified before submit), and login should accept **email or phone** in the username field.

---

## Vetting outcomes and returning students

Today vetting is informal on rejection — we either invite someone into the WhatsApp world or we do not, without a formal “you were rejected” message. NaradaLMS already has **approve / reject** on membership; that should become the formal outcome, with **email notification on reject**. No waitlist for v1 — just pending, approved, rejected.

**Vetting is super-admin only.** Anyone can create an account; we want a single gate before someone is eligible to participate in enrollment at an org. **Org-admins** own the **enrollment-period** machinery.

The **full journey** (registration form + enrollment-period batch choices) applies to **brand-new** students only. **Returning students** contact an admin; based on progress they are placed into an appropriate batch without repeating the whole public intake dance. The portal gate (see below) still works: if they have an active enrollment in an active batch, they see the full student experience.

Someone can be a **student in one batch** and an **instructor in another** at the same time — already supported; for example student in track 1 while instructing track 1 batches.

---

## Batches, time, and assignment (operational + product intent)

How many batches per cycle is **hard to say** — it depends on how many new people register and differs by pathasala.

Weekly schedule is **usually** anchored to the primary instructor’s pattern but **not a hard rule** — it depends on the instructor.

Students and instructors mostly join from **India and the USA** (on the order of four timezone flavors). We do not block other zones if they can make published slots. A single batch can hold students from **multiple timezones**; the enrollment UI should show batch times in **multiple timezones**.

During the **batch-enrollment** phase of an active enrollment-period, students see **all new enrollment batches** — **no hard system filter** for kid vs adult, because we sometimes place older kids in adult batches.

Students **choose** batches (1st and 2nd priority). Placement must **never** be fully automatic. **Admins assign** final membership; they may override preferences and talk to people offline when batches are awkwardly full.

Ideal batch size is about **12–15** for teaching quality — not because of WhatsApp or Zoom limits. We have seen **2–3 students drop** after start, so stabilized batches often land around **ten**. Batches are often created based on how many people actually enroll; minimum size is not rigidly automated.

We usually do not build WhatsApp/ZOOM orchestration into v1. Orientation is a **manual** process about pathasala rules and expectations, not something the LMS must schedule in v1.

---

## Evolution of the “family account” idea

Early thinking was explicitly **parent / child**: parent creates account, **register my kid**, kid cannot log in until admin allows, parent uses **login as** with up to four kids per pathasala, admin can allow kid login later or “graduate” kid to independent adult.

That evolved into something more flexible: **manages / managed-by**, a **many-to-many directional** graph with **no cap** on how many accounts someone can manage. It is **not symmetric** — if A manages B, B does not manage A unless an admin adds that separately. Chains like C manages A manages B are possible by explicit admin edits.

Use cases beyond parent/child:

- Registering **self, father, and child** after your own approval, then **login as** each to complete enrollment.
- A **secondary instructor** doing portal work for an elderly primary instructor.
- **Super-admin** impersonation to debug user issues.

**Register another user** is available to any **approved** user, even if they are still stuck on the enrollment-only student view. Super-admin sees proxy registrations with context, vets them like any registration, and can edit **manages** and **managed-by** lists on the user profile in admin portal. **Login as** uses a searchable list of managed users; super-admin can impersonate anyone.

We intentionally moved **away** from kid-specific limits, allow-login flags, and graduate-to-adult flows in favor of this generic relationship model unless we add them back later.

---

## New User Onboarding Feature — author's original write-up (verbatim)

The following is preserved **as written** when the enrollment-process feature was first articulated. Later conversation refined naming and mechanics (see **Addendum** below); this section is the source text. Where the original text says “period” or “review period,” read **enrollment-period** (entity) and **review-period** (status) per the terminology note above and the feature memo.

### User registration

When user is registering for an account, we should display a form in addition to the email and password. This form will have the questions that we want to ask the user to fill out for the vetting process. Some questions in the form maybe common, while some questions will be org specific. The new user registration request is only submitted after all the required form fields are provided. This creates the account and puts the user in pending state.

Super-admin will review the student's registration and vet the student based on the form response they provided. If the vetting yields in failed outcome, admin will simply reject the user. If the vetting is successful, admin will approve the user at which time the account is created successfully.

After this, the student is able to successfully login to the org's student-portal. Since this is a new user and hasn't completed the enrollment process yet, they will automatically land on 'Enrollment' page. The student will not see or have access to any features/modules inside the student-portal until they complete the Enrollment process.

Only exception being, every logged in user can still have access to 'Add a dependent' and 'Login as' features.

### Enrollment

#### Step1: Enrollment setup

On the admin-portal, we will have a new 'Enrollments' module available for org-admins (and super-admins). This module will show list of all newly registered students (or students that haven't completed enrollment process). The enrollment process should work like a wizard.

When the enrollment period starts, an org-admin will begin by creating a new enrollment-period. Internally, this sets status of enrollment-period to 'Draft'

Admin will provide some metadata for enrollment-period, which includes enrollment-period name, batch enrollment start & end date, review period start & end date, Orientation date & time, Batch start date.

These dates will only be for the display purpose, it will not automate the steps. org-admin will continuously monitor the situation and react accordingly during the enrollment process. (Maybe in future, we can plan for the automation, but initially we will keep the process manual)

Admin will create new batches for that specific enrollment-period. Admin will provide all the batch details, along with batch timings. Creating a batch from the enrollment page will automatically set batch's status to 'Enroll' (lets call them enrollment batches).

Once the enrollment-period is created and enrollment batches are set, admin will have a 'Start' button for enrollment-period. Internally, this sets status of enrollment-period to 'batch-enrollment'.

#### Step2: Batch enrollment

Once enrollment-period starts, the 'Enrollment' page in student-portal will display the enrollment-period details like name, batch enrollment dates, review period dates, orientation date and batches start date. This page is only visible for the students who have not yet completed the enrollment process.

The student will be able to see all the enrollment batches available and allow student to make 2 batch choices. The student should be clearly able to declare their 1st and 2nd priority for batch selection. Each batch clearly displays all the batch information along with the timings in multiple time zones.

While the batch enrollment is in progress, org-admin is able to continuously monitor all the enrollment batches to keep track of the progress. They will be able to see who and how many students completed the batch enrollment, and for each batch who and how many selected as the 1st choice and 2nd choice. They should also be able to select the date & timestamp of when the student had made that choice. Students however can make changes to their batch selection as many times as they want while the batch enrollment is in progress. The admin only sees the latest selection at all times.

When the admin team decides to stop the enrollment, they will have a 'Stop' button for the enrollment-period. Internally, this sets status of enrollment-period to 'review period'.

#### Step3: Review period

Once batch-enrollment stops, the 'Enrollment' page in student-portal will still display the enrollment-period and the choice student has made for the batches, but the student will no longer be able to make any modifications.

The review period allows admin team to now review the final results of batch enrollment. The admins will be able to then properly assign the students to appropriate enrollment batches based on the selections. Make any adjustments needed if there are any particular batches where the number of students is more than ideal threshold (~ 12to15). These are not hard limits set by system. The admin will have full flexibility to properly assign students to the batches and ensure all the batches are set properly. If needed, the admin may even contact any students directly to figure out ways to accommodate everyone equally and fairly.

It is possible that the admin team decide to extend the enrollment period, in which case, they can simply click 'Start' button, which will internally set the enrollment-period's status back to 'batch-enrollment' and allow students to continue enrolling.

Ending the enrollment-period will automatically set all the enrollment batches status to 'Active'. From here on the rest of the batch management process is the same as what we have implemented for now.

It is not necessary that all the students need to have been enrolled to a batch to end the enrollment-period. Every enrollment batch must have at least one student before we end the enrollment-period. We should also warn if there are any batches that contain less than 5 students when ending the enrollment-period.

When the admin team is finally comfortable with all the batch assignments, the orientation is complete and the and ready to start the batches, they have a button to 'End' the enrollment-period. Internally, this sets status of enrollment-period to 'Completed'. Once enrollment period ends, there is no more starting it back.

The 'Enrollments' module on admin-portal will show list of all previous and current enrollment-periods for the org. At anytime there can only be one active enrollment-period for a given org. There can however be multiple enrollment-periods that are in draft or end state.

When then enrollment period ends, now that the student is in an active batch, they will be able to see and access rest of the student features/modules in that org.

Any students that were not assigned any batch while the enrollment-period ends will still continue to see 'Enrollment' page on their login and need to wait until the next enrollment-period begins.

All students who are assigned to batches when enrollment-period ends will continue to see the 'Enrollment' page in the student-portal but it will not be their landing page anymore. During the subsequent enrollment periods, they will be able to see that enrollment-period has started by going to the 'Enrollment' page and see the list of new batches, but they will not be able to make any selections since they already completed enrollment process.

### Proxy Registration & Impersonation (verbatim, same design session)

Any logged in user to the student-portal will have an option to 'Register another user'.

Clicking this feature will start a new user registration form for the dependent. logged-in user will fill out the form and submit the registration.

The super-admin will view this as a new user registration, along with information to identify this new account will be managed by another user. The admin team will complete the vetting process and approve/ reject the newly registered account.

For all system's practical purposes, the dependent account will just act as any other regular account, but the only difference is that an internal relationship will be established between both the accounts as manages and managed by.

The super-admin will have an option in the 'user management' feature to open a user, and be able to add users who can manage an account, and also which users that account can manage. This relationship will simply be displayed as 'managed-by' and 'manages'.

The super-admin at any time can remove users from managed-by or manages from the same interface where they manage a user account.

When a user logs in to student-portal, they will see 'Login as' option if they manage at least one user. Clicking the 'Login as' will open a dropdown with list of users they can manage with a simple type down search. The user can select the user they want to login as which will allow them to impersonate as the managed used in the student-portal.

The super-admin will be able to manage all users by default. Which means, a super-admin can pick any user's name in the 'Login as' in student-portal.

---

## Addendum — refinements after the original write-up

These points came **after** the verbatim text above. They do not replace that section; they record how the design was tightened.

**Naming:** “Add a dependent” in the original registration section became **Register another user** in the broader onboarding design. The relationship model became generic **manages / managed-by** (many-to-many, directional), not a dedicated parent–child entity.

**Account vs approval:** On submit the account already exists in **pending** state; “account created successfully” on approve means **membership approved** and login allowed, not a second account creation.

**Enrollment-period entity:** We stopped saying “the period” on its own. **Enrollment-period** is the named entity the org creates many of; only one may be **active** (Draft, batch-enrollment, or review-period) at a time. Status **review-period** replaces the looser phrase “review period.” Display metadata may use “review window” dates on the enrollment-period.

**Single End button:** The original text mentions batches becoming **Active** when “ending the enrollment-period” and also a separate **End** button after orientation. In follow-up, these are **one** action: **End** sets the enrollment-period to **Completed**, flips enrollment batches from **Enroll** to **Active**, and reflects that assignments, orientation, and batch readiness are done. Validations on End also require track, primary instructor, and at least one co-instructor per batch (added after the first write-up).

**Portal gate:** “Completed enrollment process” for students maps to: **has active enrollment in an active batch** in that org. Unassigned students after an enrollment-period **Ends** stay on the Enrollment page until a **later enrollment-period** (must submit choices again) or an org-admin assigns them via batch management for an offline personal request. Returning or advanced students can skip the enrollment-period UI if an admin places them directly.

**Registration extras:** Replace Google Forms; require phone and email with verification (at least one before submit); login with email or phone; Google OAuth still shows the same form and goes through super-admin vetting; reject via email notification.

**Instructor access:** Users with instructor role still reach instructor modules even when the student gate would show only Enrollment.

**Proxy:** Any **approved** user may register another user and use Login as for managed accounts; super-admin vets proxy registrations and can edit manages / managed-by on any user; super-admin can Login as anyone.

---

## Portal access — the rule that ties it together

“Enrollment complete” is not really a separate flag. Practically: when a user logs into the student portal, check **are they assigned to an active batch with active enrollment in this org?** If yes, show the normal student modules. If no, show only **Enrollment** (plus register another user / login as).

If someone is advanced — learned elsewhere, approved account, no active enrollment-period — an org-admin can assign them straight from **batch management**; once they have active batch enrollment, the gate opens.

**Instructors** are special: if they have instructor role, they should still reach **instructor modules** even when the student gate would otherwise force Enrollment. The enrollment landing behavior is about **student-facing** learning areas. There is no standalone instructor membership — **everyone must be a student**; instructor is an additional org role.

Multi-org means **separate** registration, vetting, enrollment-periods, and gate per org.

---

## Clarifications captured late in the conversation

The **End** button is not two steps — it both **completes** the enrollment-period and **activates** batches.

Students who were assigned during **review-period** but batches are still **enrolling** still sit on the Enrollment student experience until **End** fires.

Rejected users get **email**; no waitlist state.

Student choice UI does not need history — what they selected now is enough.

Proxy registration after approval enables the “register me, dad, and kid, then login as each to enroll” pattern.

For communication and WhatsApp group mechanics we explicitly deferred — not v1 LMS scope.

Discovery questionnaires were useful early but the **feature memo** is the stakeholder-facing spec; this raw note file preserves the narrative underneath.

---

## What we deliberately left open or out of v1

WhatsApp groups, Zoom link provisioning, automated date-driven phase transitions, waitlists, hard kid/adult batch rules, parent–child as a first-class entity, org-admin doing registration vetting, and rich rejection UX beyond email. Pain-point prioritization and pilot success metrics were not finalized in writing. Track/level vs batch creation details and co-instructor teaching vs backup role were left implicit — operational judgment and existing instructor patterns fill the gap for now.

---

## Related documents

- [user-onboarding-feature-memo.md](./user-onboarding-feature-memo.md) — formal future-state specification for architects, developers, and stakeholders
