#!/usr/bin/env bash
# gate-schema-v2.sh — binary pass/fail gate for the charter-schema-v2 tournament.
#
# NOT a judge. This decides only whether a submission is ELIGIBLE to be judged.
# Every check is mechanical: a script can answer it, so a script does (agents
# forgive, scripts don't). Judges never see a submission that fails here.
#
# Usage:  gate-schema-v2.sh <worktree-path>
# Exit:   0 = eligible, 1 = rejected (reason printed to stdout)
#
# Required submission artifacts inside the worktree:
#   templates/squad-multi-v2.yaml   — the proposed template (placeholders allowed)
#   SCHEMA-V2.md                    — the schema spec/rationale
#
# Checks (all must pass):
#   G1  both artifacts exist
#   G2  SCHEMA-V2.md <= 250 lines
#   G3  template <= 250 lines
#   G4  render.sh consumes the template and writes a charter (no crash)
#   G5  rendered charter passes `maw team preflight` CHARTER SCHEMA check
#   G6  rendered charter contains no unsubstituted __PLACEHOLDER__
#   G7  rendered charter declares provenance (the stated point of v2)
#   G8  template parameterizes the codex pool slot (trap #9: hardcoded 1,2
#       makes two parallel crews share credentials)

set -uo pipefail

WT="${1:?usage: gate-schema-v2.sh <worktree-path>}"
WT="$(cd "$WT" 2>/dev/null && pwd)" || { echo "REJECT G0: worktree not found: $1"; exit 1; }

RENDER=/opt/Code/github.com/Soul-Brews-Studio/crew-master-charters/scripts/render.sh
TPL="$WT/templates/squad-multi-v2.yaml"
SPEC="$WT/SCHEMA-V2.md"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fail() { echo "REJECT $1"; exit 1; }

# ── G1: artifacts present ─────────────────────────────────────────────
[ -f "$TPL" ]  || fail "G1: missing templates/squad-multi-v2.yaml"
[ -f "$SPEC" ] || fail "G1: missing SCHEMA-V2.md"

# ── G2/G3: size budget ────────────────────────────────────────────────
SPEC_LINES=$(wc -l < "$SPEC" | tr -d ' ')
TPL_LINES=$(wc -l < "$TPL" | tr -d ' ')
[ "$SPEC_LINES" -le 250 ] || fail "G2: SCHEMA-V2.md is $SPEC_LINES lines (max 250)"
[ "$TPL_LINES"  -le 250 ] || fail "G3: template is $TPL_LINES lines (max 250)"

# ── G4: render.sh must consume it ─────────────────────────────────────
# render.sh resolves templates from its own ../templates, so stage a copy there
# under a unique name, render into a scratch repo, then remove the staged copy.
STAGE_NAME="gate-probe-$$"
STAGED="$(dirname "$RENDER")/../templates/$STAGE_NAME.yaml"
cp "$TPL" "$STAGED" || fail "G4: cannot stage template"
cleanup_stage() { rm -f "$STAGED"; }
trap 'cleanup_stage; rm -rf "$TMP"' EXIT

git init -q "$TMP/repo" 2>/dev/null
git -C "$TMP/repo" remote add origin https://github.com/gate-probe/repo.git 2>/dev/null

RENDER_OUT="$("$RENDER" --template "$STAGE_NAME" --target "$TMP/repo" \
  --team gateprobe --session gateprobe --lead-name gateprobe 2>&1)" \
  || fail "G4: render.sh failed — $(echo "$RENDER_OUT" | tail -2 | tr '\n' ' ')"

CHARTER=$(echo "$RENDER_OUT" | sed -n 's/^wrote: //p' | head -1)
[ -n "$CHARTER" ] && [ -f "$CHARTER" ] || fail "G4: render.sh wrote no charter"

# ── G6: no unsubstituted placeholders survived ────────────────────────
if grep -q '__[A-Z0-9_]\+__' "$CHARTER"; then
  fail "G6: unsubstituted placeholder(s): $(grep -o '__[A-Z0-9_]\+__' "$CHARTER" | sort -u | tr '\n' ' ')"
fi

# ── G5: maw must accept the charter's SCHEMA ──────────────────────────
# preflight fails overall on missing worktrees/session (expected here — nothing
# is spawned). Gate only on the "charter schema" check line.
PRE="$(maw team preflight "$CHARTER" 2>&1)"
SCHEMA_LINE="$(echo "$PRE" | grep 'charter schema' || true)"
[ -n "$SCHEMA_LINE" ] || fail "G5: preflight produced no charter-schema verdict"
echo "$SCHEMA_LINE" | grep -q '✓' \
  || fail "G5: charter schema rejected —$(echo "$SCHEMA_LINE" | sed 's/.*charter schema//')"

# ── G7: provenance must be declared (the stated purpose of v2) ────────
grep -Eqi '^[[:space:]]*(provenance|origin|rendered_from|source):' "$CHARTER" \
  || fail "G7: rendered charter declares no provenance field"

# ── G8: pool slot must be parameterized, not hardcoded (trap #9) ──────
grep -q 'codex-setup' "$TPL" && {
  grep -Eq 'codex-setup\.ts[[:space:]]+(__[A-Z0-9_]+__|\$\{?[A-Za-z_])' "$TPL" \
    || fail "G8: codex pool slot is hardcoded — two parallel crews would share credentials (trap #9)"
}

echo "PASS: $WT"
echo "  spec=${SPEC_LINES}L template=${TPL_LINES}L charter=$(basename "$CHARTER")"
exit 0
