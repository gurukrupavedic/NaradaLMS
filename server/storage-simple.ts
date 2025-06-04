import type { User, UpsertUser } from "@shared/schema";

// Simple in-memory storage for initial testing
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRoles(userId: string, roles: string[]): Promise<User>;
  updateUserStatus(userId: string, status: string): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = new Date();
    const existingUser = this.users.get(userData.id);
    
    const user: User = {
      id: userData.id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      roles: userData.roles || existingUser?.roles || ["student", "instructor", "content_manager", "admin"],
      status: userData.status || existingUser?.status || "active",
      createdAt: existingUser?.createdAt || now,
      updatedAt: now,
    };
    
    this.users.set(user.id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...user, roles, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserStatus(userId: string, status: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...user, status, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
}

export const storage = new MemStorage();