# Portfolio Hub - Developer Log

**Last Updated:** 2025-12-02
**Owner:** Nicholas Lubold
**Project Status:** Active Development

---

## Project Overview

This is Nicholas's personal portfolio website built with React, TypeScript, Vite, and TailwindCSS. It showcases projects, skills, and includes several interactive tools.

**Live Dev Server:** http://localhost:5174 (5173 in use, using 5174)
**Tech Stack:**
- React 19.1.1
- TypeScript 5.9.3
- Vite 7.1.7
- TailwindCSS 3.4.18
- React Router 7.9.5
- Lucide React (icons)

---

## Project Structure

```
portfolio-hub/
├── src/
│   ├── components/
│   │   ├── Layout.tsx           # Main layout with nav, header, footer
│   │   ├── ControlsModal.tsx    # Game controls customization modal
│   │   ├── AsteroidsGame.tsx    # Asteroids game component
│   │   ├── SnakeGame.tsx        # Snake game component
│   │   └── PacManGame.tsx       # Pac-Man game component
│   ├── contexts/
│   │   └── ThemeContext.tsx     # Dark mode theme provider
│   ├── pages/
│   │   ├── Home.tsx             # Landing page with about, skills
│   │   ├── StockTracker.tsx     # Stock tracking with Alpha Vantage API
│   │   ├── NewsCurator.tsx      # Multi-source news aggregation
│   │   ├── Projects.tsx         # Projects showcase (placeholder)
│   │   ├── Games.tsx            # Classic games arcade (Asteroids, Snake, Pac-Man)
│   │   ├── Pokedex.tsx          # Complete Pokédex with all 1,025 Pokémon
│   │   ├── Battle.tsx           # Pokémon Battle Simulator (3v3 battles)
│   │   ├── SwitchDisplay.tsx    # Nintendo Switch capture card display
│   │   ├── Browser.tsx          # Iframe browser for websites
│   │   └── FileBrowser.tsx      # File system browser (UI only, needs backend)
│   ├── App.tsx                  # Main app with routes
│   └── main.tsx                 # Entry point
├── tailwind.config.js           # Tailwind config with dark mode
└── package.json
```

---

## Implemented Features

### ✅ Core Features
- [x] Responsive navigation (desktop + mobile)
- [x] Dark mode toggle (persists to localStorage)
- [x] Home page with about section, skills, feature cards
- [x] Footer with copyright

### ✅ Tools & Pages

- [x] **Stock Tracker** - Real-time stock market data with Alpha Vantage API
  - Live stock quotes and price data
  - Search autocomplete for stock symbols
  - Interactive charts with Recharts (1D, 1W, 1M, 3M, 1Y)
  - Watchlist with add/remove stocks
  - API Key: II19ZTIIPZLYNA6O
  - Rate limits: 5 calls/min, 100 calls/day

- [x] **News Curator** - Multi-source news aggregation
  - Three news API integrations: NewsAPI, The Guardian, NY Times
  - Toggle individual sources on/off
  - Top headlines by category
  - Cross-source search functionality
  - Category filters (Technology, Business, Science, Health, Sports, Entertainment)
  - Shows which API provided each article
  - Sample data until API keys are added

- [x] **Classic Games Arcade** - Three custom-built retro games
  - **Asteroids** - Space shooter with physics-based movement
  - **Snake** - Classic snake with grid movement
  - **Pac-Man** - Full maze with 4 AI ghosts
  - **All games feature:**
    - 100% custom built with HTML5 Canvas
    - Customizable controls (Arrow Keys, WASD, or custom)
    - Interactive controls modal with presets
    - Score tracking and lives system
    - Progressive difficulty
    - Dark mode support

- [x] **Pokédex** - Complete database of all 1,025 Pokémon
  - All generations (Gen 1-9) with filtering
  - Regional and National Dex toggle
  - Multi-criteria search (name, number, type, move)
  - Expandable Pokémon entries with:
    - Base stats and typing
    - Abilities and hidden abilities
    - Complete move lists with power, accuracy, generation
    - Evolution chains with methods and requirements
    - Type effectiveness chart
  - Loading indicators
  - Full dark mode support

- [x] **Battle Simulator** - Complete Pokémon battle system
  - Two modes: Custom Team or Random Battle
  - 3v3 battles (400+ base stat Pokémon only)
  - Team preview bars on both sides
  - Complete battle mechanics:
    - Accurate damage calculation with type effectiveness
    - STAB (Same Type Attack Bonus)
    - Status conditions (burn, paralyze, sleep, poison, freeze)
    - Stat stages system (-6 to +6)
    - Real moves from PokéAPI
  - Battle polish:
    - Attack confirmation with highlighting
    - Battle pacing delays and animations
    - HP bar tick marks
    - Pokémon attack animations (swirl + jolt)

- [x] **Switch Display** - Displays Nintendo Switch via USB capture card using browser MediaDevices API
  - Device selection dropdown
  - Start/Stop controls
  - Fullscreen toggle
  - Mute/unmute audio
  - Capture card: USB3.0 Video (working)

- [x] **Browser Frame** - Embed websites in iframe
  - URL input
  - Warnings for blocked sites (YouTube, TikTok, etc.)
  - Works with sites that allow iframe embedding

- [x] **File Browser** - UI for browsing local files
  - ⚠️ UI only - requires backend API to function
  - Shows file icons, sizes, types
  - Path navigation with breadcrumbs

### ✅ Design System
- **Colors:** Blue primary (#3b82f6), gray scale
- **Dark Mode:** gray-900 background, gray-800 cards, gray-700 borders
- **Light Mode:** gray-50 background, white cards, gray-200 borders
- **Icons:** Lucide React
- **Transitions:** Smooth color transitions on theme change

---

## User Information

**Name:** Nicholas Lubold
**Background:** CS degree from Penn State, currently Kitchen Manager at Sheetz
**Career Goal:** Transition into tech eventually
**LinkedIn:** https://www.linkedin.com/in/nicholas-lubold
**GitHub:** https://github.com/Ragnr99

**About Me (as displayed on site):**
> CS degree from Penn State. Took a job at Sheetz after graduation and found I genuinely enjoy the management side of things. Still want to end up in tech eventually, just taking a different path to get there.
>
> This is stuff I work on outside of work. Analytics, automation, some web projects. Keeps me sharp.

**Skills:**
- **Development:** React, TypeScript, Python, Node.js, TailwindCSS
- **Operations:** Data Analysis, Excel/Sheets, P&L Management, Team Leadership, Process Optimization

---

## Hardware Setup

**Capture Card:** Amazon USB HDMI capture card (arrives 2025-11-27)
- Model: USB3.0 Video
- Status: ✅ Working
- Connected: Switch Dock → Capture Card → PC USB
- Browser detection: Shows as "USB3.0 Video"

**PC Environment:**
- OS: Windows 11
- Node.js: 20.14.0 (Vite warns about wanting 20.19+, but works fine)
- Default browser: Unknown (user uses localhost:5173)

---

## Known Issues & Limitations

1. **Node.js Version Warning**
   - Current: 20.14.0
   - Vite wants: 20.19+ or 22.12+
   - Impact: Just a warning, everything works
   - Fix: User can upgrade Node.js if desired

2. **File Browser**
   - Status: UI only, non-functional
   - Needs: Backend API (Node.js/Python server)
   - Endpoints needed:
     - `GET /api/files?path=...` - List directory
     - `GET /api/file?path=...` - Read file contents
   - Security: Needs sandboxing/path validation

3. **Placeholder Pages**
   - Projects.tsx - Not implemented
   - Just shows basic page structure

4. **Switch Display Browser Permissions**
   - Requires user to grant camera/mic permissions
   - May need to refresh page after first denial
   - Some browsers may cache permissions

---

## TODO / Future Improvements

### High Priority
- [ ] Implement Projects page with actual project showcases
  - Include macro_maker project
  - Include this portfolio site as meta-project
  - Screenshots, descriptions, GitHub links

- [ ] Build backend for File Browser
  - Express.js or Python Flask
  - File system API endpoints
  - Security/sandboxing

- [ ] Add Resume/CV page
  - Downloadable PDF
  - Interactive timeline
  - Contact information

### Medium Priority
- [x] Stock Tracker functionality ✅ COMPLETED
  - Alpha Vantage API integration
  - Interactive charts with Recharts
  - Search autocomplete

- [x] News Curator implementation ✅ COMPLETED
  - Multi-source API integration
  - Category filters
  - Source toggles

- [ ] Blog/Tech Notes section
  - Markdown support
  - Code syntax highlighting
  - Project write-ups

### Low Priority / Nice to Have
- [ ] Contact form with EmailJS or Formspare
- [ ] Analytics dashboard (personal finance, habits, etc.)
- [ ] Code snippet library
- [ ] Upgrade Node.js to silence Vite warning
- [ ] Add loading states to all pages
- [ ] Add error boundaries
- [ ] Improve mobile navigation (8 tabs now - getting crowded)
- [ ] Add keyboard shortcuts
- [ ] Export dark mode preference to system
- [ ] Add more classic games (Tetris, Space Invaders, etc.)
- [ ] Save game high scores to localStorage
- [ ] Add sound effects to games

---

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm preview

# Lint
npm run lint
```

**Dev server runs on:** http://localhost:5173

---

## Color Palette Reference

### Light Mode
- Background: `bg-gray-50`
- Cards: `bg-white`
- Borders: `border-gray-200`
- Text: `text-gray-900` (headings), `text-gray-600` (body)
- Accent: `bg-blue-600`, `text-blue-700`

### Dark Mode
- Background: `dark:bg-gray-900`
- Cards: `dark:bg-gray-800`
- Borders: `dark:border-gray-700`
- Text: `dark:text-white` (headings), `dark:text-gray-300` (body)
- Accent: `dark:bg-blue-500`, `dark:text-blue-400`

### Feature Colors
- Green (Stock Tracker): `bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400`
- Blue (News): `bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400`
- Purple (Projects): `bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400`

---

## Session History

### Session 2025-11-27
**Created by:** Claude (Sonnet 4.5)
**Duration:** ~2 hours
**Completed:**
- Initial project setup with React + TypeScript + Vite + Tailwind
- Dark mode implementation with theme context
- Home page with about section, skills, project cards
- LinkedIn and GitHub links added
- Switch Display page with capture card integration
- Browser iframe page
- File Browser UI (non-functional)
- Full dark mode styling across all pages
- Color scheme standardization

**User Requests Fulfilled:**
- "Connect my LinkedIn and GitHub"
- "Make my about me [specific text]"
- "Set up my capture card for Switch display"
- "Make a browser tab that can embed websites"
- "Dark mode it up"
- "Use greys and dark blues"
- "File browser (read-only)"
- "Living developer log for future Claude sessions"

**Notes:**
- User tested image analysis capabilities (unrelated to project)
- User preference: Straightforward, concise communication
- User is hands-on and tests features immediately
- Navigation is getting crowded (7 tabs now)

---

### Session 2025-11-29
**Created by:** Claude (Sonnet 4.5)
**Duration:** ~2 hours
**Completed:**
- Multi-source news aggregation (NewsAPI, Guardian, NY Times)
  - Search functionality across all sources
  - Category filtering
  - Source toggles with visual indicators
  - Sample data with API setup instructions
- Classic Games Arcade - Three complete games from scratch
  - **Asteroids**: Physics-based space shooter with wrap-around, progressive levels
  - **Snake**: Grid-based movement, collision detection, food generation
  - **Pac-Man**: Full maze with 4 AI ghosts, power pellets, win/lose conditions
- Customizable game controls system
  - Interactive modal for key remapping
  - Arrow Keys and WASD presets
  - Individual key binding with duplicate prevention
  - Dynamic control hints that update with custom bindings
  - Persists per game with session storage
- All games built with HTML5 Canvas and TypeScript
  - No external game engines
  - 60 FPS game loops
  - Complete dark mode support
  - Proper state management (playing/paused/gameOver)

**User Requests Fulfilled:**
- "okay now lets do the same thing for news. off rip im thinking like ground news or seomthing but really we need to plug in as many news apis as we can"
- "i want a page where i can play classic games. on that page i want astroids. all custom. start there"
- "k now add a snake option. and lets do a pacman too"
- "make em wasd or arrow keys. you know what. give each customizable controls"

**Technical Achievements:**
- Implemented search autocomplete pattern for stocks and news
- Created reusable controls modal component
- Built collision detection algorithms for all three games
- Implemented ghost AI with chase/flee behavior for Pac-Man
- Progressive asteroid splitting mechanics
- Snake self-collision and boundary detection
- Pac-Man pellet tracking and win condition
- Time-based movement for consistent game speed

**Notes:**
- User prefers concise responses - "yes" to proceed
- Appreciates systematic implementation
- Tests features immediately
- Likes clean, functional UI
- Navigation now has 8 tabs (Home, Stocks, News, Projects, Games, Switch, Browser, Files)

---

### Session 2025-12-02
**Created by:** Claude (Sonnet 4.5)
**Duration:** ~3 hours
**Completed:**
- Complete Pokédex Implementation (1,025 Pokémon)
  - All generations (Gen 1-9) with regional/national dex filtering
  - Multi-criteria search (name, number, type, move)
  - Expandable entries with stats, types, abilities, moves
  - Evolution chains with methods and requirements
  - Type effectiveness visualization
  - Loading indicators at cursor
  - Dark mode support
- Pokémon Battle Simulator
  - Two battle modes: Custom Team vs Random Battle
  - 3v3 battles with 400+ base stat Pokémon filter
  - Complete battle engine with accurate damage calculation
  - Type effectiveness and STAB mechanics
  - Status conditions: burn, paralyze, sleep, poison, freeze
  - Stat stages system (-6 to +6) with proper multipliers
  - Real moves from PokéAPI (level-up movesets)
  - Pokémon switching with free enemy attack
- Battle Phase Polish (6 improvements)
  - Team preview bars showing all 3 Pokémon on both sides
  - Fixed infinite switching bug (team state synchronization)
  - Attack confirmation system with selection highlighting
  - Battle pacing delays (click → attack → damage animation)
  - HP bar tick marks at 25%, 50%, 75%
  - Pokémon attack animations (swirl + jolt forward)

**User Requests Fulfilled:**
- "i want to make a complete pokedex"
- "make teams of 3, also make a team editor"
- "we gotta work on the battle phase. i want a team track on both sides"
- "battles seem to be infinite switching between 2 pokemon on the enemy team"
- "make there be some sort of selection confirmation, menu highlighting"
- "delay between click and attack. delay between attack and damage bar drop"
- "add lines to the hp bar for easier eye read"
- "make the pokemon swirl and jolt towards the enemy and back to its place"

**Technical Implementation:**
- Built complete type effectiveness matrix (18x18 types)
- Implemented Pokémon damage formula with all modifiers
- Created stat calculation formulas (HP vs non-HP stats)
- Status condition mechanics with turn-based effects
- CSS keyframe animations for battle attacks
- State management for battle flow, team updates, animations
- Async PokéAPI integration with move fetching
- Fixed state synchronization bug causing infinite switching

**Files Added:**
- `src/pages/Pokedex.tsx` (1,111 lines)
- `src/pages/Battle.tsx` (829 lines)
- Updated `src/index.css` with animation keyframes
- Updated navigation in Layout.tsx

**Stats:**
- Total lines added: 2,005+
- Pokémon database: 1,025
- Battle modes: 2
- Status conditions: 5
- Animation states: 3

**Notes:**
- User wanted immediate usability at each stage
- Prioritized high-value features first (basic battle before polish)
- Systematic approach to battle phase improvements
- All 6 battle phase improvements completed in one session
- Navigation now has 10 tabs (added Pokédex and Battle)

---

## For Future Claude Sessions

### Quick Start
1. User is Nicholas, working on personal portfolio
2. Project is at: `C:\Users\Nicholas\Desktop\portfolio-hub`
3. Dev server is likely already running: `npm run dev`
4. Browser should be at: http://localhost:5173

### User Preferences
- Keep explanations concise and technical
- He'll test features immediately and report back
- He appreciates proactive suggestions
- He's comfortable with code and terminal
- Prefers seeing implementations over just discussions

### Common Tasks
- "Open the website" → `cd portfolio-hub && npm run dev` then `start http://localhost:5173`
- "Find my [file]" → Check Desktop first, then Downloads
- Updates to pages → Usually editing src/pages/*.tsx
- Color changes → Tailwind utility classes with dark: variants

### Updating This Log
**For future Claude sessions:** Please add your session info below in the Session History section:
1. Date, Claude version
2. What was accomplished
3. New features added
4. Bug fixes
5. User requests/preferences discovered
6. Update the TODO list
7. Update Last Updated date at top

---

**End of Developer Log**
