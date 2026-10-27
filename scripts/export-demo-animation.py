#!/usr/bin/env python3
"""Optional MP4 export: Python Playwright, installed Chrome, and ffmpeg required.

Run from any directory: python scripts/export-demo-animation.py
The regular Node-only application does not depend on this helper.
"""

import argparse
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def export(args):
    source = args.input.resolve()
    output = args.output.resolve()
    if not source.is_file():
        raise ValueError(f"Animation HTML is missing: {source}")
    if output.suffix.lower() != ".mp4":
        raise ValueError("Output must have an .mp4 extension.")
    if not 1 <= args.fps <= 60 or min(args.width, args.height) < 2:
        raise ValueError("Use 1-60 fps and positive video dimensions.")
    if args.width % 2 or args.height % 2:
        raise ValueError("H.264 yuv420p requires even width and height.")
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as error:
        raise RuntimeError("Optional export requires the Python playwright package.") from error
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        try:
            import imageio_ffmpeg
            ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        except (ImportError, RuntimeError) as error:
            raise RuntimeError("Install ffmpeg on PATH or the optional imageio-ffmpeg package.") from error

    output.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(prefix=output.stem + "-", suffix=".mp4", dir=output.parent)
    os.close(handle)
    process = None
    try:
        with sync_playwright() as playwright, tempfile.TemporaryFile() as errors:
            browser = playwright.chromium.launch(channel="chrome", headless=True)
            try:
                page = browser.new_page(viewport={"width": args.width, "height": args.height},
                                        device_scale_factor=1, reduced_motion="reduce")
                page.set_default_timeout(15000)
                page.goto(source.as_uri() + "?capture=1", wait_until="load", timeout=15000)
                page.wait_for_function("typeof window.renderAt === 'function'", timeout=5000)
                duration = page.evaluate("Number(window.ANIMATION_DURATION)")
                if not isinstance(duration, (int, float)) or not math.isfinite(duration) or not 1 <= duration <= 180:
                    raise ValueError("ANIMATION_DURATION must be a finite number from 1 to 180 seconds.")
                page.evaluate("document.fonts.ready")
                total = math.ceil(duration * args.fps)
                hold = min(2.0, duration / 4)
                moving = max(2, total - round(hold * args.fps))
                end = duration - 1 / args.fps
                command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                           "-f", "image2pipe", "-vcodec", "png", "-framerate", str(args.fps),
                           "-i", "pipe:0", "-an", "-c:v", "libx264", "-preset", "medium",
                           "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", temporary]
                process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                                           stderr=errors, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
                try:
                    for frame in range(total):
                        seconds = end * min(frame / (moving - 1), 1)
                        page.evaluate("seconds => window.renderAt(seconds)", seconds)
                        process.stdin.write(page.screenshot(type="png", timeout=10000))
                        if frame % args.fps == 0:
                            print(f"Rendering {frame // args.fps}/{math.ceil(duration)} seconds", flush=True)
                    process.stdin.close()
                    code = process.wait(timeout=60)
                    if code:
                        raise RuntimeError(f"ffmpeg exited with code {code}.")
                except Exception as error:
                    if process.poll() is None:
                        process.kill()
                        process.wait(timeout=10)
                    errors.seek(0)
                    details = errors.read().decode("utf-8", errors="replace").strip()[-8000:]
                    raise RuntimeError(f"MP4 export failed: {error}" + (f"\nffmpeg: {details}" if details else "")) from error
                if Path(temporary).stat().st_size == 0:
                    raise RuntimeError("ffmpeg produced an empty video.")
            finally:
                browser.close()
        os.replace(temporary, output)
        print(f"Saved {output} ({duration:g}s, {args.width}x{args.height}, {args.fps} fps)")
    finally:
        if process and process.poll() is None:
            process.kill()
            process.wait(timeout=10)
        Path(temporary).unlink(missing_ok=True)


def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=root / "demo/workflow-animation.html")
    parser.add_argument("--output", type=Path, default=root / "demo/workflow-animation.mp4")
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--fps", type=int, default=24)
    args = parser.parse_args()
    try:
        export(args)
    except Exception as error:
        print(f"Export error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
