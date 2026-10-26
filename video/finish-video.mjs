import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));
const ffmpeg = join(root, "node_modules", "ffmpeg-static", "ffmpeg.exe");
const out = (...parts) => join(root, "out", ...parts);
const audio = (...parts) => join(root, "public", "audio", ...parts);
const skillMusic = "C:/Users/zhuan/.codex/skills/video-shotcraft/assets/audio/bgm/cat-walk.mp3";
function run(label, args) {
  console.log(label);
  const result = spawnSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...args], { encoding: "utf8", maxBuffer: 10_000_000 });
  if (result.status !== 0) throw new Error(`${label}: ${result.stderr.slice(-4000)}`);
}

// Avoid the source track's 117–124-second silent tail.
run("Building continuous music bed", [
  "-i", skillMusic, "-i", skillMusic,
  "-filter_complex", "[0:a]atrim=0:96,asetpts=PTS-STARTPTS[a0];[1:a]atrim=0:96,asetpts=PTS-STARTPTS[a1];[a0][a1]acrossfade=d=4:c1=tri:c2=tri,atrim=duration=180,asetpts=N/SR/TB[a]",
  "-map", "[a]", "-c:a", "libmp3lame", "-b:a", "192k", audio("music-180.mp3"),
]);

const splice = [
  "[0:v]trim=start_frame=0:end_frame=990,setpts=PTS-STARTPTS[v0]",
  "[1:v]setpts=PTS-STARTPTS[v1]",
  "[0:v]trim=start_frame=1260:end_frame=4350,setpts=PTS-STARTPTS[v2]",
  "[2:v]setpts=PTS-STARTPTS[v3]",
  "[0:v]trim=start_frame=4680:end_frame=4890,setpts=PTS-STARTPTS[v4]",
  "[3:v]setpts=PTS-STARTPTS[v5]",
  "[0:v]trim=start_frame=5100:end_frame=5400,setpts=PTS-STARTPTS[v6]",
  "[v0][v1][v2][v3][v4][v5][v6]concat=n=7:v=1:a=0,format=yuv420p[v]",
].join(";");
run("Assembling three corrected visual beats", [
  "-i", out("ascend-demo-final-silent.mp4"),
  "-i", out("coach-corrected.mp4"),
  "-i", out("team-corrected.mp4"),
  "-i", out("engineering-corrected.mp4"),
  "-filter_complex", splice,
  "-map", "[v]", "-an", "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
  "-movflags", "+faststart", out("ascend-demo-visual-v3.mp4"),
]);

const cues = [
  { at: 10, name: "transition-soft.mp3", gain: 0.13 },
  { at: 24, name: "whoosh-fast.mp3", gain: 0.10 },
  { at: 55, name: "impact-deep-whoosh.mp3", gain: 0.13 },
  { at: 68, name: "sparkle.mp3", gain: 0.13 },
  { at: 88, name: "transition-soft.mp3", gain: 0.13 },
  { at: 138, name: "impact-deep-whoosh.mp3", gain: 0.10 },
  { at: 156, name: "transition-soft.mp3", gain: 0.13 },
  { at: 170, name: "riser-cine.mp3", gain: 0.10 },
];
function buildAudio(withMusic, target) {
  const inputs = withMusic ? ["-i", audio("music-180.mp3")] : ["-f", "lavfi", "-t", "180", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"];
  const graph = [];
  graph.push(withMusic
    ? "[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.26,afade=t=in:st=0:d=1.7,afade=t=out:st=176:d=4[base]"
    : "[0:a]aformat=sample_rates=48000:channel_layouts=stereo[base]");
  const names = ["[base]"];
  cues.forEach((cue, index) => {
    inputs.push("-i", audio(cue.name));
    const label = `[fx${index}]`;
    graph.push(`[${index + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${cue.gain},adelay=${cue.at * 1000}:all=1${label}`);
    names.push(label);
  });
  graph.push(`${names.join("")}amix=inputs=${names.length}:duration=longest:dropout_transition=0:normalize=0,atrim=duration=180,asetpts=N/SR/TB[a]`);
  run(withMusic ? "Mixing music and sound effects" : "Mixing sound effects only", [
    ...inputs, "-filter_complex", graph.join(";"), "-map", "[a]", "-c:a", "aac", "-b:a", "192k", target,
  ]);
}
buildAudio(true, out("music-and-fx.m4a"));
buildAudio(false, out("fx-only.m4a"));
for (const [sound, target] of [
  ["music-and-fx.m4a", "ascend-demo.mp4"],
  ["fx-only.m4a", "ascend-demo-no-music.mp4"],
]) run(`Muxing ${target}`, [
  "-i", out("ascend-demo-visual-v3.mp4"), "-i", out(sound),
  "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", "-t", "180",
  "-movflags", "+faststart", out(target),
]);
console.log("Final 180-second music and no-music videos are ready.");
