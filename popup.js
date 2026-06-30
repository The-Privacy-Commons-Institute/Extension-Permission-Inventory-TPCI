/**
 * popup.js
 *
 * Reads installed extensions via chrome.management.getAll(), scores each
 * one's DECLARED permissions using permission-tiers.js, and renders them
 * worst-to-best. No network requests anywhere in this file.
 */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Map internal tier keys to display labels and CSS classes
const TIER_DISPLAY = {
  ReviewCarefully: { label: "Review carefully", css: "tier-ReviewCarefully" },
  WorthChecking:   { label: "Worth checking",   css: "tier-WorthChecking"   },
  MinorAccess:     { label: "Minor access",      css: "tier-MinorAccess"     },
  MinimalAccess:   { label: "Minimal access",    css: "tier-MinimalAccess"   },
  None:            { label: "No flagged access", css: "tier-None"            },
};

function renderReason(r) {
  const row = document.createElement("div");
  row.className = "reason";

  const tierInfo = TIER_DISPLAY[r.tier] || { label: r.tier, css: "tier-None" };

  if (r.isHost) {
    // Host permission — show domain/pattern prominently
    row.innerHTML = `
      <span class="reason-tier ${tierInfo.css}" style="background:none;padding:0;">${escapeHtml(tierInfo.label)}</span>
      <span class="reason-text">
        <span class="reason-perm">${escapeHtml(r.pattern)}</span>
        — ${escapeHtml(r.note)}
      </span>`;
  } else {
    row.innerHTML = `
      <span class="reason-tier ${tierInfo.css}" style="background:none;padding:0;">${escapeHtml(tierInfo.label)}</span>
      <span class="reason-text">
        <span class="reason-perm">${escapeHtml(r.permission)}</span>
        — ${escapeHtml(r.note)}
      </span>`;
  }
  return row;
}

function renderExtension(ext, scored) {
  const wrapper = document.createElement("details");
  wrapper.className = "ext-row";

  const summary = document.createElement("summary");
  summary.className = "ext-summary";

  const tierInfo = TIER_DISPLAY[scored.topTier] || TIER_DISPLAY.None;
  const chip = document.createElement("span");
  chip.className = `tier-chip ${tierInfo.css}`;
  chip.textContent = tierInfo.label;

  const name = document.createElement("span");
  name.className = "ext-name" + (ext.enabled ? "" : " disabled");
  name.textContent = ext.name + (ext.enabled ? "" : " (disabled)");

  const chevron = document.createElement("span");
  chevron.className = "chevron";
  chevron.textContent = "▸";

  summary.appendChild(chip);
  summary.appendChild(name);
  summary.appendChild(chevron);
  wrapper.appendChild(summary);

  const detail = document.createElement("div");
  detail.className = "ext-detail";

  const hasHost = scored.hostReasons.length > 0;
  const hasApi  = scored.apiReasons.length > 0;

  if (!hasHost && !hasApi) {
    const none = document.createElement("div");
    none.className = "no-perms";
    none.textContent = "No permissions on our watch list. (It may still have other, narrower permissions not covered here.)";
    detail.appendChild(none);
  } else {
    // ── Host permissions first — most concrete, most scannable ──────────────
    if (hasHost) {
      const hostHeader = document.createElement("div");
      hostHeader.className = "reason-section-header";
      hostHeader.textContent = "Sites this extension can access";
      detail.appendChild(hostHeader);

      const tierOrder = { ReviewCarefully: 0, WorthChecking: 1, MinorAccess: 2, MinimalAccess: 3 };
      const sortedHost = [...scored.hostReasons].sort(
        (a, b) => (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9)
      );
      for (const r of sortedHost) {
        detail.appendChild(renderReason(r));
      }
    }

    // ── API permissions second ───────────────────────────────────────────────
    if (hasApi) {
      if (hasHost) {
        const divider = document.createElement("div");
        divider.style.cssText = "border-top:1px solid var(--border-soft);margin:8px 0 4px;";
        detail.appendChild(divider);
      }

      const apiHeader = document.createElement("div");
      apiHeader.className = "reason-section-header";
      apiHeader.textContent = "Browser capabilities";
      detail.appendChild(apiHeader);

      const tierOrder = { ReviewCarefully: 0, WorthChecking: 1, MinorAccess: 2, MinimalAccess: 3 };
      const sortedApi = [...scored.apiReasons].sort(
        (a, b) => (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9)
      );
      for (const r of sortedApi) {
        detail.appendChild(renderReason(r));
      }
    }
  }

  wrapper.appendChild(detail);
  return wrapper;
}

async function main() {
  const listEl = document.getElementById("list");

  let extensions;
  try {
    extensions = await chrome.management.getAll();
  } catch (e) {
    listEl.innerHTML = `<div class="empty-state">Couldn't read installed extensions (${escapeHtml(e.message || String(e))}).</div>`;
    return;
  }

  const self = await chrome.management.getSelf();
  const relevant = extensions.filter(
    (e) => e.id !== self.id && e.type === "extension"
  );

  if (relevant.length === 0) {
    listEl.innerHTML = `<div class="empty-state">No other extensions installed.</div>`;
    return;
  }

  const scoredList = relevant.map((ext) => ({ ext, scored: scoreExtension(ext) }));

  const tierRank = { ReviewCarefully: 4, WorthChecking: 3, MinorAccess: 2, MinimalAccess: 1, None: 0 };
  scoredList.sort((a, b) => {
    if (b.scored.totalPoints !== a.scored.totalPoints)
      return b.scored.totalPoints - a.scored.totalPoints;
    if (tierRank[b.scored.topTier] !== tierRank[a.scored.topTier])
      return tierRank[b.scored.topTier] - tierRank[a.scored.topTier];
    return a.ext.name.localeCompare(b.ext.name);
  });

  listEl.innerHTML = "";
  for (const { ext, scored } of scoredList) {
    listEl.appendChild(renderExtension(ext, scored));
  }
}

main();
