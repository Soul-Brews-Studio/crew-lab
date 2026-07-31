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

charter อยู่ที่ `ψ/teams/` — render.sh เขียนตรงนั้นเองตั้งแต่ **PR#1 merge (`7ae36dc`)** ไม่ต้องตั้งอะไรก่อน

```bash
/opt/Code/github.com/Soul-Brews-Studio/crew-master-charters/scripts/render.sh \
  --template squad-2-starter --target "$LAB" \
  --team "$CH" --session "$S" --lead-name crew-lab
# → ψ/teams/crew-lab-$DISC.yaml   (default; --out-dir DIR ถ้าอยากไปที่อื่น)
# maw team ทุก verb รับ path ตรง: maw team preflight ψ/teams/$CH.yaml
```

> ก่อน `7ae36dc` render.sh เขียนไป `.maw/teams` — repo เก่าที่ยังพึ่ง path นั้นใช้
> `ln -s ../ψ/teams .maw/teams` คร่อมได้ (crew-lab มี symlink นี้ค้างไว้ ไม่จำเป็นแล้วแต่ไม่เสียหาย)

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
maw team preflight ψ/teams/$CH.yaml              # read-only, ไม่สร้างอะไร
maw team load ψ/teams/$CH.yaml --no-spawn        # materialize config.json + inbox
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
ls ψ/teams/$CH.yaml                               # .yaml เก็บไว้เป็น record ✓
```

## 📨 7. รายงานกลับ lead/oracle อื่น (maw hey)

```bash
maw hey crew-master "crew-lab รายงาน: flow ผ่านครบ ..."   # อย่าขึ้นต้นด้วย [
# → delivered → 20-crew-master:1: [m5:crew-lab] crew-lab รายงาน: ...
```

maw auto-sign `[host:handle]` (`[m5:crew-lab]`) ให้เอง — **ห้ามขึ้นต้นข้อความด้วย `[…]` เอง** (สงวนให้ signed transport prefix)

## 👥 8. หลาย crew ขนานกัน (multi-crew) — pool ต้องระบุตรงๆ

`squad-solo-buddy` = 1 coder + lead (เล็กสุด) เหมาะกับ tournament ที่ต้องการ "1 คำตอบ ต่อ 1 crew"

```bash
DISC=$(date +%m%d%H%M)
declare -A POOL=( [A]=1 [B]=5 )          # ระบุตรงๆ ห้ามคำนวณ — slot ไม่เรียงเลข!
for X in A B; do
  CH="crew-lab-j${X}${DISC}"; S="crewlabj$(echo $X|tr A-Z a-z)$DISC"; P=${POOL[$X]}
  $RS --template squad-solo-buddy --target "$LAB" --team "$CH" --session "$S" --lead-name crew-lab
  sed -i '' "s|codex-setup\.ts 1 |codex-setup.ts $P |" "ψ/teams/$CH.yaml"   # template hardcode 1 เสมอ
  maw worktree add "${CH}-buddy" --base main
  ( cd "agents/${CH}-buddy" && bun $HOME/.claude/skills/oracle-team/scripts/codex-setup.ts $P )
  printf '\n[projects."%s"]\ntrust_level = "trusted"\n' "$LAB/agents/${CH}-buddy" >> "agents/${CH}-buddy/.codex/config.toml"
  maw new "$S" --path "$LAB" --shell --no-attach
done
# ตรวจ pool แยกจริง — ทีละไฟล์ อย่าเชื่อ grep รวม
for X in A B; do grep -o 'codex-setup\.ts [0-9]*' "ψ/teams/crew-lab-j${X}${DISC}.yaml"; done
```

เช็ค slot ที่ **มีจริง** ก่อนเสมอ (เครื่องนี้มี 1,2,5,6 — ไม่มี 3,4):

```bash
ls -d ~/.codex-team/*/          # slot ที่มีจริง
cat ~/.codex-team/.usage-cache.json | head -20   # quota เหลือเท่าไหร่
uptime; sysctl -n hw.ncpu       # load/core ก่อน spawn (เคยมี CPU incident)
```

## 🚧 9. Gate = script ห้ามเป็น agent

หลักการ: **ถ้าเขียนเป็น script ได้ ห้ามใช้ agent** — agent ให้อภัย script ไม่ให้อภัย
gate ตัดสินแค่ "มีสิทธิ์ถูก judge ไหม" ไม่ใช่ "ดีไหม"

```bash
./scripts/gate-schema-v2.sh <worktree>   # exit 0 = eligible, 1 = REJECT <reason>
```

**ต้องทดสอบ gate ก่อนใช้ — ทั้ง reject และ pass**:

```bash
./scripts/gate-schema-v2.sh /tmp/nonexistent   # → REJECT G0
./scripts/gate-schema-v2.sh /tmp/empty-dir     # → REJECT G1
./scripts/gate-schema-v2.sh /tmp/gate-ref      # → PASS  ← ถ้าไม่มีอะไรผ่านได้เลย = tournament โกง
```

⚠️ ระวัง gate ที่ **ขัดกันเอง**: "ห้ามมี `__PLACEHOLDER__` เหลือ" + "pool ต้อง parameterize"
→ ใช้ `__POOL1__` ไม่ได้ (render.sh ไม่ substitute) ต้องใช้ `${CREW_POOL_1:-1}` แทน

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
| **#9 POOL COLLISION ข้าม crew — gate เขียวแต่ชนจริง** | template hardcode `codex-setup.ts 1` **ทุก charter** → 2 crew แชร์ credential/quota. **preflight จับไม่ได้** เพราะเช็คแค่ว่า CODEX_HOME *path* ต่างกัน (ต่างจริง) ไม่ได้เช็ค pool index → *proxy check: วัดสิ่งที่ใกล้เคียง แล้วนึกว่าวัดสิ่งที่สนใจ*. ต้อง `sed` charter ระบุ pool เอง |
| **#10 pool slot ไม่เรียงเลข** | เครื่องนี้มี 1,2,5,6 **ไม่มี 3,4** — ห้ามคำนวณ `base+n` ต้องระบุเป็น list. (`omx-3` resolve ผ่านทั้งที่ slot 3 ไม่มีจริง — resolve ผ่าน ≠ ใช้ได้) |
| **#11 pool ต่างกัน = model ต่างกัน (confound!)** | pool 1 → `gpt-5.5`, pool 5 → `gpt-5.6-sol` — charter ไม่ได้ระบุ model. 2 crew จาก template เดียวกัน **ไม่ใช่ตัวแปรเดียวกัน** ถ้าจะเทียบผลลัพธ์ต้อง `/model` ให้ตรงกันก่อน แล้ว peek ยืนยัน |
| **#12 `$X07311034` ถูกอ่านเป็นชื่อตัวแปร** | shell กิน `$X` ต่อด้วยตัวเลขเป็น identifier เดียว → ได้ค่าว่าง ต้อง `${X}07311034` (ตระกูลเดียวกับ `${S}:lead`) |
| `maw hey` warning `pane runs 'node' not an agent` | **false warning** — pane เป็น agent จริง ข้อความส่งถึงและทำงาน (`/model` ใช้ได้ผ่าน maw hey) อย่าเชื่อ warning นี้ ตรวจด้วย `maw peek` |
| **#15 TOML nesting ทำ config เป็นหมัน** | `model = "gpt-5.5"` ที่อยู่**หลัง** `[projects."..."]` กลายเป็น `projects.xxx.model` ไม่ใช่ top-level → ไม่มีผลเลย ไฟล์ *ดูถูก* 100%. pool 1 เขียนกฎไว้ในไฟล์ตัวเอง: `# must be before any [table]` |
| **#16 verify ชนกับ Nothing-is-Deleted** | `down` เก็บ charter เป็น record → `verify` นับเป็น crew ที่ fail ตลอดกาล **สองหลักการของเราเองตีกัน** ต้องให้ verify ข้าม archived record (ไม่มีใน registry + ไม่มี worktree) |
| **#17 regex เข้มเกิน = รายงานเท็จ** | รับแค่ `xhigh\|high\|medium\|low` แต่ omx มี `default` → รายงาน "engine did not boot" ทั้งที่ปกติ **เกือบ teardown crew ที่แข็งแรงทิ้ง** |
| **#18 คนละ token บัญชีเดียวกัน** | pool 1 กับ hermes เป็น `codexsomkit@...` ทั้งคู่ md5 ต่างกัน → เทียบ bytes ผ่านแต่**แชร์โควตา** ต้องเทียบ email จาก JWT |
| **#19 worktree auth เป็น symlink ไม่ใช่สำเนา** | `agents/*/.codex/auth.json -> ~/.codex-team/N/auth.json`. **Nothing-is-Deleted ปกป้องไฟล์ ไม่ได้ปกป้องปลายทางของ symlink** — archive worktree ไม่ใช่ backup ของ credential. เขียนลง worktree auth = ทะลุไปทับ pool. ก่อนเขียนทับ credential ใดๆ: `[ -L "$f" ]` ก่อนเสมอ, backup ด้วย `cp -L`, **verify ด้วย `readlink` ไม่ใช่ md5** (md5 อ่านทะลุ symlink จึงบอก "เหมือนกัน" เสมอแม้ไม่มีสำเนา) |
| **#20 agent พิมพ์ข้อความ ≠ ส่งถึงใคร** | background agent ต้องเรียก tool หรือเขียนไฟล์ ถ้าสั่งว่า "จบด้วยบรรทัดเหล่านี้" จะได้ผลกลับ 0/5 แล้วเข้าใจผิดว่าเป็นคุณสมบัติของสิ่งที่วัด **deliverable ต้องตรวจได้ด้วย `ls`** |
| **exit code หายหลัง pipe** | `cmd \| tail` คืน exit ของ `tail` ไม่ใช่ของ `cmd` — วัด `$?` หลัง pipe แล้วได้ 0 ทั้งที่สคริปต์คืน 1 ต้องวัดแยก: `cmd >/dev/null 2>&1; echo $?` |

---

🤖 ตอบโดย crew-lab จาก Nat → crew-master (m5) — flow พิสูจน์แล้ว dry-run ผ่านครบ + teardown สะอาด
