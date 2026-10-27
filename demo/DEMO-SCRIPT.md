# DemoJam script: Screen Builder

**Slot:** 10 minutes. **Audience:** mostly developers.
**Story:** I used AI to build a developer tool, then tested that process with an independent review and repair.
The builder itself has no AI assistant inside it. The AI is in how it was built and checked.
Drafted by Claude Desktop, then reviewed and packaged by Codex.

How to read this script:

- **DO** lines are actions. Do not read them aloud.
- **SAY** blocks (the quoted text) are what I read aloud.
- UI labels are in **bold** and match the app exactly.
- Timestamps are targets. If I run behind, cut from the Export section first.

---

## 0:00-0:40 · Silent intro

**DO:**
- Open `demo/workflow-animation.mp4` in a video player, or `demo/workflow-animation.html` in a browser, in full screen and paused on the title frame.
- Start playback. Say nothing for 40 seconds.
- It stops by itself on the last frame. Leave it there while I start talking.

---

## 0:40-1:30 · Why this tool

**SAY:**
> So that was the story in forty seconds. Now let me tell it properly.
>
> In my work, we build recurring mobile app screens as webviews. A review step. A confirmation. A code entry screen. They follow the same few patterns, again and again.
>
> I wanted a tool for that. A local, drag-and-drop builder for those screens. Real Lit components. Reusable blocks. One theme. Click-through preview. And an export that gives you code you can actually use.
>
> This talk follows how the builder got built and checked. I used AI to create developer tooling, and experimented with a workflow for reviewing what it produced.

---

## 1:30-2:30 · Step one: the brief and the build

**SAY:**
> Step one was a brief. It was high level on purpose. I gave it to Claude, in Claude Desktop, and I gave it creative ownership. I did not dictate the architecture or the UI. I wanted to see what it would choose.
>
> It built a real app. A project model. A renderer for the canvas. A code generator that mirrors the renderer. Linked blocks. Undo and redo. Drag and drop that works across shadow roots. And a test suite.
>
> That is a lot of structure for a first pass from a short brief.
>
> When it was done, there were sixteen tests, all green. The build passed. That gave me a useful starting point for review.

---

## 2:30-3:40 · Step two: independent review

**DO:** Optionally use the animation's seek bar to pause on the five-bug review frame while I explain the findings. Rehearse this before the talk.

**SAY:**
> Here is the experiment. I did not want to trust green checks on their own. So I asked for an independent review, by Astra. A separate pass with one job. Try to break it, and only report what you can reproduce.
>
> It reproduced five bugs. With sixteen passing tests and a passing build.
>
> One. A circular block paste crashed the builder.
>
> Two. Export was missing component dependencies.
>
> Three. Two screens with the same name overwrote each other's export files.
>
> Four. Imported and named slots were lost.
>
> Five. If you cleared a custom text on purpose, export put the default back.
>
> These are practical editing and export failures. The review exercised cases the original test suite did not cover. That is the useful result of this experiment: a separate pass gave me specific failures to reproduce and fix.

---

## 3:40-4:20 · Step three: repair and regression checks

**DO:** If using the animation as a visual aid, seek to the repair frame showing twenty-five tests, then leave it paused.

**SAY:**
> Step three was repair. I authorized the fixes, and the fixes came with regression checks. After repair there were twenty-five tests, and the build passed. Slots and export navigation were also checked in a real browser.
>
> The order matters. Reproduce the failure, add a regression check, and verify the repair.
>
> Before this talk, I had Codex do a fresh install from the tracked files. All twenty-five tests passed. The production build passed. The local server started with six saved screens.
>
> So what you are about to see is that code. Let me show you.

---

## 4:20-5:00 · Tour of the builder

**DO:**
- Switch to the browser tab at `http://127.0.0.1:5180`. **Transfer review** is already selected in the bottom strip.
- Point to each area as I name it. Do not click yet.

**SAY:**
> This is Screen Builder. The header says **Mobile webviews**, which is the project name.
>
> On the left, **Components** and **Layers**. In the middle, the screen. Along the bottom, the six sample screens. On the right, **Properties** and **Theme**. The components are real custom elements, rendered live. **Theme** is one set of design tokens for every screen, so they all stay consistent.
>
> Everything here runs locally. Public Lit and Lion components, and sample data.

---

## 5:00-6:20 · A flow with Preview

**DO:**
- If needed, click **Transfer review** in the bottom strip.
- Click the **Confirm transfer** button on the canvas.
- In **Properties**, point to **On tap, go to**. It shows **Transfer sent**.

**SAY:**
> Here is a transfer review screen. I select the **Confirm transfer** button. In **Properties**, under Interaction, there is **On tap, go to**. It is set to **Transfer sent**. In the generated code, that becomes a navigate event. In **Layers**, elements that link to another screen get a small link icon.
>
> Now let's try it.

**DO:**
- Click **Preview** at the top.
- Click **Confirm transfer**. The screen shows **Money sent**.
- Click **Done**. It returns to the review screen.

**SAY:**
> I tap **Confirm transfer**. Money sent. And **Done** takes me back to the review.
>
> To be clear, this is simulated navigation between screens. No money moved. But you can click through a flow like this with a designer or a product owner before anyone hand-codes the screens.

**DO:**
- Click **Design** at the top to leave Preview.

---

## 6:20-7:40 · Shared blocks

**DO:**
- Click **Transfer sent** in the bottom strip. Point to **Questions? Contact us**.
- Click **Verify code**. Point to the same link.

**SAY:**
> Next, blocks. A block is a reusable composition, and every use is linked. This help link is one block. It sits on Transfer sent, and on Verify code.

**DO:**
- Click the **Components** tab. In the **Blocks** section, hover **Help link** and click its pencil icon (**Edit block**).
- The banner reads **Editing block Help link**.
- Click the link on the canvas to select the block root.
- In **Properties**, in **Label**, replace `Questions? Contact us` with `Need help? Contact us`.
- Click **Done** in the banner.

**SAY:**
> I open it with **Edit block**. The banner tells me changes apply everywhere it is used. I select the link, and in **Properties** I change the **Label**. Questions becomes Need help.
>
> **Done**. Now Transfer sent...

**DO:**
- Click **Transfer sent**, then **Verify code**, in the bottom strip.

**SAY:**
> ...and Verify code. Both updated, from one edit. Each use can still override its own text, or detach. These two do not, so they follow the block.

---

## 7:40-8:50 · Export

**DO:**
- Click **Export** at the top right.
- Make sure the screen picker shows **Transfer review**.

**SAY:**
> Finally, **Export**. Four tabs. **Lit component**, **HTML page**, **theme.css** and **Project JSON**.
>
> This is the Lit source for the transfer review. Plain Lit, with the theme as CSS custom properties. Further down, the button we looked at fires its navigate event.

**DO:**
- Scroll to the rehearsed `navigate` line and point to it.
- Click **HTML page**, then **theme.css**, then **Project JSON**. Pause about a second on each.

**SAY:**
> The HTML page runs the screen in a browser. **theme.css** holds the design tokens, loaded once per webview. **Project JSON** is the whole project, screens, blocks and theme, so you can commit it and share it.
>
> With the dev server running, **Write all screens to repo** writes the source, the compiled JavaScript, HTML pages, the theme, and the local dependencies bundled in. That last part was bug number two from the review.

**DO:**
- Optional, only if rehearsed: click **Write all screens to repo**.
- Close the dialog.

---

## 8:50-9:30 · Scope and next steps

**SAY:**
> Let me be clear about what this is. It is a local prototype. It uses public components and sample data. The internal ing-web adapter is a disabled template. There is no verified private ING package, no native bridge, no production integration, and no accessibility certification. Custom coded components still need code and registration.
>
> And there is no AI inside the builder. The AI was in how it was built and checked.

---

## 9:30-10:00 · Close

**SAY:**
> Here is what I am taking away. AI got me a working tool from a high-level brief. Passing tests covered part of its behavior. Independent review found additional failures, and repairs with regression checks gave me a stronger basis for the next round of work.
>
> Getting the build was the easy part. The checking is where I learned the most.
>
> Try that loop on your next internal tool. Thank you.

---

## Optional 30-second closing

Use this in place of the last line of the Close if I am ahead of time, or as the bridge into questions.

**SAY:**
> If you want to try it, ask me for repo access. Then it is npm ci, npm run dev, and open port fifty-one eighty. Six sample screens are waiting for you.
>
> And if you build your own tools with AI, try the same loop. One pass builds. A separate pass tries to break it. Repairs only count when they come with a regression check. I would love to hear what your review finds. Thanks.

---

## Recovery line if the live demo fails

**SAY:**
> Live demos are the best argument for independent review. Give me five seconds.

**DO:**
1. Press **Ctrl+R** to reload the page. The project autosaves, so the screens come back.
2. If the page does not load, switch to the terminal and check that `npm run dev` is still running. Restart it if needed.
3. If it is still broken after about 20 seconds, switch to the animation, press **End** for the last frame, and say:

> This is the flow I was about to click. Confirm transfer goes to Money sent, and Done goes back. I will show it live afterwards to anyone who wants to see it.

Then skip ahead to "Scope and next steps".

---

## Rehearsal checklist

- [ ] Run the full talk with a timer at least twice. Target 9:30 so there is slack.
- [ ] The dev server runs with `npm run dev -- --host 127.0.0.1 --strictPort` and the header says **Saved to builder-data/ in the repo**.
- [ ] The bottom strip shows six screens: Software update, Transfer review, Transfer sent, Verify code, Savings overview, New screen.
- [ ] Before each run, the Help link reads `Questions? Contact us` on Transfer sent and Verify code. Reset after every rehearsal (see `demo/README.md`).
- [ ] **Confirm transfer** shows **On tap, go to** = **Transfer sent**, and **Done** on Transfer sent goes back to Transfer review in **Preview**.
- [ ] I know exactly where the `navigate` line is in the **Lit component** export for Transfer review.
- [ ] I decided whether to click **Write all screens to repo** live, and rehearsed it if yes.
- [ ] I do not open **Libraries** or use its Shoelace example. It needs internet.
- [ ] Browser zoom is readable from the back of the room. Notifications are off.
- [ ] The animation is open in its own window, paused on the first frame, with Full screen tested on the projector.
- [ ] After the last rehearsal, `git status` shows no change to `builder-data/project.json`.
