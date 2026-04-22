# Tasks for Canvas Redux

A privacy-respecting, open-source task sidebar for Canvas LMS.

## Why this fork?

This is a community-maintained fork of Jeffrey Cheng's [Tasks for Canvas](https://github.com/UseBetterCanvas/canvas-task-extension). The goal was to rebuild it with a narrower, user-controlled permissions model and strip any external tracking or analytics, while keeping all the original student features intact.

## What makes this different?

- **Zero tracking** — no analytics, no experiments, no external data collection
- **Dynamic permissions** — the extension does nothing until you explicitly enable it per Canvas domain
- **Privacy-first** — no broad host permissions, no remote code
- **All original features preserved** — task list, progress rings, custom tasks, dark mode, confetti, due date headings, and more

## Download

Chrome Web Store (coming soon)

## Support

If you find this extension useful, consider [buying me a coffee](https://ko-fi.com/dantemoony).

## Installing from Source

1. Check if your [Node.js](https://nodejs.org/) version is >= **16.0**.
2. Clone this repository.
3. Run `npm install` to install the dependencies.
4. Run `npm run build`
5. Load the extension:
   1. Access `chrome://extensions/`
   2. Enable **Developer mode**
   3. Click **Load unpacked**
   4. Select the `build/` folder.
6. Happy hacking.

## Usage

1. Install the extension
2. Navigate to your Canvas site
3. Click the extension icon and choose **Enable on this site**
4. Reload the Canvas page

## Features

### Stay on Track

Colorful task items ensure that you'll never miss an assignment again.

### Track Your Progress

Visual progress bars for each of your courses show how far you are in completing your assignments this week.

### Make It Your Own

Task items and progress bars correspond with your chosen dashboard colors and positions.

### Notes

- The sidebar only works in Card View and Recent Activity.
- Only courses that have assignments will appear in the chart.
  - Alternatively, you can choose to show all dashboard courses in the options page.
    - To change your dashboard courses, go to **Courses** in the left sidebar, go to **All Courses** and star the classes that you want on your dashboard.
- The **Unfinished** assignments list will show all assignments from the dashboard courses that are both unsubmitted and ungraded or have a grade of 0.

## Permissions

- **Storage** — save your settings and enabled domains
- **Scripting** — inject the sidebar into Canvas pages
- **Active Tab** — detect Canvas on the current tab
- **Alarms** — reliable background permission recovery
- **Optional host permissions** — requested per-domain when you enable the extension

At install, the extension requests **no** website access. You grant access only to the specific Canvas domains you use.

## License

MIT — see [LICENSE](./LICENSE). Original work copyright Jeffrey Cheng (2020). Modifications copyright Tasks for Canvas Redux contributors (2026).
