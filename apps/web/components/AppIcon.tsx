import type {ReactNode,SVGProps} from 'react';

/** Shared, self-hosted 24px outline icon system (no network font or icon CDN). */
const paths={
  library:<><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/><path d="M6.5 8h0M17.5 8h0M6.5 14h0M17.5 14h0"/></>,
  search:<><circle cx="10.8" cy="10.8" r="6.4"/><path d="m16 16 5 5"/></>,
  archive:<><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 13h4"/></>,
  template:<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  book:<><path d="M12 6c-2-1.5-5-2-9-2v15c4 0 7 .5 9 2 2-1.5 5-2 9-2V4c-4 0-7 .5-9 2Z"/><path d="M12 6v15"/></>,
  chapter:<><path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 13h8M8 17h5"/></>,
  manuscript:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  files:<><path d="M8 4h9l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M17 4v5h4M3 8v11"/></>,
  upload:<><path d="M12 16V3m0 0-5 5m5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></>,
  download:<><path d="M12 3v13m0 0-5-5m5 5 5-5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></>,
  plus:<><path d="M12 5v14M5 12h14"/></>,
  refresh:<><path d="M20 11a8 8 0 0 0-14-4L3 10m0-5v5h5"/><path d="M4 13a8 8 0 0 0 14 4l3-3m0 5v-5h-5"/></>,
  history:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  comment:<><path d="M20 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4Z"/><path d="M7 9h9M7 13h6"/></>,
  edit:<><path d="m14 6 4 4M4 20l4-.7L20 7.3a2.5 2.5 0 0 0-3.5-3.5L4.7 15.7 4 20Z"/></>,
  trash:<><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></>,
  chevronRight:<><path d="m9 5 7 7-7 7"/></>,
  arrowLeft:<><path d="m12 19-7-7 7-7M5 12h15"/></>,
  shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  check:<><path d="m5 12 5 5L20 7"/></>,
  sparkles:<><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z"/></>,
  folder:<><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3Z"/></>,
  warning:<><path d="M10.3 4.3a2 2 0 0 1 3.4 0l8 14A2 2 0 0 1 20 21H4a2 2 0 0 1-1.7-2.7l8-14Z"/><path d="M12 9v4M12 17h.01"/></>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  x:<><path d="M5 5l14 14M19 5 5 19"/></>
} as const;

export type AppIconName=keyof typeof paths;
type Props={name:AppIconName;size?:number;className?:string} & Omit<SVGProps<SVGSVGElement>,'children'|'width'|'height'>;

/** Icons are decorative; adjacent text or button aria-label carries meaning. */
export default function AppIcon({name,size=18,className,...props}:Props){
  const glyph:ReactNode=paths[name];
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    focusable="false" className={className??'app-icon'} {...props}>{glyph}</svg>;
}
