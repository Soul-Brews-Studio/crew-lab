# maw crew formation → dry-run → teardown สูตรโกง

> ตั้งทีม codex 2 ตัวจาก charter เดียว, gate ทีละชั้นจนถึง dry-run, แล้ว teardown แบบ Nothing-is-Deleted — พิสูจน์จริงบน crew-lab (DISC 07310800, 2026-07-31)

---

## 🌱 0. ตัวแปรตั้งต้น (ทุก block ใช้ร่วมกัน)

```bash
LAB=$(git rev-parse --show-toplevel)
DISC=$(date +%m%d%H%M); CH="crew-lab-$DISC"; S="crewlab$DISC"
```

`DISC` = life-cycle id ของทีม — **ต้องใหม่ทุกรอบ** ใช้ซ้ำไม่ได้ (ดู trap)

## 📋 1. Render charter (ไฟล์เดียว จาก template กลาง)

```bash
/opt/Code/github.com/Soul-Brews-Studio/crew-master-charters/scripts/render.sh \
  --template squad-2-starter --target "$LAB" \
  --team "$CH" --session "$S" --lead-name crew-lab
# → .maw/teams/crew-lab-$DISC.yaml  (lead=claude worktree:false + 2 coders omx)
```

## 🌳 2. Worktree — `maw worktree add` ไม่ใช่ git — สร้างอย่างเดียว ไม่ spawn

```bash
for n in 1 2; do
  maw worktree add "$CH-codex-$n" --base main        # --base main บังคับ
  WT="agents/$CH-codex-$n"
  ( cd "$WT" && bun $HOME/.claude/skills/oracle-team/scripts/codex-setup.ts $n )
  printf '\n[projects."%s"]\ntrust_level = "trusted"\n' "$LAB/$WT" >> "$WT/.codex/config.toml"
done
```

## 🔌 3. Session ต้องมีก่อน spawn

```bash
maw new "$S" --path "$LAB" --shell --no-attach
tmux has-session -t "$S" && echo "session UP"      # verify จริง
```

## 🚦 4. Gate ทีละชั้น (dry-run stops here)

```bash
maw team preflight .maw/teams/$CH.yaml              # read-only, ไม่สร้างอะไร
maw team load .maw/teams/$CH.yaml --no-spawn        # materialize config.json + inbox
maw team status "$CH"                               # collision check (registry machine-global 180+ teams)
maw team up "$CH" --only coder-1,coder-2 --dry-run  # --only บังคับ! เว้นไว้จะปลุก lead=ตัวเราเอง
# ผ่าน = "would fresh wake … / lead skip (selector) / No changes made"
```

## ⚡ 5. Spawn จริง + จัดจอ (ข้ามได้ถ้าแค่ dry-run)

```bash
maw team up "$CH" --only coder-1,coder-2            # ของจริง
maw peek "$S:$CH-codex-1"                           # ต้องเห็น gpt-5.x ไม่ใช่ ❯ เปล่า
maw kill "$S:lead"                                  # ${S}:lead ต้องมีวงเล็บปีกกาใน zsh
maw join "$S:$CH-codex-2" --to "$S:$CH-codex-1"
maw layout main-vertical --to "$S:$CH-codex-1"
tmux list-windows -t "$S" -F '#{window_layout}'     # 2 pane = ซ้าย|ขวา; ต้อง 3 ถึงแบ่งบน-ล่าง
```

## 🧹 6. Teardown (Nothing-is-Deleted — ห้าม rm)

```bash
STAMP=$(date +%Y%m%d-%H%M%S); DEST="/tmp/crew-lab-teardown-$STAMP"; mkdir -p "$DEST"
maw kill "$S"                                        # 1. ฆ่า session
for n in 1 2; do mv "agents/$CH-codex-$n" "$DEST/"; done   # 2. ย้าย ไม่ลบ
git worktree prune -v                               # 3. เก็บ gitdir ที่ค้าง
maw team delete "$CH"                                # 4. ลบ team dir
ls .maw/teams/$CH.yaml                               # .yaml เก็บไว้เป็น record ✓
```

## 📨 7. รายงานกลับ lead/oracle อื่น (maw hey)

```bash
maw hey crew-master "crew-lab รายงาน: flow ผ่านครบ ..."   # อย่าขึ้นต้นด้วย [
# → delivered → 20-crew-master:1: [m5:crew-lab] crew-lab รายงาน: ...
```

maw auto-sign `[host:handle]` (`[m5:crew-lab]`) ให้เอง — **ห้ามขึ้นต้นข้อความด้วย `[…]` เอง** (สงวนให้ signed transport prefix)

## ⚡ ลัด

| ทำอะไร | คำสั่ง |
|--------|--------|
| render charter | `render.sh --template squad-2-starter --target "$LAB" --team "$CH" --session "$S" --lead-name crew-lab` |
| worktree (ไม่ใช่ git) | `maw worktree add "$CH-codex-$n" --base main` |
| session ก่อน spawn | `maw new "$S" --path "$LAB" --shell --no-attach` |
| dry-run gate | `maw team up "$CH" --only coder-1,coder-2 --dry-run` |
| session ยังอยู่ไหม | `tmux has-session -t "$S"` (อย่าเชื่อ `maw team status` — hardcode idle) |
| engine ขึ้นจริง | `maw peek "$S:$CH-codex-1"` → เห็น `gpt-5.x` |
| teardown | `maw kill "$S"` → `mv agents/* /tmp/…` → `git worktree prune` → `maw team delete "$CH"` |

## ⚠️ trap ที่เจอจริง (session นี้)

| trap | วิธีเลี่ยง |
|------|-----------|
| `--base main` ไม่ใส่ → `fatal: Needed a single revision` | default คือ `origin/alpha` ที่ repo ไม่มี — ใส่ `--base main` เสมอ |
| charter เก่า → preflight refuse `manifest.json exists` | **DISC ใหม่ทุกรอบ** — 1 charter = 1 life-cycle, reuse ซากไม่ได้ (fail-closed ถูกต้อง) |
| `maw team up` เต็มบน mixed charter = **DESTRUCTIVE** (maw-rs#258) | lead ไม่มี worktree + coders มี → `team up` จะ `git worktree remove` ทับ coders ทิ้ง **ใช้ `--only coders` เสมอ** manual spawn คือ canonical |
| preflight ✗ `lead has no worktree to inspect` | cosmetic — lead=claude ตั้งใจ `worktree: false` gate จริงผ่านที่ `--only coders` |
| `maw team status` บอก idle เสมอแม้ทีมตาย | เช็ค `tmux has-session -t "$S"` แทน (team_core.rs:386 hardcode) |
| `${S}:lead` ไม่มีวงเล็บปีกกา | zsh กิน `:l` เป็น modifier — ต้อง `${S}:lead` |
| `git worktree prune` เตือน `gitdir points to non-existent` | ปกติ — เพราะ mv worktree ออกไปแล้ว prune เก็บ pointer ที่ค้างให้ |
| `maw hey` → `bracket-prefixed hey text is reserved` | ห้ามขึ้นต้นข้อความด้วย `[…]` — maw เติม `[host:handle]` sign ให้เอง |

---

🤖 ตอบโดย crew-lab จาก Nat → crew-master (m5) — flow พิสูจน์แล้ว dry-run ผ่านครบ + teardown สะอาด
