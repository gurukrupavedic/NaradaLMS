import type { User, UpsertUser } from "@shared/schema";

// Simple in-memory storage for initial testing
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = new Date();
    const user: User = {
      id: userData.id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      roles: userData.roles || ["student"],
      status: userData.status || "active",
      createdAt: now,
      updatedAt: now,
    };
    
    this.users.set(user.id, user);
    return user;
  }
}

export const storage = new MemStorage();