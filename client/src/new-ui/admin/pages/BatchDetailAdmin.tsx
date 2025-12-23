import React, { useState } from "react";
import { Link, useRoute } from "wouter";
import { useCoInstructors, useAssignCoInstructor, useRemoveCoInstructor, useEnrollments, useEnrollStudent, useDropEnrollment } from "../hooks/useBatchRelations";
import { useAdminUserSearch } from "../hooks/useAdminUserSearch";
import { useToast } from "@/features/shared-features/hooks/use-toast";

export default function BatchDetailAdmin() {
  const { toast } = useToast();
  const [, params] = useRoute("/app/admin/batches/:id");
  const batchId = Number(params?.id);

  const coInstructors = useCoInstructors(batchId);
  const assignCo = useAssignCoInstructor(batchId);
  const removeCo = useRemoveCoInstructor();

  const enrollments = useEnrollments(batchId);
  const enrollStudent = useEnrollStudent(batchId);
  const dropEnrollment = useDropEnrollment(batchId);

  // Instructor assignment state
  const [qInstructor, setQInstructor] = useState("");
  const [selectedInstructor, setSelectedInstructor] = useState<any>(null);
  const [instructorRole, setInstructorRole] = useState("secondary_instructor");

  // Student enrollment state
  const [qStudent, setQStudent] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Search pickers
  const instructorSearch = useAdminUserSearch({ role: "instructor", q: qInstructor, status: "active" });
  const studentSearch = useAdminUserSearch({ role: "student", q: qStudent, status: "active" });

  // Check if primary instructor already exists
  const hasPrimaryInstructor = (coInstructors.data ?? []).some((ci: any) => ci.role === "primary_instructor");

  const onAssignInstructor = () => {
    if (!selectedInstructor) return;
    assignCo.mutate({ instructorId: selectedInstructor.id, role: instructorRole }, {
      onSuccess: () => {
        toast({ title: "Instructor assigned" });
        setSelectedInstructor(null);
        setQInstructor("");
        setInstructorRole("secondary_instructor");
      },
      onError: (err: any) => {
        toast({ title: "Failed to assign instructor", description: err.message, variant: "destructive" });
      },
    });
  };

  const onEnrollStudent = () => {
    if (!selectedStudent) return;
    enrollStudent.mutate({ studentId: selectedStudent.id }, {
      onSuccess: () => {
        toast({ title: "Student enrolled" });
        setSelectedStudent(null);
        setQStudent("");
      },
      onError: (err: any) => {
        toast({ title: "Failed to enroll student", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Admin Center</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Batch Detail</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Manage instructors and enrollments for batch #{batchId}.</p>
        </div>
        <Link href="/app/admin/batches">
          <a className="text-sm text-primary hover:opacity-80 transition-colors">Back to batches</a>
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">Assign Instructors</h2>
        
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">Search Instructor</span>
            <input 
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" 
              value={qInstructor} 
              onChange={(e) => {
                setQInstructor(e.target.value);
                setSelectedInstructor(null);
              }} 
              placeholder="Name or email" 
            />
          </label>

          {selectedInstructor && (
            <>
              <label className="block">
                <span className="text-xs text-muted-foreground">Role</span>
                <select 
                  aria-label="Instructor Role"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={instructorRole}
                  onChange={(e) => setInstructorRole(e.target.value)}
                  disabled={instructorRole === "primary_instructor" && hasPrimaryInstructor}
                >
                  <option value="primary_instructor" disabled={hasPrimaryInstructor}>Primary Instructor {hasPrimaryInstructor ? "(already assigned)" : ""}</option>
                  <option value="secondary_instructor">Secondary Instructor</option>
                </select>
              </label>

              <div className="flex items-end gap-2">
                <button 
                  className="rounded-md bg-primary px-3 py-2 text-primary-foreground hover:opacity-90"
                  onClick={onAssignInstructor}
                  disabled={assignCo.isPending}
                >
                  Assign
                </button>
                <button 
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setSelectedInstructor(null)}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        {/* Instructor search results */}
        {qInstructor && !selectedInstructor && (
          <div className="mt-3">
            <div className="rounded-md border border-border">
              <ul className="max-h-48 overflow-auto text-sm">
                {(instructorSearch.results ?? []).length === 0 && (
                  <li className="px-3 py-2 text-muted-foreground">No instructors found.</li>
                )}
                {instructorSearch.results.map(u => (
                  <li key={u.id} className="flex items-center justify-between border-t border-border px-3 py-2 hover:bg-muted/50">
                    <div>
                      <div className="font-medium text-foreground">{u.email}</div>
                      <div className="text-xs text-muted-foreground">{u.firstName} {u.lastName}</div>
                    </div>
                    <button 
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => setSelectedInstructor(u)}
                    >
                      Select
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Current instructors */}
        <div className="mt-4 rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(coInstructors.data ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-5 text-muted-foreground">No instructors assigned yet.</td></tr>
              )}
              {(coInstructors.data ?? []).map((ci: any) => (
                <tr key={ci.id} className="border-t border-border">
                  <td className="px-3 py-2">{ci.instructorId}</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2 font-medium">{ci.role === "primary_instructor" ? "Primary" : "Secondary"}</td>
                  <td className="px-3 py-2">
                    <button 
                      className="rounded-md bg-destructive/20 px-3 py-1.5 text-destructive hover:bg-destructive/30 disabled:opacity-50"
                      onClick={() => removeCo.mutate({ assignmentId: ci.id, batchId }, {
                        onSuccess: () => toast({ title: "Instructor removed" }),
                        onError: (err: any) => toast({ title: "Failed to remove", description: err.message, variant: "destructive" }),
                      })}
                      disabled={removeCo.isPending}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">Enrollments</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs text-muted-foreground">Search Student</span>
            <input 
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={qStudent} 
              onChange={(e) => {
                setQStudent(e.target.value);
                setSelectedStudent(null);
              }}
              placeholder="Name or email"
            />
          </label>

          {selectedStudent && (
            <div className="flex items-end gap-2">
              <button 
                className="rounded-md bg-primary px-3 py-2 text-primary-foreground hover:opacity-90"
                onClick={onEnrollStudent}
                disabled={enrollStudent.isPending}
              >
                Enroll
              </button>
              <button 
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setSelectedStudent(null)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Student search results */}
        {qStudent && !selectedStudent && (
          <div className="mt-3">
            <div className="rounded-md border border-border">
              <ul className="max-h-48 overflow-auto text-sm">
                {(studentSearch.results ?? []).length === 0 && (
                  <li className="px-3 py-2 text-muted-foreground">No students found.</li>
                )}
                {studentSearch.results.map(u => (
                  <li key={u.id} className="flex items-center justify-between border-t border-border px-3 py-2 hover:bg-muted/50">
                    <div>
                      <div className="font-medium text-foreground">{u.email}</div>
                      <div className="text-xs text-muted-foreground">{u.firstName} {u.lastName}</div>
                    </div>
                    <button 
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => setSelectedStudent(u)}
                    >
                      Select
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(enrollments.data ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-5 text-muted-foreground">No enrollments yet.</td></tr>
              )}
              {(enrollments.data ?? []).map(en => (
                <tr key={en.id} className="border-t border-border">
                  <td className="px-3 py-2">{en.id}</td>
                  <td className="px-3 py-2">{en.studentId}</td>
                  <td className="px-3 py-2">{en.status}</td>
                  <td className="px-3 py-2">
                    {en.status === "active" ? (
                      <button 
                        className="rounded-md bg-destructive/20 px-3 py-1.5 text-destructive hover:bg-destructive/30 disabled:opacity-50"
                        onClick={() => dropEnrollment.mutate({ enrollmentId: en.id }, {
                          onSuccess: () => toast({ title: "Student dropped" }),
                          onError: (err: any) => toast({ title: "Failed to drop", description: err.message, variant: "destructive" }),
                        })}
                        disabled={dropEnrollment.isPending}
                      >
                        Drop
                      </button>
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
