import { Router, Request, Response } from "express";
import { learningService } from "../modules/learning-delivery";
import { jwtAuth } from "../middleware/jwt-auth.middleware";
import { requireInstructor } from "../shared/middleware/auth";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";

const router = Router();

// Protect all student routes - authentication required
router.use(jwtAuth);

/**
 * GET /api/students/:studentId/progress
 * Get student details with proficiency matrix for instructor view
 * Only instructors can view their students, instructors can only see students in their batches
 */
router.get('/students/:studentId/progress', requireInstructor, catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw new AppError('Unauthorized', 401);
  }

  // User is guaranteed to be instructor or admin by middleware
  const isInstructorOrAdmin = true;

  const studentId = req.params.studentId;

  const studentDetails = await learningService.getStudentDetails(user.id, studentId, isInstructorOrAdmin);

  if (!studentDetails) {
    throw new AppError('Student not found or you do not have access', 404);
  }

  res.json(studentDetails);
}));

/**
 * GET /api/students/:studentId/track-progress
 * Get student's proficiency history organized by track (for track-wise progress view)
 * Returns all tracks the student has studied across their batch enrollments
 * Only instructors can view their students
 */
router.get('/students/:studentId/track-progress', requireInstructor, catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw new AppError('Unauthorized', 401);
  }

  // User is guaranteed to be instructor or admin by middleware
  const isInstructorOrAdmin = true;

  const studentId = req.params.studentId;
  const trackProgress = await learningService.getStudentTrackProgress(user.id, studentId, isInstructorOrAdmin);

  if (!trackProgress) {
    throw new AppError('Student not found or you do not have access', 404);
  }

  res.json(trackProgress);
}));

export { router as studentRouter };
