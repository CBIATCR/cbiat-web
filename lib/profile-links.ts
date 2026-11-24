export function socialNetwork(value: string): "LinkedIn" | "X" | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return;
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return;
  const host = url.hostname.toLowerCase();
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "LinkedIn";
  if (["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"].includes(host)) return "X";
}

export function profileLinks(links: string[]) {
  let linkedin = "";
  let x = "";
  const other: string[] = [];
  for (const link of links) {
    const network = socialNetwork(link);
    if (network === "LinkedIn" && !linkedin) linkedin = link;
    else if (network === "X" && !x) x = link;
    else other.push(link);
  }
  return { linkedin, x, other };
}
