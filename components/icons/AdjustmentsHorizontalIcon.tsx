import React from 'react';

const AdjustmentsHorizontalIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0h-3.75M3 16.5h3.75m-3.75 0a1.5 1.5 0 103 0m3 0h9.75M9.75 10.5H3m10.5 0a1.5 1.5 0 10-3 0m3 0h3.75m-3.75 0H21" />
        </svg>
    );
};

export default AdjustmentsHorizontalIcon;
