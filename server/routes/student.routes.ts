import { Router, Request, Response } from "express";
import { learningService } from "../modules/learning-delivery";

const router = Router();

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

export { router as studentRouter };
