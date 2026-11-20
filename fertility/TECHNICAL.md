# Technical Documentation

**Male fertility screening prototype**
Future Health Digital Innovation Challenge — Fertility Challenge 01, Male Reproductive Health

---

## 1. The problem we chose to solve

A man can have a serious problem with his fertility and feel completely well. There is no ache and no sign, so nothing prompts him to check. By the time a couple reaches a fertility clinic, the woman has usually had scans, bloods and waiting rooms; the man has often had nothing — not because anyone decided he was fine, but because nobody asked.

The barrier is not clinical access. It is the act of walking into a fertility clinic and being seen doing it. Our thesis: **build a door that is low enough that a man will start.** The screening is the door. The semen analysis is the room behind it.

---

## 2. System architecture

### 2.1 Shape

A single self-contained HTML page. One file, no build step, no server, no framework.

```
fertility/index.html          the entire application (~107 KB)
fertility/test/*.js           Playwright verification harness
```

```
┌──────────────────────────────────────────────┐
│ index.html                                   │
│                                              │
│  ┌────────────┐      ┌────────────────────┐  │
│  │ UI layer   │◄────►│ Scene controller   │  │
│  │ (DOM)      │  SC  │ (three.js, WebGL)  │  │
│  └────────────┘      └────────────────────┘  │
│       │                       │              │
│   state A{}              camera / tiers      │
│       │                                      │
│  sessionStorage ── survives reload only      │
└──────────────────────────────────────────────┘
          no network calls — none at all
```

### 2.2 Rendering

- **three.js r128**, loaded as an ES module from a CDN import map.
- **Orthographic isometric camera** at a fixed offset `(15, 12, 15)`, so the factory reads as a cutaway diagram rather than a game world.
- PCF soft shadow maps, ACES filmic tone mapping, `PMREMGenerator` + `RoomEnvironment` for image-based lighting.
- The anatomy is modelled as three stacked floors — pituitary/brain (y≈15), testis (y≈7.6), outlet (y≈0) — each a `THREE.Group` toggled by visibility. Only the floor in view is rendered, so a camera close to one organ is never occluded by the slab above it.
- Organs are built from primitives: cutaway `SphereGeometry` shells with a wedge removed (`phiStart`/`phiLength`), and `TubeGeometry` along `CatmullRomCurve3` paths for the seminiferous tubule, vas deferens and urethra.

### 2.3 State and navigation

A single state object holds everything:

```js
A = { qi, answers{}, sel:Set, ctx{}, flags{}, express }
```

- `answers` is keyed by question index, so going back and changing an answer is lossless.
- `recompute()` rebuilds **every** flag from the stored answers rather than mutating flags incrementally — unticking a risk factor genuinely unsets it, including its visual consequences in the scene.
- **Persistence:** state is written to `sessionStorage` on every commit. A reload, an interrupting phone call or a stray back-swipe no longer destroys the screening; the opening screen then offers "Pick up where I left off". `sessionStorage` is deliberate over `localStorage` — it survives a reload but dies when the tab closes, which is the correct trade on a phone someone else might pick up.
- **Back gesture:** the app keeps one spare entry on the history stack and re-pushes on `popstate`, so the phone's own back gesture steps back one question instead of closing the app.

### 2.4 Privacy by architecture

There are **zero network calls in the screening** — no `fetch`, no `XMLHttpRequest`, no `sendBeacon`, no analytics. This is not a policy promise that could be broken by a future commit; it is a property of the artefact. The screening cannot leak because there is nowhere for it to go.

This is also a stated limitation: see §6.6.

---

## 3. The clinical model

### 3.1 Inputs

- **13 risk-factor questions** across three anatomical sections (hormonal axis, testis, outflow tract).
- **3 context questions** (duration trying, partner assessment status, prior conception).

Every question is written as plain clinical English first; the factory metaphor follows as subtext, never as the primary wording.

### 3.2 Triage

Deterministic, rule-based, three tiers. **No machine learning, no model, no training data.**

| Tier | Flags | Meaning | In the scene |
|---|---|---|---|
| `stop` | `lump`, `acutePain` | Needs assessment now, independent of fertility | Line halts, lighting drops, camera shakes, red beacon |
| `flag` | `testosterone`, `hypogonadism`, `pituitary`, `udt2`, `chemo`, `genetic`, `vasectomy` | Materially raises the prior; changes the pathway | Line slows to 30%, lighting dips |
| `note` | all other positives | Recorded, contributes to the picture | Tag pins to the organ |

Design constraint we held to: **the factory notices, it does not panic.** Honest disclosure of a risk factor must never be punished with a more alarming response than the clinical severity warrants, and panic would flatten the severity hierarchy the triage computes.

### 3.3 Reference limits

Semen analysis results are interpreted against the **WHO laboratory manual for the examination and processing of human semen, 6th edition (2021)**, lower reference limits (5th centile):

| Measure | Limit |
|---|---|
| Semen volume | 1.4 mL |
| Sperm concentration | 16 million/mL |
| Total sperm number | 39 million per ejaculate |
| Progressive motility | 30% |
| Total motility | 42% |
| Normal forms | 4% |

These are **reference limits, not thresholds of fertility.** A man below a limit is not infertile and a man above every limit is not guaranteed fertile. The app states this on the result screen rather than burying it.

### 3.4 Collection

Two routes are offered without preference ranking:

1. Masturbation into a sterile container.
2. A **non-spermicidal seminal collection sheath** used during intercourse.

Route 2 exists because for a significant share of our target population the first route presents a religious barrier that ends the pathway entirely. The app presents the option as a clinical fact. **It does not issue, imply or interpret any religious ruling** — that is explicitly outside its scope and is directed to the user's own religious authority.

---

## 4. Dataset assumptions

**There is no dataset, no model and no training.** This is worth stating plainly because "AI health screening" usually implies one.

| Input | Source | Status |
|---|---|---|
| Risk-factor question set | Clinical authorship (team clinician), standard male-factor history | Authored, not validated |
| Triage rules | Explicit `if` rules over answer flags; auditable in source | Deterministic |
| Reference limits | WHO 6th ed (2021), 5th-centile lower reference limits | Published, cited |
| Lab result values in the demo | **Three hardcoded scenarios** (`normal`, `borderline`, `low`) | **Simulated — not real data** |

The demonstration lab result is a fixture so the end-to-end journey can be shown. It is not a pipeline, not a lab integration, and must not be read as one.

---

## 5. Clinical boundaries

Stated as hard boundaries, not caveats:

1. **This is not a diagnostic device.** It is a screening and triage aid that decides whether a conversation and a test should happen.
2. **It does not and cannot replace semen analysis.** The screening's entire purpose is to get a man to the test, not to substitute for it.
3. **A screening result is never a fertility verdict.** No combination of answers tells a man he is fertile or infertile.
4. **Male factor is approximately half the picture.** Every result carries an unskippable line saying so. A reassuring male screening does not mean a couple has no issue.
5. **Interpretation and referral require a licensed clinician in the loop.** Returning an interpreted lab result with a referral recommendation is the practice of medicine and is regulated accordingly (in the UAE, DoH/MOHAP licensing). The prototype currently computes the interpretation algorithmically; **a named, licensed physician must own the result before this touches a real patient.**
6. **Two red-flag findings bypass fertility entirely.** A testicular lump and acute severe testicular pain route straight to "see a doctor now" regardless of every other answer — one is a possible malignancy, the other a possible torsion. Neither waits for a semen analysis.

### 5.1 Identity: two zones

The privacy claim is precise, and the boundary between the zones is deliberately visible to the user:

| | Zone 1 — the screening | Zone 2 — the lab test |
|---|---|---|
| Identity | Genuinely anonymous | Name + Emirates ID required |
| Data | Never leaves the device | Requisition, chain of custody, health record |
| Why | No clinical need to know | ISO 15189 primary-sample identification; two identifiers matching the request form |

The product's real claim is **"you never set foot in a fertility clinic"** — not "we never learn who you are." A sample cannot be processed anonymously: accreditation requires unambiguous identification, and in Abu Dhabi laboratories are additionally required to capture Emirates ID so results can be matched into Malaffi, the emirate's health information exchange. That means **a result is visible to other licensed providers treating the patient**, and the user must be told so before consenting.

Privacy that *is* preserved by design: the courier handles an accession barcode and never learns whose sample it is or what it contains; outer packaging is unbranded; identity is visible only to the lab and the requesting clinician.

> **Verification note:** the Abu Dhabi Emirates-ID capture requirement should be confirmed directly with the DoH and the lab partner before it appears in any public claim. Our sourcing is secondary.

---

## 6. Limitations

Honest inventory of what this prototype is not.

### 6.1 No backend exists
No server, no database, no authentication, no job queue. Arranging a kit, dispatching an agent and returning a result are **interface demonstrations only**. The operational half of the business — courier network, chain of custody, lab contracts, result delivery — is unbuilt and is where the real execution risk sits.

### 6.2 Lab results are simulated
See §4. Three fixed scenarios.

### 6.3 Never tested on physical hardware
Every measurement in this document was taken in **headless software-rendered Chromium at 390×844**. Load time, touch-target reachability, thermal behaviour and motion comfort on a real mid-range Android on mobile data are **unknown**. This is the largest single gap and we are not hiding it.

### 6.4 WebGL is a hard dependency
Roughly 231 KB (gzipped) of three.js downloads before the experience begins. On devices where WebGL is unavailable or very slow, `boot3D()` currently fails to a console message rather than a user-visible fallback. Progressive loading — questions first, scene after — is designed but not implemented.

### 6.5 Accessibility is partial
Reduced-motion preference is honoured for the camera shake (verified: camera positional spread 0.078 when motion is allowed, 0.002 when reduced) and for CSS animations. However: the canvas is unlabelled for screen readers, there are no ARIA landmark roles, and the experience has not been tested with assistive technology.

### 6.6 No measurement
Zero analytics means we cannot see which question men abandon on — a serious gap for a product whose only KPI is whether he starts and finishes. This conflicts directly with §2.4 and is an unresolved product decision, not an oversight.

### 6.7 No clinical or user validation
The question set has not been validated against outcomes. The factory metaphor has not been tested with the target population; whether a frightened 34-year-old finds it clarifying or patronising is unknown.

### 6.8 Engineering debt
The application is a single 1,600-line file with global scope and no module boundaries. It is appropriate for a prototype and inappropriate for a team.

---

## 7. Verification

A Playwright harness runs against headless Chromium with SwiftShader. Current status:

| Check | Result |
|---|---|
| Full 26-screen click-through, intro → result | passes, no page errors |
| State written, survives reload, answers restored | passes |
| Back gesture stays in app and steps back one question | passes |
| Reduced motion suppresses camera shake | passes (0.078 → 0.002) |
| Restart confirmation: cancel preserves, confirm clears | passes |
| Risk-tier reaction fires (lighting dip 68 → 59 → recovers) | passes |
| Navigation order monotonic along the outflow tract | passes |

Run with `node fertility/test/<name>.js` from a checkout with Playwright available.

---

## 8. What production would require

Ordered by what would block a first real patient:

1. A licensed physician owning every returned result, and the corresponding DoH/MOHAP licensing.
2. An accredited laboratory partner (ISO 15189) and a defined requisition and chain-of-custody process.
3. Courier operations meeting the ≤60 minute, temperature-controlled transport window — which constrains the service to a radius around each participating lab.
4. Backend with identity capture, encryption at rest, access control, and health-information-exchange submission.
5. Explicit consent flow covering who sees the result, including health-record visibility.
6. Clinical validation of the question set and triage thresholds.
7. A price. There is currently no pricing anywhere in the product, and the unit economics of a dedicated single-sample courier run are unproven.
