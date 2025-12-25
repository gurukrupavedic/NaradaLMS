import { Router, Request, Response, NextFunction } from "express";
import { batchService } from "../modules/batch-cohort";

const router = Router();

interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createErrorResponse(message: string, code?: string, details?: any): ApiErrorResponse {
  return {
    error: {
      message,
      code,
      details,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    },
  };
}

// GET /api/batches - List batches with pagination
router.get('/batches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const allItems = await batchService.listBatches();
    const total = allItems.length;
    const paginatedItems = allItems.slice(offset, offset + limit);

    res.json({ items: paginatedItems, pagination: { limit, offset, total } });
  } catch (error) { next(error); }
});

// GET /api/batches/:id - Get batch by ID
router.get('/batches/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const item = await batchService.getBatch(id);
    if (!item) return res.status(404).json(createErrorResponse('Batch not found', 'BATCH_NOT_FOUND'));
    res.json(item);
  } catch (error) { next(error); }
});

// POST /api/batches - Create batch
router.post('/batches', async (req: Request, res: Response, next: NextFunction) => {
      // Validate required fields
      if (!req.body.batchCode || !req.body.batchName) {
        return res.status(400).json(createErrorResponse('Batch code and name are required', 'MISSING_REQUIRED_FIELDS'));
      }

      if (!req.body.primaryInstructorId) {
        return res.status(400).json(createErrorResponse('Primary instructor is required', 'MISSING_PRIMARY_INSTRUCTOR'));
      }

      // Validate cohortType if provided
      if (req.body.cohortType && !['bramhachari', 'grihasta'].includes(req.body.cohortType)) {
        return res.status(400).json(createErrorResponse('Invalid cohort type. Must be "bramhachari" or "grihasta".', 'INVALID_COHORT_TYPE'));
      }

  try {
    const created = await batchService.createBatch({
      batchCode: req.body.batchCode,
      batchName: req.body.batchName,
      trackId: req.body.trackId ?? undefined,
      primaryInstructorId: req.body.primaryInstructorId ?? undefined,
      cohortType: req.body.cohortType ?? undefined,
      description: req.body.description ?? null,
      createdBy: req.body.createdBy || 'system',
      secondaryInstructorIds: Array.isArray(req.body.secondaryInstructorIds) ? req.body.secondaryInstructorIds : undefined,
    });

    res.json(created);
  } catch (error) { 
    console.error('Error creating batch:', error);
    next(error); 
  }
});

// PATCH /api/batches/:id - Update batch
router.patch('/batches/:id', async (req: Request, res: Response, next: NextFunction) => {
      // Validate cohortType if provided
      if (req.body.cohortType !== undefined && req.body.cohortType !== null && !['bramhachari', 'grihasta'].includes(req.body.cohortType)) {
        return res.status(400).json(createErrorResponse('Invalid cohort type. Must be "bramhachari" or "grihasta".', 'INVALID_COHORT_TYPE'));
      }

  try {
    const id = parseInt(req.params.id);
    const updated = await batchService.updateBatch(id, {
      batchCode: req.body.batchCode,
      batchName: req.body.batchName,
      trackId: req.body.trackId,
      primaryInstructorId: req.body.primaryInstructorId,
      cohortType: req.body.cohortType,
      description: req.body.description,
    });

    // If secondaryInstructorIds provided, sync co-instructor assignments
    if (Array.isArray(req.body.secondaryInstructorIds)) {
      const assignedBy = req.body.assignedBy || (req as any).user?.id || 'system';
      await batchService.syncCoInstructors(id, req.body.secondaryInstructorIds, assignedBy);
    }
    res.json(updated);
  } catch (error) { next(error); }
});

// DELETE /api/batches/:id - Delete batch
router.delete('/batches/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await batchService.deleteBatch(id);
    res.json(deleted);
  } catch (error) { next(error); }
});

// POST /api/batches/:id/enrollments - Enroll a student
router.post('/batches/:id/enrollments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batchId = parseInt(req.params.id);
    const created = await batchService.addEnrollment({
      batchId,
      studentId: req.body.studentId,
      enrolledBy: req.body.enrolledBy || 'system',
    });
    res.json(created);
  } catch (error) { next(error); }
});

// PATCH /api/enrollments/:id/drop - Drop an enrollment
router.patch('/enrollments/:id/drop', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollmentId = parseInt(req.params.id);
    const updated = await batchService.dropEnrollment({
      enrollmentId,
      droppedReason: req.body.droppedReason,
    });
    res.json(updated);
  } catch (error) { next(error); }
});

// GET /api/batches/:id/enrollments - List enrollments in batch
router.get('/batches/:id/enrollments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batchId = parseInt(req.params.id);
    const items = await batchService.listEnrollments(batchId);
    res.json(items);
  } catch (error) { next(error); }
});

// POST /api/batches/:id/co-instructors - Assign co-instructor
router.post('/batches/:id/co-instructors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batchId = parseInt(req.params.id);
    const created = await batchService.assignCoInstructor({
      batchId,
      instructorId: req.body.instructorId,
      role: req.body.role,
      assignedBy: req.body.assignedBy || 'system',
    });
    res.json(created);
  } catch (error) { next(error); }
});

// DELETE /api/co-instructors/:assignmentId - Remove co-instructor assignment
router.delete('/co-instructors/:assignmentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const removed = await batchService.removeCoInstructor(assignmentId);
    res.json(removed);
  } catch (error) { next(error); }
});

// GET /api/batches/:id/co-instructors - List co-instructors for batch
router.get('/batches/:id/co-instructors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batchId = parseInt(req.params.id);
    const items = await batchService.listCoInstructors(batchId);
    res.json(items);
  } catch (error) { next(error); }
});

// Phase 5: Evaluation endpoints

// GET /api/batches/:id/progress - Get all student progress in batch (Excel-like grid)
router.get('/batches/:id/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json(createErrorResponse('Unauthorized', 'UNAUTHORIZED'));
    }

    // Only instructors and admins can view batch progress
    const isInstructorOrAdmin = user.roles?.includes('instructor') || user.roles?.includes('admin');
    if (!isInstructorOrAdmin) {
      return res.status(403).json(createErrorResponse('Forbidden: Instructors only', 'FORBIDDEN'));
    }

    const batchId = parseInt(req.params.id);
    const progress = await batchService.getBatchProgress(batchId);
    res.json(progress);
  } catch (error) { next(error); }
});

// POST /api/batches/:batchId/students/:studentId/evaluate - Evaluate student for chapter
router.post('/batches/:batchId/students/:studentId/evaluate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json(createErrorResponse('Unauthorized', 'UNAUTHORIZED'));
    }

    // Only instructors can evaluate
    if (!user.roles?.includes('instructor')) {
      return res.status(403).json(createErrorResponse('Forbidden: Instructors only', 'FORBIDDEN'));
    }

    const batchId = parseInt(req.params.batchId);
    const studentId = req.params.studentId;
    const { chapterId, proficiencyLevel, notes } = req.body;

    if (!chapterId || proficiencyLevel === undefined) {
      return res.status(400).json(createErrorResponse('chapterId and proficiencyLevel are required', 'VALIDATION_ERROR'));
    }

    const result = await batchService.evaluateStudent({
      studentId,
      chapterId: parseInt(chapterId),
      proficiencyLevel: parseInt(proficiencyLevel),
      notes,
      evaluatedBy: user.id,
      batchId,
    });

    res.json(result);
  } catch (error) { next(error); }
});

export const batchRouter = router;
