import sharp from "../web/node_modules/sharp/dist/index.cjs";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("./", import.meta.url));
const skill = "C:/Users/zhuan/.codex/skills/video-shotcraft";
const captures = join(root, "public", "captures");
const stills = join(root, "public", "stills");
const audio = join(root, "public", "audio");
await mkdir(stills, { recursive: true });
await mkdir(audio, { recursive: true });

async function crop(source, target, left, top, width, height) {
  await sharp(join(captures, source)).extract({ left, top, width, height }).png().toFile(join(stills, target));
}
async function copy(source, target = source) {
  await cp(join(captures, source), join(stills, target));
}

await copy("02-software-selected-company-carousel.png", "company-carousel.png");
await copy("03-office-office-stage.png", "office-stage.png");
await copy("03-office-team-panel.png", "five-roles.png");
await copy("05-pdf-upload-material-panel.png", "pdf-upload.png");
await copy("04-events-stage2-activity.png", "events.png");
await copy("17-teammate-office-stage.png", "teammate-office.png");
await copy("18-support-brief-stage2-message-list.png", "support-message.png");
await copy("19-engineering-question-stage2-message-list.png", "engineering-message.png");
await copy("20-paused-stage2-activity.png", "paused-events.png");
await crop("07-lesson-task.png", "source-card.png", 580, 2620, 3120, 540);
await crop("07-lesson-task-code-split-grid.png", "task-code.png", 1120, 0, 2040, 1700);
await crop("08-code-fail-code-split-grid.png", "failed-checks.png", 1120, 0, 2040, 2150);
await crop("10-code-pass-code-split-grid.png", "passing-checks.png", 1120, 0, 2040, 2100);
await crop("09-feedback-first.png", "feedback-first.png", 580, 3000, 3120, 1050);
await crop("11-feedback-revised.png", "feedback-revised.png", 580, 3000, 3120, 1050);
for (const role of ["sales-marketing", "customer-support", "product-manager", "data-analyst"]) {
  await crop(`role-${role}.png`, `role-${role}.png`, 400, 160, 3280, 1780);
}
await crop("20-paused-stage2-activity.png", "pause-control.png", 0, 1170, 1518, 365);
await sharp(join(stills, "task-code.png")).extract({ left: 80, top: 240, width: 1880, height: 790 }).toFile(join(stills, "code-close.png"));
await sharp(join(stills, "failed-checks.png")).extract({ left: 80, top: 1260, width: 1880, height: 740 }).toFile(join(stills, "failed-result.png"));
await sharp(join(stills, "passing-checks.png")).extract({ left: 80, top: 1280, width: 1880, height: 700 }).toFile(join(stills, "passing-result.png"));
await sharp(join(stills, "events.png")).extract({ left: 0, top: 0, width: 1518, height: 1050 }).toFile(join(stills, "events-focus.png"));
await sharp(join(stills, "paused-events.png")).extract({ left: 0, top: 470, width: 1518, height: 800 }).toFile(join(stills, "paused-focus.png"));
await sharp(join(stills, "support-message.png")).extract({ left: 0, top: 0, width: 1414, height: 235 }).toFile(join(stills, "support-brief.png"));
await sharp(join(stills, "engineering-message.png")).extract({ left: 0, top: 215, width: 1414, height: 179 }).toFile(join(stills, "engineering-brief.png"));
await sharp(join(captures, "22-coach-panel.png")).extract({ left: 0, top: 450, width: 720, height: 550 }).toFile(join(stills, "coach-response.png"));
await sharp(join(captures, "17-teammate.png")).extract({ left: 400, top: 1890, width: 3050, height: 330 }).toFile(join(stills, "team-seat.png"));
await sharp(join(captures, "16-invite-main.png")).extract({ left: 1470, top: 600, width: 950, height: 950 }).toFile(join(stills, "invite-sam.png"));
await cp(join(captures, "21-teach-option.png"), join(stills, "teach-option.png"));

const bgm = join(skill, "assets", "audio", "bgm", "cat-walk.mp3");
const ffmpeg = fileURLToPath(new URL("./node_modules/ffmpeg-static/ffmpeg.exe", import.meta.url));
const renderedMusic = join(audio, "music-180.mp3");
const music = spawnSync(ffmpeg, [
  "-y", "-i", bgm, "-i", bgm,
  "-filter_complex", "[0:a]atrim=0:96,asetpts=PTS-STARTPTS[a0];[1:a]atrim=0:96,asetpts=PTS-STARTPTS[a1];[a0][a1]acrossfade=d=4:c1=tri:c2=tri,atrim=duration=180,asetpts=N/SR/TB[a]",
  "-map", "[a]", "-c:a", "libmp3lame", "-b:a", "192k", renderedMusic,
], { encoding: "utf8" });
if (music.status !== 0) throw new Error(music.stderr.slice(-2000));
for (const [name, dir] of [
  ["transition-soft.mp3", "transition"],
  ["whoosh-fast.mp3", "transition"],
  ["riser-cine.mp3", "riser"],
  ["impact-deep-whoosh.mp3", "impact"],
  ["sparkle.mp3", "light"],
  ["keyboard.mp3", "text"],
]) await cp(join(skill, "assets", "audio", "sfx", dir, name), join(audio, name));

await writeFile(join(root, "ASSET_SOURCES.md"), `# Video asset sources\n\n- Product UI: actual local Ascend fixture sessions captured by \`capture.mjs\` on 2026-10-25. The source PDF was fictional and generated for this video.\n- Background music: \`Cat Walk\` by Arulo, bundled with video-shotcraft from Mixkit. Source: https://assets.mixkit.co/music/371/371.mp3 . Verify the current Mixkit license before publication. The 180-second edit crossfades two copies over four seconds.\n- Sound effects: bundled video-shotcraft Mixkit assets; see \`C:/Users/zhuan/.codex/skills/video-shotcraft/assets/audio/ATTRIBUTION.md\` for per-file credits.\n`);
console.log("Prepared stills and 180-second music bed.");
