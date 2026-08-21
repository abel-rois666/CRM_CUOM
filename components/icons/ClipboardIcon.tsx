import React from 'react';

const ClipboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.666 3.888A2.25 2.25 0 0 0 13.56 2.25h-3.12a2.25 2.25 0 0 0-2.106 1.638m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184m7.332 0 1.927.184m-1.927-.184h-3.12m-3.12 0-1.927.184m-1.927-.184C4.85 4.025 4.257 4.15 3.684 4.34M13.56 2.25h-3.12M13.56 2.25a2.25 2.25 0 0 1 2.106 1.638"
    />
  </svg>
);

export default ClipboardIcon;
