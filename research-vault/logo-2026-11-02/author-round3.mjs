// Two hand-authored vector explorations. No text glyphs or generated raster tracing.
import {writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const t='<path d="M16 9Q16 1 24 1H34V31H56V46H34V79Q34 96 49 90L54 104Q16 120 16 82V46H2V31H16Z"/>';
const a='<path fill-rule="evenodd" d="M35 30C12 30 0 46 0 69S13 108 34 108Q50 108 58 96V106H76V32H58V41Q49 30 35 30ZM38 47C51 47 58 56 58 69S50 91 38 91S18 82 18 69S25 47 38 47Z"/>';
const s='<path d="M63 37L55 52C44 44 19 43 19 55C19 61 27 62 40 65C58 69 65 76 65 88C65 103 53 111 33 111Q12 111 0 100L9 85C17 92 32 96 42 91C47 89 47 84 43 81S26 77 17 74C4 70 0 62 1 52C2 37 14 30 32 30Q50 30 63 37Z"/>';
const i='<rect x="0" y="32" width="18" height="74" rx="6"/><circle cx="9" cy="12" r="10"/>';
const q='<path fill-rule="evenodd" d="M35 30C12 30 0 46 0 69S13 108 34 108Q50 108 58 96V101L77 127L92 116L76 95V32H58V41Q49 30 35 30ZM38 47C51 47 58 56 58 69S50 91 38 91S18 82 18 69S25 47 38 47Z"/>';
const matchWord=`<g>${t}<g transform="translate(66)">${a}</g><g transform="translate(154)">${s}</g><g transform="translate(229)">${t}</g><g transform="translate(298)">${i}</g><g transform="translate(334)">${q}</g></g>`;
// Two complementary contours, separated by a single S-shaped open channel.
const half='<path d="M26 8H79Q92 8 92 21V37H61C49 37 48 54 35 54H8V26Q8 8 26 8Z"/>';
const matchIcon=`<g>${half}<g transform="rotate(180 50 50)">${half}</g></g>`;
const scriptWord=`<g fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M32 13C28 37 14 81 24 95C33 105 51 88 57 77M13 49C25 45 46 44 57 43"/><path d="M107 58C88 40 59 56 59 83C58 108 86 101 99 73L106 51L96 87C92 104 107 103 119 85"/><path d="M159 52C144 42 128 48 128 61C127 70 151 72 151 84C150 99 132 104 119 93"/><path d="M192 14C184 40 173 78 179 94C183 104 200 99 215 80M168 48L209 44"/><path d="M234 51L223 88C218 107 236 102 247 85"/><path d="M294 59C280 42 254 53 251 77C246 100 264 110 280 94C294 80 297 61 299 52M299 52L277 134C275 142 285 136 310 119"/></g><circle cx="243" cy="24" r="7" fill="currentColor"/>`;
const scriptIcon='<g fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"><path d="M57 13C50 37 34 72 39 86C44 99 64 95 79 79M23 45C39 39 61 38 80 37"/></g>';
const svg=(viewBox,body,color='#000')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" style="color:${color}" fill="currentColor">${body}</svg>`;
const matchPlate=color=>svg('0 0 720 480',`<g transform="translate(305 70) scale(1.1)">${matchIcon}</g><g transform="translate(108 244) scale(1.18)">${matchWord}</g>`,color);
const scriptPlate=color=>svg('0 0 720 480',`<g transform="translate(96 106) scale(1.65)">${scriptWord}</g>`,color);
const files={
 'r3-match.svg':svg('0 0 430 135',matchWord),
 'r3-match-icon.svg':svg('0 0 100 100',matchIcon),
 'r3-match-color.svg':svg('0 0 430 135',matchWord,'#12664a'),
 'r3-match-icon-color.svg':svg('0 0 100 100',matchIcon,'#12664a'),
 'r3-match-plate.svg':matchPlate('#000'),
 'r3-match-plate-color.svg':matchPlate('#12664a'),
 'r3-script.svg':svg('0 0 330 155',scriptWord),
 'r3-script-icon.svg':svg('0 0 110 110',scriptIcon),
 'r3-script-color.svg':svg('0 0 330 155',scriptWord,'#6e32c9'),
 'r3-script-icon-color.svg':svg('0 0 110 110',scriptIcon,'#6e32c9'),
 'r3-script-plate.svg':scriptPlate('#000'),
 'r3-script-plate-color.svg':scriptPlate('#6e32c9')
};
for(const [name,body] of Object.entries(files))await writeFile(join(root,'assets',name),body+'\n');
console.log('Wrote '+Object.keys(files).length+' hand-authored SVG studies.');
