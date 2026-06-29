/**
 * permission-tiers.js
 *
 * A simple, independent permission-risk heuristic for ranking installed
 * extensions by what they CAN access — not whether they're malicious.
 *
 * IMPORTANT: This is intentionally NOT TPCI's Stage 5A behavioral scoring
 * engine. This module only looks at DECLARED permissions, which is all the
 * chrome.management API exposes. It does not inspect code, detect
 * obfuscation, check for known-malicious domains, or produce a
 * malicious/safe verdict.
 *
 * Tier labels are intentionally non-alarming — this tool is not a malware
 * scanner, and "Review Carefully" is a prompt to think, not a verdict.
 */

// Tier names — chosen to prompt review, not to alarm
const TIER_LABELS = {
  ReviewCarefully: "Review carefully",
  WorthChecking:   "Worth checking",
  MinorAccess:     "Minor access",
  MinimalAccess:   "Minimal access",
  None:            "No flagged access",
};

const API_PERMISSION_TIERS = {
  // REVIEW CAREFULLY — broad, hard-to-constrain capabilities
  debugger:        { tier: "ReviewCarefully", points: 100, note: "Can access full developer tools on any page — reads or changes anything on screen." },
  proxy:           { tier: "ReviewCarefully", points: 100, note: "Can redirect or intercept all of your network traffic, on every site." },
  nativeMessaging: { tier: "ReviewCarefully", points: 100, note: "Can communicate with programs outside the browser, bypassing Chrome's sandbox." },
  privacy:         { tier: "ReviewCarefully", points: 100, note: "Can change browser-wide privacy and security settings." },

  // WORTH CHECKING — meaningful access to sensitive data or page content
  cookies:              { tier: "WorthChecking", points: 30, note: "Can read and write cookies — including session cookies that keep you logged in." },
  webRequest:           { tier: "WorthChecking", points: 30, note: "Can observe every network request your browser makes." },
  webRequestBlocking:   { tier: "WorthChecking", points: 30, note: "Can intercept and modify network requests before they're sent." },
  history:              { tier: "WorthChecking", points: 30, note: "Can read your full browsing history." },
  downloads:            { tier: "WorthChecking", points: 30, note: "Can see and control files you download." },
  clipboardRead:        { tier: "WorthChecking", points: 30, note: "Can read whatever is on your clipboard — including copied passwords." },
  scripting:            { tier: "WorthChecking", points: 30, note: "Can inject and run code on pages it has access to." },
  tabs:                 { tier: "WorthChecking", points: 30, note: "Can see the URLs and titles of every open tab." },
  declarativeNetRequest:{ tier: "WorthChecking", points: 30, note: "Can block or redirect network requests according to its own rules." },

  // MINOR ACCESS — narrower or interaction-gated access
  storage:       { tier: "MinorAccess", points: 10, note: "Can store data locally — normal for most extensions." },
  activeTab:     { tier: "MinorAccess", points: 10, note: "Can access the current tab, but only when you click the extension." },
  geolocation:   { tier: "MinorAccess", points: 10, note: "Can request your physical location." },
  identity:      { tier: "MinorAccess", points: 10, note: "Can access your Google account identity/OAuth tokens." },
  clipboardWrite:{ tier: "MinorAccess", points: 10, note: "Can write to your clipboard." },
  notifications: { tier: "MinorAccess", points: 10, note: "Can show desktop notifications." },
  contextMenus:  { tier: "MinorAccess", points: 10, note: "Can add items to your right-click menu." },

  // MINIMAL ACCESS — narrow, low-impact
  alarms:       { tier: "MinimalAccess", points: 2, note: "Can schedule code to run at set times." },
  idle:         { tier: "MinimalAccess", points: 2, note: "Can detect when your system is idle." },
  power:        { tier: "MinimalAccess", points: 2, note: "Can keep your system awake." },
  fontSettings: { tier: "MinimalAccess", points: 2, note: "Can read or change font settings." },
  tts:          { tier: "MinimalAccess", points: 2, note: "Can use text-to-speech." },
};

function scoreHostPermission(pattern) {
  if (
    pattern === "<all_urls>" ||
    /^\*?:\/\/\*\/\*$/.test(pattern) ||
    pattern === "https://*/*" ||
    pattern === "http://*/*"
  ) {
    return {
      tier: "ReviewCarefully",
      points: 100,
      note: `Can read and modify every website you visit.`,
      isHost: true,
      pattern,
    };
  }
  if (pattern.includes("*.") || pattern.startsWith("*://")) {
    return {
      tier: "WorthChecking",
      points: 30,
      note: `Can access this domain and all its subdomains.`,
      isHost: true,
      pattern,
    };
  }
  return {
    tier: "MinorAccess",
    points: 10,
    note: `Can access this specific site.`,
    isHost: true,
    pattern,
  };
}

function scoreExtension(ext) {
  const hostReasons = [];
  const apiReasons  = [];
  let totalPoints   = 0;
  let topTier       = "None";

  const tierRank = {
    ReviewCarefully: 4,
    WorthChecking:   3,
    MinorAccess:     2,
    MinimalAccess:   1,
    None:            0,
  };

  for (const perm of ext.permissions || []) {
    const info = API_PERMISSION_TIERS[perm];
    if (info) {
      totalPoints += info.points;
      apiReasons.push({ permission: perm, ...info });
      if (tierRank[info.tier] > tierRank[topTier]) topTier = info.tier;
    }
  }

  for (const pattern of ext.hostPermissions || []) {
    const info = scoreHostPermission(pattern);
    totalPoints += info.points;
    hostReasons.push(info);
    if (tierRank[info.tier] > tierRank[topTier]) topTier = info.tier;
  }

  return { totalPoints, topTier, hostReasons, apiReasons };
}
