# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MWServerBKO (Magic Wings Server Backoffice) is a local desktop application for managing an MMO RPG game (Magic Wings). It's built with React and uses XML files as the database, operating completely offline.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Format code
npm run format:fix

# Preview production build
npm run preview
```

## High-Level Architecture

### Core Stack
- **Frontend**: React 19 with Vite
- **UI Framework**: Metronic v9.2.9 with Tailwind CSS 4
- **Data Persistence**: XML files in `public/data/` and external paths
- **API**: Custom Vite middleware for local file operations
- **State Management**: React hooks and context providers

### Project Structure

```
src/
├── modules/           # Main feature modules
│   ├── monsters/      # Monster management (CRUD, balancing, rewards)
│   └── items/         # Items management
├── services/          # Data services
│   ├── monsterService.js       # Monster XML operations
│   ├── monsterItemService.js   # Monster loot items service
│   └── itemsService.js         # Items XML operations
├── components/        # Reusable UI components
├── providers/         # React context providers
├── routing/          # App routing configuration
└── hooks/            # Custom React hooks

public/
├── data/
│   ├── items.xml     # Items database
│   └── settings.json # App configuration with external paths
```

### Key Architectural Patterns

1. **XML Data Layer**: All game data stored in structured XML files
   - Monsters stored in external path (configured in settings.js: `monstersPath`)
   - Items stored in external path (configured in settings.js: `itemsPath`)
   - Services parse XML using regex patterns for reliability

2. **API Middleware**: Custom Vite plugin (`apiPlugin` in vite.config.js)
   - `/api/monsters/list` - Lists monster files without cache
   - `/api/monsters` - Returns parsed monster data
   - Direct file system operations for XML reading/writing

3. **Component Architecture**
   - Uses Metronic v9.2.9 components exclusively
   - DataGrid pattern for tables with pagination
   - Sheet/Modal pattern for details panels
   - Portal-based dropdowns for autocomplete

4. **Service Layer Pattern**
   - Services handle all XML parsing and data operations
   - Regex-based parsing for large XML files (avoids DOMParser limitations)
   - Caching strategies for performance

## Panel ID System

All major UI sections have `data-panel-id` attributes for easy reference. See `PANEL_IDS.md` for complete list.

Pattern: `[page]-[section]-[subsection]-[element]`

Examples:
- `monsters-filters-search`
- `monsters-details-rewards-loot`
- `items-details-attributes`

## Critical Business Rules

### Monster Items Autocomplete
- Items MUST have category `monsterLoot` in XML to appear in monster loot autocomplete
- Service: `src/services/monsterItemService.js`

### Monster Balance System
- Power calculation based on formulas in `useAttributeFormulas` hook
- Auto-balance for XP/Loot based on power and level
- Legendary loot rules with tier-based distribution

### XML Parsing Strategy
- Use regex parsing for large files (items.xml has 11k+ items)
- Handle both single items and ID ranges (fromid/toid)
- Always preserve exact XML structure when saving

### Settings Configuration
- Settings stored in `public/data/settings.js` as ES module (single source of truth)
- Contains base path and all other paths are derived from it
- Frontend accesses via API: `fetch('/api/settings')`
- Backend uses require: `require(settingsPath).default`

## Development Guidelines

### When Adding New Features

1. **Always add panel IDs**: Every new section must have `data-panel-id`
2. **Update documentation**: Update PANEL_IDS.md with new IDs
3. **Use existing patterns**: Follow the established service/component patterns
4. **XML consistency**: Maintain exact XML structure when reading/writing

### Performance Considerations

- Items XML has 11k+ entries - use efficient parsing
- Monster files loaded from external path - cache when appropriate
- Use React.memo for expensive components
- Implement virtual scrolling for large lists when needed

### Security Notes

- App runs locally with file system access
- No network operations except initial load
- Settings.js contains absolute paths to game data (with base path configuration)

## Common Issues and Solutions

### XML Parsing Issues
- Remove BOM characters: `xmlContent.replace(/^\uFEFF/, '')`
- Use regex parsing for large files instead of DOMParser
- Handle both attribute styles: `<item id="1">` and `<item><attribute key="id" value="1"/>`

### Autocomplete Performance
- Limit filtered results to 50 items
- Use portal rendering for dropdown positioning
- Implement debouncing for search inputs

### File Path Issues
- Always use absolute paths from settings.json
- Handle Windows paths correctly (backslashes)
- Check file existence before operations