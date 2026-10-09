# Personal LifeOS setup

Open **Settings > Set up my LifeOS**. Choose whole sections, adjust lecture and nutrition planning references, and select **Preview changes**. The preview reads only the signed-in account. It groups goals, projects, tasks, subjects, habits, interview topics, meal templates and recurring sessions by life area and labels new, existing, archived, previously removed, duplicate and conflicting records. Confirm to install the new items in one transaction. Nothing is installed on registration or by merely opening the page.

After installation, use **Open Today** to choose a priority and begin. The completion summary lists personal details to add later; placeholders do not block daily use.

The preset contains nine goals, three projects, 40 starter tasks and milestones, five editable subject placeholders, eight habits, 22 weekly blocks, 21 interview topics, and six optional meal templates. It never creates completion entries, grades, weight measurements, applications, meal logs, scores or past reviews. The calorie and protein values are planning references. The user's saved timezone and week start are retained; a new settings row defaults to Asia/Colombo and Monday.

Stable per-user template keys prevent duplicate installation. The installer records seeded keys so deleting a seeded record does not cause a later installation to recreate it. Existing managed records are preserved if the user changed their title, time or status. Similar user-created items and overlapping recurring sessions appear for manual review; the installer skips them. An optional checkbox previews recommended changes to a small set of untouched, flexible sessions from the earlier preset. Confirming these changes adds effective-dated revisions, leaving earlier occurrences intact. Customized and fixed sessions never qualify. Use Week to adjust any other existing session.

Some details need the user's own input: real subject names and assessment dates, actual foods and portions, preferred meal times, travel or social dates, and any achieved grades, practice results or measurements. The six meal slots remain optional and do not enable nutrition tracking automatically. The four planned gym visits do not enable an optional fifth visit.

Apply the additive `0015` and `0016` database migrations in the intended environment before opening setup. Do not run the installer against a personal database as a test. The preset is shared by web and desktop code, but each environment uses its own signed-in account and database.

For local verification, run `npm test`, `node tests/integration/release-upgrade.mjs pglite`, and `node tests/e2e/run-life-os-embedded.mjs`. The browser runner creates and removes its own temporary PGlite database; it does not use `.env.local` data.
