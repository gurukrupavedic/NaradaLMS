import React, { useState } from "react";
import { Link, useRoute } from "wouter";
import { useCoInstructors, useAssignCoInstructor, useRemoveCoInstructor, useEnrollments, useEnrollStudent, useDropEnrollment } from "../hooks/useBatchRelations";

export default function BatchDetailAdmin() {
  const [, params] = useRoute("/app/admin/batches/:id");
  const batchId = Number(params?.id);

  const coInstructors = useCoInstructors(batchId);
  const assignCo = useAssignCoInstructor(batchId);
  const removeCo = useRemoveCoInstructor();

  const enrollments = useEnrollments(batchId);
  const enrollStudent = useEnrollStudent(batchId);
  const dropEnrollment = useDropEnrollment(batchId);

  const [coForm, setCoForm] = useState({ instructorId: "", role: "co_instructor" });
  const [enrollForm, setEnrollForm] = useState({ studentId: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Admin Center</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Batch Detail</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Manage co-instructors and enrollments for batch #{batchId}.</p>
        </div>
        <Link href="/app/admin/batches">
          <a className="text-sm text-primary hover:opacity-80 transition-colors">Back to batches</a>
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">Co-Instructors</h2>
        <form onSubmit={(e) => { e.preventDefault(); assignCo.mutate(coForm); }} className="mt-3 grid gap-3 md:grid-cols-3">
          <LabeledInput label="Instructor ID" value={coForm.instructorId} onChange={(v) => setCoForm(f => ({ ...f, instructorId: v }))} placeholder="user UUID" />
          <label className="block">
            <span className="text-xs text-muted-foreground">Role</span>
            <select aria-label="Role" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={coForm.role} onChange={(e) => setCoForm(f => ({ ...f, role: e.target.value }))}>
              <option value="co_instructor">co_instructor</option>
              <option value="ta">ta</option>
            </select>
          </label>
          <div className="flex items-end">
            <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground hover:opacity-90" disabled={assignCo.isPending}>Assign</button>
          </div>
        </form>

        <div className="mt-4 rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Instructor</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(coInstructors.data ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-5 text-muted-foreground">No co-instructors yet.</td></tr>
              )}
              {(coInstructors.data ?? []).map(ci => (
                <tr key={ci.id} className="border-t border-border">
                  <td className="px-4 py-3">{ci.id}</td>
                  <td className="px-4 py-3">{ci.instructorId}</td>
                  <td className="px-4 py-3">{ci.role}</td>
                  <td className="px-4 py-3">
                    <button className="rounded-md bg-destructive/20 px-3 py-1.5 text-destructive hover:bg-destructive/30" onClick={() => removeCo.mutate({ assignmentId: ci.id, batchId })}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">Enrollments</h2>
        <form onSubmit={(e) => { e.preventDefault(); enrollStudent.mutate(enrollForm); }} className="mt-3 grid gap-3 md:grid-cols-3">
          <LabeledInput label="Student ID" value={enrollForm.studentId} onChange={(v) => setEnrollForm(f => ({ ...f, studentId: v }))} placeholder="user UUID" />
          <div className="flex items-end">
            <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground hover:opacity-90" disabled={enrollStudent.isPending}>Enroll</button>
          </div>
        </form>

        <div className="mt-4 rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(enrollments.data ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-5 text-muted-foreground">No enrollments yet.</td></tr>
              )}
              {(enrollments.data ?? []).map(en => (
                <tr key={en.id} className="border-t border-border">
                  <td className="px-4 py-3">{en.id}</td>
                  <td className="px-4 py-3">{en.studentId}</td>
                  <td className="px-4 py-3">{en.status}</td>
                  <td className="px-4 py-3">
                    {en.status === "active" ? (
                      <button className="rounded-md bg-destructive/20 px-3 py-1.5 text-destructive hover:bg-destructive/30" onClick={() => dropEnrollment.mutate({ enrollmentId: en.id })}>Drop</button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        aria-label={label}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
