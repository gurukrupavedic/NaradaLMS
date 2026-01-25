import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/features/shared/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

// Assets
import kolamPattern from "@/assets/branding/kolam-1.svg";
import logoStacked from "@/assets/branding/logo-stacked-dark-notag.svg";

export function AuthPage() {
    const [location, navigate] = useLocation();
    const [activeTab, setActiveTab] = useState<"login" | "register">(location === "/register" ? "register" : "login");
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return (
        <div className="min-h-screen w-full flex overflow-hidden bg-background">
            {/* LEFT PANEL: Sacred Illumination */}
            <div className="hidden lg:flex w-1/2 relative bg-nila-base overflow-hidden items-center justify-center">
                {/* Kolam Background Layer */}
                <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                        backgroundImage: `url(${kolamPattern})`,
                        backgroundSize: "120%",
                        backgroundPosition: "center",
                        filter: "drop-shadow(0 0 2px rgba(255, 215, 0, 0.3))", // Subtle gold glow
                    }}
                >
                    {/* CSS-based Shimmer Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-hema-base/20 to-transparent -translate-x-full animate-shimmer" />
                </div>

                {/* Central Hero Logo */}
                <div className="relative z-10 p-12 flex flex-col items-center text-center">
                    <img
                        src={logoStacked}
                        alt="Narada LMS"
                        className="w-48 h-auto drop-shadow-2xl mb-6"
                    />
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-dhavala-text tracking-wide">
                            Vedic Wisdom. Modern Learning.
                        </h2>
                        <p className="text-nila-muted-dark max-w-sm mx-auto">
                            Access your batches, track progress, and master the ancient arts.
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Authentication Forms */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-mukta-canvas dark:bg-nila-infinite">
                <div className="w-full max-w-md space-y-6">

                    {/* Mobile Logo (Visible only on small screens) */}
                    <div className="lg:hidden text-center mb-8">
                        <img src="/icon-contained-dark.svg" className="w-16 h-16 mx-auto mb-4" alt="Logo" />
                        <h1 className="text-2xl font-bold">Narada LMS</h1>
                    </div>

                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-8">
                            <TabsTrigger value="login">Login</TabsTrigger>
                            <TabsTrigger value="register">Register</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <LoginForm
                                onSuccess={() => {
                                    queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
                                    setTimeout(() => navigate("/app"), 300);
                                }}
                            />
                        </TabsContent>

                        <TabsContent value="register">
                            <RegisterForm
                                onSuccess={(email) => {
                                    setActiveTab("login");
                                    // Optional: Pre-fill email in login form via context or shared state if needed
                                }}
                            />
                        </TabsContent>
                    </Tabs>

                    <p className="px-8 text-center text-sm text-muted-foreground">
                        By clicking continue, you agree to our{" "}
                        <a href="#" className="underline hover:text-primary">Terms of Service</a>{" "}
                        and{" "}
                        <a href="#" className="underline hover:text-primary">Privacy Policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
                credentials: "include",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Invalid credentials");
            }

            toast({ title: "Welcome back", description: "Logged in successfully" });
            onSuccess();
        } catch (err: any) {
            toast({
                title: "Login failed",
                description: err.message,
                variant: "destructive",
            });
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Enter your email below to login into your account</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function RegisterForm({ onSuccess }: { onSuccess: (email: string) => void }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email.toLowerCase(),
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Registration failed");
            }

            toast({
                title: "Account created",
                description: "Please login with your new credentials."
            });
            onSuccess(formData.email);
        } catch (err: any) {
            toast({
                title: "Registration failed",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>Enter your details below to create your account</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First name</Label>
                            <Input id="firstName" placeholder="John" value={formData.firstName} onChange={handleChange} disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last name</Label>
                            <Input id="lastName" placeholder="Doe" value={formData.lastName} onChange={handleChange} disabled={loading} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="m@example.com" required value={formData.email} onChange={handleChange} disabled={loading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" required value={formData.password} onChange={handleChange} disabled={loading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input id="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} disabled={loading} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Creating account..." : "Create Account"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
