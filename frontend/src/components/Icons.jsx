/** A small set of inline icons (Lucide-style strokes), so the app needs no icon dependency. */
const PATHS = {
  logo: <><path d="M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>,
  shieldOff: <><path d="M19.7 14a8.9 8.9 0 0 0 .3-2V6l-8-3-3.2 1.2" /><path d="M4.7 4.700L4 6v6c0 4.5 3.2 7.9 8 9 1.9-.4 3.5-1.2 4.8-2.3" /><path d="M3 3l18 18" /></>,
  eyeOff: <><path d="M10.7 5.100A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.1" /><path d="M6.6 6.600A17.3 17.3 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.900a3 3 0 0 0 4.2 4.2" /><path d="M2 2l20 20" /></>,
  check: <path d="M5 12.500l4.5 4.500L19 7.5" />,
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.100L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.900A2 2 0 0 0 16.8 4H7.200a2 2 0 0 0-1.7 1.100z" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  alert: <><path d="M10.3 3.900L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.900a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  folder: <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.900a2 2 0 0 1-1.7-.900l-.8-1.200A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />,
  layers: <><path d="M12 2l10 5-10 5L2 7l10-5z" /><path d="M2 12l10 5 10-5" /><path d="M2 17l10 5 10-5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  arrowLeft: <path d="M19 12H5M12 19l-7-7 7-7" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  sparkle: <path d="M12 3l1.9 5.800a2 2 0 0 0 1.3 1.300L21 12l-5.8 1.900a2 2 0 0 0-1.3 1.300L12 21l-1.9-5.800a2 2 0 0 0-1.3-1.300L3 12l5.8-1.900a2 2 0 0 0 1.3-1.300L12 3z" />,
};

export default function Icon({ name, size = 18, className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
