# Phases.Umbraco.Community.TemplateHistory

> "Version history for your Umbraco files — compare, restore, and never lose a change."

## What is Template History?

Template History is an Umbraco 17 backoffice package that automatically snapshots **templates**, **stylesheets**, **scripts**, and **partial views** each time you save them in the backoffice. Open the **History** tab on any supported file to browse past versions, compare changes with a visual diff, and restore an earlier version in one click.

### Key benefits

- **Full file coverage** — Templates, stylesheets, scripts, and partial views
- **Visual diffs** — Unified or side-by-side comparison between any two versions
- **One-click restore** — Roll back to a previous version from the backoffice
- **Settings dashboard** — See recent file changes across all asset types
- **Non-intrusive** — Code/Template tab stays the default; History is one click away
- **SQLite-ready** — Works with the default Umbraco database providers

---

## Where to find History

After installing the package, open any supported file under **Settings → Templating**:

| Asset type   | Location in backoffice              | History tab |
|--------------|-------------------------------------|-------------|
| Template     | Settings → Templates                | History     |
| Stylesheet   | Settings → Stylesheets              | History     |
| Script       | Settings → Scripts                  | History     |
| Partial view | Settings → Partial Views            | History     |

You can also open **Settings → Template History** dashboard to browse recent versions across all file types.

### Default tab

The **Code** (or **Template**) editor tab opens by default. Switch to **History** to view saved versions.

---

## How to use History

### Browse versions

1. Open a template, stylesheet, script, or partial view in the backoffice.
2. Click the **History** tab.
3. Select a version from the list to inspect when it was saved and by whom.

### Compare versions

1. On the **History** tab, pick an **Older version** and **Newer version** (or **Current**).
2. Click **Compare selected**.
3. Switch between **Side by side** and **Unified** diff views.

### Restore a version

1. Find the version you want in the version list.
2. Click **Restore**.
3. Confirm — the file content is replaced and a new snapshot of the previous content is saved first.

> **Note:** The first save of a brand-new file may not create a snapshot (nothing existed on disk yet). Save again after the initial save to start building history.

---

## Installation

### Via NuGet (recommended)

```powershell
dotnet add package Phases.Umbraco.Community.TemplateHistory
```

Or in Visual Studio: **Manage NuGet Packages** → search for `Phases.Umbraco.Community.TemplateHistory`.

### Local NuGet feed

```powershell
dotnet add package Phases.Umbraco.Community.TemplateHistory --version 0.1.0 --source "path\to\nuget\folder"
```

### Requirements

- Umbraco **17.x**
- .NET **10.0**

The package registers itself via `IComposer` — no manual `Program.cs` changes required. Restart the site after install and hard-refresh the backoffice (`Ctrl+Shift+R`).

---

## Umbraco Marketplace

This package is listed on the [Umbraco Marketplace](https://marketplace.umbraco.com/). Listing metadata lives in [`umbraco-marketplace.json`](umbraco-marketplace.json) at the repository root.

To appear on the marketplace:

1. Publish the NuGet package with the `umbraco-marketplace` tag (included in the `.csproj`).
2. Ensure `PackageProjectUrl` points to this GitHub repository.
3. Commit `umbraco-marketplace.json` and `icon.png` to the repo root on the default branch.

See [Listing your package](https://docs.umbraco.com/umbraco-dxp/marketplace/listing-your-package) for full details.

---

## Building from source

```powershell
git clone https://github.com/phases/Phases.Umbraco.Community.TemplateHistory.git
cd Phases.Umbraco.Community.TemplateHistory

# Build client + package
dotnet build src\Umbraco.Community.TemplateHistory\Umbraco.Community.TemplateHistory.csproj

# Create NuGet package
dotnet pack src\Umbraco.Community.TemplateHistory\Umbraco.Community.TemplateHistory.csproj -c Release -o artifacts\nuget
```

Run the test site:

```powershell
dotnet run --project tests\Umbraco.Community.TemplateHistory.TestSite
```

---

## Troubleshooting

### History tab is empty after saving

1. **Save twice** — the first save of a new file often has no prior content to snapshot.
2. **Hard-refresh** the backoffice after installing or upgrading (`Ctrl+Shift+R`).
3. **Restart** the Umbraco site after package install.
4. Check the browser **Network** tab for requests to `/umbraco/umbracocommunitytemplatehistory/api/v1/...` when opening History.

### History tab does not appear

1. Confirm the package is referenced in your `.csproj` and the site was restarted.
2. Check the browser console for JavaScript errors.
3. Verify static web assets loaded under `/App_Plugins/UmbracoCommunityTemplateHistory/`.

### API returns 401 in a new browser tab

The History API requires backoffice authentication. Test via the **History** tab while logged in, not by pasting the API URL in a new tab.

### Stylesheets in subfolders

History keys files by their management API path (e.g. `/css/site.css`, `/tewst.css`). Paths must match between save and lookup.

---

## Screenshots

Add PNG screenshots to the [`Screenshots/`](Screenshots/) folder before publishing to GitHub (used by the marketplace listing):

| File | Description |
|------|-------------|
| `history-workspace.png` | History tab with version list |
| `diff-comparison.png` | Side-by-side diff view |
| `settings-dashboard.png` | Settings dashboard with recent changes |

---

## License

MIT — see [LICENSE](LICENSE) if present in the repository.

---

**Never lose a template change again.** 🎉
