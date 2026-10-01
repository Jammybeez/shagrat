// Member avatars, cut from a sticker sheet and stored as public/avatars/<id>.png.
// Shared by the client (the picker) and the server (input validation).
export const avatars = [
  { id: "accuser", label: "The Accuser" },
  { id: "approver", label: "The Approver" },
  { id: "bone-collector", label: "The Bone Collector" },
  { id: "cook", label: "The Cook (do not ask what's in it)" },
  { id: "hoarder", label: "The Hoarder" },
  { id: "war-paint", label: "The Berserker" },
  { id: "flower-crown", label: "The Softie" },
  { id: "dark-knight", label: "The Black Helm" },
  { id: "scholar", label: "The Scholar" },
  { id: "tankard", label: "The Drinker" },
  { id: "archer", label: "The Archer" },
  { id: "brute", label: "The Brute" },
  { id: "shaman", label: "The Shaman" },
  { id: "raspberry", label: "The Heckler" },
  { id: "pipe-smoker", label: "The Pipe-Weed Enjoyer" },
  { id: "skull-helm", label: "The Skull Helm" },
  { id: "pious", label: "The Pious One" },
  { id: "glutton-king", label: "The Glutton King" },
  { id: "veteran", label: "The Veteran" },
  { id: "loon", label: "The Loon" },
] as const;

export type AvatarId = (typeof avatars)[number]["id"];

export const avatarIds = avatars.map((a) => a.id) as [AvatarId, ...AvatarId[]];

export function avatarLabel(id: string) {
  return avatars.find((a) => a.id === id)?.label ?? "A nameless orc";
}

export function randomAvatarId(): AvatarId {
  return avatars[Math.floor(Math.random() * avatars.length)]!.id;
}
