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
import kolamPattern from "@/assets/branding/kolam-2.svg";
import logoStacked from "@/assets/branding/logo-stacked-dark-notag.svg";

import { FcGoogle } from "react-icons/fc";

// ... (existing imports, but defining FcGoogle nearby if I can't edit top cleanly)
// Actually I'll just replace the whole file content block for the right panel area or simpler chunks.

export function AuthPage() {
    // ... (state)
    const [location, navigate] = useLocation();
    const [activeTab, setActiveTab] = useState<"login" | "register">(location === "/register" ? "register" : "login");
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const handleGoogleLogin = () => {
        window.location.href = "/api/auth/google";
    };

    return (
        <div className="min-h-screen w-full flex overflow-hidden bg-background">
            {/* LEFT PANEL: Sacred Illumination */}
            <div className="hidden lg:flex w-1/2 relative bg-nila-base overflow-hidden items-center justify-center">
                {/* ... (keep existing left panel) ... */}
                {/* Kolam Background Layer */}
                {/* Kolam Geometric Overlay */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-60"
                    style={{
                        maskImage: `url(${kolamPattern})`,
                        maskSize: "200%",
                        maskPosition: "25% 8%",
                        maskRepeat: "no-repeat",
                        WebkitMaskImage: `url(${kolamPattern})`,
                        WebkitMaskSize: "200%",
                        WebkitMaskPosition: "25% 8%",
                        WebkitMaskRepeat: "no-repeat",
                    }}
                >
                    {/* Layer 1: Base Etching (Static Gold Lines) */}
                    <div className="absolute inset-0 bg-hema-base opacity-20" />

                    {/* Layer 2: The Blade Sheen (Intense Moving Highlight) */}
                    <div className="absolute inset-0 overflow-hidden -skew-x-12">
                        <div className="absolute inset-0 -translate-x-full animate-shimmer" style={{ background: 'linear-gradient(to right, transparent 0%, oklch(0.76 0.14 85 / 0.9) 50%, transparent 100%)' }} />
                    </div>
                </div>

                {/* Atmospheric Fade Overlay (Fix: Use correct 'nila-base') */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-nila-base pointer-events-none" />

                {/* Central Hero Logo */}
                <div className="relative z-10 p-12 flex flex-col items-center text-center">
                    <img
                        src={logoStacked}
                        alt="Narada LMS"
                        className="w-96 h-auto drop-shadow-2xl mb-8"
                    />
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-dhavala-text tracking-wide">
                            Vedic Wisdom. Modern Learning.
                        </h2>
                        <p className="text-dhavala-text opacity-70 max-w-sm mx-auto">
                            Access your batches, track progress, and master the ancient arts.
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Authentication Forms */}
            {/* FORCE LIGHT THEME: Explicit slate colors to override global dark mode interactions */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md space-y-6">

                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8 shrink-0">
                        <img src="/icon-contained-dark.svg" className="w-16 h-16 mx-auto mb-4" alt="Logo" />
                        <h1 className="text-2xl font-bold text-slate-900">Narada LMS</h1>
                    </div>

                    <div className="text-center space-y-2 shrink-0 mb-8">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome</h1>
                        <p className="text-sm text-slate-500">Sign in to your account to continue</p>
                    </div>

                    {/* Social Login */}
                    <Button
                        variant="outline"
                        className="w-full py-5 flex items-center gap-2 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 mb-6 shrink-0"
                        onClick={handleGoogleLogin}
                    >
                        <FcGoogle className="h-5 w-5" />
                        Continue with Google
                    </Button>

                    <div className="relative shrink-0 mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-slate-400 font-medium">
                                Or continue with email
                            </span>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1 rounded-lg">
                            <TabsTrigger
                                value="login"
                                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500"
                            >
                                Login
                            </TabsTrigger>
                            <TabsTrigger
                                value="register"
                                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500"
                            >
                                Register
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="login" className="mt-0">
                            <LoginForm
                                onSuccess={() => {
                                    queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
                                    setTimeout(() => navigate("/app"), 300);
                                }}
                            />
                        </TabsContent>

                        <TabsContent value="register" className="mt-0">
                            <RegisterForm
                                onSuccess={(email) => {
                                    setActiveTab("login");
                                }}
                            />
                        </TabsContent>
                    </Tabs>

                    <p className="px-8 text-center text-sm text-slate-400 mt-8 shrink-0">
                        By clicking continue, you agree to our{" "}
                        <a href="#" className="underline hover:text-slate-600 transition-colors">Terms of Service</a>{" "}
                        and{" "}
                        <a href="#" className="underline hover:text-slate-600 transition-colors">Privacy Policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
}

// Helper for 'Force Light' inputs
const LightInput = (props: React.ComponentProps<typeof Input>) => (
    <Input
        {...props}
        className={`bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-hema-base focus-visible:ring-offset-0 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset] [&:-webkit-autofill]:-webkit-text-fill-color:rgb(15_23_42) ${props.className}`}
    />
);
const LightLabel = (props: React.ComponentProps<typeof Label>) => (
    <Label {...props} className={`text-slate-600 font-medium ${props.className}`} />
);

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
        <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-slate-900">Login</CardTitle>
                <CardDescription className="text-slate-500">Enter your email below to login</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <LightLabel htmlFor="email">Email</LightLabel>
                        <LightInput id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
                    </div>
                    <div className="space-y-2">
                        <LightLabel htmlFor="password">Password</LightLabel>
                        <LightInput id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
                    </div>
                    <Button type="submit" className="w-full bg-hema-base hover:opacity-80 transition-opacity text-white" disabled={loading}>
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
        <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-slate-900">Create an account</CardTitle>
                <CardDescription className="text-slate-500">Enter your details to register</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <LightLabel htmlFor="firstName">First name</LightLabel>
                            <LightInput id="firstName" placeholder="John" value={formData.firstName} onChange={handleChange} disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <LightLabel htmlFor="lastName">Last name</LightLabel>
                            <LightInput id="lastName" placeholder="Doe" value={formData.lastName} onChange={handleChange} disabled={loading} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <LightLabel htmlFor="email">Email</LightLabel>
                        <LightInput id="email" type="email" placeholder="m@example.com" required value={formData.email} onChange={handleChange} disabled={loading} />
                    </div>
                    <div className="space-y-2">
                        <LightLabel htmlFor="password">Password</LightLabel>
                        <LightInput id="password" type="password" required value={formData.password} onChange={handleChange} disabled={loading} />
                    </div>
                    <div className="space-y-2">
                        <LightLabel htmlFor="confirmPassword">Confirm Password</LightLabel>
                        <LightInput id="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} disabled={loading} />
                    </div>
                    <Button type="submit" className="w-full bg-hema-base hover:opacity-80 transition-opacity text-white" disabled={loading}>
                        {loading ? "Creating account..." : "Create Account"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
