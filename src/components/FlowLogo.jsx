import React from 'react';

const FlowLogo = ({ className = "w-10 h-10" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main geometric shape - abstract flow design with multiple facets */}
      <g>
        {/* Central facet - main body */}
        <path
          d="M 50 20 L 70 35 L 65 55 L 50 60 L 35 55 L 30 35 Z"
          fill="#5a8a3a"
          opacity="0.95"
        />
        
        {/* Top-left facet */}
        <path
          d="M 50 20 L 70 35 L 65 25 L 50 20 Z"
          fill="#6b9a4a"
          opacity="0.85"
        />
        
        {/* Top-right facet */}
        <path
          d="M 50 20 L 30 35 L 35 25 L 50 20 Z"
          fill="#4a7c2a"
          opacity="0.9"
        />
        
        {/* Right facet */}
        <path
          d="M 70 35 L 65 55 L 75 50 L 70 35 Z"
          fill="#4a7c2a"
          opacity="0.8"
        />
        
        {/* Left facet */}
        <path
          d="M 30 35 L 35 55 L 25 50 L 30 35 Z"
          fill="#6b9a4a"
          opacity="0.8"
        />
        
        {/* Bottom-left facet */}
        <path
          d="M 35 55 L 50 60 L 45 70 L 35 55 Z"
          fill="#6b9a4a"
          opacity="0.75"
        />
        
        {/* Bottom-right facet */}
        <path
          d="M 65 55 L 50 60 L 55 70 L 65 55 Z"
          fill="#4a7c2a"
          opacity="0.75"
        />
        
        {/* Center highlight for depth */}
        <path
          d="M 50 30 L 60 40 L 55 50 L 50 52 L 45 50 L 40 40 Z"
          fill="#7baa5a"
          opacity="0.5"
        />
        
        {/* Additional accent shapes for complexity */}
        <path
          d="M 45 25 L 50 30 L 47 32 L 45 25 Z"
          fill="#8bba6a"
          opacity="0.6"
        />
        <path
          d="M 55 25 L 50 30 L 53 32 L 55 25 Z"
          fill="#8bba6a"
          opacity="0.6"
        />
      </g>
      
      {/* Flowing accent lines */}
      <path
        d="M 20 50 Q 30 45 35 55"
        stroke="#5a8a3a"
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M 80 50 Q 70 45 65 55"
        stroke="#5a8a3a"
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
};

export default FlowLogo;

