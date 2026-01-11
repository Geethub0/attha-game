# Attha Game - Development Notes

## Latest Updates

### Online Multiplayer (P2P)
- Uses PeerJS for peer-to-peer connection (no server needed!)
- **Create Game**: Generates a 6-character room code to share with friend
- **Join Game**: Enter the room code to connect
- Host plays as Yellow, Guest plays as Blue
- Full game state synchronization between players
- Connection status indicators and turn management
- One-click copy button for room codes

### Save/Load Game
- **Save button**: Saves game to localStorage AND downloads a JSON file
- **Load button**: Load from file during game
- **Resume Saved Game section**: On main menu, load from localStorage or file
- Coins are now numbered 1-4 for easy identification

### Inner Circle Movement Rules
- Coins in inner circle (positions 15-22) can move normally or reach heaven exactly
- **Conditional recircling**: Recircling (wrapping around inner circle) is ONLY allowed when:
  1. The roll cannot move any other coin on the board (home, outer circle, or to heaven exactly)
  2. If ANY coin can use the roll normally, recircling is NOT allowed
- **Priority**: Normal moves > Heaven entry > Recircling
- When recircling IS allowed, the coin wraps: position 15 + ((currentPos - 15 + roll) % 8)
- Example: Roll 8, Coin A in inner circle (can't reach heaven), Coin B in outer circle (can move 8) → Coin B MUST use the roll, no recircle allowed
- Example: Roll 8, ALL coins either in home (no valid exit) or inner circle (can't reach heaven exactly) → Recircle IS allowed

### UI Improvements
- Dice/Roll section is now separate from the Rules/Instructions section
- Colored arrows at inner circle entry points show each color's path inward:
  - Yellow: arrow pointing UP at position [4,1] (position 14 outer)
  - Green: arrow pointing LEFT at position [3,4] (position 14 outer)
  - Blue: arrow pointing DOWN at position [0,3] (position 14 outer)
  - Red: arrow pointing RIGHT at position [1,0] (position 14 outer)

### Outer Circle Restriction
- Coins in outer circle (positions 0-14) CANNOT re-circle the board
- Position 14 is the final outer position (entry point to inner circle)
- From position 14, coins can ONLY enter inner circle (if they have killed)
- No wrapping or re-circling allowed under any condition

---

## Recently Implemented (Previous Session)

### Bug Fixes
1. **Inner circle entry bug fixed** - Coins can no longer enter inner circle (positions 15-22) or heaven (position 23) without having killed an opponent first. The check now properly blocks both landing in inner circle AND reaching heaven directly from outer circle.

### Stack System Overhaul

**Forming a Stack:**
- Shift+click to select multiple coins on the same square (works anywhere!)
- "Stack" button appears when 2+ coins selected
- Click "Stack" button to form the stack

**Stack Visual:**
- Stacked coins show as a single larger circle with the count number (2, 3, or 4)
- Has overlapping coin visual effect and yellow ring border
- Unstacked coins appear normally

**Stack Movement:**
- Once stacked, coins are LOCKED together - must move as a unit
- Cannot move individual coins from a stack outside safe zones
- Roll value ÷ stack size = blocks moved (must divide evenly)
- **Rolls can be WASTED**: If roll doesn't divide evenly by stack size, that roll is lost
  - Stack of 2: can only use 2, 4, 8 (rolls of 1, 3 are wasted)
  - Stack of 3: can only use 3 (rolls of 1, 2, 4, 8 are wasted)
  - Stack of 4: can only use 4, 8 (rolls of 1, 2, 3 are wasted)

**Stack Behavior:**
- Stacks do NOT auto-break at your own safe zones
- Stacks AUTO-BREAK when landing on an opponent's home square
- Stacks can form and move freely from any location including safe zones
- Once stacked, coins stay stacked until: reaching heaven, or landing on opponent's home

---

## All Implemented Features

### Dice & Rolling
- Cowrie shell dice: 4 shells (0 heads=4, 1=1, 2=2, 3=3, 4 heads=8)
- Rolling 4 or 8 gives bonus roll
- Triple consecutive bonuses (4 or 8) = lose all moves but get 4th roll
- Auto-select single roll when only one available
- Drag rolls together to merge them

### Movement
- First coin needs 1, 4, or 8 to leave home
- Each individual roll must be used on ONE coin/stack
- Cannot skip valid moves - must use if available

### Capture Rules
- Capturing opponent gives bonus roll
- Stack vs Stack capture: can only kill if stack sizes match (1 kills 1, 2 kills 2)
- Mixed-color protection: coins of different colors on same block can't be killed
- Inner circle entry requires player to have captured at least once

## Board Layout
- Outer circle: 15 blocks (positions 0-14)
- Inner circle: 8 blocks (positions 15-22) - requires kill to enter
- Heaven: position 23
- Home: position -1
- Safe zones: home bases, starting squares, heaven
- **Total moves to reach heaven: 24** (positions 0-23 from home)

## Path Details (Per Color)

### Yellow (Home: [4,2])
- **Outer (0-14):** [4,3]→[4,4]→[3,4]→[2,4]→[1,4]→[0,4]→[0,3]→[0,2]→[0,1]→[0,0]→[1,0]→[2,0]→[3,0]→[4,0]→[4,1]
- **Inner (15-22):** [3,1]→[2,1]→[1,1]→[1,2]→[1,3]→[2,3]→[3,3]→[3,2]
- **Heaven (23):** [2,2]

### Green (Home: [2,4])
- **Outer (0-14):** [1,4]→[0,4]→[0,3]→[0,2]→[0,1]→[0,0]→[1,0]→[2,0]→[3,0]→[4,0]→[4,1]→[4,2]→[4,3]→[4,4]→[3,4]
- **Inner (15-22):** [3,3]→[3,2]→[3,1]→[2,1]→[1,1]→[1,2]→[1,3]→[2,3]
- **Heaven (23):** [2,2]

### Blue (Home: [0,2])
- **Outer (0-14):** [0,1]→[0,0]→[1,0]→[2,0]→[3,0]→[4,0]→[4,1]→[4,2]→[4,3]→[4,4]→[3,4]→[2,4]→[1,4]→[0,4]→[0,3]
- **Inner (15-22):** [1,3]→[2,3]→[3,3]→[3,2]→[3,1]→[2,1]→[1,1]→[1,2]
- **Heaven (23):** [2,2]

### Red (Home: [2,0])
- **Outer (0-14):** [3,0]→[4,0]→[4,1]→[4,2]→[4,3]→[4,4]→[3,4]→[2,4]→[1,4]→[0,4]→[0,3]→[0,2]→[0,1]→[0,0]→[1,0]
- **Inner (15-22):** [1,1]→[1,2]→[1,3]→[2,3]→[3,3]→[3,2]→[3,1]→[2,1]
- **Heaven (23):** [2,2]

## Controls
- Click a roll to select it
- Click a coin to move it with selected roll
- Drag rolls together to merge them
- Shift+click coins to select for stacking → Stack button to form
- Stacks auto-break at safe zones
