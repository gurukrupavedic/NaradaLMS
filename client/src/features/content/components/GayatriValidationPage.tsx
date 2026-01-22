import React, { useState } from 'react';
import {
    BookOpen,
    Home,
    LayoutDashboard,
    Settings,
    Users,
    Bell,
    Search,
    ChevronRight,
    Play,
    AlertCircle,
    CheckCircle2,
    Moon,
    Sun
} from 'lucide-react';

/**
 * GAYATRI COLOR CONSTANTS (LIGHT MODE)
 */
const COLORS_LIGHT = {
    // NILA (Sapphire/Navy) - Structure
    nilaBase: '#0F172A',      // Slate 900 - Sidebar
    nilaSurface: '#1E293B',   // Slate 800
    nilaText: '#0F172A',      // Primary Text
    nilaMuted: '#64748B',     // Slate 500

    // MUKTA (Pearl) - Canvas
    muktaCanvas: '#F8F7F5',   // Warm Off-White
    muktaCard: '#FFFFFF',     // Pure White Cards
    muktaBorder: '#E2E8F0',   // Slate 200

    // HEMA (Gold) - Action / Illumination
    hemaPrimary: '#D97706',   // Amber 600 - Readable Gold
    hemaGlow: 'rgba(217, 119, 6, 0.15)', // Amber Glow

    // VIDRUMA (Coral) - Warning / Energy
    vidrumaWarn: '#F97316',   // Orange 500
    vidrumaBg: '#FFF7ED',     // Orange 50
    vidrumaText: '#9A3412',   // Orange 800

    // DHAVALA (Clear) - Contrast
    dhavalaWhite: '#FFFFFF',

    // SYSTEM (Proficiency)
    profPracticing: '#FEF3C7',
    profL1: '#ECFCCB',
    profL2: '#DCFCE7',
    profL3: '#F3E8FF',
    profL4: '#FAE8FF',
};

/**
 * GAYATRI COLOR CONSTANTS (DARK MODE - "THE INNER SANCTUM")
 */
const COLORS_DARK = {
    // NILA (Sapphire/Navy) - The Infinite Background
    nilaBase: '#020617',      // Slate 950 (Deepest)
    nilaSurface: '#0F172A',   // Slate 900 (Sidebar/Elevated)
    nilaText: '#F8FAFC',      // Slate 50 (Near White)
    nilaMuted: '#94A3B8',     // Slate 400

    // MUKTA (Pearl) - Transformed to "Deep Pearl/Midnight"
    muktaCanvas: '#020617',   // Slate 950
    muktaCard: '#1E293B',     // Slate 800 (Card Surface)
    muktaBorder: '#334155',   // Slate 700

    // HEMA (Gold) - Radiant Light in Darkness
    hemaPrimary: '#F59E0B',   // Amber 500 (Brighter for Dark Mode)
    hemaGlow: 'rgba(245, 158, 11, 0.20)',

    // VIDRUMA (Coral)
    vidrumaWarn: '#FB923C',   // Orange 400 (Brighter)
    vidrumaBg: 'rgba(154, 52, 18, 0.2)', // Dark Orange Alpha
    vidrumaText: '#FFEDD5',   // Orange 100

    // DHAVALA (Clear)
    dhavalaWhite: '#FFFFFF',

    // SYSTEM (Proficiency) - Dark Mode Variants
    profPracticing: 'rgba(251, 191, 36, 0.2)', // Amber 400 alpha
    profL1: 'rgba(163, 230, 53, 0.2)',        // Lime 400 alpha
    profL2: 'rgba(74, 222, 128, 0.2)',        // Green 400 alpha
    profL3: 'rgba(192, 132, 252, 0.2)',       // Violet 400 alpha
    profL4: 'rgba(232, 121, 249, 0.2)',       // Fuchsia 400 alpha
};

export default function GayatriValidationPage() {
    const [isDark, setIsDark] = useState(false);
    const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;

    return (
        <div className="flex h-screen w-full font-sans antialiased transition-colors duration-300" style={{ backgroundColor: COLORS.muktaCanvas, color: COLORS.nilaText }}>

            {/* 1. APP SHELL: SIDEBAR (NILA) */}
            <aside className="w-64 flex-shrink-0 flex flex-col transition-colors duration-300" style={{ backgroundColor: isDark ? COLORS.nilaSurface : COLORS.nilaBase, color: COLORS.dhavalaWhite }}>
                {/* Logo Area */}
                <div className="h-16 flex items-center px-6 border-b border-white/10">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ border: `2px solid ${COLORS.hemaPrimary}` }}>
                        <span className="text-xs font-bold" style={{ color: COLORS.hemaPrimary }}>ॐ</span>
                    </div>
                    <span className="font-semibold tracking-wide text-lg">Narada<span style={{ color: COLORS.hemaPrimary }}>LMS</span></span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 space-y-1">
                    <NavItem icon={<Home size={20} />} label="Dashboard" colors={COLORS} />
                    <NavItem icon={<LayoutDashboard size={20} />} label="Batches" active colors={COLORS} />
                    <NavItem icon={<BookOpen size={20} />} label="Curriculum" colors={COLORS} />
                    <NavItem icon={<Users size={20} />} label="Students" colors={COLORS} />
                    <NavItem icon={<Settings size={20} />} label="Configure" colors={COLORS} />
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium">
                            JD
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">Jayant Dave</span>
                            <span className="text-xs opacity-60">Instructor</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* 2. APP SHELL: MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Header */}
                <header className="h-16 flex items-center justify-between px-8 border-b transition-colors duration-300" style={{ backgroundColor: isDark ? COLORS.muktaCard : COLORS.dhavalaWhite, borderColor: COLORS.muktaBorder }}>
                    <div className="flex items-center text-sm" style={{ color: COLORS.nilaMuted }}>
                        <span>Batches</span>
                        <ChevronRight size={16} className="mx-2" />
                        <span style={{ color: COLORS.nilaText, fontWeight: 500 }}>Vedic Chanting Morning - Cohort A</span>
                    </div>
                    <div className="flex items-center gap-4">

                        {/* THEME TOGGLE (Moved to Header) */}
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            style={{ color: COLORS.nilaMuted }}
                            title="Toggle Theme"
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                        <div className="relative">
                            <Search size={20} style={{ color: COLORS.nilaMuted }} />
                        </div>
                        <div className="relative">
                            <Bell size={20} className="cursor-pointer" style={{ color: COLORS.nilaMuted }} />
                            <div className="absolute top-0 right-0 w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.vidrumaWarn }}></div>
                        </div>
                    </div>
                </header>

                {/* Scrollable Canvas */}
                <div className="flex-1 overflow-auto p-8">

                    <div className="max-w-5xl mx-auto space-y-8">

                        {/* Page Header + Primary Action */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold" style={{ color: COLORS.nilaText }}>Batch Dashboard</h1>
                                <p className="mt-1" style={{ color: COLORS.nilaMuted }}>Manage student progress and curriculum delivery.</p>
                            </div>
                            <button
                                className="px-5 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-transform active:scale-95"
                                style={{ backgroundColor: COLORS.hemaPrimary, color: isDark ? '#1a0500' : 'white' }}
                            >
                                <Play size={18} fill="currentColor" />
                                Start Live Session
                            </button>
                        </div>

                        {/* 3. WARNING STATE (VIDRUMA) */}
                        <div className="rounded-lg p-4 border-l-4 flex items-start gap-4" style={{ backgroundColor: COLORS.vidrumaBg, borderColor: COLORS.vidrumaWarn }}>
                            <AlertCircle className="shrink-0 mt-0.5" size={20} style={{ color: COLORS.vidrumaWarn }} />
                            <div>
                                <h3 className="font-semibold text-sm" style={{ color: COLORS.vidrumaText }}>3 Students At Risk</h3>
                                <p className="text-sm mt-1" style={{ color: isDark ? COLORS.nilaText : '#475569' }}>Attendance has dropped below 70% for this week. Review the report before starting.</p>
                            </div>
                        </div>

                        {/* 4. CONTENT AREA (MUKTA + ACADEMIC DATA) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Card 1: Sacred Text Reading (The "Soul") */}
                            <div className="rounded-xl shadow-sm border p-6 transition-colors duration-300" style={{ backgroundColor: COLORS.muktaCard, borderColor: COLORS.muktaBorder }}>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-semibold text-lg" style={{ color: COLORS.nilaText }}>Current Recitation</h3>
                                    <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-600">Mantra 4.2</span>
                                </div>

                                <div className="space-y-6 text-center">
                                    <p className="text-3xl leading-relaxed font-serif" style={{ color: COLORS.nilaText }}>
                                        ॐ भूर् भुवः स्वः
                                    </p>

                                    {/* Illuminated Segment (Hema) */}
                                    <div className="relative inline-block px-4 py-2 rounded-lg" style={{ backgroundColor: COLORS.hemaGlow }}>
                                        <p className="text-3xl leading-relaxed font-serif font-medium" style={{ color: isDark ? COLORS.hemaPrimary : COLORS.nilaBase, textShadow: isDark ? '0 0 15px rgba(245, 158, 11, 0.3)' : '0 0 1px rgba(217,119,6,0.2)' }}>
                                            तत् सवितुर् वरेण्यं
                                        </p>
                                        <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded" style={{ backgroundColor: COLORS.hemaPrimary, boxShadow: isDark ? '0 0 10px rgba(245, 158, 11, 0.5)' : 'none' }}></div>
                                    </div>

                                    <p className="text-3xl leading-relaxed font-serif opacity-60" style={{ color: COLORS.nilaText }}>
                                        भर्गो देवस्य धीमहि
                                    </p>
                                </div>

                                <div className="mt-8 flex justify-center gap-4">
                                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9' }}>
                                        <div className="h-full w-1/3 rounded-full" style={{ backgroundColor: COLORS.hemaPrimary }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Proficiency Matrix (The "System") */}
                            <div className="rounded-xl shadow-sm border p-6 transition-colors duration-300" style={{ backgroundColor: COLORS.muktaCard, borderColor: COLORS.muktaBorder }}>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-semibold text-lg" style={{ color: COLORS.nilaText }}>Proficiency Matrix</h3>
                                    <button className="text-sm font-medium hover:underline" style={{ color: COLORS.nilaMuted }}>View All</button>
                                </div>

                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="border-b" style={{ borderColor: COLORS.muktaBorder }}>
                                            <th className="pb-3 pt-1 font-medium" style={{ color: COLORS.nilaMuted }}>Student</th>
                                            <th className="pb-3 pt-1 font-medium text-center" style={{ color: COLORS.nilaMuted }}>Ch 1</th>
                                            <th className="pb-3 pt-1 font-medium text-center" style={{ color: COLORS.nilaMuted }}>Ch 2</th>
                                            <th className="pb-3 pt-1 font-medium text-center" style={{ color: COLORS.nilaMuted }}>Ch 3</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ divideColor: COLORS.muktaBorder }}>
                                        <tr className="group">
                                            <td className="py-3 font-medium" style={{ color: COLORS.nilaText }}>Arjun K.</td>
                                            <td className="p-2 text-center"><Badge color={COLORS.profL4} isDark={isDark}>L4</Badge></td>
                                            <td className="p-2 text-center"><Badge color={COLORS.profL4} isDark={isDark}>L4</Badge></td>
                                            <td className="p-2 text-center"><Badge color={COLORS.profL2} isDark={isDark}>L2</Badge></td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 font-medium" style={{ color: COLORS.nilaText }}>Bhavya S.</td>
                                            <td className="p-2 text-center"><Badge color={COLORS.profL4} isDark={isDark}>L4</Badge></td>
                                            <td className="p-2 text-center"><Badge color={COLORS.profL3} isDark={isDark}>L3</Badge></td>
                                            <td className="p-2 text-center"><Badge color={COLORS.profPracticing} isDark={isDark}>Prac</Badge></td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 font-medium" style={{ color: COLORS.nilaText }}>Chirag M.</td>
                                            <td className="p-2 text-center"><Badge color={COLORS.profL3} isDark={isDark}>L3</Badge></td>
                                            <td className="p-2 text-center"><Badge color={COLORS.profL1} isDark={isDark}>L1</Badge></td>
                                            <td className="p-2 text-center"><span style={{ color: COLORS.nilaMuted }}>-</span></td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="mt-4 text-xs p-3 rounded border" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderColor: COLORS.muktaBorder, color: COLORS.nilaMuted }}>
                                    <strong>System Check:</strong> Note how the Proficiency colors (Green/Purple badges) stay distinct from the Brand colors (Gold button/Blue sidebar).
                                </div>
                            </div>

                        </div>

                        {/* 5. PHASE 3: FEEDBACK & OPERATIONS LAB */}
                        <div className="border-t pt-8 mt-8" style={{ borderColor: COLORS.muktaBorder }}>
                            <h2 className="text-xl font-bold mb-6" style={{ color: COLORS.nilaText }}>Phase 3: Operational States Lab</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                {/* A. Inputs & Focus */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: COLORS.nilaMuted }}>Idle vs Focus</h3>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            placeholder="Idle Input (Mukta Border)"
                                            className="w-full px-3 py-2 rounded-md border text-sm transition-all outline-none focus:ring-2 focus:ring-offset-2"
                                            style={{
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'white',
                                                borderColor: COLORS.muktaBorder,
                                                color: COLORS.nilaText,
                                                // Note: Tailwind classes usually handle focus ring color via --ring variable
                                                // We will rely on global CSS for ring color, simulating standard input behavior
                                            }}
                                        />
                                        <div className="text-xs" style={{ color: COLORS.nilaMuted }}>
                                            *Focus ring should be thin Gold (Hema). Border should be Calm (Mukta).
                                        </div>
                                    </div>
                                </div>

                                {/* B. Destructive & Critical */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: COLORS.nilaMuted }}>Critical Feedback</h3>

                                    {/* Destructive Button */}
                                    <div className="flex gap-4 items-center">
                                        <button
                                            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                            style={{ backgroundColor: COLORS.vidrumaWarn, color: '#FFFFFF' }}
                                        >
                                            Delete Batch
                                        </button>
                                        <span className="text-xs" style={{ color: COLORS.nilaMuted }}>Vidruma (Coral) for Destructive</span>
                                    </div>

                                    {/* Error Alert */}
                                    <div className="p-4 rounded-md flex items-start gap-3 border" style={{
                                        backgroundColor: isDark ? 'rgba(154, 52, 18, 0.1)' : '#FFF7ED',
                                        borderColor: 'rgba(249, 115, 22, 0.2)'
                                    }}>
                                        <AlertCircle size={18} style={{ color: COLORS.vidrumaWarn }} />
                                        <div className="text-sm">
                                            <strong style={{ color: COLORS.vidrumaText }}>Connection Error</strong>
                                            <p className="mt-1" style={{ color: COLORS.vidrumaText }}>Unable to sync student progress. Retrying...</p>
                                        </div>
                                    </div>
                                </div>

                                {/* C. Muted / Empty State */}
                                <div className="col-span-1 md:col-span-2 p-8 rounded-lg border border-dashed text-center" style={{ borderColor: COLORS.muktaBorder }}>
                                    <div className="inline-flex p-3 rounded-full mb-3" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}>
                                        <Search size={24} style={{ color: COLORS.nilaMuted }} />
                                    </div>
                                    <h4 className="font-medium" style={{ color: COLORS.nilaText }}>No Curriculum Found</h4>
                                    <p className="text-sm mt-1 max-w-sm mx-auto" style={{ color: COLORS.nilaMuted }}>
                                        This is a muted state example. The text should be distinct but de-emphasized without becoming unreadable.
                                    </p>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false, colors }: { icon: React.ReactNode, label: string, active?: boolean, colors: any }) {
    return (
        <a href="#" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <span style={{ color: active ? colors.hemaPrimary : 'currentColor' }}>{icon}</span>
            <span className="text-sm font-medium">{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.hemaPrimary }}></div>}
        </a>
    );
}

function Badge({ children, color, isDark }: { children: React.ReactNode, color: string, isDark: boolean }) {
    return (
        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded text-xs font-bold" style={{ backgroundColor: color, color: isDark ? '#E2E8F0' : '#334155' }}>
            {children}
        </span>
    );
}
