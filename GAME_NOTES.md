# Attha Game

**Live:** https://geethub0.github.io/attha-game/

## Controls

### Mobile
- Tap **ROLL** to roll dice
- Tap a **roll number** to select it
- Tap a **coin** to move it
- Tap **Stack icon** (purple) to enable stack mode, then tap coins to select

### Desktop
- Click roll to select, click coin to move
- Drag rolls together to merge them
- Shift+click coins to select for stacking

## Game Rules

### Dice
- 4 cowrie shells: 0 heads=4, 1=1, 2=2, 3=3, 4 heads=8
- Rolling 4 or 8 = bonus roll
- 3 consecutive bonuses = lose moves, get 4th roll

### Movement
- Leave home with 1, 4, or 8
- Each roll used on ONE coin/stack
- Must use valid moves (can't skip)

### Capture
- Capture = bonus roll
- Stack vs stack: sizes must match
- **Must capture to unlock inner circle**

### Stacking
- Select 2+ coins on same square → Stack button
- Stack moves as unit (roll ÷ stack size)
- Rolls not divisible by stack size are wasted
- Stacks break at opponent's home

## Board Layout
```
Outer: 15 blocks (pos 0-14)
Inner: 8 blocks (pos 15-22) - needs kill
Heaven: pos 23
Home: pos -1
Total: 24 moves to heaven
```

## Online Play (P2P)
- Create Game → get 6-char code
- Join Game → enter code
- Host = Yellow, Guest = Blue
- Uses PeerJS (no server needed)

## Features
- 2 or 4 player modes
- Computer opponents
- Save/Load game
- Undo (2 moves)
- Mobile responsive UI
