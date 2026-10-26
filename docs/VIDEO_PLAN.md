# Ascend: three-minute demo video plan

Status: rendered on 2026-10-25. The final music version is [`../video/out/ascend-demo.mp4`](../video/out/ascend-demo.mp4); the version without background music, retaining sound effects, is [`../video/out/ascend-demo-no-music.mp4`](../video/out/ascend-demo-no-music.mp4). Source captures, the sample PDF, asset credits, and the Remotion edit are in [`../video/`](../video/).

## Creative brief

- **Audience:** hackathon judges across engineering, marketing, education, and product.
- **Length and format:** 3:00, 16:9, 1920×1080, 30 fps.
- **Audio:** instrumental music throughout; no narration. Use a few restrained, physical UI and transition sounds beneath the music.
- **Main idea:** Ascend helps students turn concepts into work they can try, improve, and discuss with a teammate inside a simulated company.
- **Visual language:** use the current Ascend interface and real captures of its miniature offices. Carry over its warm cream background, deep green, editorial type, and gentle role accents. Keep captions large and short enough to read without pausing.
- **Provisional production route:** a custom video built with video-shotcraft's motion and sound guidance. The bundled Ink Press template is designed around a much shorter, ten-shot film; this three-minute tour needs room for five roles and collaboration. Choose the final production mode before rendering.

## Storyboard and exact on-screen copy

| Time | Picture and action | On-screen copy | Music and motion |
| --- | --- | --- | --- |
| 0:00–0:10 | A class concept on a simple note or PDF page resolves into Ascend's company selection screen. Keep the opening abstract until the real UI appears. | **What if learning became doing?** | Sparse opening; one deliberate reveal, then a readable hold. |
| 0:10–0:24 | Real capture of the five-company carousel, then enter the illustrated software office. | **Step into a simulated company** | The beat arrives as the office fills the frame. Use one slow camera move through the real capture. |
| 0:24–0:42 | Record a real upload of a fictional, text-based study PDF in the learning workspace. Start a related lesson or task; show the uploaded source card and **Teach me first** with the AI coworker. | **Upload your notes** → **Put them to work** | Compress the upload into a few clear beats, then hold on the source title and coach exchange. |
| 0:42–1:08 | Show the current engineering task in the actual left assignment/right code layout. Type a small change in the editor and run the checks; one check fails. Use the supported request-batching or duplicate-event exercise. | **Build a solution** → **See what breaks** | Tighten the rhythm on the Run action, then briefly thin the music under the failed result. |
| 1:08–1:28 | Correct the code, run checks again, and reveal the submitted attempt's specific feedback. Hold on the result long enough to read one criterion and one next step. | **Try again** → **Feedback on your work** | A modest lift on the passing checks; give the feedback card a calm hold. |
| 1:28–1:35 | Return to the miniature office and cycle through the five selectable coworker cards. | **Five ways to explore work** | Music opens up; a single, smooth transition introduces the role sequence. |
| 1:35–1:42 | Software engineer: show an issue, code editor, and checks. | **Software engineer** / Build and debug | Short, readable UI close-up. |
| 1:42–1:49 | Sales & marketing: show a customer discovery conversation. | **Sales & marketing** / Learn the customer | Keep the customer's message visible. |
| 1:49–1:56 | Customer support: show a customer issue and response or problem brief. | **Customer support** / Diagnose with care | Show the student's written response. |
| 1:56–2:03 | Product manager: show a focused feature brief and acceptance criteria. | **Product manager** / Define what matters | Let one criterion settle on screen. |
| 2:03–2:10 | Data analyst: show the dataset or trend task and a written recommendation. | **Data analyst** / Find the signal | Finish the role sequence with a clear visual pause. |
| 2:10–2:25 | Show a Real world company's labeled, simulated activity feed advancing; focus on a new issue, then click **Pause for task**. | **The company keeps moving** → **Pause. Take a task.** | Build tension as an event arrives; mute the pulse briefly on Pause. |
| 2:25–2:36 | Two named students enter the same fictional company through an invite. Frame the shared view alongside the five role choices to show that either student can move among them. | **Two students. Five roles.** | Beat returns with a wider two-screen composition. |
| 2:36–2:50 | Show a real cross-role handoff: a support problem brief, an engineering clarification, and linked work in the shared thread. Briefly echo the product, data, and marketing role cards from the earlier montage around the shared company view; do not present them as contributors to this specific thread unless captured doing so. | **Many perspectives. One company.** → **Practice the handoff** | Alternate the actual messages, then bring both screens and the role choices together. Hold one shared message long enough to read. |
| 2:50–3:00 | Pull back to the miniature office and resolve to the Ascend name and site. | **Ascend** / **Learn by doing in an AI company simulator.** / **ascendsim.tech** | Final rise, clean landing, logo and URL held for at least three seconds; music fades out. |

## Footage and asset list

1. Capture the **current** creation carousel, software office, source upload, teaching panel, coding task, failed check, corrected check, review, each of the five role workspaces, Real world event feed, Pause, invite, and two-student thread. Record clean fictional sessions so dates, names, company data, and task outcomes are consistent across shots.
2. Use real product captures for any recognizable UI. The existing [software office](screenshots/office-integrated-software.png), [restaurant office](screenshots/office-integrated-restaurant.png), and [bank office](screenshots/office-integrated-bank.png) are useful visual references. The older [engineering](stage2-captures/engineering-desktop.png) and [collaboration](stage2-captures/company-desktop.png) screenshots show the workflow but predate the latest branding and layout; recapture those screens before the video.
3. The video producer (the assistant using video-shotcraft) will prepare a fictional text-based PDF, upload it through the actual Ascend UI, start a related lesson or task, and verify that the uploaded source appears before recording the final take. The skill guides capture and editing; it does not independently operate the app or invent a successful upload. No PDF is required from the user unless they want their own material featured. Scanned-image PDFs need OCR and are unsupported here. Do not show Ford–Fulkerson as a working code task: the current app does not provide one.
4. Keep the five **AI coworker roles** distinct from the **two student seats**. The role montage presents software engineering, sales and marketing, customer support, product management, and data analysis as different perspectives inside one company. The shared thread demonstrates an actual support-to-engineering handoff; show more role contributions only if they are captured as real student or labeled AI messages. The activity feed's outcomes must remain visibly labeled as simulated.
5. Frame desktop captures for 16:9 delivery. For the long engineering page, crop and animate between the assignment, editor, checks, and feedback at readable scale; do not shrink the entire page into one frame. Avoid visible secrets, private uploads, or real customer data.

## Music and text rules

- Start with a restrained instrumental pulse, grow through the build-and-revise sequence, ease during the five-role tour, rise during the shared task, and finish with a clear musical resolution. Avoid vocals because captions carry the story.
- `video-shotcraft/assets/audio/bgm/bgm-tech-house.mp3` is a length-suitable **working candidate**, not a final music selection. Audition it against the rough cut and verify its specific usage rights before release; the skill's attribution file cannot trace that copy to an individual track page. Once a track is chosen, map actual beats and transitions before timing the final animation.
- Use one caption idea at a time: usually three to six words, no more than two lines, with enough hold to read. Keep product labels such as **Teach me first**, **Pause for task**, and **Run checks** legible where the action depends on them.
- Use the video-shotcraft sequence principle of a calm opening, one strong product reveal, alternating action and reading space, then a final brand peak. Match any movement to Ascend's own typography, palette, and real screens.
- If the film is rendered with music later, export both a music version and a version without the background track so the soundtrack can be replaced without re-editing the visual timeline.

## What this plan claims

The film shows current, demonstrable paths: sourced learning, five role workspaces, isolated engineering checks and review, company events that advance while a participant is active, shared Pause, and a two-student support-to-engineering handoff. It presents **learning by building** through the existing coding exercise. It does not claim arbitrary algorithms become executable tasks, that five students collaborate at once, or that simulated feed entries are real work completed by students or AI agents.
