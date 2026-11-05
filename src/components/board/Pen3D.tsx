import { useId } from 'react'
import type { PenStyle } from '../../config/themes'
import { darken, getPenStyle, lighten } from '../../config/themes'
import { useThemePrefs } from '../../store/preferences'

/**
 * A realistic clear-barrel ballpoint pen. The nib sits at (0, 0) and the body
 * runs along the positive X axis. The barrel is translucent so the ink tube,
 * spring and inner reflections are visible, which reads as a physical object
 * rather than a flat icon. Colours come from the selected pen style so every
 * player can make the pen their own.
 *
 * Premium silhouettes (`premium` field on the style):
 *  - 'metal'     : chrome silver barrel with a stepped metal nose
 *  - 'fountain'  : classic nib + collar bands (fountain quill)
 *  - 'cyber'     : slim tube with neon ring accents
 *  - 'midnight'  : matte black with silver rings
 *  - 'rose'/'blossom'/'emerald' : curved barrel + gold band accents
 */
export function PenGraphic({ style }: { style?: PenStyle }) {
  const uid = useId().replace(/:/g, '')
  const storedPen = useThemePrefs((state) => state.penStyleId)
  const ps = style ?? getPenStyle(storedPen)
  const premium = ps.premium
  const barrel = `${uid}-barrel`
  const ink = `${uid}-ink`
  const grip = `${uid}-grip`
  const metal = `${uid}-metal`
  const metalDark = `${uid}-metal-dark`
  const cap = `${uid}-cap`
  const clip = `${uid}-clip`
  const spring = `${uid}-spring`
  const shadow = `${uid}-shadow`

  const premiumBody = premium === 'metal' || premium === 'midnight' || premium === 'emerald' || premium === 'rose' || premium === 'blossom' || premium === 'cyber' || premium === 'fountain'

  return (
    <g>
      <defs>
        <linearGradient id={barrel} x1="0" y1="-11" x2="0" y2="11" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.08" stopColor={ps.barrelStart} stopOpacity="0.8" />
          <stop offset="0.24" stopColor={ps.barrelStart} stopOpacity="0.42" />
          <stop offset="0.46" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.62" stopColor={ps.barrelEnd} stopOpacity="0.28" />
          <stop offset="0.82" stopColor={ps.barrelEnd} stopOpacity="0.46" />
          <stop offset="0.94" stopColor={ps.barrelEnd} stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.92" />
        </linearGradient>
        <linearGradient id={ink} x1="0" y1="-2.8" x2="0" y2="2.8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={lighten(ps.ink, 0.55)} />
          <stop offset="0.28" stopColor={ps.ink} />
          <stop offset="0.58" stopColor={darken(ps.ink, 0.45)} />
          <stop offset="0.82" stopColor={ps.ink} />
          <stop offset="1" stopColor={lighten(ps.ink, 0.4)} />
        </linearGradient>
        <linearGradient id={grip} x1="0" y1="-11" x2="0" y2="11" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={ps.gripLight} stopOpacity="0.88" />
          <stop offset="0.16" stopColor={lighten(ps.gripDark, 0.35)} stopOpacity="0.78" />
          <stop offset="0.4" stopColor={ps.gripDark} stopOpacity="0.82" />
          <stop offset="0.62" stopColor={darken(ps.gripDark, 0.2)} stopOpacity="0.78" />
          <stop offset="0.84" stopColor={lighten(ps.gripDark, 0.3)} stopOpacity="0.72" />
          <stop offset="1" stopColor={ps.gripLight} stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={metal} x1="0" y1="-9" x2="0" y2="9" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.16" stopColor={lighten(ps.metal, 0.65)} />
          <stop offset="0.38" stopColor={ps.metal} />
          <stop offset="0.58" stopColor={darken(ps.metal, 0.35)} />
          <stop offset="0.78" stopColor={lighten(ps.metal, 0.4)} />
          <stop offset="0.94" stopColor={ps.metal} />
          <stop offset="1" stopColor="#f7fbff" />
        </linearGradient>
        <linearGradient id={metalDark} x1="0" y1="-10" x2="0" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={lighten(ps.metal, 0.7)} />
          <stop offset="0.3" stopColor={ps.metal} />
          <stop offset="0.55" stopColor={darken(ps.metal, 0.45)} />
          <stop offset="0.8" stopColor={lighten(ps.metal, 0.25)} />
          <stop offset="1" stopColor={lighten(ps.metal, 0.6)} />
        </linearGradient>
        <linearGradient id={cap} x1="0" y1="-11" x2="0" y2="11" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={lighten(ps.cap, 0.45)} />
          <stop offset="0.16" stopColor={ps.cap} />
          <stop offset="0.44" stopColor={darken(ps.cap, 0.45)} />
          <stop offset="0.7" stopColor={darken(ps.cap, 0.2)} />
          <stop offset="0.9" stopColor={lighten(ps.cap, 0.3)} />
          <stop offset="1" stopColor={lighten(ps.cap, 0.6)} />
        </linearGradient>
        <linearGradient id={clip} x1="0" y1="-21" x2="0" y2="-10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={lighten(ps.clip, 0.4)} />
          <stop offset="0.22" stopColor={ps.clip} />
          <stop offset="0.55" stopColor={darken(ps.clip, 0.45)} />
          <stop offset="0.8" stopColor={darken(ps.clip, 0.1)} />
          <stop offset="1" stopColor={lighten(ps.clip, 0.35)} />
        </linearGradient>
        <linearGradient id={spring} x1="0" y1="-5" x2="0" y2="5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor={ps.spring} />
          <stop offset="0.7" stopColor={darken(ps.spring, 0.35)} />
          <stop offset="1" stopColor={lighten(ps.spring, 0.45)} />
        </linearGradient>
        <filter id={shadow} x="-30%" y="-120%" width="160%" height="340%">
          <feDropShadow dx="0" dy="4.5" stdDeviation="3.4" floodColor={ps.shadow} floodOpacity="0.38" />
        </filter>
      </defs>

      <g filter={`url(#${shadow})`}>
        {premiumBody ? (
          <>
            {/* Premium barrel */}
            <path
              d="M 28 -10.2 C 31 -11.2 36 -11.6 42 -11.6 H 236 C 244 -11.6 250 -6.4 250 0 C 250 6.4 244 11.6 236 11.6 H 42 C 36 11.6 31 11.2 28 10.2 Z"
              fill={`url(#${barrel})`}
              stroke={darken(ps.barrelEnd, 0.2)}
              strokeWidth="0.8"
              strokeOpacity="0.55"
            />
            {/* Gold / chrome accent bands on premium pens */}
            <rect x="96" y="-11.5" width="2.2" height="23" fill={`url(#${metalDark})`} opacity="0.9" />
            <rect x="196" y="-11.5" width="3" height="23" fill={`url(#${metalDark})`} opacity="0.9" />
            {premium === 'cyber' ? (
              <>
                <circle cx="120" cy="0" r="3" fill={ps.metal} opacity="0.9" />
                <path d="M 40 -8 H 196" stroke={ps.metal} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
              </>
            ) : null}
            {premium === 'fountain' ? (
              <g>
                {/* Fountain nib */}
                <path
                  d="M 0 0 C 10 -3.8 22 -7.4 34 -9.2 L 34 9.2 C 22 7.4 10 3.8 0 0 Z"
                  fill={`url(#${metal})`}
                />
                <path d="M 0 0 L 18 0" stroke={darken(ps.metal, 0.5)} strokeWidth="1" />
                <circle cx="15" cy="0" r="2.1" fill={darken(ps.metal, 0.4)} />
                <circle cx="2.2" cy="0" r="1.3" fill={darken(ps.ink, 0.6)} />
              </g>
            ) : (
              <>
                {/* Stepped metal nose */}
                <path d="M 0 0 L 28 -8.7 L 28 8.7 Z" fill={`url(#${metal})`} />
                <rect x="27" y="-10" width="5" height="20" rx="1.6" fill={`url(#${metalDark})`} />
              </>
            )}
            {/* Ink tube */}
            <rect x="34" y="-2.7" width="168" height="5.4" rx="2.7" fill={`url(#${ink})`} />
            {/* Grip */}
            <path
              d="M 30 -9.8 C 34 -11 41 -11.6 49 -11.6 H 84 C 90 -11.6 94 -8 94 -3.6 V 3.6 C 94 8 90 11.6 84 11.6 H 49 C 41 11.6 34 11 30 9.8 Z"
              fill={`url(#${grip})`}
            />
            {/* Cap */}
            <path
              d="M 210 -11.6 H 236 C 244 -11.6 250 -6.4 250 0 C 250 6.4 244 11.6 236 11.6 H 210 Z"
              fill={`url(#${cap})`}
            />
            <rect x="248" y="-4.4" width="7" height="8.8" rx="2.2" fill={`url(#${cap})`} />
            {/* Clip */}
            <path
              d="M 200 -11 C 199 -18.4 205 -21.8 214 -20.5 L 233 -18.4 C 237.5 -17.9 238 -13.7 233.5 -12.9 L 218 -14.8 C 210 -15.8 205.5 -14.3 204.5 -9.8 Z"
              fill={`url(#${clip})`}
              stroke={darken(ps.clip, 0.25)}
              strokeWidth="0.55"
            />
            {/* Highlights */}
            <path d="M 38 -8.2 C 84 -9.4 166 -9.4 228 -8.2" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.82" />
            <path d="M 40 9.2 C 86 10.4 166 10.4 230 9" fill="none" stroke={darken(ps.barrelEnd, 0.5)} strokeWidth="2.4" strokeLinecap="round" opacity="0.25" />
            {/* Branding */}
            <text x="216" y="2.3" fill={ps.text} fontFamily="'Courier Prime', monospace" fontSize="4.8" fontWeight="700" letterSpacing="0.9" opacity="0.72">
              {premium === 'fountain' ? 'QUILL' : 'PREMIUM'}
            </text>
            <circle cx="1.7" cy="0" r="1.5" fill={darken(ps.ink, 0.6)} />
          </>
        ) : (
          <>
            {/* Clear barrel */}
            <path
              d="M 28 -9.6 C 31 -10.8 36 -11.2 42 -11.2 H 234 C 242 -11.2 248 -6.3 248 0 C 248 6.3 242 11.2 234 11.2 H 42 C 36 11.2 31 10.8 28 9.6 Z"
              fill={`url(#${barrel})`}
              stroke={darken(ps.barrelEnd, 0.2)}
              strokeWidth="0.8"
              strokeOpacity="0.55"
            />

            {/* Ink tube, visible through the clear barrel */}
            <rect x="34" y="-2.7" width="169" height="5.4" rx="2.7" fill={`url(#${ink})`} />
            <path d="M 36 -1.6 H 196" stroke={lighten(ps.ink, 0.7)} strokeWidth="0.65" strokeLinecap="round" opacity="0.7" />
            <path d="M 36 1.7 H 196" stroke={darken(ps.ink, 0.7)} strokeWidth="0.8" strokeLinecap="round" opacity="0.32" />

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
                <path d={`M ${x} -10.2 V 10.2`} stroke={darken(ps.gripDark, 0.55)} strokeWidth="1.6" opacity="0.42" />
                <path d={`M ${x + 1.25} -10.2 V 10.2`} stroke={lighten(ps.gripLight, 0.5)} strokeWidth="0.7" opacity="0.24" />
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
              fill={darken(ps.metal, 0.5)}
              opacity="0.28"
            />
            <rect x="28.5" y="-9.4" width="4.2" height="18.8" rx="1.4" fill={`url(#${metalDark})`} />

            {/* End cap and clicker */}
            <path
              d="M 208 -11.2 H 234 C 242 -11.2 248 -6.3 248 0 C 248 6.3 242 11.2 234 11.2 H 208 Z"
              fill={`url(#${cap})`}
            />
            <path d="M 209 -10.6 V 10.6" stroke={darken(ps.cap, 0.5)} strokeWidth="1" opacity="0.55" />
            <path d="M 212 -9.8 V 9.8" stroke={lighten(ps.cap, 0.55)} strokeWidth="0.7" opacity="0.32" />
            <rect x="246" y="-4.4" width="7" height="8.8" rx="2.2" fill={`url(#${cap})`} />
            <path d="M 247 -3 V 3" stroke={lighten(ps.cap, 0.7)} strokeWidth="0.7" opacity="0.5" />

            {/* Pocket clip */}
            <path
              d="M 199 -10.6 C 198 -18.2 204 -21.4 213 -20.2 L 231 -18.2 C 235.5 -17.7 236 -13.5 231.5 -12.7 L 216 -14.6 C 208 -15.6 203.5 -14.1 202.5 -9.4 Z"
              fill={`url(#${clip})`}
              stroke={darken(ps.clip, 0.25)}
              strokeWidth="0.55"
            />
            <path
              d="M 204 -14.8 C 207 -17.8 216 -18.3 223 -17.2"
              fill="none"
              stroke={lighten(ps.clip, 0.65)}
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
              stroke={darken(ps.barrelEnd, 0.5)}
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity="0.25"
            />
            <path
              d="M 96 -8 C 132 -8.8 172 -8.8 202 -8"
              fill="none"
              stroke={lighten(ps.barrelStart, 0.6)}
              strokeWidth="0.8"
              strokeLinecap="round"
              opacity="0.35"
            />

            {/* Tiny branding on the cap */}
            <text
              x="214"
              y="2.3"
              fill={ps.text}
              fontFamily="'Courier Prime', monospace"
              fontSize="4.8"
              fontWeight="700"
              letterSpacing="0.9"
              opacity="0.72"
            >
              PAPER
            </text>

            {/* Ball tip */}
            <circle cx="1.7" cy="0" r="1.5" fill={darken(ps.ink, 0.6)} />
            <circle cx="1.25" cy="-0.45" r="0.45" fill={lighten(ps.ink, 0.7)} opacity="0.85" />
          </>
        )}
      </g>
    </g>
  )
}

export function Pen3D({ className, style }: { className?: string; style?: PenStyle }) {
  return (
    <svg viewBox="-18 -38 282 76" className={className} aria-hidden="true" focusable="false">
      <PenGraphic style={style} />
    </svg>
  )
}
