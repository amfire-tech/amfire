import { Archivo, IBM_Plex_Mono, Inter } from "next/font/google";

// Archivo with its width axis for headings (wide letters read as stamped, engineered),
// Inter for reading, IBM Plex Mono for specs, sizes and labels.
export const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-mfg-display", display: "swap" });
export const body = Inter({ subsets: ["latin"], variable: "--font-mfg-body", display: "swap" });
export const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mfg-mono", display: "swap" });

export const fontVars = `${display.variable} ${body.variable} ${mono.variable}`;
