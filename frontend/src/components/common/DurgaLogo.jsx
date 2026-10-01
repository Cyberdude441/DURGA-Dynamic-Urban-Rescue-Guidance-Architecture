import React from 'react';

export default function DurgaLogo({ size = 32, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 select-none ${className}`}
      aria-label="DURGA Logo"
      role="img"
    >
      <path
        d="M16 2.75L27 6.8V15C27 21.95 22.6 27.8 16 30C9.4 27.8 5 21.95 5 15V6.8L16 2.75Z"
        fill="#166534"
      />
      <path
        d="M16 5.2L23.8 8.05V14.9C23.8 20.05 20.75 24.65 16 26.55C11.25 24.65 8.2 20.05 8.2 14.9V8.05L16 5.2Z"
        fill="#22c55e"
      />
      <path
        d="M14.35 8.25H17.65V10.45H19.85V13.75H17.65V15.95H14.35V13.75H12.15V10.45H14.35V8.25Z"
        fill="#ffffff"
      />
      <path
        d="M11.25 23.45C12.7 20.15 14.25 18.1 16 17.05C17.75 18.1 19.3 20.15 20.75 23.45"
        stroke="#f0fdf4"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16 23.4V18.1"
        stroke="#166534"
        strokeWidth="1.25"
        strokeDasharray="1.5 1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
