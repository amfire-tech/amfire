// The people behind amfire, shown on the About page and listed as founders in
// the site's structured data. Put photos in public/team/ (square, at least 400×400).
// The section is hidden while this list is empty.

export type Founder = {
  name: string;
  role: string;
  /** Two or three sentences in plain language: background, and what you do for clients. */
  bio: string;
  /** Path under public/, e.g. "/team/your-name.jpg". */
  photo?: string;
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
    bio: "Obsessed with two things: AI that does real work, and clients who never have to ask “what’s the status?” Navanish builds amfire’s AI agents and automations hands-on, and personally owns every client outcome, from the first call to go-live.",
    photo: "/team/navanish-square.jpg",
    linkedin: "https://www.linkedin.com/in/navanish/",
    note: "Most businesses don't need one more AI tool. They need someone who learns how each department really works, builds the system that takes the busywork out, and stays to run it. That's the job I take on personally, for every client.",
  },
];
