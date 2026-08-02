---
pattern: If a system addresses a resource by a name it generated, reshaping that resource by hand severs every consumer while the visual result looks untouched — and tools that default to "current context" will pick the human's context when an agent runs them
date: 2026-08-02
source: "rrr: crew-lab — digger lab layout"
concepts: [tmux, addressing, automation, defaults, agent-safety, warnings]
---

# Don't hand-edit what a tool addresses by name

A crew member's tmux window is named `basename(worktree)`. That name is not
cosmetic — it is the **address**. `liveModel()` runs `maw peek "${session}:${window}"`
(`crew.ts:131`, called from `:378`), and `maw hey` resolves the same way, then
delivers to the window's *active* pane.

I merged that window into another with `maw join` to get a two-pane layout. On
screen it was exactly right. Underneath, the name was gone, so `crew status`
reported `MODEL -` and messages went to a shell instead of the agent.

**The correct move was to split *inside* the named window** and make the agent the
active pane — the container keeps its identity, the layout still changes.

## Rules

**A generated name is an interface. Treat renaming or destroying it as a breaking
change**, even when the change is "only visual". Ask what resolves this resource
before reshaping it — if anything addresses it by name, path, or index, that is a
consumer you are about to break silently.

**Add inside the named container rather than restructuring around it.** Splitting a
window preserves its name; merging windows destroys one. Prefer the operation that
keeps identities intact.

**A tool that defaults to "current context" will choose the wrong one under
automation.** `tmux break-pane` with no `-t` creates the window in the *attached*
session. Run by an agent, "attached" is the human's own workspace — I moved a live
agent into the user's session twice. Under automation, name every target
explicitly; a default that is convenient interactively is a hazard in a script.

**Screen-looks-right is a proxy for state.** A layout that renders correctly says
nothing about whether the machinery behind it can still find its parts. Verify
through the consumer (`crew status`, a real message round-trip), never by looking.

## The warning I ignored

`maw hey` printed "likely misaddressed — pane runs 'zsh', not an agent" **twice**
while genuinely misdelivering, and I treated it as a targeting nuisance to route
around. Later, once the layout was fixed, the same warning fired on a *correct*
delivery (pane runs `node`) — so as a check it discriminates nothing and should be
distrusted in general.

Both facts are true at once, and the ordering matters: **a warning being unreliable
in general is not licence to dismiss it in the moment.** The cheap move is to spend
one command confirming the thing it names — `maw peek` would have shown me the
message sitting in a shell. I skipped that because I had already decided the layout
was fine.

See [[instruments-that-lie-green]] and [[proxy-checks-intent-vs-state]].
