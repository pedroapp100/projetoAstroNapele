"""Builds the videos of the "A clínica" scroll tour (assets/clinica/passeio.mp4 and passeio-m.mp4) from the ten Flow clips in Video/.

    python tools/build-clinic-tour.py              # writes both files into assets/clinica/
    python tools/build-clinic-tour.py some/dir     # ... or into another folder (to compare before replacing)

Needs ffmpeg on the PATH. What it does to the clips (sorted by file name, so 01-... to 10-...):
- the walk goes at 2x (every other frame kept), so the file has half the frames and the scroll still gets a smooth image;
- the two procedure rooms (clips 8 and 9) are the point of the tour, so their last stretch (the approach and the room) plays at 1x and the last
  frame is held for a second before the dissolve: the room is seen whole, not dissolved away the moment it appears (CLIPS below);
- soft dissolve on every seam (short where the walk is continuous, longer where the next clip restarts in the corridor: SEAM_D);
- no audio, a keyframe every 8 frames so that seeking by scroll is cheap; 1280x720 for desktop, 854x480 for phones.

It prints, as JSON, where every clip starts in the finished video and where each room's 1x part, held frame and dissolve are. If you change CLIPS,
SEAM_D or the clips themselves, those seconds move: update from them the data-at of each <li> of .np-clinic__stops and the data-pace and data-duration
of .np-clinic__stage in assets/overview/index.html (napele-clinic.js reads them; nothing else needs to change).
"""
import json, os, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "Video"
OUT_DIR = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "assets" / "clinica"
VARIANTS = [("passeio.mp4", 1280, 720, "29"), ("passeio-m.mp4", 854, 480, "30")]   # name, width, height, crf
GOP = "8"
FPS = 24
CLIP_FRAMES = 190                         # 7.9167 s at 24 fps
# per clip: slow = second of the clip from which it plays at 1x (None = all at 2x); hold = seconds the last frame stays before the dissolve
CLIPS = [dict() for _ in range(10)]
CLIPS[7] = dict(slow=5.4, hold=1.0)       # 08, corridor -> Sala 1
CLIPS[8] = dict(slow=5.0, hold=1.0)       # 09, corridor -> Sala 2
# dissolve length (s) at each seam i -> i+1; 8->9 and 9->10 restart in the corridor (they dissolve over the held last frame)
SEAM_D = [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.80, 0.80]


def build(out, w, h, crf):
    clips = sorted(SRC.glob("*.mp4"))
    assert len(clips) == 10, f"expected 10 clips in {SRC}, found {len(clips)}"
    parts, inputs, lens, meta = [], [], [], []
    for i, c in enumerate(clips):
        inputs += ["-i", str(c)]
        cfg = CLIPS[i]
        d_after = SEAM_D[i] if i < len(SEAM_D) else 0
        base = f"[{i}:v]scale={w}:{h}:flags=lanczos,setsar=1,format=yuv420p"
        tail = cfg.get("hold", 0) + (d_after if cfg.get("hold") else 0)
        if cfg.get("slow") is not None:
            f0 = int(round(cfg["slow"] * FPS / 2)) * 2        # an even frame, where the 2x part ends and the 1x part begins
            a_len, b_len = (f0 // 2) / FPS, (CLIP_FRAMES - f0) / FPS
            parts.append(f"{base},split[s{i}a][s{i}b]")
            parts.append(f"[s{i}a]trim=end_frame={f0},setpts=PTS-STARTPTS,select='not(mod(n\\,2))',setpts=N/{FPS}/TB,fps={FPS}[a{i}]")
            parts.append(f"[s{i}b]trim=start_frame={f0},setpts=PTS-STARTPTS,fps={FPS}[b{i}]")
            # concat leaves a 1/1000000 timebase, xfade wants all inputs on the same one: fps=24 puts it back on 1/24
            parts.append(f"[a{i}][b{i}]concat=n=2:v=1:a=0,tpad=stop_mode=clone:stop_duration={tail},fps={FPS}[v{i}]")
        else:
            a_len, b_len = (CLIP_FRAMES // 2) / FPS, 0.0
            parts.append(f"{base},select='not(mod(n\\,2))',setpts=N/{FPS}/TB,fps={FPS}[v{i}]")
        lens.append(a_len + b_len + tail)
        meta.append(dict(a=a_len, b=b_len, hold=cfg.get("hold", 0)))

    starts, length, cur = [0.0], lens[0], "v0"
    for k, d in enumerate(SEAM_D):
        off = round(length - d, 4)
        starts.append(off)                  # clip k+1 starts to fade in here
        parts.append(f"[{cur}][v{k+1}]xfade=transition=fade:duration={d}:offset={off}[x{k}]")
        cur = f"x{k}"
        length = length + lens[k + 1] - d

    tmp = out.with_name(out.name + ".tmp.mp4")           # written aside and moved in, so a failed run never leaves an empty file behind
    cmd = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(parts), "-map", f"[{cur}]",
           "-an", "-c:v", "libx264", "-preset", "slow", "-crf", crf, "-g", GOP, "-keyint_min", GOP,
           "-sc_threshold", "0", "-bf", "0", "-pix_fmt", "yuv420p", "-profile:v", "high",
           "-movflags", "+faststart", str(tmp)]
    subprocess.run(cmd, check=True)
    os.replace(tmp, out)

    info = {"duration": round(length, 4), "clipStarts": [round(s, 4) for s in starts]}
    for i in (7, 8):                        # the rooms: where the 1x part begins, where the held frame begins and ends
        m = meta[i]
        info[f"room{i+1}"] = {"from": round(starts[i] + m["a"], 4), "hold": round(starts[i] + m["a"] + m["b"], 4),
                              "holdEnd": round(starts[i] + m["a"] + m["b"] + m["hold"], 4)}
    return info


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, w, h, crf in VARIANTS:
        info = build(OUT_DIR / name, w, h, crf)
        print(name, json.dumps(info))
