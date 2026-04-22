#!/usr/bin/env python3
"""HTML 파일을 지정 viewport 크기의 PNG로 렌더링."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

here = Path(__file__).parent

targets = [
    # (html, out_png, css_w, css_h, dsf)
    # 카페24 규격 정본 — 정확히 444x320px
    ('_story-01-main.html', 'story-01-main.png', 444, 320, 1),
    # 고해상도 백업 (블로그/소셜 공유 등 다른 용도)
    ('_story-01-main.html', 'story-01-main@2x.png', 444, 320, 2),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        for html_name, out_name, w, h, dsf in targets:
            html_path = here / html_name
            out_path = here / out_name
            if not html_path.exists():
                print(f'SKIP (not found): {html_name}', file=sys.stderr)
                continue
            ctx = browser.new_context(
                viewport={'width': w, 'height': h},
                device_scale_factor=dsf,
            )
            page = ctx.new_page()
            page.goto(html_path.as_uri(), wait_until='networkidle')
            page.wait_for_timeout(1500)
            page.screenshot(
                path=str(out_path),
                clip={'x': 0, 'y': 0, 'width': w, 'height': h},
                omit_background=False,
            )
            ctx.close()
            size_kb = out_path.stat().st_size / 1024
            print(f'OK {out_name}  css={w}x{h}  dsf={dsf}  {size_kb:.1f}KB')
    finally:
        browser.close()
