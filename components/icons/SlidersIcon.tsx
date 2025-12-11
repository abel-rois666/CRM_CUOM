import React from 'react';

const SlidersIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <path d="M4 15V9H20V15H4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0" />
            <path d="M7 8L7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 18L17 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 13L12 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Top Line */}
            <path d="M4 7H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="7" r="2" fill="currentColor" />

            {/* Middle Line */}
            <path d="M4 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />

            {/* Bottom Line */}
            <path d="M4 17H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="17" cy="17" r="2" fill="currentColor" />
        </svg>
    );
};

export default SlidersIcon;
