"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
    Button,
    Input,
    Tabs, TabsContent, TabsList, TabsTrigger,
    Card, CardContent, CardDescription, CardHeader, CardTitle,
    Label,
    useToast,
    cn
} from "@narada/ui";
import { apiRequest } from "@/lib/api";
import { FcGoogle } from "react-icons/fc";

// Assets
import kolamPattern from "@/assets/branding/kolam-2.svg";
import logoStacked from "@/assets/branding/logo-stacked-dark-notag.svg";
import slmtsLogo from "@/assets/branding/SLMTS LOGO 01-2025 FINAL.png";
import Image from "next/image";

export function StudentAuthPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTab = searchParams.get("tab") === "register" ? "register" : "login";
    const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
    const queryClient = useQueryClient();

    const handleGoogleLogin = () => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
            console.error('NEXT_PUBLIC_API_URL environment variable is not set');
            return;
        }
        window.location.href = `${apiUrl}/auth/google`;
    };

    return (
        <div className="h-screen w-full flex overflow-hidden bg-background">
            {/* LEFT PANEL: Sacred Illumination */}
            <div className="hidden lg:flex w-1/2 relative bg-nila-base overflow-hidden items-center justify-center">
                {/* Kolam Geometric Overlay */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-60"
                    style={{
                        maskImage: `url(${kolamPattern.src})`,
                        maskSize: "200%",
                        maskPosition: "25% 8%",
                        maskRepeat: "no-repeat",
                        WebkitMaskImage: `url(${kolamPattern.src})`,
                        WebkitMaskSize: "200%",
                        WebkitMaskPosition: "25% 8%",
                        WebkitMaskRepeat: "no-repeat",
                    }}
                >
                    {/* Layer 1: Base Etching (Static Gold Lines) */}
                    <div className="absolute inset-0 bg-hema-base opacity-40" />

                    {/* Layer 2: The Blade Sheen (Intense Moving Highlight) */}
                    <div className="absolute inset-0 overflow-hidden -skew-x-12">
                        <div className="absolute inset-0 -translate-x-full animate-shimmer" style={{ background: 'linear-gradient(to right, transparent 0%, oklch(0.95 0.14 85 / 0.9) 50%, transparent 100%)' }} />
                        <div className="absolute inset-0 -translate-x-full animate-shimmer" style={{ background: 'linear-gradient(to right, transparent 0%, oklch(0.95 0.14 85 / 0.9) 50%, transparent 100%)', animationDelay: '4s' }} />
                    </div>
                </div>

                {/* Atmospheric Fade Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-nila-base pointer-events-none" />

                {/* Central Hero Logo */}
                <div className="relative z-10 p-12 flex flex-col items-center text-center">
                    <Image
                        src={logoStacked}
                        alt="Narada LMS"
                        width={384}
                        height={200}
                        className="w-96 h-auto drop-shadow-2xl mb-8"
                    />
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-white tracking-wide">
                            Vedic Wisdom. Modern Learning.
                        </h2>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Authentication Forms */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white h-full overflow-y-auto border-l border-slate-200">
                <div className="w-full max-w-md space-y-6">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8 shrink-0">
                        <h1 className="text-2xl font-bold text-slate-900">Narada LMS</h1>
                    </div>

                    <div className="text-center space-y-2 shrink-0 mb-8">
                        <Image
                            src={slmtsLogo}
                            alt="SLMTS Learning"
                            width={128}
                            height={128}
                            className="h-32 w-auto mx-auto mb-4"
                        />
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome to SLMTS Learning</h1>
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
                                    // Force hard redirect to ensure fresh state/sidebar context
                                    setTimeout(() => {
                                        window.location.href = "/vedic-learning";
                                    }, 500);
                                }}
                            />
                        </TabsContent>

                        <TabsContent value="register" className="mt-0">
                            <RegisterForm
                                onSuccess={() => {
                                    setActiveTab("login");
                                }}
                            />
                        </TabsContent>
                    </Tabs>

                    <p className="px-8 text-center text-sm text-slate-400 mt-8 shrink-0">
                        By clicking continue, you agree to our{" "}
                        {/* Terms of Service and Privacy Policy links to be added when pages exist */}
<span className="text-slate-500 text-sm">Terms of Service</span>{" "}
                        and{" "}
                        <span className="text-slate-500 text-sm">Privacy Policy</span>.
                    </p>
                </div>
            </div>
        </div>
    );
}

// Helper for 'Force Light' inputs
const LightInput = ({ className, ...props }: React.ComponentProps<typeof Input>) => (
    <Input
        {...props}
        className={cn(
            "bg-white border-slate-200 !text-slate-900 placeholder:text-slate-400 focus-visible:ring-hema-base focus-visible:ring-offset-0",
            "[&:-webkit-autofill]:bg-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset] [&:-webkit-autofill]:-webkit-text-fill-color:rgb(15_23_42)",
            className
        )}
    />
);
const LightLabel = ({ className, ...props }: React.ComponentProps<typeof Label>) => (
    <Label {...props} className={cn("text-slate-600 font-medium", className)} />
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
            await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });

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
        <Card className="border-slate-200 bg-white shadow-sm pt-6">
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <LightLabel htmlFor="email">Email</LightLabel>
                        <LightInput
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            disabled={loading}
                            autoComplete="email"
                            spellCheck={false}
                        />
                    </div>
                    <div className="space-y-2">
                        <LightLabel htmlFor="password">Password</LightLabel>
                        <LightInput
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            disabled={loading}
                            autoComplete="current-password"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !loading) {
                                    handleSubmit(e as any);
                                }
                            }}
                        />
                    </div>
                    <Button type="submit" className="w-full bg-hema-base hover:opacity-80 transition-opacity text-white" disabled={loading}>
                        {loading ? "Signing in…" : "Sign In"}
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
            await apiRequest("/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    email: formData.email.toLowerCase(),
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                }),
            });

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
        <Card className="border-slate-200 bg-white shadow-sm pt-6">
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
                        <LightInput
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            disabled={loading}
                            autoComplete="email"
                            spellCheck={false}
                        />
                    </div>
                    <div className="space-y-2">
                        <LightLabel htmlFor="password">Password</LightLabel>
                        <LightInput
                            id="password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            disabled={loading}
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="space-y-2">
                        <LightLabel htmlFor="confirmPassword">Confirm Password</LightLabel>
                        <LightInput
                            id="confirmPassword"
                            type="password"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            disabled={loading}
                            autoComplete="new-password"
                        />
                    </div>
                    <Button type="submit" className="w-full bg-hema-base hover:opacity-80 transition-opacity text-white" disabled={loading}>
                        {loading ? "Creating account…" : "Create Account"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
