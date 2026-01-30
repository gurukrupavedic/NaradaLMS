import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { db } from '@narada/database';
import { users } from '@narada/database/schema';
import { insertUserSchema } from '@narada/types';
import { generateToken } from '../auth/jwt.utils.js';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 10;

export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    insertUserSchema.parse({ email, firstName, lastName });

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
        throw new AppError('User with this email already exists', 400, 'EMAIL_EXISTS');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const [newUser] = await db.insert(users).values({
        email,
        passwordHash,
        firstName,
        lastName,
        provider: 'local',
        roles: ['student'], // Default role
        status: 'active',
    }).returning();

    // Generate token
    const token = generateToken({
        userId: newUser.id,
        email: newUser.email,
        roles: newUser.roles,
    });

    res.status(201).json({
        success: true,
        data: {
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                roles: newUser.roles,
            },
        },
    });
});

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new AppError('Email and password are required', 400, 'MISSING_CREDENTIALS');
    }

    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !user.passwordHash) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Check status
    if (user.status !== 'active') {
        throw new AppError('Account is not active. Please contact support.', 403, 'ACCOUNT_INACTIVE');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    await db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

    // Generate token
    const token = generateToken({
        userId: user.id,
        email: user.email,
        roles: user.roles,
    });

    res.json({
        success: true,
        data: {
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roles: user.roles,
            },
        },
    });
});

export const me = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Fetch full user data
    const [user] = await db.select().from(users).where(eq(users.id, req.user.userId)).limit(1);
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
        success: true,
        data: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
            status: user.status,
        },
    });
});
