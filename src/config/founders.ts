// The people behind amfire, shown on the About page and listed as founders in
// the site's structured data. Put photos in public/team/ (square, at least 400×400).
// The section is hidden while this list is empty.

export type Founder = {
  name: string;
  role: string;
  /** Two or three sentences in plain language: background, and what you do for clients. */
  bio: string;
  /** Square photo under public/, e.g. "/team/your-name.jpg" (structured data, small uses). */
  photo?: string;
  /** 3:4 portrait for the About page, framed head to waist with a little headroom (about 11%). Falls back to `photo`. */
  portrait?: string;
  linkedin?: string;
  /** A first-person note for the founder strip on the homepage and /agencies. */
  note?: string;
  /** A 60–90 second intro video under public/media/, shown beside the note once recorded. */
  video?: { src: string; poster?: string };
};

export const FOUNDERS: Founder[] = [
  {
    name: "Navanish Pandey",
    role: "Co-founder",
    bio: "Navanish designs and builds the systems amfire delivers, from the first look at how a company works to the day it runs without chasing. He owns every client outcome personally, and clients reach him directly.",
    photo: "/team/navanish-square.jpg",
    portrait: "/team/navanish-portrait.jpg",
    linkedin: "https://www.linkedin.com/in/navanish/",
    note: "Most companies don’t need another tool. They need someone who learns how each team really works, sees where work gets stuck between them, and builds what keeps it moving. Then stays to run it. I do that personally, for every client.",
  },
  {
    name: "Prashant Dixit",
    role: "Co-founder",
    bio: "Prashant leads amfire’s work with accounting and professional firms. He spends his time with partners and their teams, learning how work really moves through a practice, so every client has someone who knows their business.",
    photo: "/team/prashant-dixit-square.jpg",
    portrait: "/team/prashant-dixit.jpg",
    linkedin: "https://www.linkedin.com/in/prashant-dixit-8479b4242/",
  },
];
