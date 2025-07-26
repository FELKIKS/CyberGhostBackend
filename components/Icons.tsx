import React from 'react';

export const LogoIcon = () => (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-200 drop-shadow-[0_0_5px_currentColor]">
        {/* Central shape */}
        <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="2.5"/>
        <path d="M50 35 V 20" stroke="currentColor" strokeWidth="2"/>
        <path d="M50 65 V 80" stroke="currentColor" strokeWidth="2"/>

        {/* Outer Rings */}
        <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.8"/>
        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="3 3"/>
        
        {/* Intersecting lines */}
        <path d="M25 25 L 75 75" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7"/>
        <path d="M25 75 L 75 25" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7"/>
        
        {/* Faux rune details */}
        <path d="M50 5 L 45 15 L 55 15 Z" fill="currentColor" />
        <path d="M50 95 L 45 85 L 55 85 Z" fill="currentColor" />
        <path d="M5 50 L 15 45 L 15 55 Z" fill="currentColor" />
        <path d="M95 50 L 85 45 L 85 55 Z" fill="currentColor" />
    </svg>
);


export const D20Icon = ({ value, className }: { value?: number | string; className?: string; }) => (
    <svg className={className || "w-12 h-12 text-gray-200"} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 4L8 20L8 44L32 60L56 44L56 20L32 4Z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 20L32 28L56 20" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M32 60V28" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 44L32 28" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M56 44L32 28" stroke="currentColor" strokeWidth="1.5"/>
        {value !== undefined && (
            <text x="32" y="38" fontFamily="VT323" fontSize="18" fill="currentColor" textAnchor="middle" alignmentBaseline="middle">
                {value}
            </text>
        )}
    </svg>
);

// --- Invocation Signs for Master Grimoire ---
// Common defs for glow effect
const GlowFilter = () => (
    <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>
);

export const RitualSignFragmentado: React.FC = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full stroke-current" strokeWidth="1.5" fill="none" strokeLinecap="round" filter="url(#glow)">
        <GlowFilter />
        <circle cx="50" cy="50" r="40" strokeOpacity="0.3" />
        <path d="M50,15 L75,30 L85,50 L75,70 L50,85 L25,70 L15,50 L25,30 Z" strokeOpacity="0.5"/>
        <path d="M20 20 L 80 80 M 80 20 L 20 80" strokeDasharray="4 4" strokeOpacity="0.7"/>
        <path d="M50,35 L60,50 L50,65 L40,50Z" strokeWidth="2.5" />
    </svg>
);

export const RitualSignCaos: React.FC = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full stroke-current" strokeWidth="1.5" fill="none" strokeLinecap="round" filter="url(#glow)">
        <GlowFilter />
        <circle cx="50" cy="50" r="40" strokeOpacity="0.3" />
        <path d="M 30 25 C 40 70, 60 70, 70 25" strokeOpacity="0.8" strokeWidth="2" />
        <path d="M 25 70 C 70 60, 70 40, 25 30" strokeOpacity="0.5" />
        <path d="M 75 70 C 30 60, 30 40, 75 30" strokeOpacity="0.5" />
        <circle cx="50" cy="50" r="8" fill="currentColor" stroke="none" strokeOpacity="0.5"/>
    </svg>
);

export const RitualSignAlKai: React.FC = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full stroke-current" strokeWidth="1.5" fill="none" strokeLinecap="round" filter="url(#glow)">
        <GlowFilter />
        <circle cx="50" cy="50" r="45" strokeOpacity="0.3" />
        <circle cx="50" cy="50" r="35" strokeOpacity="0.5" />
        <circle cx="50" cy="50" r="8" strokeWidth="2.5"/>
        <path d="M50 15 L50 37 M50 63 L50 85" />
        <path d="M15 50 L37 50 M63 50 L85 50" />
        <path d="M25 25 L40 40 M60 60 L75 75" />
        <path d="M25 75 L40 60 M60 40 L75 25" />
    </svg>
);

export const RitualSignMorte: React.FC = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full stroke-current" strokeWidth="1.5" fill="none" strokeLinecap="round" filter="url(#glow)">
        <GlowFilter />
        <circle cx="50" cy="50" r="40" strokeOpacity="0.3" />
        <path d="M30 30 L 70 70 M 70 30 L 30 70" strokeWidth="2.5"/>
        <path d="M50 20 L 20 50 L 50 80 L 80 50 Z" strokeOpacity="0.7"/>
    </svg>
);

export const RitualSignSangue: React.FC = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full stroke-current" strokeWidth="1.5" fill="none" strokeLinecap="round" filter="url(#glow)">
        <GlowFilter />
        <circle cx="50" cy="50" r="40" strokeOpacity="0.3" />
        <path d="M50 20 C 70 40, 70 60, 50 80 C 30 60, 30 40, 50 20 Z" strokeWidth="2.5"/>
        <path d="M50 80 L 50 90 M 40 85 L 60 85"/>
        <path d="M50 20 L 50 30"/>
    </svg>
);

export const ritualSignComponents: Record<string, React.FC> = {
  fragmentado: RitualSignFragmentado,
  caos: RitualSignCaos,
  alkai: RitualSignAlKai,
  morte: RitualSignMorte,
  sangue: RitualSignSangue,
};

export const RitualSignSelector: React.FC<{ signKey: string }> = ({ signKey }) => {
    const SignComponent = ritualSignComponents[signKey] || RitualSignFragmentado; // Default to one
    return <SignComponent />;
};