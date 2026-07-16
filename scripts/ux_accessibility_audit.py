import json
import os
import re
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("UX_AUDIT_BASE_URL", "http://localhost:3200")
EVIDENCE_DIR = Path("docs/ux-accessibility-evidence")
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
AXE_PATH = Path("node_modules/axe-core/axe.min.js")

VIEWPORTS = [375, 768, 1024, 1440]
PUBLIC_ROUTES = {
    "home": "/",
    "login": "/login",
    "register": "/register",
}
PROTECTED_ROUTES = [
    "/onboarding",
    "/dashboard",
    "/learn",
    "/learn/vocabulary",
    "/learn/grammar",
    "/practice/academic-vocabulary-foundations",
    "/practice/academic-vocabulary-foundations/result/00000000-0000-0000-0000-000000000000",
    "/profile",
    "/progress",
]


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "route"


def audit_dom(page):
    return page.evaluate(
        r"""
        () => {
          const visible = (el) => {
            const style = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          };
          const text = (el) => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
          const name = (el) => {
            const labelledby = el.getAttribute('aria-labelledby');
            if (labelledby) {
              const value = labelledby.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim();
              if (value) return value;
            }
            const aria = el.getAttribute('aria-label');
            if (aria) return aria.trim();
            if (el.id) {
              const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
              if (label) return text(label);
            }
            if (el.closest('label')) return text(el.closest('label'));
            if (el.tagName === 'IMG') return el.getAttribute('alt') || '';
            return text(el) || el.getAttribute('title') || '';
          };
          const interactiveSelector = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
          const interactive = [...document.querySelectorAll(interactiveSelector)].filter(visible);
          const controls = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter(visible);
          const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
          const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
          return {
            title: document.title,
            lang: document.documentElement.lang,
            finalUrl: location.href,
            horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: document.documentElement.clientWidth,
            headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map((el) => ({level: Number(el.tagName[1]), text: text(el)})),
            landmarks: {
              main: document.querySelectorAll('main').length,
              nav: document.querySelectorAll('nav').length,
              header: document.querySelectorAll('header').length,
              footer: document.querySelectorAll('footer').length,
              aside: document.querySelectorAll('aside').length,
            },
            duplicateIds,
            unnamedInteractive: interactive.filter((el) => !name(el)).map((el) => ({tag: el.tagName, type: el.getAttribute('type'), html: el.outerHTML.slice(0, 180)})),
            unlabeledControls: controls.filter((el) => !name(el)).map((el) => ({tag: el.tagName, id: el.id, name: el.getAttribute('name'), type: el.getAttribute('type')})),
            smallTargets44: interactive.map((el) => {
              const rect = el.getBoundingClientRect();
              return {tag: el.tagName, name: name(el), width: Math.round(rect.width), height: Math.round(rect.height)};
            }).filter((item) => item.width < 44 || item.height < 44),
            focusables: interactive.map((el) => ({tag: el.tagName, name: name(el), id: el.id || null})),
          };
        }
        """
    )


def keyboard_order(page, count=14):
    page.locator("body").click(position={"x": 2, "y": 2})
    order = []
    for _ in range(count):
        page.keyboard.press("Tab")
        item = page.evaluate(
            r"""
            () => {
              const el = document.activeElement;
              if (!el) return null;
              const label = el.getAttribute('aria-label');
              const associated = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
              return {
                tag: el.tagName,
                id: el.id || null,
                name: (label || associated?.textContent || el.innerText || el.textContent || '').trim().replace(/\s+/g, ' '),
                outline: getComputedStyle(el).outlineStyle,
                boxShadow: getComputedStyle(el).boxShadow,
              };
            }
            """
        )
        if item:
            order.append(item)
    return order


def run_axe(page):
    page.add_script_tag(path=str(AXE_PATH.resolve()))
    result = page.evaluate(
        """
        async () => await axe.run(document, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
          },
        })
        """
    )
    return [
        {
            "id": violation["id"],
            "impact": violation["impact"],
            "help": violation["help"],
            "helpUrl": violation["helpUrl"],
            "nodes": [
                {
                    "target": node["target"],
                    "failureSummary": node.get("failureSummary"),
                }
                for node in violation["nodes"]
            ],
        }
        for violation in result["violations"]
    ]


results = {
    "baseUrl": BASE_URL,
    "publicMatrix": [],
    "protectedRoutes": [],
    "formErrors": {},
    "reducedMotion": {},
    "longContent": {},
    "offline": {},
    "consoleErrors": [],
}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)

    for width in VIEWPORTS:
        context = browser.new_context(viewport={"width": width, "height": 900})
        page = context.new_page()
        page.on(
            "console",
            lambda message, w=width: results["consoleErrors"].append(
                {"width": w, "type": message.type, "text": message.text}
            )
            if message.type == "error"
            else None,
        )
        for route_name, route in PUBLIC_ROUTES.items():
            page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
            dom = audit_dom(page)
            dom.update({"route": route, "routeName": route_name, "width": width})
            dom["keyboardOrder"] = keyboard_order(page)
            dom["axeViolations"] = run_axe(page)
            results["publicMatrix"].append(dom)
            page.screenshot(
                path=str(EVIDENCE_DIR / f"{route_name}-{width}.png"),
                full_page=True,
            )
        context.close()

    context = browser.new_context(viewport={"width": 375, "height": 900})
    page = context.new_page()

    page.goto(f"{BASE_URL}/login", wait_until="networkidle")
    page.get_by_role("button", name="Đăng nhập").click()
    page.wait_for_timeout(250)
    results["formErrors"]["login"] = {
        "activeId": page.evaluate("document.activeElement?.id || null"),
        "alerts": page.locator('[role="alert"]').all_text_contents(),
        "axeViolations": run_axe(page),
    }
    page.screenshot(path=str(EVIDENCE_DIR / "login-errors-375.png"), full_page=True)

    page.goto(f"{BASE_URL}/register", wait_until="networkidle")
    page.get_by_role("button", name="Tạo tài khoản").click()
    page.wait_for_timeout(250)
    results["formErrors"]["register"] = {
        "activeId": page.evaluate("document.activeElement?.id || null"),
        "alerts": page.locator('[role="alert"]').all_text_contents(),
        "invalidCount": page.locator('[aria-invalid="true"]').count(),
        "axeViolations": run_axe(page),
    }
    page.screenshot(path=str(EVIDENCE_DIR / "register-errors-375.png"), full_page=True)

    page.goto(f"{BASE_URL}/login", wait_until="networkidle")
    for _ in range(3):
        page.keyboard.press("Tab")
    results["formErrors"]["focusEvidence"] = page.evaluate(
        """
        () => ({
          tag: document.activeElement?.tagName,
          id: document.activeElement?.id || null,
          outline: getComputedStyle(document.activeElement).outlineStyle,
          boxShadow: getComputedStyle(document.activeElement).boxShadow,
        })
        """
    )
    page.screenshot(path=str(EVIDENCE_DIR / "login-keyboard-focus-375.png"), full_page=True)

    page.goto(f"{BASE_URL}/", wait_until="networkidle")
    heading = page.locator("h1")
    heading.evaluate("el => el.textContent = 'W'.repeat(180)")
    results["longContent"] = heading.evaluate(
        """
        el => ({
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          overflows: el.scrollWidth > el.clientWidth,
          wordBreak: getComputedStyle(el).wordBreak,
          overflowWrap: getComputedStyle(el).overflowWrap,
        })
        """
    )
    page.screenshot(path=str(EVIDENCE_DIR / "home-long-title-375.png"), full_page=True)
    context.close()

    reduced_context = browser.new_context(
        viewport={"width": 375, "height": 900}, reduced_motion="reduce"
    )
    reduced_page = reduced_context.new_page()
    reduced_page.goto(f"{BASE_URL}/", wait_until="networkidle")
    results["reducedMotion"] = reduced_page.evaluate(
        """
        () => ({
          matchesReduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
          htmlScrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
          skipLinkTransitionDuration: getComputedStyle(document.querySelector('.skip-link')).transitionDuration,
        })
        """
    )
    reduced_context.close()

    protected_context = browser.new_context(viewport={"width": 375, "height": 900})
    protected_page = protected_context.new_page()
    for route in PROTECTED_ROUTES:
        protected_page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
        record = audit_dom(protected_page)
        record.update({"requestedRoute": route})
        results["protectedRoutes"].append(record)
        protected_page.screenshot(
            path=str(EVIDENCE_DIR / f"protected-{slug(route)}-375.png"),
            full_page=True,
        )
    protected_context.close()

    offline_context = browser.new_context(viewport={"width": 375, "height": 900})
    offline_page = offline_context.new_page()
    offline_page.goto(f"{BASE_URL}/", wait_until="networkidle")
    offline_context.set_offline(True)
    try:
        offline_page.reload(wait_until="domcontentloaded", timeout=10_000)
    except PlaywrightError as error:
        results["offline"]["navigationError"] = str(error).splitlines()[0]
    results["offline"].update(
        {
            "url": offline_page.url,
            "title": offline_page.title(),
            "bodyText": offline_page.locator("body").inner_text()[:500],
        }
    )
    offline_page.screenshot(path=str(EVIDENCE_DIR / "offline-home-375.png"), full_page=True)
    offline_context.close()

    browser.close()

(EVIDENCE_DIR / "browser-audit.json").write_text(
    json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(json.dumps({"evidenceDir": str(EVIDENCE_DIR), "screenshots": len(list(EVIDENCE_DIR.glob('*.png')))}, ensure_ascii=False))
