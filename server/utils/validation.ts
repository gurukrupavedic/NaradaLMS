import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";
import { fromZodError } from "zod-validation-error";

export function validateRequest(schema: ZodSchema) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validate both body and query if present in schema, otherwise just body
            // This is a simple implementation; complex schemas might need separation
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const validationError = fromZodError(error);
                return res.status(400).json({ error: validationError.message });
            }
            next(error);
        }
    };
}
