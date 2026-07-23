#!/usr/bin/env python3
"""
publish-page.py — mark a translated French page as live.

The /fr/ pages ship as English placeholders that show a "not translated yet"
banner and stay out of search results. Once translators have actually
translated a page, run this to flip the switches that publish it. It performs
the steps listed in each page's banner, idempotently, on BOTH the French page
and its English counterpart:

  French page (fr/<page>/index.html):
    - <html lang="en">  ->  <html lang="fr">
    - add "inLanguage": "fr" to the JSON-LD (if the page has one)
    - ensure a self-canonical and the three hreflang tags
    - drop a robots "noindex" tag if one is present
  English page (<page>/index.html):
    - ensure a self-canonical and the three hreflang tags
  sitemap.xml:
    - add the French URL
  js/main.js:
    - add the page's path to TRANSLATED_PATHS (this removes the banner)

Usage:
    python3 scripts/publish-page.py chapters/felfrost
    python3 scripts/publish-page.py fr/chapters/felfrost about /   # several at once

The page argument is forgiving: "chapters/felfrost", "fr/chapters/felfrost",
"/chapters/felfrost/", ".../index.html", and "/" (the home page) all work.

Run it from the repo root. It only edits files — it does NOT commit. Review the
changes, then commit them to your working branch as usual; the preview will
rebuild and you can eyeball the page before merging to main.
"""

import os
import re
import sys

BASE_URL = "https://nineblades.ca"


def die(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def normalize_arg(arg):
    """Reduce any accepted spelling of a page to its slug ('' for home)."""
    a = arg.strip().strip('"').strip("'")
    a = re.sub(r"^/?fr/", "", a)              # drop a leading fr/ or /fr/
    a = re.sub(r"/?index\.html$", "", a)      # drop a trailing index.html
    a = a.strip("/")
    return "" if a in ("", ".") else a


def paths_for(slug):
    """All the derived paths/URLs a publish needs, from a page slug."""
    if slug == "":
        return {
            "en_file": "index.html",
            "fr_file": "fr/index.html",
            "en_url": f"{BASE_URL}/",
            "fr_url": f"{BASE_URL}/fr/",
            "translated_path": "/",
        }
    return {
        "en_file": f"{slug}/index.html",
        "fr_file": f"fr/{slug}/index.html",
        "en_url": f"{BASE_URL}/{slug}",
        "fr_url": f"{BASE_URL}/fr/{slug}",
        "translated_path": f"/{slug}/",
    }


def insert_after_line(text, line_pattern, insertion):
    """Insert `insertion` (newline-prefixed) right after the first line
    matching `line_pattern`. Returns (new_text, did_insert)."""
    m = re.search(line_pattern, text)
    if not m:
        return text, False
    end = text.index("\n", m.end()) if "\n" in text[m.end():] else len(text)
    return text[:end] + insertion + text[end:], True


def strip_hreflang_comment(text):
    """Remove the '<!-- Uncomment when this page is translated ... -->' block
    that placeholder French pages carry."""
    return re.sub(
        r"\n?[ \t]*<!-- Uncomment when this page is translated.*?-->",
        "",
        text,
        flags=re.DOTALL,
    )


def strip_placeholder_banner(text):
    """Remove the big '<!-- ... FRENCH PAGE — ENGLISH PLACEHOLDER ... -->'
    comment. Once a page is translated the instructions are obsolete — and
    removing it also drops the copy of '<html lang="en">' it contains, so the
    lang swap below can't touch anything but the real tag."""
    return re.sub(
        r"<!--\s*=+\s*FRENCH PAGE.*?-->\n?",
        "",
        text,
        flags=re.DOTALL,
    )


def ensure_canonical_and_hreflang(text, self_url, en_url, fr_url):
    """Make sure the page has a self-canonical and the three hreflang tags.
    Idempotent: re-running changes nothing once they're present."""
    changed = []

    # A placeholder French page hides its hreflang in a comment — clear it out
    # first so the checks below see a clean slate.
    stripped = strip_hreflang_comment(text)
    if stripped != text:
        text = stripped
        changed.append("uncommented hreflang block")

    # Self-canonical.
    if not re.search(r'<link rel="canonical"', text):
        text, ok = insert_after_line(
            text,
            r'<link rel="icon" href="/favicon\.ico">',
            f'\n    <link rel="canonical" href="{self_url}">',
        )
        if ok:
            changed.append("added canonical")

    # hreflang trio, placed right after the canonical.
    hreflang = (
        f'\n    <link rel="alternate" hreflang="en" href="{en_url}">'
        f'\n    <link rel="alternate" hreflang="fr" href="{fr_url}">'
        f'\n    <link rel="alternate" hreflang="x-default" href="{en_url}">'
    )
    if not re.search(r'<link rel="alternate" hreflang="en"', text):
        text, ok = insert_after_line(text, r'<link rel="canonical"[^>]*>', hreflang)
        if ok:
            changed.append("added hreflang")

    return text, changed


def publish_fr_page(paths):
    f = paths["fr_file"]
    if not os.path.isfile(f):
        die(f"French page not found: {f}")
    text = open(f, encoding="utf-8").read()
    changes = []

    stripped = strip_placeholder_banner(text)
    if stripped != text:
        text = stripped
        changes.append("removed placeholder banner")

    # Anchored to the start of a line so it only ever matches the real <html>
    # element, never a mention of it inside prose.
    new_text = re.sub(r'(?m)^<html lang="en">', '<html lang="fr">', text, count=1)
    if new_text != text:
        text = new_text
        changes.append('lang="fr"')

    # inLanguage in the JSON-LD, if the page has a block and lacks the key.
    def add_inlanguage(block):
        body = block.group(1)
        if '"inLanguage"' in body:
            return block.group(0)
        body2 = re.sub(
            r'("@type":\s*"[^"]*",)',
            r'\1\n      "inLanguage": "fr",',
            body,
            count=1,
        )
        return block.group(0).replace(body, body2)

    new_text = re.sub(
        r'<script type="application/ld\+json">(.*?)</script>',
        add_inlanguage,
        text,
        count=1,
        flags=re.DOTALL,
    )
    if new_text != text:
        text = new_text
        changes.append('inLanguage: "fr"')

    # Drop a noindex robots tag if present (placeholders may carry one later).
    new_text = re.sub(
        r'\n?[ \t]*<meta name="robots" content="[^"]*noindex[^"]*">',
        "",
        text,
    )
    if new_text != text:
        text = new_text
        changes.append("removed noindex")

    text, cc = ensure_canonical_and_hreflang(
        text, paths["fr_url"], paths["en_url"], paths["fr_url"]
    )
    changes += cc

    open(f, "w", encoding="utf-8").write(text)
    return f, changes


def publish_en_page(paths):
    f = paths["en_file"]
    if not os.path.isfile(f):
        die(f"English page not found: {f}")
    text = open(f, encoding="utf-8").read()
    text, changes = ensure_canonical_and_hreflang(
        text, paths["en_url"], paths["en_url"], paths["fr_url"]
    )
    open(f, "w", encoding="utf-8").write(text)
    return f, changes


def publish_sitemap(paths):
    f = "sitemap.xml"
    text = open(f, encoding="utf-8").read()
    if f"<loc>{paths['fr_url']}</loc>" in text:
        return f, []
    # Clone the English page's <url> line, swapping in the French loc, so the
    # priority/changefreq match. Fall back to a default line before </urlset>.
    en_line = re.search(
        r'[ \t]*<url><loc>' + re.escape(paths["en_url"]) + r'</loc>.*?</url>\n',
        text,
    )
    if en_line:
        new_line = en_line.group(0).replace(paths["en_url"], paths["fr_url"])
        text = text[: en_line.end()] + new_line + text[en_line.end():]
    else:
        line = (
            f'  <url><loc>{paths["fr_url"]}</loc>'
            f'<changefreq>monthly</changefreq><priority>0.8</priority></url>\n'
        )
        text = text.replace("</urlset>", line + "</urlset>", 1)
    open(f, "w", encoding="utf-8").write(text)
    return f, ["added sitemap entry"]


def publish_translated_paths(paths):
    f = "js/main.js"
    text = open(f, encoding="utf-8").read()
    tp = paths["translated_path"]

    m = re.search(r"const TRANSLATED_PATHS = \[(.*?)\];", text, flags=re.DOTALL)
    if not m:
        die("could not find TRANSLATED_PATHS in js/main.js")

    existing = re.findall(r"""['"]([^'"]+)['"]""", m.group(1))
    if tp in existing:
        return f, []

    paths_list = existing + [tp]
    if len(paths_list) == 1:
        rendered = f"['{paths_list[0]}']"
    else:
        inner = "".join(f"    '{p}',\n" for p in paths_list)
        rendered = f"[\n{inner}]"
    text = text[: m.start()] + f"const TRANSLATED_PATHS = {rendered};" + text[m.end():]
    open(f, "w", encoding="utf-8").write(text)
    return f, [f"added {tp} to TRANSLATED_PATHS"]


def publish(slug):
    paths = paths_for(slug)
    label = "/ (home)" if slug == "" else f"/{slug}/"
    print(f"\n=== Publishing {label} ===")
    for fn in (publish_fr_page, publish_en_page, publish_sitemap, publish_translated_paths):
        f, changes = fn(paths)
        if changes:
            for c in changes:
                print(f"  {f}: {c}")
        else:
            print(f"  {f}: already up to date")


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    if not os.path.isfile("js/main.js") or not os.path.isdir("fr"):
        die("run this from the repo root (js/main.js and fr/ must be here)")
    for arg in argv:
        publish(normalize_arg(arg))
    print("\nDone. Review the changes, then commit them to your working branch.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
