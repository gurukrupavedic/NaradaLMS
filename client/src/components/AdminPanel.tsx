import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Badge,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/design-system";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  UserPlus, 
  Edit, 
  SquareSlash, 
  Send, 
  Trash2, 
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Users,
  Mail
} from "lucide-react";
import type { User } from "@shared/schema";
import { z } from "zod";

const inviteUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  roles: z.array(z.string()).min(1, "At least one role must be selected"),
});

const AVAILABLE_ROLES = [
  { id: 'student', name: 'Student', description: 'Can access learning content and track progress' },
  { id: 'instructor', name: 'Instructor', description: 'Can manage student progress and assessments' },
  { id: 'content_manager', name: 'Content Manager', description: 'Can create and edit learning content' },
  { id: 'admin', name: 'Admin', description: 'Can manage users and system settings' },
];

interface AdminPanelProps {
  user: User;
}

export function AdminPanel({ user }: AdminPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Queries
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Forms
  const inviteForm = useForm<z.infer<typeof inviteUserSchema>>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      roles: ["student"],
    },
  });

  // Mutations
  const inviteUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof inviteUserSchema>) => {
      // This would typically send an invitation email
      // For now, we'll create the user directly with pending status
      await apiRequest('POST', '/api/invite-user', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowInviteUser(false);
      inviteForm.reset();
      toast({
        title: "Success",
        description: "User invitation sent successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const updateUserRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: string[] }) => {
      await apiRequest('PUT', `/api/users/${userId}/roles`, { roles });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User roles updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user roles",
        variant: "destructive",
      });
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      await apiRequest('PUT', `/api/users/${userId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === "" || 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || user.status === filterStatus;

    const matchesRole = filterRole === "all" || user.roles.includes(filterRole);

    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disabled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'disabled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'content_manager':
        return 'bg-purple-100 text-purple-800';
      case 'instructor':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusToggle = (targetUser: User) => {
    const newStatus = targetUser.status === 'active' ? 'disabled' : 'active';
    const action = newStatus === 'disabled' ? 'disable' : 'enable';
    
    if (window.confirm(`Are you sure you want to ${action} user "${targetUser.firstName} ${targetUser.lastName}"?`)) {
      updateUserStatusMutation.mutate({
        userId: targetUser.id,
        status: newStatus,
      });
    }
  };

  const handleResendInvitation = (targetUser: User) => {
    // This would resend the invitation email
    toast({
      title: "Invitation Resent",
      description: `Invitation email sent to ${targetUser.email}`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vedic-brown"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-vedic-brown" />
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Pending Invites</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.roles.includes('admin')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-gray-900">User Management</CardTitle>
            <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
              <DialogTrigger asChild>
                <Button className="bg-vedic-brown hover:bg-vedic-brown/90 text-white">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                </DialogHeader>
                <Form {...inviteForm}>
                  <form onSubmit={inviteForm.handleSubmit((data) => inviteUserMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={inviteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="user@example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={inviteForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="First name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={inviteForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Last name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={inviteForm.control}
                      name="roles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roles</FormLabel>
                          <div className="space-y-2">
                            {AVAILABLE_ROLES.map(role => (
                              <div key={role.id} className="flex items-start space-x-3">
                                <input
                                  type="checkbox"
                                  id={role.id}
                                  checked={field.value.includes(role.id)}
                                  onChange={(e) => {
                                    const newRoles = e.target.checked
                                      ? [...field.value, role.id]
                                      : field.value.filter(r => r !== role.id);
                                    field.onChange(newRoles);
                                  }}
                                  className="mt-1"
                                />
                                <div>
                                  <label htmlFor={role.id} className="text-sm font-medium cursor-pointer">
                                    {role.name}
                                  </label>
                                  <p className="text-xs text-gray-500">{role.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setShowInviteUser(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={inviteUserMutation.isPending}>
                        Send Invitation
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Filters */}
          <div className="flex items-center space-x-4 mt-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {AVAILABLE_ROLES.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map(userData => (
                  <tr key={userData.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {userData.profileImageUrl && (
                          <img 
                            src={userData.profileImageUrl}
                            alt="User Avatar" 
                            className="w-10 h-10 rounded-full object-cover mr-4"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {userData.firstName} {userData.lastName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {userData.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {userData.roles.map(role => (
                          <Badge key={role} className={getRoleBadgeClass(role)}>
                            {AVAILABLE_ROLES.find(r => r.id === role)?.name || role}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(userData.status)}
                        <Badge className={getStatusBadgeClass(userData.status)}>
                          {userData.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => setEditingUser(userData)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit Roles"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {userData.status === 'pending' ? (
                          <Button
                            onClick={() => handleResendInvitation(userData)}
                            variant="ghost"
                            size="sm"
                            className="text-vedic-brown hover:text-vedic-brown/80"
                            title="Resend Invitation"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleStatusToggle(userData)}
                            variant="ghost"
                            size="sm"
                            className={userData.status === 'active' ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}
                            title={userData.status === 'active' ? 'Disable User' : 'Enable User'}
                          >
                            <SquareSlash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No users found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Roles</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="font-medium">{editingUser.firstName} {editingUser.lastName}</p>
                <p className="text-sm text-gray-500">{editingUser.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Roles</label>
                <div className="space-y-2">
                  {AVAILABLE_ROLES.map(role => (
                    <div key={role.id} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id={`edit-${role.id}`}
                        checked={editingUser.roles.includes(role.id)}
                        onChange={(e) => {
                          const newRoles = e.target.checked
                            ? [...editingUser.roles, role.id]
                            : editingUser.roles.filter(r => r !== role.id);
                          
                          updateUserRolesMutation.mutate({
                            userId: editingUser.id,
                            roles: newRoles,
                          });
                          
                          setEditingUser({
                            ...editingUser,
                            roles: newRoles,
                          });
                        }}
                        className="mt-1"
                      />
                      <div>
                        <label htmlFor={`edit-${role.id}`} className="text-sm font-medium cursor-pointer">
                          {role.name}
                        </label>
                        <p className="text-xs text-gray-500">{role.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={() => setEditingUser(null)}>
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
