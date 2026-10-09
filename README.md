# Flipday

A calm, full-screen flip clock that helps you plan and get through your day.

Live: https://flip-clock-sigma.vercel.app (Vercel) and https://ashuhimself.github.io/flip-day/ (GitHub Pages)

Flipday shows a large split-flap clock in the middle of the screen. Around it, small tools fade in when you move the mouse and fade out when you stop, so the clock stays the focus.

## Features

- **Flip clock** with a real split-flap animation. 12 or 24 hour, seconds on or off, date on or off.
- **Time zones.** Show 1 to 3 clocks at once. The first one is the main clock. The others appear smaller underneath with their own date and the time difference. Included places: India, New York, Atlanta, Chicago, Denver, Los Angeles, Perth, Adelaide, Brisbane, Sydney, Auckland and Wellington. The main clock starts on your own time zone. If your city is not in the list, it is added for you.
- **Timeboxing.** Give tasks a fixed slot on the clock (for example 9:00 to 10:30, "Deep work"). You can plan two blocks at a time; finish one (or mark it done) before adding the next. Both show at the bottom of the screen with time left, and a soft chime plays when a block starts or ends. Pick one of today's tasks as a block's title, or press "Timebox it" on a task; marking the block done ticks the task off. Need more time? Add 5 or 15 minutes to the running block.
- **Today's tasks.** A simple to-do list for the day. Unfinished tasks from the day before can be moved over with one click.
- **Summary.** Today's tasks and timeboxes done, Pomodoro time, the last 7 days of Pomodoro, and your streak of days in a row with something finished.
- **Pomodoro timer.** 25 minute focus sessions with short and long breaks.
- **Music.** Paste a YouTube link to play it in the background. It repeats until you pause it.
- **Pop-out window.** Keep the clock, the timer or the current block on top of other apps (Chrome and Edge only).
- **Notifications.** Turn them on in Settings to hear about blocks starting, ending or coming up, and Pomodoro sessions ending, while Flipday is in the background.
- **Install as an app.** Add Flipday to your dock or home screen from the browser's install option. It works offline once loaded.
- **Light and dark theme.**

## Privacy

There is no account, no server and no tracking. Everything you enter (settings, tasks, timeboxes) is saved only in your own browser using `localStorage`. Clearing your browser data clears it.

The only outside service used is the YouTube player, and only when you paste a link into the music tool.

## Keyboard

| Key | Action |
| --- | --- |
| `T` | Open or close today's tasks |
| `B` | Open or close Timebox |
| `P` | Start or pause the Pomodoro |
| `F` | Start a focus session |
| `D` | Mark the running block done |
| `Esc` | Close the open panel |

## Setup guide

### What you need

- [Node.js](https://nodejs.org) version 20.19 or newer (version 22 is recommended)
- npm, which comes with Node.js
- Git

Check your versions:

```bash
node -v
npm -v
```

### 1. Get the code

```bash
git clone https://github.com/ashuhimself/flip-day.git
cd flip-day
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run it locally

```bash
npm run dev
```

Open the address it prints (usually http://localhost:5173). The page reloads by itself when you change the code.

### 4. Build for production

```bash
npm run build
```

This checks the TypeScript and writes the finished site to the `dist/` folder. To try the built version locally:

```bash
npm run preview
```

### 5. Deploy (optional)

`dist/` is a plain static site, so any static host works (Vercel, Netlify, GitHub Pages, Cloudflare Pages).

With Vercel:

```bash
npx vercel          # preview deploy
npx vercel --prod   # production deploy
```

Or connect the GitHub repository in the Vercel dashboard. It detects Vite on its own, and every push to the main branch then deploys.

With GitHub Pages:

1. Push the code to a GitHub repository.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds the site and publishes it to `https://<username>.github.io/<repo-name>/`.

The build uses relative paths, so it works in a subfolder like this without any extra setup.

## Project structure

```
src/
  App.tsx              Page layout and how the tools fit together
  components/          UI pieces (clock, settings, timebox, pomodoro, music, tasks)
  hooks/               State and logic (settings, timeboxes, tasks, timer, current time)
  lib/
    time.ts            Time and date formatting
    timezones.ts       The list of time zones and time zone maths
    storage.ts         Safe reading and writing of localStorage
    chime.ts           The bell sound, made in code (no audio file)
  index.css            All styles
```

Built with React 19, TypeScript, Vite and Tailwind CSS. Icons are from Lucide.

## Adding a time zone

Open `src/lib/timezones.ts` and add a line to the `ZONES` list:

```ts
{ id: 'Europe/London', tz: 'Europe/London', city: 'London', region: 'UK' },
```

- `tz` must be a valid [IANA time zone name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).
- `id` must be unique. For a new zone, use the same value as `tz`. For a second city in a zone that is already listed, use a short name (for example `'atlanta'`).

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). You are free to use, change and share this project.
