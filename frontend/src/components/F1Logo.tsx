'use client';

interface F1LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function F1Logo({ className = '', size = 'md' }: F1LogoProps) {
  const sizes = {
    sm: { width: 110, height: 30 },
    md: { width: 156, height: 42 },
    lg: { width: 228, height: 60 },
  };

  const { width, height } = sizes[size];

  return (
    <svg
      viewBox="0 0 260 70"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="F1 Analytics Logo"
    >
      <defs>
        <linearGradient id="logoSpeed" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E10600" stopOpacity="0.25" />
          <stop offset="55%" stopColor="#E10600" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FF3B31" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      <path d="M4 19h36l-11 9H0z" fill="url(#logoSpeed)" />
      <path d="M10 33h27l-10 9H4z" fill="#E10600" opacity="0.85" />

      <path d="M50 10h54l-10 12H73l-5 7h24l-9 11H60l-9 19H36z" fill="#FFFFFF" />
      <path d="M109 10h14l-7 45h-15z" fill="#E10600" />
      <path d="M126 55h7l16-45h-8z" fill="#FFFFFF" opacity="0.95" />

      <text
        x="154"
        y="31"
        fontFamily="Orbitron, Eurostile, BankGothic Md BT, sans-serif"
        fontWeight="800"
        fontSize="19"
        letterSpacing="3"
        fill="#F4F4F5"
      >
        ANALYTICS
      </text>

      <path d="M154 38h98" stroke="#E10600" strokeWidth="2.5" strokeLinecap="round" />

      <text
        x="154"
        y="52"
        fontFamily="Orbitron, Eurostile, BankGothic Md BT, sans-serif"
        fontWeight="500"
        fontSize="9"
        letterSpacing="5"
        fill="#9CA3AF"
      >
        RACE DATA
      </text>
    </svg>
  );
}
