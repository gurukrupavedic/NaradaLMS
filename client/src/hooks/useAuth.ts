import { useQuery } from "@tanstack/react-query";

// Mock user with all roles for development
const mockUser = {
  id: "dev-user-123",
  email: "developer@vediclms.com",
  firstName: "Development",
  lastName: "User",
  profileImageUrl: "https://replit.com/public/images/mark.png",
  roles: ["student", "instructor", "content_manager", "admin"],
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
};

export function useAuth() {
  // Always return the mock user as authenticated
  return {
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
  };
}
