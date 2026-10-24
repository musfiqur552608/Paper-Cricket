import { useId } from 'react'

/**
 * A detailed, cylindrical ballpoint pen. The nib sits at (0, 0) and the body
 * extends along the positive X axis, so callers can translate to a point,
 * rotate the pen, and scale it like a real object on the paper.
 */
export function PenGraphic() {
  const uid = useId().replace(/:/g, '')
  const barrel = `${uid}-barrel`
  const grip = `${uid}-grip`
  const metal = `${uid}-metal`
  const gold = `${uid}-gold`
  const cap = `${uid}-cap`
  const clip = `${uid}-clip`
  const gloss = `${uid}-gloss`
  const shadow = `${uid}-shadow`

  return (
    <g>
      <defs>
        <linearGradient id={barrel} x1="0" y1="-12" x2="0" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8fa6c4" />
          <stop offset="0.08" stopColor="#4b6d96" />
          <stop offset="0.24" stopColor="#1c3a5d" />
          <stop offset="0.46" stopColor="#0b1d33" />
          <stop offset="0.62" stopColor="#071525" />
          <stop offset="0.8" stopColor="#173657" />
          <stop offset="0.94" stopColor="#4d7198" />
          <stop offset="1" stopColor="#a8bbd2" />
        </linearGradient>
        <linearGradient id={grip} x1="0" y1="-12" x2="0" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7a8da4" />
          <stop offset="0.12" stopColor="#344b64" />
          <stop offset="0.36" stopColor="#132437" />
          <stop offset="0.58" stopColor="#0a1725" />
          <stop offset="0.8" stopColor="#223c57" />
          <stop offset="1" stopColor="#8297ae" />
        </linearGradient>
        <linearGradient id={metal} x1="0" y1="-10" x2="0" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.14" stopColor="#dfe8f1" />
          <stop offset="0.34" stopColor="#9aacbe" />
          <stop offset="0.52" stopColor="#5d7085" />
          <stop offset="0.72" stopColor="#c3d1de" />
          <stop offset="0.9" stopColor="#7f92a6" />
          <stop offset="1" stopColor="#f4f8fc" />
        </linearGradient>
        <linearGradient id={gold} x1="0" y1="-11" x2="0" y2="11" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff4c4" />
          <stop offset="0.16" stopColor="#f0cc77" />
          <stop offset="0.38" stopColor="#bd8740" />
          <stop offset="0.58" stopColor="#7b4c17" />
          <stop offset="0.78" stopColor="#d7aa5b" />
          <stop offset="1" stopColor="#f7e3a4" />
        </linearGradient>
        <linearGradient id={cap} x1="0" y1="-12" x2="0" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#55789b" />
          <stop offset="0.18" stopColor="#18324f" />
          <stop offset="0.44" stopColor="#071524" />
          <stop offset="0.68" stopColor="#0c1d30" />
          <stop offset="0.86" stopColor="#2e4f71" />
          <stop offset="1" stopColor="#7794b4" />
        </linearGradient>
        <linearGradient id={clip} x1="0" y1="-22" x2="0" y2="-8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.26" stopColor="#dbe5ef" />
          <stop offset="0.54" stopColor="#8fa1b3" />
          <stop offset="0.78" stopColor="#e7eef5" />
          <stop offset="1" stopColor="#6e8296" />
        </linearGradient>
        <linearGradient id={gloss} x1="0" y1="-12" x2="0" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="0.28" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="0.65" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.12" />
        </linearGradient>
        <filter id={shadow} x="-30%" y="-120%" width="160%" height="340%">
          <feDropShadow dx="0" dy="5" stdDeviation="3.6" floodColor="#0a1b2f" floodOpacity="0.42" />
        </filter>
      </defs>

      <g filter={`url(#${shadow})`}>
        {/* Barrel body */}
        <path
          d="M 70 -11.8 H 222 C 231.8 -11.8 240 -6.8 240 0 C 240 6.8 231.8 11.8 222 11.8 H 70 C 61.6 11.8 56 6.6 56 0 C 56 -6.6 61.6 -11.8 70 -11.8 Z"
          fill={`url(#${barrel})`}
        />
        {/* Rear cap */}
        <path
          d="M 193 -11.8 H 222 C 231.8 -11.8 240 -6.8 240 0 C 240 6.8 231.8 11.8 222 11.8 H 193 Z"
          fill={`url(#${cap})`}
        />
        <path d="M 194 -11.3 V 11.3" stroke="#04101b" strokeWidth="1.2" opacity="0.68" />
        <path d="M 197 -10.4 V 10.4" stroke="#9fb6cf" strokeWidth="0.75" opacity="0.28" />

        {/* Rubber grip with ribs */}
        <path
          d="M 28 -9.8 C 32 -11.4 40 -11.8 49 -11.8 H 77 C 83 -11.8 87 -8.2 87 -3.8 V 3.8 C 87 8.2 83 11.8 77 11.8 H 49 C 40 11.8 32 11.4 28 9.8 Z"
          fill={`url(#${grip})`}
        />
        {[36, 43.5, 51, 58.5, 66, 73.5].map((x) => (
          <g key={x}>
            <path d={`M ${x} -10.6 V 10.6`} stroke="#030f1b" strokeWidth="1.7" opacity="0.46" />
            <path d={`M ${x + 1.3} -10.6 V 10.6`} stroke="#b4c6d8" strokeWidth="0.7" opacity="0.22" />
          </g>
        ))}

        {/* Metal cone nib */}
        <path
          d="M 0 0 C 7 -4.4 16 -7.6 31 -9.4 L 33 -9.4 V 9.4 L 31 9.4 C 16 7.6 7 4.4 0 0 Z"
          fill={`url(#${metal})`}
        />
        <path
          d="M 0 0 C 8 -4.3 18 -7 33 -9 V -3.3 C 21 -1.7 9 0.7 0 3.9 Z"
          fill="#ffffff"
          opacity="0.5"
        />
        <path
          d="M 0 0 C 9 4.1 19 6.7 33 8.8 V 3.9 C 21 2.2 9 0.5 0 0 Z"
          fill="#26384b"
          opacity="0.32"
        />

        {/* Gold accents */}
        <rect x="29.5" y="-10.2" width="6" height="20.4" rx="2.2" fill={`url(#${gold})`} />
        <rect x="181.5" y="-11.8" width="6.5" height="23.6" rx="2.4" fill={`url(#${gold})`} />
        <rect x="205" y="-11.8" width="3.8" height="23.6" rx="1.8" fill={`url(#${gold})`} opacity="0.9" />
        <path d="M 31 -7.2 V 7.2" stroke="#fff7cf" strokeWidth="0.8" opacity="0.7" />
        <path d="M 182.6 -8.4 V 8.4" stroke="#fff7cf" strokeWidth="0.8" opacity="0.62" />

        {/* Pocket clip */}
        <path
          d="M 203 -10.4 C 201 -18.8 208 -22 217.5 -20.8 L 231.5 -18.9 C 236 -18.4 236.5 -14.2 232 -13.4 L 220.5 -15 C 212.5 -16.1 207.8 -14.4 206.4 -9.4 Z"
          fill={`url(#${clip})`}
          stroke="#71869b"
          strokeWidth="0.6"
        />
        <path
          d="M 207 -15 C 209.5 -18 218 -18.6 225 -17.4"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.68"
        />

        {/* Cylindrical gloss and shade */}
        <path
          d="M 90 -6.4 C 121 -7.7 166 -7.7 190 -6.4"
          fill="none"
          stroke={`url(#${gloss})`}
          strokeWidth="3.1"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M 84 -4.6 C 116 -6 160 -6 181 -4.6"
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.44"
        />
        <path
          d="M 91 8 C 122 9.9 163 9.9 191 8"
          fill="none"
          stroke="#020c16"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.38"
        />
        <path
          d="M 104 -8.2 C 130 -9 160 -9 179 -8.2"
          fill="none"
          stroke="#b7d0e8"
          strokeWidth="0.75"
          strokeLinecap="round"
          opacity="0.2"
        />

        {/* Engraved brand */}
        <text
          x="112"
          y="2.4"
          fill="#e7cf8d"
          fontFamily="'Courier Prime', monospace"
          fontSize="5.9"
          fontWeight="700"
          letterSpacing="1.25"
          opacity="0.55"
        >
          PAPER CRICKET
        </text>

        {/* Ball tip */}
        <circle cx="1.7" cy="0" r="1.4" fill="#0b1a2d" />
        <circle cx="1.25" cy="-0.45" r="0.42" fill="#9fc2e6" opacity="0.78" />
      </g>
    </g>
  )
}

export function Pen3D({ className }: { className?: string }) {
  return (
    <svg viewBox="-18 -38 276 76" className={className} aria-hidden="true" focusable="false">
      <PenGraphic />
    </svg>
  )
}
