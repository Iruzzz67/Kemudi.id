import React from 'react';

interface TrafficSignSvgProps {
  type: string;
  size?: number;
}

export const TrafficSignSvg: React.FC<TrafficSignSvgProps> = ({ type, size = 64 }) => {
  switch (type) {
    case 'curve-left':
      // Yellow diamond warning sign with left curve arrow
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-sm">
          <polygon points="50,4 96,50 50,96 4,50" fill="#FBBF24" stroke="#000" strokeWidth="4" />
          <path
            d="M 52 75 L 52 50 Q 52 36 36 36 L 30 36 M 38 28 L 26 36 L 38 44"
            fill="none"
            stroke="#000"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'road-narrow':
      // Yellow diamond warning sign with road narrowing
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-sm">
          <polygon points="50,4 96,50 50,96 4,50" fill="#FBBF24" stroke="#000" strokeWidth="4" />
          <path d="M 32 75 L 32 60 L 40 45 L 40 25" fill="none" stroke="#000" strokeWidth="6" strokeLinecap="round" />
          <path d="M 68 75 L 68 60 L 60 45 L 60 25" fill="none" stroke="#000" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );

    case 'pedestrian':
      // Yellow diamond warning pedestrian crossing
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-sm">
          <polygon points="50,4 96,50 50,96 4,50" fill="#FBBF24" stroke="#000" strokeWidth="4" />
          {/* Head */}
          <circle cx="50" cy="34" r="5" fill="#000" />
          {/* Body and legs */}
          <path d="M 50 40 L 50 56 L 40 70 M 50 56 L 60 70 M 42 48 L 58 48" stroke="#000" strokeWidth="5" strokeLinecap="round" />
          {/* Zebra stripes beneath */}
          <line x1="28" y1="78" x2="72" y2="78" stroke="#000" strokeWidth="3" />
        </svg>
      );

    case 'no-stopping':
      // Red circle prohibition sign with blue background and red cross (Letter S coret in Indonesia)
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-sm">
          <circle cx="50" cy="50" r="45" fill="#FFFFFF" stroke="#DC2626" strokeWidth="10" />
          <text x="50" y="65" textAnchor="middle" fontSize="48" fontWeight="bold" fontFamily="sans-serif" fill="#000">
            S
          </text>
          <line x1="20" y1="20" x2="80" y2="80" stroke="#DC2626" strokeWidth="9" strokeLinecap="round" />
        </svg>
      );

    case 'no-parking':
      // Prohibition sign Letter P with diagonal red slash
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-sm">
          <circle cx="50" cy="50" r="45" fill="#FFFFFF" stroke="#DC2626" strokeWidth="10" />
          <text x="50" y="66" textAnchor="middle" fontSize="48" fontWeight="bold" fontFamily="sans-serif" fill="#000">
            P
          </text>
          <line x1="20" y1="20" x2="80" y2="80" stroke="#DC2626" strokeWidth="9" strokeLinecap="round" />
        </svg>
      );

    case 'speed-40':
      // Red circle speed limit 40
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-sm">
          <circle cx="50" cy="50" r="45" fill="#FFFFFF" stroke="#DC2626" strokeWidth="10" />
          <text x="50" y="62" textAnchor="middle" fontSize="38" fontWeight="900" fontFamily="sans-serif" fill="#000">
            40
          </text>
          <text x="50" y="76" textAnchor="middle" fontSize="11" fontWeight="bold" fontFamily="sans-serif" fill="#555">
            km/h
          </text>
        </svg>
      );

    case 'turn-left-mandatory':
      // Blue circle mandatory turn left arrow
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-sm">
          <circle cx="50" cy="50" r="45" fill="#2563EB" stroke="#FFFFFF" strokeWidth="3" />
          <path
            d="M 64 68 L 64 48 Q 64 36 50 36 L 36 36 M 44 26 L 30 36 L 44 46"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'motorcycle-lane':
      // Blue circle mandatory motorcycle lane
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-sm">
          <circle cx="50" cy="50" r="45" fill="#2563EB" stroke="#FFFFFF" strokeWidth="3" />
          {/* Stylized scooter/motorcycle */}
          <circle cx="34" cy="62" r="10" fill="none" stroke="#FFFFFF" strokeWidth="4" />
          <circle cx="66" cy="62" r="10" fill="none" stroke="#FFFFFF" strokeWidth="4" />
          <path d="M 34 62 L 48 62 L 56 46 L 42 46 L 38 38 L 46 38" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
          <circle cx="58" cy="38" r="4" fill="#FFFFFF" />
        </svg>
      );

    default:
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="#2563EB" />
          <text x="50" y="60" textAnchor="middle" fill="#FFF" fontSize="30">
            !
          </text>
        </svg>
      );
  }
};
