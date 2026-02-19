# Complete the ops-portal → admin-portal rename

All code and doc references have been updated. Two manual steps remain:

## 1. Rename the app folder

The folder `apps/ops-portal` could not be renamed automatically (it was in use). Do this manually:

1. **Close** any process using the folder: Cursor/VS Code (or close the project), dev servers, terminals that are `cd`'d into `apps/ops-portal`.
2. In PowerShell (from repo root):
   ```powershell
   Rename-Item -Path "apps\ops-portal" -NewName "admin-portal"
   ```
   Or in File Explorer: rename `apps\ops-portal` to `admin-portal`.
3. Refresh the lockfile:
   ```bash
   npm install
   ```
4. Rebuild the app to refresh `.next`:
   ```bash
   cd apps/admin-portal && npm run build
   ```

## 2. One doc file (optional)

`docs/implementation/architecture-replatforming-strategy.md` was locked (EPERM) during the rename. If you want to remove the last "Ops Portal" mentions there, do a find-and-replace in that file:

- Replace **Ops Portal** with **Admin Portal** (3 occurrences: lines 23, 117, 175).

---

After step 1, scripts (`dev-start.ps1`, `build-all.ps1`, `build-check.ps1`) and the README will point to `apps/admin-portal` and will work. The app `package.json` name is already `admin-portal`.
