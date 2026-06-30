# Extension Permission Inventory

**A browser extension from [The Privacy Commons Institute](https://tpc.institute)**

See what your installed extensions can actually do, ranked by access level. No scanning, no verdicts, no network access — just your permissions, sorted.

[Chrome Web Store](#) · [tpc.institute](https://tpc.institute) · [Still There (research paper)](https://tpc.institute)

---<img width="1280" height="731" alt="tpc-extension-screen1" src="https://github.com/user-attachments/assets/a9e3cc8e-f995-4ad0-b2c8-b81322a42b24" />



## What it does

Most people install browser extensions without looking at what they're permitted to access. This tool surfaces that information — not to tell you whether an extension is malicious, but to make it easier to spot anything that doesn't match what an extension is supposed to do.

It calls `chrome.management.getAll()` to read each installed extension's declared permissions, then sorts them from broadest access to narrowest. Expanding any extension shows two sections:

- **Sites it can access** — specific domains or URL patterns it's permitted to read and modify, listed first because these are the most concrete and scannable
- **Browser capabilities** — API permissions (cookies, history, clipboard, etc.) with plain-language explanations of what each one actually allows

The tier labels are intentionally non-alarming:

| Label | Meaning |
|---|---|
| Review carefully | Broad or hard-to-constrain access — worth understanding what this extension does |
| Worth checking | Meaningful access to sensitive data or page content |
| Minor access | Narrower or interaction-gated access |
| Minimal access | Low-impact, limited-scope permissions |

## What it deliberately does not do

**No network requests.** The manifest declares no `host_permissions`, and there are no `fetch` or `XMLHttpRequest` calls anywhere in the codebase. This is verifiable — the code is short enough to read in full.

**No verdict.** "Review carefully" means the permission is broad enough to warrant a look, not that anything is wrong. Whether a permission makes sense for a given extension is a judgment only the user can make.

**Not a malware scanner.** Chrome's extension sandboxing means one extension cannot read another's code or runtime behavior — only `chrome.management` data (name, declared permissions, enabled state). A permission inventory is exactly what that API can honestly support. Anything claiming to detect malicious *behavior* client-side would either be lying about what it can see, or would need to re-fetch and analyze each extension's package server-side — reintroducing the network dependency and IOC-list-maintenance problem this tool is specifically designed to avoid.

**Not Stage 5A.** The permission tiers in `permission-tiers.js` are this tool's own independent heuristic, clearly documented as such. TPCI's Stage 5A behavioral scoring engine is a separate, more sophisticated instrument used in our research; it is not embedded here.

## Background

This extension was built as a companion to [*Still There*](https://tpc.institute) — TPCI's empirical study of malicious Chrome extension persistence after disclosure. One finding that motivated this tool: most users have no way to judge whether an extension's permissions match what it's actually supposed to do, which is part of why malicious extensions persist even after being publicly documented.

The extension is open source, free, ad-free, and collects nothing. See [tpc.institute/privacy](https://tpc.institute/privacy) for the full data practices statement, including the browser extension section.

## Files

```
manifest.json            MV3 manifest — single permission: management
popup.html               UI and styles
popup.js                 Rendering and sort logic
permission-tiers.js      Permission risk heuristic (independent of Stage 5A)
icons/
  icon*.png              Dark-toolbar variant (light outline, orange accent)
  icon*-light-theme.png  Light-toolbar variant (dark fill, orange accent)
```

## Loading locally

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select this folder
4. Click the extension icon in the toolbar to open the popup

After installing, two optional settings you can safely turn off under **Details**:
- **Allow access to file URLs** — not used by this extension
- **Collect errors** — a developer debugging tool, not needed for normal use

To keep the icon handy: right-click the puzzle piece in the toolbar → **Pin "Extension Permission Inventory"**.

## Contributing

Issues and pull requests welcome. A few things worth knowing before proposing changes:

- The "no network access" constraint is intentional and non-negotiable — any change that requires a network call or a remotely-maintained list is out of scope for this tool
- The tier labels were chosen deliberately to avoid alarm language; proposals to rename them back to security-severity terminology will be declined
- `permission-tiers.js` is explicitly *not* Stage 5A — keep it simple, documented, and independent

## License

Apache License 2.0. See [LICENSE](LICENSE).

---

*The Privacy Commons Institute — tpc.institute*
