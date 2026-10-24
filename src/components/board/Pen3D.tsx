import { useId } from 'react'

/**
 * A realistic clear-barrel ballpoint pen. The nib sits at (0, 0) and the body
 * runs along the positive X axis. The barrel is translucent so the ink tube,
 * spring and inner reflections are visible, which reads as a physical object
 * rather than a flat icon.
 */
export function PenGraphic() {
  const uid = useId().replace(/:/g, '')
  const barrel = `${uid}-barrel`
  const ink = `${uid}-ink`
  const grip = `${uid}-grip`
  const metal = `${uid}-metal`
  const metalDark = `${uid}-metal-dark`
  const cap = `${uid}-cap`
  const clip = `${uid}-clip`
  const spring = `${uid}-spring`
  const shadow = `${uid}-shadow`

  return (
    <g>
      <defs>
        <linearGradient id={barrel} x1="0" y1="-11" x2="0" y2="11" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.08" stopColor="#e7f2fb" stopOpacity="0.8" />
          <stop offset="0.24" stopColor="#b8d2e7" stopOpacity="0.42" />
          <stop offset="0.46" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.62" stopColor="#8ab0cf" stopOpacity="0.28" />
          <stop offset="0.82" stopColor="#5b83a6" stopOpacity="0.46" />
          <stop offset="0.94" stopColor="#d5e7f5" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.92" />
        </linearGradient>
        <linearGradient id={ink} x1="0" y1="-2.8" x2="0" y2="2.8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7fb8e8" />
          <stop offset="0.28" stopColor="#2567a2" />
          <stop offset="0.58" stopColor="#0c2a4b" />
          <stop offset="0.82" stopColor="#1b4f7d" />
          <stop offset="1" stopColor="#6ba7d6" />
        </linearGradient>
        <linearGradient id={grip} x1="0" y1="-11" x2="0" y2="11" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#b9d4e9" stopOpacity="0.88" />
          <stop offset="0.16" stopColor="#5d7f9e" stopOpacity="0.78" />
          <stop offset="0.4" stopColor="#263f58" stopOpacity="0.82" />
          <stop offset="0.62" stopColor="#142838" stopOpacity="0.78" />
          <stop offset="0.84" stopColor="#4d6d8a" stopOpacity="0.72" />
          <stop offset="1" stopColor="#a8c4da" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={metal} x1="0" y1="-9" x2="0" y2="9" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.16" stopColor="#e5edf5" />
          <stop offset="0.38" stopColor="#a9bacb" />
          <stop offset="0.58" stopColor="#65798e" />
          <stop offset="0.78" stopColor="#c5d3e0" />
          <stop offset="0.94" stopColor="#8b9eb2" />
          <stop offset="1" stopColor="#f7fbff" />
        </linearGradient>
        <linearGradient id={metalDark} x1="0" y1="-10" x2="0" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#dce7f1" />
          <stop offset="0.3" stopColor="#7d92a8" />
          <stop offset="0.55" stopColor="#3d5268" />
          <stop offset="0.8" stopColor="#9cb0c3" />
          <stop offset="1" stopColor="#e8f0f7" />
        </linearGradient>
        <linearGradient id={cap} x1="0" y1="-11" x2="0" y2="11" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7db3e2" />
          <stop offset="0.16" stopColor="#2f6fa9" />
          <stop offset="0.44" stopColor="#0d3357" />
          <stop offset="0.7" stopColor="#174a78" />
          <stop offset="0.9" stopColor="#4f8bbd" />
          <stop offset="1" stopColor="#b9dcf6" />
        </linearGradient>
        <linearGradient id={clip} x1="0" y1="-21" x2="0" y2="-10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9cc9ee" />
          <stop offset="0.22" stopColor="#3f7db3" />
          <stop offset="0.55" stopColor="#0c3155" />
          <stop offset="0.8" stopColor="#2c6496" />
          <stop offset="1" stopColor="#8dc0e8" />
        </linearGradient>
        <linearGradient id={spring} x1="0" y1="-5" x2="0" y2="5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#a7b9cb" />
          <stop offset="0.7" stopColor="#52687e" />
          <stop offset="1" stopColor="#e6eef6" />
        </linearGradient>
        <filter id={shadow} x="-30%" y="-120%" width="160%" height="340%">
          <feDropShadow dx="0" dy="4.5" stdDeviation="3.4" floodColor="#10263e" floodOpacity="0.38" />
        </filter>
      </defs>

      <g filter={`url(#${shadow})`}>
        {/* Clear barrel */}
        <path
          d="M 28 -9.6 C 31 -10.8 36 -11.2 42 -11.2 H 234 C 242 -11.2 248 -6.3 248 0 C 248 6.3 242 11.2 234 11.2 H 42 C 36 11.2 31 10.8 28 9.6 Z"
          fill={`url(#${barrel})`}
          stroke="#7e9cb7"
          strokeWidth="0.8"
          strokeOpacity="0.55"
        />

        {/* Ink tube, visible through the clear barrel */}
        <rect x="34" y="-2.7" width="169" height="5.4" rx="2.7" fill={`url(#${ink})`} />
        <path d="M 36 -1.6 H 196" stroke="#a8d4f5" strokeWidth="0.65" strokeLinecap="round" opacity="0.7" />
        <path d="M 36 1.7 H 196" stroke="#06182c" strokeWidth="0.8" strokeLinecap="round" opacity="0.32" />

        {/* Small spring around the ink tube near the nib */}
        <g stroke={`url(#${spring})`} strokeWidth="0.9" fill="none" opacity="0.9">
          <path d="M 38 -5 C 41 -2 43 2 46 5" />
          <path d="M 43 -5 C 46 -2 48 2 51 5" />
          <path d="M 48 -5 C 51 -2 53 2 56 5" />
          <path d="M 53 -5 C 56 -2 58 2 61 5" />
          <path d="M 58 -5 C 61 -2 63 2 66 5" />
        </g>

        {/* Rubber grip */}
        <path
          d="M 30 -9.2 C 34 -10.6 41 -11.2 49 -11.2 H 82 C 88 -11.2 92 -7.6 92 -3.4 V 3.4 C 92 7.6 88 11.2 82 11.2 H 49 C 41 11.2 34 10.6 30 9.2 Z"
          fill={`url(#${grip})`}
        />
        {[40, 47.5, 55, 62.5, 70, 77.5, 85].map((x) => (
          <g key={x}>
            <path d={`M ${x} -10.2 V 10.2`} stroke="#071a2b" strokeWidth="1.6" opacity="0.42" />
            <path d={`M ${x + 1.25} -10.2 V 10.2`} stroke="#c6dcef" strokeWidth="0.7" opacity="0.24" />
          </g>
        ))}

        {/* Metal cone nib */}
        <path
          d="M 0 0 C 6 -4.2 14 -7.2 30 -8.7 L 32 -8.7 V 8.7 L 30 8.7 C 14 7.2 6 4.2 0 0 Z"
          fill={`url(#${metal})`}
        />
        <path
          d="M 0 0 C 7 -4 16 -6.6 31 -8.3 V -3.2 C 19 -1.5 8 0.8 0 3.7 Z"
          fill="#ffffff"
          opacity="0.56"
        />
        <path
          d="M 0 0 C 8 3.9 17 6.4 31 8.2 V 3.8 C 19 2.1 8 0.5 0 0 Z"
          fill="#2f4358"
          opacity="0.28"
        />
        <rect x="28.5" y="-9.4" width="4.2" height="18.8" rx="1.4" fill={`url(#${metalDark})`} />

        {/* End cap and clicker */}
        <path
          d="M 208 -11.2 H 234 C 242 -11.2 248 -6.3 248 0 C 248 6.3 242 11.2 234 11.2 H 208 Z"
          fill={`url(#${cap})`}
        />
        <path d="M 209 -10.6 V 10.6" stroke="#071c30" strokeWidth="1" opacity="0.55" />
        <path d="M 212 -9.8 V 9.8" stroke="#9bc7ea" strokeWidth="0.7" opacity="0.32" />
        <rect x="246" y="-4.4" width="7" height="8.8" rx="2.2" fill={`url(#${cap})`} />
        <path d="M 247 -3 V 3" stroke="#c6e4fa" strokeWidth="0.7" opacity="0.5" />

        {/* Pocket clip */}
        <path
          d="M 199 -10.6 C 198 -18.2 204 -21.4 213 -20.2 L 231 -18.2 C 235.5 -17.7 236 -13.5 231.5 -12.7 L 216 -14.6 C 208 -15.6 203.5 -14.1 202.5 -9.4 Z"
          fill={`url(#${clip})`}
          stroke="#5c86aa"
          strokeWidth="0.55"
        />
        <path
          d="M 204 -14.8 C 207 -17.8 216 -18.3 223 -17.2"
          fill="none"
          stroke="#d9ecfb"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Specular highlights and inner reflections */}
        <path
          d="M 38 -7.6 C 82 -9 164 -9 226 -7.6"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.82"
        />
        <path
          d="M 40 -5 C 84 -6.2 160 -6.2 220 -5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.7"
          strokeLinecap="round"
          opacity="0.52"
        />
        <path
          d="M 40 8.7 C 84 10.2 164 10.2 228 8.5"
          fill="none"
          stroke="#173b5b"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.35"
        />
        <path
          d="M 96 -8 C 132 -8.8 172 -8.8 202 -8"
          fill="none"
          stroke="#bfe0f8"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.35"
        />

        {/* Tiny branding on the cap */}
        <text
          x="214"
          y="2.3"
          fill="#d8ecfb"
          fontFamily="'Courier Prime', monospace"
          fontSize="4.8"
          fontWeight="700"
          letterSpacing="0.9"
          opacity="0.72"
        >
          PAPER
        </text>

        {/* Ball tip */}
        <circle cx="1.7" cy="0" r="1.5" fill="#10263e" />
        <circle cx="1.25" cy="-0.45" r="0.45" fill="#b7dcff" opacity="0.85" />
      </g>
    </g>
  )
}

export function Pen3D({ className }: { className?: string }) {
  return (
    <svg viewBox="-18 -38 282 76" className={className} aria-hidden="true" focusable="false">
      <PenGraphic />
    </svg>
  )
}
