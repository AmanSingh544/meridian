import React from 'react';

/**
 * Shared animated Meridian compass-rose logo.
 * Used on LoginPage and ForgotPasswordPage so both render the
 * identical SVG at the same size — enabling smooth CSS page transitions.
 */
export const MeridianAnimatedLogo: React.FC<{ size?: number }> = ({ size = 340 }) => (
  <svg
    width={size}
    viewBox="0 0 680 340"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    style={{ display: 'block' }}
  >
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap');
      @keyframes lp-pIn    { 0%{opacity:0;transform:scale(0.2)} 60%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
      @keyframes lp-pPulse { 0%,100%{opacity:0.85} 50%{opacity:1} }
      @keyframes lp-cPop   { 0%{r:0;opacity:0} 50%{r:5.5;opacity:1} 100%{r:4;opacity:1} }
      @keyframes lp-ring   { 0%{r:4;opacity:0;stroke-width:2} 60%{opacity:0.4} 100%{r:14;opacity:0;stroke-width:0.3} }
      @keyframes lp-ltReveal { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
      @keyframes lp-lineGrow { 0%{stroke-dashoffset:120} 100%{stroke-dashoffset:0} }
      @keyframes lp-spin   { to{transform:rotate(360deg)} }
      @keyframes lp-fadeIn { 0%{opacity:0} 100%{opacity:1} }

      .lp-spin{animation:lp-spin 24s linear infinite;transform-origin:340px 120px}
      .lp-pn{animation:lp-pIn .5s ease forwards,lp-pPulse 2.8s ease-in-out 2s infinite;opacity:0;transform-origin:340px 120px}
      .lp-pe{animation:lp-pIn .5s .13s ease forwards,lp-pPulse 2.8s ease-in-out 2.15s infinite;opacity:0;transform-origin:340px 120px}
      .lp-ps{animation:lp-pIn .5s .26s ease forwards,lp-pPulse 2.8s ease-in-out 2.3s infinite;opacity:0;transform-origin:340px 120px}
      .lp-pw{animation:lp-pIn .5s .39s ease forwards,lp-pPulse 2.8s ease-in-out 2.45s infinite;opacity:0;transform-origin:340px 120px}
      .lp-dg{animation:lp-pIn .35s .55s ease forwards;opacity:0;transform-origin:340px 120px}
      .lp-cd{animation:lp-cPop .4s .7s ease forwards;opacity:0}
      .lp-cr{animation:lp-ring 1.4s .9s ease-out infinite;opacity:0}
      .lp-wm{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:48px;letter-spacing:-0.5px;fill:#f1f5f9}
      .lp-tag{font-family:'Space Grotesk',sans-serif;font-weight:400;font-size:12.5px;letter-spacing:4px;text-transform:uppercase;fill:#94a3b8}
      .lp-ml1{animation:lp-ltReveal 3.3s .75s ease forwards;opacity:0}
      .lp-ml2{animation:lp-ltReveal .3s  .83s ease forwards;opacity:0}
      .lp-ml3{animation:lp-ltReveal 3.3s .91s ease forwards;opacity:0}
      .lp-ml4{animation:lp-ltReveal .3s  .99s ease forwards;opacity:0}
      .lp-ml5{animation:lp-ltReveal 3.3s 1.07s ease forwards;opacity:0}
      .lp-ml6{animation:lp-ltReveal .3s  1.15s ease forwards;opacity:0}
      .lp-ml7{animation:lp-ltReveal 3.3s 1.23s ease forwards;opacity:0}
      .lp-ml8{animation:lp-ltReveal .3s  1.31s ease forwards;opacity:0}
      .lp-div{stroke-dasharray:120;animation:lp-lineGrow .6s 1.4s ease forwards;stroke-dashoffset:120}
      .lp-tg{animation:lp-fadeIn .5s 1.7s ease forwards;opacity:0}
    `}</style>
    <g className="lp-spin">
      <path className="lp-pn" d="M 340 68 L 354 106 L 340 114 L 326 106 Z" fill="#818cf8" opacity="0.95"/>
      <path className="lp-pe" d="M 392 120 L 354 134 L 346 120 L 354 106 Z" fill="#a5b4fc" opacity="0.85"/>
      <path className="lp-ps" d="M 340 172 L 326 134 L 340 126 L 354 134 Z" fill="#c7d2fe" opacity="0.75"/>
      <path className="lp-pw" d="M 288 120 L 326 106 L 334 120 L 326 134 Z" fill="#e0e7ff" opacity="0.65"/>
      <path className="lp-dg" d="M 372 88 L 352 112 L 348 108 Z" fill="#818cf8" opacity="0.3"/>
      <path className="lp-dg" d="M 372 152 L 348 132 L 352 128 Z" fill="#a5b4fc" opacity="0.25"/>
      <path className="lp-dg" d="M 308 152 L 328 128 L 332 132 Z" fill="#c7d2fe" opacity="0.2"/>
      <path className="lp-dg" d="M 308 88 L 332 108 L 328 112 Z" fill="#e0e7ff" opacity="0.2"/>
      <circle className="lp-cd" cx="340" cy="120" r="4" fill="#818cf8"/>
      <circle className="lp-cr" cx="340" cy="120" r="4" fill="none" stroke="#a5b4fc" strokeWidth="1"/>
    </g>
    <text textAnchor="middle" y="228" className="lp-wm">
      <tspan className="lp-ml1" x="340">M</tspan>
      <tspan className="lp-ml2">E</tspan>
      <tspan className="lp-ml3">R</tspan>
      <tspan className="lp-ml4">I</tspan>
      <tspan className="lp-ml5">D</tspan>
      <tspan className="lp-ml6">I</tspan>
      <tspan className="lp-ml7">A</tspan>
      <tspan className="lp-ml8">N</tspan>
    </text>
    <line className="lp-div" x1="280" y1="243" x2="400" y2="243" stroke="#818cf8" strokeWidth="1.5" opacity="0.35"/>
    <text x="340" y="264" textAnchor="middle" className="lp-tag lp-tg">Intelligent Support</text>
  </svg>
);
