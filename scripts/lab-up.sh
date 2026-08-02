#!/bin/zsh
# one-shot: spawn a 1-agent lab with a shell pane on the right, fully gated.
# usage: crew-lab-oneshot.sh <name> <pool>
#
# NOTE: no `set -e`. Under set -e a false `[ a ] || [ b ] && { ... }` guard
# returns 1 and kills the script SILENTLY — zero output, nothing spawned.
# Every step here checks its own result explicitly instead.

NAME="$1"; POOL="$2"
if [ -z "$NAME" ] || [ -z "$POOL" ]; then echo "usage: $0 <name> <pool>"; exit 2; fi

# There are TWO maw binaries on this machine:
#   ~/.local/bin/maw  = maw-rs v26.7.28  — HAS the `worktree` verb
#   ~/.bun/bin/maw    = maw-js v26.5.21  — does NOT
# ~/.zshenv:2 prepends .bun/bin before .local/bin, so any script picks maw-js.
# The crew plugin's labRoot() resolves the repo with `maw worktree ls`; under
# maw-js that is an unknown command, stdout is empty, the parse yields undefined
# and it dies "not inside a maw-visible repository" — which says nothing about
# the real problem. Interactive shells only work by accident: a later line in
# ~/.zshrc re-prepends .local/bin, and the last prepend wins.
export PATH="$HOME/.local/bin:$PATH"
if ! maw worktree ls >/dev/null 2>&1; then
  echo "FAIL: 'maw worktree ls' unavailable — wrong maw on PATH ($(command -v maw))"; exit 1
fi

# 1. spawn + verify — anything but VERIFIED means DO NOT proceed
maw crew up "$NAME" --pools "$POOL" > /tmp/oneshot-up.txt 2>&1
if ! grep -q "VERIFIED" /tmp/oneshot-up.txt; then
  echo "FAIL spawn: not VERIFIED"; tail -20 /tmp/oneshot-up.txt; exit 1
fi

# 2. resolve session + member window BY NAME (never by index — indexes shift)
S=$(grep -oE 'UP \([a-z0-9]+\)' /tmp/oneshot-up.txt | head -1 | sed -E 's/UP \((.*)\)/\1/')
if [ -z "$S" ]; then echo "FAIL: could not resolve session"; exit 1; fi
W=$(tmux list-windows -t "$S" -F '#{window_name}' | grep -v '^lead$' | head -1)
if [ -z "$W" ]; then echo "FAIL: could not resolve member window"; exit 1; fi
WT="$(git rev-parse --show-toplevel)/agents/$W"

# 3. drop the idle lead window (empty shell, nothing runs there)
tmux kill-window -t "${S}:lead" 2>/dev/null

# 4. shell pane on the RIGHT
#    explicit -t  → never leaks into the attached session (tmux defaults to the
#                   current session, which is how stray windows land in your oracle)
#    explicit cmd → never inherits the agent's command (maw split reuses
#                   #{pane_current_command} and silently starts a 2nd engine)
tmux split-window -h -t "${S}:${W}" -c "$WT" "zsh -l"

# 5. agent must be the ACTIVE pane — maw hey delivers to the window's active pane
AGENT=$(tmux list-panes -t "${S}:${W}" -F '#{pane_id} #{pane_current_command}' | grep -v ' zsh$' | head -1 | cut -d' ' -f1)
if [ -z "$AGENT" ]; then echo "FAIL: no agent pane found"; exit 1; fi
tmux select-pane -t "$AGENT"

# 6. GATES
MODEL=$(maw crew status "$NAME" 2>/dev/null | grep "$S" | grep -oE 'gpt-[0-9.a-z-]+( [a-z]+)?')
if [ -z "$MODEL" ]; then
  echo "FAIL gate1: crew status shows no model — window name broken, maw cannot address the agent"; exit 1
fi
PANES=$(tmux list-panes -t "${S}:${W}" | wc -l | tr -d ' ')
if [ "$PANES" != "2" ]; then echo "FAIL gate2: expected 2 panes, got $PANES"; exit 1; fi
ENGINES=$(tmux list-panes -t "${S}:${W}" -F '#{pane_current_command}' | grep -c node)
if [ "$ENGINES" != "1" ]; then echo "FAIL gate3: expected 1 engine, got $ENGINES (duplicate)"; exit 1; fi

echo "OK  session=$S  window=$W  model=$MODEL"
tmux list-panes -t "${S}:${W}" -F "    pane #{pane_index} #{pane_current_command} x=#{pane_left} active=#{pane_active}"
echo "    hey : maw hey \"${S}:${W}\" \"...\""
echo "    peek: maw peek \"${S}:${W}\""
echo "    down: maw crew down $NAME"
