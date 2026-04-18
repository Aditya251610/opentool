// Random startup taglines — personality for your terminal.

const DEFAULT_TAGLINE = 'One MCP server. All your tools.'

const TAGLINES: string[] = [
  'One MCP server. All your tools.',
  'Your tools called—they want a unified API.',
  "Because copy-pasting API keys across 47 services isn't a workflow.",
  'Open source, self-hosted, zero vendor lock-in.',
  'We connect things so you can disconnect from work.',
  'The middleware between your ambition and your attention span.',
  'Making "I\'ll automate that later" happen now.',
  'Your terminal just leveled up. Type something.',
  'Like having a senior engineer on call, except this one never sighs.',
  "I read logs so you don't have to.",
  "If it works, it's automation. If it breaks, it's a learning opportunity.",
  'Hot reload for config, cold sweat for deploys.',
  'Open source means you can see exactly how we handle your secrets.',
  'Self-hosted, self-updating, zero excuses.',
  'Somewhere between "hello world" and "oh god what have I built."',
  'Your .env is safe with us. Probably.',
  'Finally—all your tools behind one API key.',
  'Built for developers who have better things to do than read OAuth docs.',
  'MCP: because REST was too mainstream.',
  "The only open-source tool server that doesn't require a PhD to set up.",
  "More integrations than your therapist's intake form.",
  'Powered by open source, sustained by caffeine and good docs.',
  'Less clicking, more shipping.',
  "I don't sleep. I just wait for your next API call.",
  'Half tool server, half debugger, full open source.',
  'Your personal API gateway—minus the enterprise pricing.',
  'Connecting tools since… well, recently. But with conviction.',
  'Ship features faster than your last sprint planning meeting lasted.',
  'I autocomplete your workflows—just slower and with more retries.',
  'Deployed locally, trusted globally, debugged eternally.',
  'The Arcade alternative your wallet was hoping for.',
]

const HOLIDAY_TAGLINES: Record<string, (date: Date) => boolean> = {
  'New year, new config—same old EADDRINUSE.': (d) => d.getMonth() === 0 && d.getDate() === 1,
  'Happy Holidays! May your builds be merry and your deploys be bright. 🎄': (d) =>
    d.getMonth() === 11 && d.getDate() >= 24 && d.getDate() <= 26,
  'Happy Diwali! Let the logs sparkle and the bugs flee. 🪔': (d) =>
    d.getMonth() === 9 && d.getDate() >= 19 && d.getDate() <= 21,
  'Happy Halloween! Beware haunted dependencies and cursed caches. 🎃': (d) =>
    d.getMonth() === 9 && d.getDate() === 31,
  "Happy Valentine's Day! Roses are typed, violets are piped. 💕": (d) =>
    d.getMonth() === 1 && d.getDate() === 14,
}

export function pickTagline(): string {
  const now = new Date()

  // Check holiday taglines first
  for (const [tagline, isActive] of Object.entries(HOLIDAY_TAGLINES)) {
    if (isActive(now)) return tagline
  }

  const index = Math.floor(Math.random() * TAGLINES.length)
  return TAGLINES[index] ?? DEFAULT_TAGLINE
}

export { DEFAULT_TAGLINE, TAGLINES }
