import React from 'react';

/**
 * Shared animated Meridian logo for the internal console.
 * Used on LoginPage and ForgotPasswordPage so both render the
 * identical SVG — keeping the logo visually stable across page transitions.
 */
export const ConsoleAnimatedLogo: React.FC<{ width?: number }> = ({ width = 260 }) => (
  <svg width={width} viewBox="0 0 680 310" xmlns="http://www.w3.org/2000/svg" role="img" style={{ display: 'block' }}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600&display=swap');
      @keyframes ic-pIn{0%{opacity:0;transform:scale(0.2)}60%{transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}
      @keyframes ic-pPulse{0%,100%{opacity:0.8}50%{opacity:1}}
      @keyframes ic-cPop{0%{r:0;opacity:0}50%{r:6;opacity:1}100%{r:4;opacity:1}}
      @keyframes ic-ring{0%{r:4;opacity:0;stroke-width:2}60%{opacity:0.5}100%{r:18;opacity:0;stroke-width:0.2}}
      @keyframes ic-letter{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes ic-lineGrow{0%{stroke-dashoffset:130}100%{stroke-dashoffset:0}}
      @keyframes ic-fade{0%{opacity:0}100%{opacity:1}}
      @keyframes ic-spin{to{transform:rotate(360deg)}}

      .ic-spin{animation:ic-spin 18s linear infinite;transform-origin:340px 120px}
      .ic-pn{animation:ic-pIn .5s ease forwards,ic-pPulse 3s ease-in-out 2s infinite;opacity:0;transform-origin:340px 120px}
      .ic-pe{animation:ic-pIn .5s .14s ease forwards,ic-pPulse 3s ease-in-out 2.2s infinite;opacity:0;transform-origin:340px 120px}
      .ic-ps{animation:ic-pIn .5s .28s ease forwards,ic-pPulse 3s ease-in-out 2.4s infinite;opacity:0;transform-origin:340px 120px}
      .ic-pw{animation:ic-pIn .5s .42s ease forwards,ic-pPulse 3s ease-in-out 2.6s infinite;opacity:0;transform-origin:340px 120px}
      .ic-dg{animation:ic-pIn .4s .58s ease forwards;opacity:0;transform-origin:340px 120px}
      .ic-cd{animation:ic-cPop .45s .72s ease forwards;opacity:0}
      .ic-cr{animation:ic-ring 1.6s .9s ease-out infinite;opacity:0}
      .ic-wm{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:48px;letter-spacing:-0.5px;fill:#e2e8f0}
      .ic-tag{font-family:'Space Grotesk',sans-serif;font-weight:400;font-size:12px;letter-spacing:4px;text-transform:uppercase;fill:#818cf8}
      .ic-l1{animation:ic-letter .35s .78s ease forwards;opacity:0}
      .ic-l2{animation:ic-letter .35s .86s ease forwards;opacity:0}
      .ic-l3{animation:ic-letter .35s .94s ease forwards;opacity:0}
      .ic-l4{animation:ic-letter .35s 1.02s ease forwards;opacity:0}
      .ic-l5{animation:ic-letter .35s 1.10s ease forwards;opacity:0}
      .ic-l6{animation:ic-letter .35s 1.18s ease forwards;opacity:0}
      .ic-l7{animation:ic-letter .35s 1.26s ease forwards;opacity:0}
      .ic-l8{animation:ic-letter .35s 1.34s ease forwards;opacity:0}
      .ic-div{stroke-dasharray:130;animation:ic-lineGrow .6s 1.5s ease forwards;stroke-dashoffset:130}
      .ic-tg{animation:ic-fade .5s 1.8s ease forwards;opacity:0}
    `}</style>
    <g className="ic-spin">
      <path className="ic-pn" d="M 340 68 L 354 106 L 340 114 L 326 106 Z" fill="#818cf8" opacity="0.95"/>
      <path className="ic-pe" d="M 392 120 L 354 134 L 346 120 L 354 106 Z" fill="#a5b4fc" opacity="0.85"/>
      <path className="ic-ps" d="M 340 172 L 326 134 L 340 126 L 354 134 Z" fill="#c7d2fe" opacity="0.75"/>
      <path className="ic-pw" d="M 288 120 L 326 106 L 334 120 L 326 134 Z" fill="#e0e7ff" opacity="0.65"/>
      <path className="ic-dg" d="M 372 88 L 352 112 L 348 108 Z" fill="#818cf8" opacity="0.3"/>
      <path className="ic-dg" d="M 372 152 L 348 132 L 352 128 Z" fill="#a5b4fc" opacity="0.25"/>
      <path className="ic-dg" d="M 308 152 L 328 128 L 332 132 Z" fill="#c7d2fe" opacity="0.2"/>
      <path className="ic-dg" d="M 308 88 L 332 108 L 328 112 Z" fill="#e0e7ff" opacity="0.2"/>
      <circle className="ic-cd" cx="340" cy="120" r="4" fill="#818cf8"/>
      <circle className="ic-cr" cx="340" cy="120" r="4" fill="none" stroke="#a5b4fc" strokeWidth="1.2"/>
    </g>
    <text textAnchor="middle" y="228" className="ic-wm">
      <tspan className="ic-l1" x="340">M</tspan><tspan className="ic-l2">E</tspan><tspan className="ic-l3">R</tspan>
      <tspan className="ic-l4">I</tspan><tspan className="ic-l5">D</tspan><tspan className="ic-l6">I</tspan>
      <tspan className="ic-l7">A</tspan><tspan className="ic-l8">N</tspan>
    </text>
    <line className="ic-div" x1="275" y1="243" x2="405" y2="243" stroke="#818cf8" strokeWidth="1.5" opacity="0.3"/>
    <text x="340" y="264" textAnchor="middle" className="ic-tag ic-tg">Intelligent Support</text>
  </svg>
);
