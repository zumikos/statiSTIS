from html import escape
from pathlib import Path
import re
import sys


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


PROJECT_DIR = Path(__file__).resolve().parent.parent
NAVIGATION = [
    ("index.html", "Domů"),
    ("hraci.html", "Hráči"),
    ("skokani.html", "Skokani"),
    ("oddily.html", "Oddíly"),
    ("hledat-hrace.html", "Hledat hráče"),
    ("porovnat-hrace.html", "Porovnat hráče"),
    ("rekordy.html", "Rekordy"),
    ("o-projektu.html", "O projektu"),
]
SOCIAL_IMAGE_URL = "https://statistis.cz/images/logo.png"

HEADER_START = "<!-- shared-header:start -->"
HEADER_END = "<!-- shared-header:end -->"
ASSETS_START = "<!-- shared-assets:start -->"
ASSETS_END = "<!-- shared-assets:end -->"
SOCIAL_START = "<!-- shared-social-meta:start -->"
SOCIAL_END = "<!-- shared-social-meta:end -->"


def replace_marked_section(text, start, end, replacement):
    pattern = re.compile(
        rf"^[ \t]*{re.escape(start)}.*?^[ \t]*{re.escape(end)}",
        re.DOTALL | re.MULTILINE,
    )
    return pattern.sub(replacement, text, count=1)


def build_header(current_page):
    links = []
    for href, label in NAVIGATION:
        current = ' aria-current="page"' if href == current_page else ""
        links.append(f'        <a href="{href}"{current}>{label}</a>')

    return "\n".join([
        HEADER_START,
        "<header>",
        "    <h1>",
        '        <a class="site-title" href="index.html">',
        '            <img class="site-logo" src="images/logo-96.png" alt="">',
        "            <span>statiSTIS</span>",
        "        </a>",
        "    </h1>",
        "",
        '    <nav aria-label="Hlavní navigace">',
        *links,
        "    </nav>",
        "</header>",
        HEADER_END,
    ])


def build_shared_assets():
    return "\n".join([
        f"    {ASSETS_START}",
        '    <link rel="icon" type="image/png" href="images/logo-96.png">',
        "    <script>",
        "        try {",
        '            document.documentElement.dataset.theme = localStorage.getItem("statistis-theme") || "";',
        "        } catch {}",
        '        document.documentElement.dataset.theme ||= matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";',
        "        document.documentElement.style.colorScheme = document.documentElement.dataset.theme;",
        "    </script>",
        '    <link rel="stylesheet" href="css/style.css">',
        '    <script src="js/theme.js" defer></script>',
        f"    {ASSETS_END}",
    ])


def build_social_metadata(title, description, canonical_url):
    values = {
        "title": escape(title, quote=True),
        "description": escape(description, quote=True),
        "url": escape(canonical_url, quote=True),
    }
    return "\n".join([
        f"    {SOCIAL_START}",
        '    <meta property="og:type" content="website">',
        '    <meta property="og:locale" content="cs_CZ">',
        '    <meta property="og:site_name" content="statiSTIS">',
        f'    <meta property="og:title" content="{values["title"]}">',
        f'    <meta property="og:description" content="{values["description"]}">',
        f'    <meta property="og:url" content="{values["url"]}">',
        f'    <meta property="og:image" content="{SOCIAL_IMAGE_URL}">',
        '    <meta property="og:image:width" content="1254">',
        '    <meta property="og:image:height" content="1254">',
        '    <meta property="og:image:alt" content="Logo statiSTIS">',
        '    <meta name="twitter:card" content="summary">',
        f'    <meta name="twitter:title" content="{values["title"]}">',
        f'    <meta name="twitter:description" content="{values["description"]}">',
        f'    <meta name="twitter:image" content="{SOCIAL_IMAGE_URL}">',
        f"    {SOCIAL_END}",
    ])


def update_page(path):
    raw = path.read_bytes()
    has_bom = raw.startswith(b"\xef\xbb\xbf")
    text = raw.decode("utf-8-sig")
    header = build_header(path.name if path.name != "404.html" else None)
    assets = build_shared_assets()

    text = replace_marked_section(text, HEADER_START, HEADER_END, header)
    text = replace_marked_section(text, ASSETS_START, ASSETS_END, assets)

    title_match = re.search(r"<title>(.*?)</title>", text, re.DOTALL)
    description_match = re.search(
        r'<meta name="description" content="([^"]*)">',
        text,
    )
    canonical_match = re.search(
        r'<link rel="canonical" href="([^"]*)">',
        text,
    )
    if title_match and description_match and canonical_match:
        metadata = build_social_metadata(
            title_match.group(1).strip(),
            description_match.group(1),
            canonical_match.group(1),
        )
        text = replace_marked_section(text, SOCIAL_START, SOCIAL_END, metadata)

    text = text.replace("\r\n", "\n").replace("\r", "\n")
    encoded = text.replace("\n", "\r\n").encode("utf-8")
    path.write_bytes((b"\xef\xbb\xbf" if has_bom else b"") + encoded)
    print(f"✓ Aktualizováno {path.name}")


for html_file in sorted(PROJECT_DIR.glob("*.html")):
    update_page(html_file)
