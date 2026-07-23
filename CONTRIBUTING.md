# Contributing — translating the site into French

You can do everything here **in your web browser**. No software to install, and
it works the same on Windows, Mac, or a Chromebook. All you need is a GitHub
account with access to this repository.

This guide is written for the French translation effort, but the same steps
work for any edit.

---

## The short version

1. Open a file and edit it on GitHub.
2. **Commit** your change to the shared branch.
3. Wait ~30–60 seconds for the preview to rebuild.
4. Reload **https://preview.nineblades.ca** to see it live.

You won't see changes *as you type* — you have to commit first, then refresh
the preview. That's the normal rhythm; you'll get used to it quickly.

---

## One-time: find the shared branch and its pull request

All translation work happens on a single branch (for example
`french-translation`) with one open **pull request (PR)**. Everyone commits to
that same branch, so everyone's work shows up in the same preview.

- Ask the maintainer for the link to the PR, or find it under the repo's
  **Pull requests** tab.
- The PR has a comment with the **🔎 Live preview** link. That link
  (`https://preview.nineblades.ca`) is where you check your work.

If that branch/PR doesn't exist yet, ask the maintainer to create it — you
don't need to make your own.

---

## Editing a page

### Option A — the quick pencil (one file at a time)

1. Browse to the file you want, e.g. `fr/chapters/felfrost/index.html`.
2. Click the **pencil ✏️** (top-right of the file) to edit.
3. Make your changes (see *What to translate* below).
4. Scroll down to **Commit changes**.
   - Write a short message like `Translate Felfrost intro`.
   - Make sure **"Commit directly to the `french-translation` branch"** is
     selected (not "Create a new branch").
   - Click **Commit changes**.

### Option B — the full browser editor (several files at once)

1. On the repo's main page, press the **`.`** key (period), or change
   `github.com` to `github.dev` in the address bar.
2. This opens a full VS Code editor **in your browser**.
3. Make sure you're on the shared branch (bottom-left corner shows the branch
   name — click it to switch to `french-translation`).
4. Edit as many files as you like.
5. Open the **Source Control** panel (the branch icon on the left), type a
   short message, and click **Commit**, then **Sync / Push**.

Both options change the same files — pick whichever feels comfortable.

---

## What to translate on a French page

Every page under `fr/` starts as an **English placeholder**. Open one and
you'll see a comment block at the very top with instructions specific to that
page. In general:

**Do translate** the visible words:
- The page title (`<title>…</title>`)
- The description (`<meta name="description" …>`)
- Headings and paragraphs
- Button and link text
- Image descriptions (`alt="…"`)

**Do _not_ translate:**
- Menu labels and officer titles that come from the ORK — those are handled
  centrally in `js/main.js`.
- Proper names: **Nine Blades**, and chapter names like **Felfrost** or
  **Grandes Fourches**.
- Anything inside `< >` tags, URLs, or file paths. Only change the words a
  visitor reads.

### The "not translated yet" banner

While a page still has English text, visitors see a banner at the top saying
it isn't translated yet. **You don't need to add or remove this** — it appears
and disappears automatically. When a page is fully translated, the maintainer
flips one setting to clear the banner and publish it. Just focus on the words.

---

## Working together without stepping on each other

Everyone commits to the same branch, which is great for sharing one preview —
but two people editing the **same file** at the same time can collide.

- **Claim a page.** Agree on who's doing which page (e.g. "I'll take
  `fr/about/`, you take `fr/chapters/`"). Editing *different* files never
  conflicts.
- If you do get a **conflict** message when committing, it means someone else
  changed that file first. GitHub will ask you to reconcile — easiest is to
  cancel, reload the file to get the latest version, and redo your edit.

---

## Checking your work

1. After you commit, go to the PR — the **Actions** build runs automatically.
2. Give it ~30–60 seconds (you can watch it under the repo's **Actions** tab).
3. Reload **https://preview.nineblades.ca** and navigate to your page.

The preview shows the **latest commit on the branch**, from anyone. If a
teammate pushed right after you, the preview may show their version until the
next build — commit again or wait a moment and it'll come back around.

---

## Quick reference

| I want to…                    | Do this                                                   |
| ----------------------------- | --------------------------------------------------------- |
| Edit one file                 | Browse to it → pencil ✏️ → Commit to the shared branch    |
| Edit several files            | Press `.` on the repo → edit in the browser → Commit/Push |
| See my changes                | Reload https://preview.nineblades.ca after ~30–60s        |
| Know what to translate        | Read the comment at the top of each `fr/…` page           |
| Avoid conflicts               | Each person takes different pages                          |

Questions? Ask the maintainer on the PR or in the group chat — no question is
too small.
