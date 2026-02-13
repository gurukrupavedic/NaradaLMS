import { ProficiencyLevel } from './types';

export function getCellColor(
    level: ProficiencyLevel,
    status: 'practicing' | 'completed' | 'absent' | 'not_started'
) {
    if (level === 8 || status === 'absent') {
        return {
            bgColor: 'bg-gray-200',
            textColor: 'text-gray-700',
            borderColor: 'border-gray-400',
            darkBgColor: 'dark:bg-gray-700',
            darkTextColor: 'dark:text-gray-300',
            darkBorderColor: 'dark:border-gray-500',
            bgHex: '#E5E7EB',
            borderHex: '#9CA3AF',
            circleHex: '#6B7280',
            textHex: '#374151',
        };
    }

    if (status === 'not_started') {
        return {
            bgColor: 'bg-gray-50',
            textColor: 'text-gray-400',
            borderColor: 'border-gray-200',
            darkBgColor: 'dark:bg-gray-900',
            darkTextColor: 'dark:text-gray-500',
            darkBorderColor: 'dark:border-gray-700',
            bgHex: '#F9FAFB',
            borderHex: '#E5E7EB',
            circleHex: '#D1D5DB',
            textHex: '#9CA3AF',
        };
    }

    switch (level) {
        case 0: // Practicing
            return {
                bgColor: 'bg-amber-50',
                textColor: 'text-amber-900',
                borderColor: 'border-amber-300',
                darkBgColor: 'dark:bg-amber-900/30',
                darkTextColor: 'dark:text-amber-200',
                darkBorderColor: 'dark:border-amber-700',
                bgHex: '#FEF3C7',
                borderHex: '#FCD34D',
                circleHex: '#F59E0B',
                textHex: '#78350F',
            };

        case 1: // L1 (50%)
            return {
                bgColor: 'bg-emerald-50',
                textColor: 'text-emerald-800',
                borderColor: 'border-emerald-300',
                darkBgColor: 'dark:bg-emerald-900/30',
                darkTextColor: 'dark:text-emerald-200',
                darkBorderColor: 'dark:border-emerald-700',
                bgHex: '#F0FDF4',
                borderHex: '#6EE7B7',
                circleHex: '#10B981', // Emerald 500
                textHex: '#065F46',
            };

        case 2: // L2 (70%)
            return {
                bgColor: 'bg-green-500',
                textColor: 'text-white',
                borderColor: 'border-green-600',
                darkBgColor: 'dark:bg-green-700',
                darkTextColor: 'dark:text-white',
                darkBorderColor: 'dark:border-green-800',
                bgHex: '#22C55E',
                borderHex: '#16A34A',
                circleHex: '#15803D',
                textHex: '#FFFFFF',
            };

        case 3: // L3 (90% Ready)
            return {
                bgColor: 'bg-violet-100',
                textColor: 'text-violet-900',
                borderColor: 'border-violet-300',
                darkBgColor: 'dark:bg-violet-900/30',
                darkTextColor: 'dark:text-violet-200',
                darkBorderColor: 'dark:border-violet-700',
                bgHex: '#EDE9FE',
                borderHex: '#C4B5FD',
                circleHex: '#8B5CF6', // Violet 500
                textHex: '#4C1D95',
            };

        case 4: // L4 (95% Certified)
            return {
                bgColor: 'bg-purple-600',
                textColor: 'text-white',
                borderColor: 'border-purple-700',
                darkBgColor: 'dark:bg-purple-800',
                darkTextColor: 'dark:text-white',
                darkBorderColor: 'dark:border-purple-900',
                bgHex: '#9333EA',
                borderHex: '#7E22CE',
                circleHex: '#6B21A8',
                textHex: '#FFFFFF',
            };

        default:
            return {
                bgColor: 'bg-gray-50',
                textColor: 'text-gray-600',
                borderColor: 'border-gray-200',
                darkBgColor: 'dark:bg-gray-900',
                darkTextColor: 'dark:text-gray-400',
                darkBorderColor: 'dark:border-gray-700',
                bgHex: '#F9FAFB',
                borderHex: '#E5E7EB',
                circleHex: '#D1D5DB',
                textHex: '#4B5563',
            };
    }
}

export function getProficiencyLabel(level: ProficiencyLevel | null): string {
    switch (level) {
        case 8: return 'Absent';
        case 0: return 'Practicing';
        case 1: return 'L1 (50%)';
        case 2: return 'L2 (70%)';
        case 3: return 'L3 (90%)';
        case 4: return 'L4 (95%)';
        default: return 'Not Started';
    }
}

export function getProficiencyShortLabel(level: ProficiencyLevel): string {
    switch (level) {
        case 8: return 'Abs';
        case 9: return 'NS';
        case 0: return 'Prac';
        case 1: return 'L1';
        case 2: return 'L2';
        case 3: return 'L3';
        case 4: return 'L4';
        default: return '—';
    }
}

export const PROFICIENCY_OPTIONS: Array<{ value: ProficiencyLevel; label: string; description: string }> = [
    { value: 8, label: 'Absent', description: 'Student was absent for this session' },
    { value: 0, label: 'Practicing', description: 'Currently learning, minimal competency' },
    { value: 1, label: 'L1 (50%)', description: 'Basic recitation capability, needs practice' },
    { value: 2, label: 'L2 (70%)', description: 'Good flow, minor corrections needed' },
    { value: 3, label: 'L3 (90% Ready)', description: 'Ready for certification exam' },
    { value: 4, label: 'L4 (95% Certified)', description: 'Mastered and certified' },
];
