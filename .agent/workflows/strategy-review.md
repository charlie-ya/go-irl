---
description: Run a strategic pre-mortem on a feature or evaluate current roadmap priorities
---

# Strategy Review

Evaluate a proposed feature or the current roadmap against real-world constraints.

## Steps

1. Read the strategy agent context:
   ```
   .agent/strategy_agent.md
   ```

2. Identify the subject of review:
   - If reviewing a **specific feature**: Ask the user for the feature description
   - If reviewing the **roadmap**: Read current task files and recent conversation history

3. Run the Pre-Mortem analysis:
   - **"Imagine it failed. Why?"** — List 3-5 realistic failure scenarios
   - **Scope creep risk** — Does this feature open a rabbit hole of follow-up work?
   - **User impact** — How many users will actually use this? (Be honest)
   - **Opportunity cost** — What are you NOT building while building this?

4. Check real-world impact:
   - **Battery/data usage** — Will this drain the phone?
     ```bash
     # turbo
     grep -rn "watchPosition\|setInterval\|requestAnimationFrame\|onSnapshot" src/ --include="*.ts" --include="*.tsx" -c
     ```
   - **Safety** — Could this feature put users in physical danger?
   - **Privacy** — Does this expose user location or behavior to others?
   - **Cheating** — Can this be exploited by GPS spoofers or bad actors?

5. Evaluate against the Bartle player types:
   - **Achievers** — Does this give them something to grind for?
   - **Explorers** — Does this reward discovering new areas?
   - **Socializers** — Does this foster positive player interaction?
   - **Killers** — Could this enable harassment or griefing?

6. Market reality check:
   - Is there a proven precedent for this feature in similar games?
   - Does this differentiate from competitors or is it table-stakes?
   - Will this help with retention (D7, D30) or just acquisition?

7. Provide a recommendation:
   - **🟢 Build it** — Clear value, manageable scope
   - **🟡 Simplify it** — Good idea but over-scoped; suggest MVP version
   - **🔴 Skip it** — Not worth the effort right now; explain why
   - **⏸️ Defer it** — Good idea but wrong timing; suggest when to revisit

8. If recommending "Build it", provide:
   - Minimum viable version (what to ship first)
   - Success metrics (how to know if it worked)
   - Kill criteria (when to pull the plug if it's not working)
