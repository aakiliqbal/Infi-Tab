import {
  siFacebook,
  siGithub,
  siGmail,
  siGoogle,
  siGooglecalendar,
  siGooglechrome,
  siGoogledocs,
  siGoogledrive,
  siInstagram,
  siNetflix,
  siNotion,
  siReddit,
  siSpotify,
  siX,
  siYoutube,
  type SimpleIcon
} from "simple-icons";

const curatedIcons = {
  facebook: siFacebook,
  github: siGithub,
  gmail: siGmail,
  google: siGoogle,
  googleCalendar: siGooglecalendar,
  googleChrome: siGooglechrome,
  googleDocs: siGoogledocs,
  googleDrive: siGoogledrive,
  instagram: siInstagram,
  netflix: siNetflix,
  notion: siNotion,
  reddit: siReddit,
  spotify: siSpotify,
  x: siX,
  youtube: siYoutube
} satisfies Record<string, SimpleIcon>;

export type BrandIconId = keyof typeof curatedIcons;

export type BrandIcon = {
  id: BrandIconId;
  title: string;
  hex: string;
  path: string;
  aliases: string[];
};

const aliases: Record<BrandIconId, string[]> = {
  facebook: ["facebook", "fb", "facebook.com"],
  github: ["github", "git hub", "github.com"],
  gmail: ["gmail", "mail.google.com"],
  google: ["google", "google.com"],
  googleCalendar: ["calendar", "google calendar", "calendar.google.com"],
  googleChrome: ["chrome", "google chrome"],
  googleDocs: ["docs", "google docs", "docs.google.com"],
  googleDrive: ["drive", "google drive", "drive.google.com"],
  instagram: ["instagram", "insta", "instagram.com"],
  netflix: ["netflix", "netflix.com"],
  notion: ["notion", "notion.so"],
  reddit: ["reddit", "reddit.com"],
  spotify: ["spotify", "spotify.com"],
  x: ["x", "twitter", "x.com", "twitter.com"],
  youtube: ["youtube", "you tube", "youtu.be", "youtube.com"]
};

export const brandIcons = Object.fromEntries(
  Object.entries(curatedIcons).map(([id, icon]) => [
    id,
    {
      id,
      title: icon.title,
      hex: icon.hex,
      path: icon.path,
      aliases: aliases[id as BrandIconId]
    }
  ])
) as Record<BrandIconId, BrandIcon>;

export function matchBrandIcon(title: string, url: string): BrandIcon | null {
  return findBrandIconRecommendations(title, url)[0] ?? null;
}

export function findBrandIconRecommendations(title: string, url: string): BrandIcon[] {
  const haystack = `${title} ${url}`.toLowerCase();
  const queryParts = haystack
    .split(/[^a-z0-9]+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  return Object.values(brandIcons)
    .map((icon) => ({
      icon,
      score: scoreBrandIcon(icon, haystack, queryParts)
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.icon.title.localeCompare(b.icon.title))
    .slice(0, 6)
    .map((result) => result.icon);
}

function scoreBrandIcon(icon: BrandIcon, haystack: string, queryParts: string[]) {
  const title = icon.title.toLowerCase();
  let score = 0;

  for (const alias of icon.aliases) {
    const normalizedAlias = alias.toLowerCase();
    if (haystack.includes(normalizedAlias)) {
      score += normalizedAlias.includes(".") ? 8 : 5;
    }
  }

  if (queryParts.includes(title)) {
    score += 4;
  }

  if (queryParts.some((part) => title.includes(part) || part.includes(title))) {
    score += 2;
  }

  return score;
}
