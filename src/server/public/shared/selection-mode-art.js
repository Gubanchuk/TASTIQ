// The clips follow the controls in the original 960 × 640 photographs.
// Both the moving control and its background come from the same image.
export function selectionModeArt(depth) {
 const quick=depth==='standard';
 const file=quick?'transport':'mixer';
 const motion=quick?`
  <defs>
   <radialGradient id="mode-lamp"><stop stop-color="#fff2c4"/><stop offset=".28" stop-color="#ffad32"/><stop offset="1" stop-color="#ff4d00" stop-opacity="0"/></radialGradient>
  </defs>
  <g class="mode-key">
   <image href="/assets/selection-modes/transport.webp" width="960" height="640"/>
   <path class="mode-chevron mode-chevron-first" d="M346 289 406 169Q409 165 414 168L503 242Q507 246 502 249L350 292Q345 294 346 289Z"/>
   <path class="mode-chevron mode-chevron-second" d="M484 320 541 198Q544 193 550 197L642 272Q646 276 642 279L488 325Q483 327 484 320Z"/>
   <ellipse class="mode-lamp" cx="678" cy="374" rx="39" ry="31" fill="url(#mode-lamp)"/>
  </g>`:`
  <defs>
   <image id="mode-mixer-photo" href="/assets/selection-modes/mixer.webp" width="960" height="640"/>
   <clipPath id="mode-fader-knob"><path d="M403 360C404 345 419 334 437 334C458 333 474 346 474 364L475 394C474 408 459 418 439 419C420 419 404 409 404 395Z"/></clipPath>
   <filter id="mode-feather" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
   <mask id="mode-empty-track" maskUnits="userSpaceOnUse" x="385" y="318" width="131" height="128">
    <path fill="white" filter="url(#mode-feather)" d="M392 351Q399 322 446 325Q477 324 493 354Q512 384 505 415Q501 440 457 440L430 428Q399 427 394 407Z"/>
   </mask>
  </defs>
  <use href="#mode-mixer-photo"/>
  <g class="mode-fader-assembly">
   <g mask="url(#mode-empty-track)"><use href="#mode-mixer-photo" transform="translate(-54 104)"/></g>
   <g class="mode-fader-position"><g class="mode-fader">
    <ellipse cx="452" cy="400" rx="37" ry="24" fill="#201925" opacity=".37" filter="url(#mode-feather)"/>
    <use href="#mode-mixer-photo" clip-path="url(#mode-fader-knob)"/>
   </g></g>
  </g>`;
 return `<span class="mode-card-art" aria-hidden="true"><svg viewBox="0 0 960 640" preserveAspectRatio="xMidYMid slice" focusable="false" data-mode-art="${file}">${motion}</svg></span>`;
}
