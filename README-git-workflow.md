# Cd'Kazim Ciris Portfolio – Git Workflow & Branch Rules

This repository hosts the source code for Cd'Kazim Ciris' portfolio site, including the AI interview chat widget.  
To keep the codebase stable and the history clean, follow these rules and workflow steps.

---

## 0. Rules for This Repo

### 🏛 Main branch (`main`)

- `main` is the **protected production branch**.
- **Do NOT commit directly** to `main`.
- All work must go through:
  - a dedicated feature or bugfix branch, and
  - a Pull Request (PR) into `main`.
- Merges into `main` should use **“Squash and merge”** on GitHub.

### 🌿 Branch naming

Use short, descriptive names:

- Features: `feature/<short-name>`
  - e.g. `feature/chat-widget-overlay`, `feature/plausible-analytics`
- Bug fixes: `bugfix/<short-name>`
  - e.g. `bugfix/chat-light-mode`, `bugfix/mobile-layout`
- Experiments/spikes (optional): `spike/<short-name>`

One topic per branch. If you start working on something different, open a new branch.

---

## 1. Starting Work

Always start from a clean, up-to-date `main`:

```bash
git checkout main
git pull origin main

git checkout -b feature/<short-name>
```

Do all coding for that task in this new branch.

---

## 2. Making Changes and Committing

While working:

```bash
git status                          # check what changed
git add path/to/file1 path/to/file2 # stage changes
git commit -m "Short clear summary"
```

Keep commits focused and meaningful (UI tweak, bug fix, refactor, etc.).

Push the branch to GitHub (first time only):

```bash
git push -u origin feature/<short-name>
```

---

## 3. Keeping Your Branch in Sync With `main`

Before opening or updating a PR, sync with `main` to reduce merge conflicts:

```bash
# Update main
git checkout main
git pull origin main

# Bring changes into your feature branch
git checkout feature/<short-name>
git merge main
```

If there are conflicts:

1. Fix them in the reported files (remove `<<<<<<<`, `=======`, `>>>>>>>` markers).
2. Stage the fixes and commit:

   ```bash
   git add <conflicted-files>
   git commit -m "Merge main into feature/<short-name> and resolve conflicts"
   ```

3. Push:

   ```bash
   git push
   ```

---

## 4. Opening and Merging a Pull Request

On GitHub:

1. Open a PR:
   - **Base**: `main`
   - **Compare**: `feature/<short-name>`
2. Wait for checks and (if enabled) review.
3. When ready to merge:
   - Use **“Squash and merge”**.
   - Write a clear squash message, e.g.  
     `Refactor CSS structure and improve chat widget light mode`.

This keeps `main` history clean: **one commit per PR**.

---

## 5. After Merge

After the PR is merged:

```bash
# Update local main with the new changes
git checkout main
git pull origin main

# Clean up the feature branch
git branch -d feature/<short-name>          # delete local branch
git push origin --delete feature/<short-name>  # delete remote branch (optional)
```

For the next task, repeat from **“Starting Work”** with a new branch from the updated `main`.

---

## 6. Handling Push Rejections (fetch first / non-fast-forward)

If you see:

```text
! [rejected] ... (fetch first)
```

it means the remote branch has commits you don’t have. Fix it by integrating the remote then pushing:

```bash
# Option A – merge remote into your local branch
git fetch origin
git merge origin/feature/<short-name>
# resolve conflicts if any, then:
git add <files>
git commit
git push
```

Avoid `--force` unless you **know exactly** what you’re doing and you’re the only person using that branch.

---

Following these rules keeps:

- `main` stable and production-ready,
- history readable and easy to revert, and
- feature work isolated and safe to experiment on.
