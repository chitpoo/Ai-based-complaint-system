# Grievance dataset

Two files, same columns. All complaints are written for this project; they contain no real names, phone numbers or roll numbers.

**Provenance.** The rows were drafted with AI assistance; they are not hand-written by the student and not collected from real complaints. Before the project is submitted the student must read every row, correct wording and labels where they disagree, and say in the report how the data was produced.

| File | Rows | Used for |
|---|---|---|
| `grievances.csv` | 495 (165 groups of 3) | Training and the grouped test split |
| `sanity.csv` | 50 (10 per category) | Final check only. Never trained on, never used to tune anything |

## Columns

| Column | Meaning |
|---|---|
| `group_id` | One id per issue, e.g. `HOS-017`. Each group holds three complaints on the same issue (rewordings or closely related cases) and they share the id. `train.py` splits by this column so complaints on one issue never sit on both sides of the split. In `sanity.csv` every row has its own id. |
| `title` | Short subject line, as a student would type it (max 200 characters in the app). |
| `description` | The complaint itself. Most are 2 sentences; some are a single short line, some run to 4 sentences, a few are typed casually. |
| `category` | `ACADEMIC`, `HOSTEL`, `INFRASTRUCTURE`, `FINANCE` or `HARASSMENT`. |
| `priority` | `LOW`, `MEDIUM` or `HIGH`. |

Rows of one group always have the same category and priority.

## Category rule for ambiguous complaints

Applied in this order; the first rule that fits decides.

1. **A person targeting, humiliating, threatening or hurting someone is `HARASSMENT`**, wherever it happens and whoever does it (classmate, senior, faculty, warden, guard). A teacher who marks unfairly without singling a student out is `ACADEMIC`.
2. **Money is `FINANCE`**, whatever the money is for: tuition, hostel fee, mess fee or mess rebate, bus fee, library fine, deposit, scholarship, stipend, refund, receipt, loan letter. A hall ticket blocked because of fee dues is `FINANCE`; a hall ticket missing for any other reason is `ACADEMIC`.
3. **Something broken, dirty, missing or dangerous inside the hostel is `HOSTEL`**: rooms, hostel bathrooms, mess food and timings, hostel wifi, hostel water and power, warden office, hostel security.
4. **The same kind of problem anywhere else on campus is `INFRASTRUCTURE`**: classrooms, labs and their equipment, library building and timings, campus wifi, roads, lights, lifts, canteen, parking, sports facilities, college buses.
5. **Teaching, exams and records are `ACADEMIC`**: syllabus, classes or lab sessions not held, attendance, marks, results, revaluation, timetable, electives, project guides, certificates and transcripts.

Two examples of the rule at work: a lab whose computers are broken is `INFRASTRUCTURE`, but lab sessions that are not conducted are `ACADEMIC`; a leaking tap in a hostel bathroom is `HOSTEL`, the same tap in the department building is `INFRASTRUCTURE`.

## Priority labelling guide (plan.md §4)

| Priority | When |
|---|---|
| `HIGH` | Safety risk or injury, harassment, a threat, or a hard deadline within two days (exam tomorrow, form closes tonight). |
| `MEDIUM` | Unresolved for more than 3 days, money blocked, or a repeated problem that has already been reported. |
| `LOW` | A suggestion, a minor repair with no hurry, or a general query. |

One extra rule keeps the labels consistent with the service: **a complaint that contains a critical keyword is labelled `HIGH`**, because `rules.py` forces `HIGH` for it anyway. Matching starts at the beginning of a word and allows any ending, so the stems `ragging, ragged, harass, unsafe, threat, assault, abus, suicid, emergenc, urgen, discriminat, brib, stalk, molest` also cover forms such as "harassed", "threatens", "urgently" and "urgency". Also matched: `corrupt` / `corruption` (not "corrupted"), `self-harm` / `self harm`, `kill` / `kills` / `killed` / `killing`, `rape` and its forms, "end my / his / her / their life" (also "ending ..."), and "acid attack". No `LOW` or `MEDIUM` row in either file matches.

### Priority inside HARASSMENT

| Priority | When |
|---|---|
| `HIGH` | Physical conduct or physical punishment (hitting, pushing, being made to kneel); sexual conduct (touching, following, filming, sexual or gender-targeted remarks); threats, blackmail and extortion; ragging; discrimination or hostile remarks on a protected ground (caste, religion, gender, skin colour, disability, region); impersonation, or obscene or sexualised content about someone online; any risk of self-harm. |
| `MEDIUM` | Repeated verbal mockery, insults, rumours, exclusion or rudeness without any of the above. |
| `LOW` | Suggestions and procedural queries (how to reach the committee, request for an awareness session). |

Mockery of someone's accent or English fluency alone is `MEDIUM`; slurs or unequal treatment because of someone's region or language are `HIGH`. Mocking memes or jokes about a person online are `MEDIUM` unless they are obscene, sexualised or posted under a fake identity.

The label follows the kind of conduct, not whether a keyword happens to be in the text. The service never returns `LOW` for a complaint it classifies as `HARASSMENT`: `rules.py` raises it to `MEDIUM` on purpose. The six `LOW` rows keep their label because that is what they are, so the served priority counts as wrong on them; `docs/evaluation.md` reports the model-alone and the served accuracy separately for this reason.

## Balance

| | LOW | MEDIUM | HIGH | Total |
|---|---|---|---|---|
| ACADEMIC | 27 | 45 | 27 | 99 |
| HOSTEL | 33 | 39 | 27 | 99 |
| INFRASTRUCTURE | 36 | 36 | 27 | 99 |
| FINANCE | 30 | 48 | 21 | 99 |
| HARASSMENT | 6 | 21 | 72 | 99 |
| **Total** | 132 (26.7%) | 189 (38.2%) | 174 (35.2%) | 495 |

`HARASSMENT` is mostly `HIGH` on purpose: that is what the labelling guide says.

## Adding rows

- A complaint on a new issue gets a new `group_id`; a rewording or a closely related case of an existing one reuses its `group_id`, category and priority.
- Rewordings must be real rewrites (different sentence structure and details), not the same sentence with one word swapped.
- Do not copy from `sanity.csv` and do not edit `sanity.csv` to make the numbers look better.
- Retrain and re-evaluate afterwards, and update `docs/evaluation.md` with the new output.
