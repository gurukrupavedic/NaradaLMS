import { Router, Request, Response } from "express";
import { learningService } from "../modules/learning-delivery";
import { authMiddleware } from "../shared/middleware/auth";

const router = Router();

// Protect all student routes - authentication required
router.use(authMiddleware);

/**
 * GET /api/students/:studentId/progress
 * Get student details with proficiency matrix for instructor view
 * Only instructors can view their students, instructors can only see students in their batches
 */
router.get('/students/:studentId/progress', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Only instructors and admins can access student details
    const isInstructorOrAdmin = user.roles?.includes('instructor') || user.roles?.includes('admin');
    if (!isInstructorOrAdmin) {
      return res.status(403).json({ error: 'Forbidden: Instructors only' });
    }

    const studentId = req.params.studentId;
    const studentDetails = await learningService.getStudentDetails(user.id, studentId, isInstructorOrAdmin);

    if (!studentDetails) {
      return res.status(404).json({ error: 'Student not found or you do not have access' });
    }

    res.json(studentDetails);
  } catch (error: any) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch student details' });
  }
});

/**
 * GET /api/students/:studentId/track-progress
 * Get student's proficiency history organized by track (for track-wise progress view)
 * Returns all tracks the student has studied across their batch enrollments
 * Only instructors can view their students
 */
router.get('/students/:studentId/track-progress', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Only instructors and admins can access student details
    const isInstructorOrAdmin = user.roles?.includes('instructor') || user.roles?.includes('admin');
    if (!isInstructorOrAdmin) {
      return res.status(403).json({ error: 'Forbidden: Instructors only' });
    }

    const studentId = req.params.studentId;
    const trackProgress = await learningService.getStudentTrackProgress(user.id, studentId, isInstructorOrAdmin);

    if (!trackProgress) {
      return res.status(404).json({ error: 'Student not found or you do not have access' });
    }

    res.json(trackProgress);
  } catch (error: any) {
    console.error('Error fetching track progress:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch track progress' });
  }
});

export { router as studentRouter };
