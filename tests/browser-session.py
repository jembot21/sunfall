"""Run the Sunfall player smoke path in headless Chromium."""
from pathlib import Path
import socket
import subprocess
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def run(url):
    from playwright.sync_api import sync_playwright

    failures = []

    def report(label, passed, details):
        print(f"{'PASS' if passed else 'FAIL'} {label} — {details}", flush=True)
        if not passed:
            failures.append(label)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        try:
            page.goto(url, wait_until="domcontentloaded")
            page.get_by_role("button", name="New Game", exact=True).click(timeout=8000)
            page.wait_for_function("window.SF?.state?.mode === 'play'")
            arm_sample = """() => Object.values(SF.player.mesh.userData.arms)
                .filter(arm => arm?.rotation)
                .flatMap(({ rotation: { x, y, z } }) => [x, y, z])"""
            # Headless Chromium may decline pointer lock even after a real click.
            page.evaluate("() => { SF.input.locked = true; }")
            page.keyboard.down("KeyW")
            try:
                page.wait_for_timeout(180)
                first = page.evaluate(arm_sample)
                page.wait_for_timeout(140)
                second = page.evaluate(arm_sample)
            finally:
                page.keyboard.up("KeyW")
            delta = max((abs(a - b) for a, b in zip(first, second)), default=0)
            report("arm swing", delta > 0.001, f"rotation delta {delta:.6f} rad")

            before = page.evaluate("SF.runtime.wanted()")
            page.evaluate("""() => {
                const peds = SF.peds?.all;
                const origin = SF.runtime.position();
                const candidates = Object.values(peds || {})
                    .map(ped => ped?.mesh?.position || ped?.position)
                    .filter(position => position && Number.isFinite(position.x))
                    .sort((a, b) => Math.hypot(a.x-origin.x, a.z-origin.z)
                        - Math.hypot(b.x-origin.x, b.z-origin.z));
                if (candidates.length) {
                    const witness = candidates[0];
                    origin.set(witness.x + 3, origin.y, witness.z);
                }
            }""")
            page.mouse.down()
            try:
                page.wait_for_timeout(450)
            finally:
                page.mouse.up()
            page.wait_for_timeout(500)
            after = page.evaluate("SF.runtime.wanted()")
            report("wanted response", after > before, f"stars {before} → {after}")
            report("browser errors", not errors, "; ".join(errors) or "none")
        except Exception as error:
            report("browser session", False, f"{error}; page errors: {errors}")
        finally:
            browser.close()
    return bool(failures)


def main():
    server = None
    try:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        url = f"http://127.0.0.1:{port}/game/"
        server = subprocess.Popen(["node", "serve.ts", str(port)], cwd=ROOT)
        for _ in range(60):
            try:
                with urlopen(url, timeout=0.3):
                    break
            except OSError:
                if server.poll() is not None:
                    raise RuntimeError("Static server exited")
                time.sleep(0.1)
        else:
            raise RuntimeError("Static server did not become ready")
        return run(url)
    except Exception as error:
        print(f"FAIL browser session — {error}")
        return 1
    finally:
        if server is not None:
            server.terminate()
            server.wait(timeout=5)


if __name__ == "__main__":
    raise SystemExit(main())
