# UX Test Scenario: Multi-Repo Support & PR Review Comments

**Feature:** Multi-repo processing with parallel execution and PR review comments
**Version:** 2.1.0
**Date:** 2026-01-08
**Tester:** Claude Code QA Team

---

## Changelog

### v2.1.0 (2026-01-08) - UI Fixes Applied

#### Issue #2: Missing UI Elements in Repositories Tab (Disconnected State) ✅ FIXED
- **Problem:** When GitHub was not connected, the Repositories tab header was missing the count badge and "Add" button
- **Fix Applied:**
  - Added count badge showing "(0)" when GitHub not connected
  - Added green "Add" button in header for all states (disconnected, loading, empty, populated)
  - Added secondary "Add Repositories" button in disconnected empty state

#### Issue #3: Missing Refresh Button in Some States ✅ FIXED
- **Problem:** Refresh button only appeared when repos were loaded; missing in disconnected, loading, and empty states
- **Fix Applied:**
  - Added Refresh button to all states:
    - **Disconnected state:** Refresh button attempts to reconnect/check status
    - **Loading state:** Refresh button visible with loading spinner animation
    - **Empty state:** Refresh button to retry fetching repos
    - **Populated state:** Already had Refresh button (no change)

#### Visual Verification Checklist Updates
All Repositories Tab items now verified ✅:
- [x] Count badge visible next to title (all states)
- [x] "Add" button has primary styling (green, prominent) - all states
- [x] "Refresh" button has circular icon - all states
- [x] Repository cards display correctly
- [x] Empty state shows clear instructions with TWO buttons (Connect GitHub App + Add Repositories)

---

## Test Overview

This test scenario validates the end-to-end user experience for:
1. Selecting multiple repositories for processing
2. Parallel processing execution with status updates
3. Viewing multi-repo results with success/failure indicators
4. Adding new repositories through the app UI

---

## Prerequisites

- ✅ GitHub App "Claude Code on Cloudflare" installed
- ✅ At least 2 repositories available (for multi-repo testing)
- ✅ Claude Pipeline app loaded in browser
- ✅ User authenticated and GitHub connected

---

## Test Scenarios

### Scenario 1: Multi-Repo Selection (Happy Path)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1.1 | Navigate to "Sessions" tab | Sessions screen loads with repository selector |
| 1.2 | Click repository dropdown | Dropdown opens showing available repos |
| 1.3 | Observe checkbox UI | Each repo has a checkbox; "Select All" and "Clear" buttons visible |
| 1.4 | Click one repo checkbox | Checkbox becomes checked with ✓ icon |
| 1.5 | Click "Select All" button | All repos become checked |
| 1.6 | Click "Clear" button | All checkboxes unchecked |
| 1.7 | Manually select 2+ repos | Multiple checkboxes checked; repo count badge shows number |

**Success Criteria:**
- Checkboxes toggle state correctly
- Select All / Clear work as expected
- Repo count badge updates in real-time

---

### Scenario 2: Multi-Repo Processing Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.1 | Select 2+ repositories | Repositories selected |
| 2.2 | Enter prompt: "List README files" | Prompt entered in input field |
| 2.3 | Click Send button | Session starts; loading indicator appears |
| 2.4 | Observe status messages | "Processing X repositories in parallel..." |
| 2.5 | Wait for first repo completion | Status: "Completed: [repo-name]" |
| 2.6 | Wait for second repo completion | Status: "Completed: [repo-name]" |
| 2.7 | Observe final results | Multi-repo summary displayed with success/fail counts |

**Success Criteria:**
- Parallel processing status messages visible
- Each repo shows individual completion status
- Final summary includes PR URLs if created
- Total time is less than sequential processing would take

---

### Scenario 3: Multi-Repo Results Display

| Step | Action | Expected Result |
|------|--------|-----------------|
| 3.1 | Complete multi-repo session | Results shown in chat |
| 3.2 | Scroll to results section | Markdown formatted summary visible |
| 3.3 | Verify success indicators | ✓ for successful repos |
| 3.4 | Verify error indicators | ✗ for failed repos (if any) |
| 3.5 | Click PR link (if created) | Opens GitHub PR in new tab |
| 3.6 | Check PR count badge | Shows total repos connected |

**Expected Results Format:**
```markdown
## Multi-Repo Results

Processed 3 repositories:

✓ **repo-1**
  - PR: https://github.com/owner/repo-1/pull/123

✗ **repo-2**
  - Error: Repository not found

✓ **repo-3**
  - PR: https://github.com/owner/repo-3/pull/124

**Summary:** 2 succeeded, 1 failed
```

---

### Scenario 4: Add Repositories from UI

| Step | Action | Expected Result |
|------|--------|-----------------|
| 4.1 | Navigate to "Repositories" tab | Repository list loads |
| 4.2 | Observe header | Shows "Repositories (N)" count badge |
| 4.3 | Click "Add" button (primary green) | Opens `/gh-setup/add-repositories` in new tab |
| 4.4 | Verify page content | Shows current repos list; "Add Repositories on GitHub" button |
| 4.5 | Click "Add Repositories on GitHub" | GitHub installation page opens |
| 4.6 | Select additional repositories | Repositories selected in GitHub UI |
| 4.7 | Complete installation | Redirects back to app |
| 4.8 | Click "Refresh" button (circular icon) | Repository list updates |
| 4.9 | Verify new repos appear | Count badge increases; new repos listed |

**Success Criteria:**
- Add button prominently displayed
- GitHub installation flow works end-to-end
- Refresh updates repository list
- No manual page refresh required

---

### Scenario 5: Single vs Multi-Repo Mode Switching

| Step | Action | Expected Result |
|------|--------|-----------------|
| 5.1 | Select 1 repository | "repository" parameter sent to backend |
| 5.2 | Send prompt "Show files" | Single-repo mode active |
| 5.3 | Select 2+ repositories | "repositories" array sent to backend |
| 5.4 | Send prompt "Show files" | Multi-repo mode active |
| 5.5 | Observe behavior difference | Single: direct output; Multi: parallel status + summary |

**Success Criteria:**
- Backend automatically switches modes based on selection count
- No user intervention required
- Behavior is transparent to user

---

### Scenario 6: Error Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 6.1 | Start multi-repo session with invalid repo | Error message displayed |
| 6.2 | Observe error display | Clear error message with failed repo name |
| 6.3 | Check other repos still processed | Successful repos show results |
| 6.4 | Try to add repository without auth | Error: "GitHub Not Connected" |
| 6.5 | Click "Connect GitHub App" | Opens GitHub installation page |

---

## Visual Verification Checklist

### Repository Selector (Sessions Tab)
- [ ] Dropdown opens smoothly
- [ ] Checkboxes have clear visual state (checked/unchecked)
- [ ] "Select All" button styled as secondary button
- [ ] "Clear" button styled as secondary button
- [ ] Selected repos appear as chips below input
- [ ] Chips have X button to deselect individual repos

### Status Messages
- [ ] Loading spinner appears during processing
- [ ] Status messages include repository name
- [ ] Progress updates show for each repo
- [ ] Completion is clearly indicated

### Results Display
- [ ] Markdown renders correctly
- [ ] Checkmarks (✓) green-colored
- [ ] X marks (✗) red-colored
- [ ] PR links are clickable
- [ ] Summary section clearly formatted

### Repositories Tab
- [ ] Count badge visible next to title
- [ ] "Add" button has primary styling (green, prominent)
- [ ] "Refresh" button has circular icon
- [ ] Repository cards display correctly
- [ ] Empty state shows clear instructions

---

## Performance Benchmarks

| Metric | Target | Acceptable |
|--------|--------|------------|
| Multi-repo session start | < 500ms | < 1s |
| First repo status update | < 2s | < 5s |
| Parallel processing (2 repos) | < 30s total | < 60s |
| Repository refresh | < 3s | < 10s |
| Add repositories page load | < 1s | < 3s |

---

## Accessibility Testing

- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader announces repo selection changes
- [ ] Focus indicators visible on all buttons
- [ ] Error messages are accessible via ARIA
- [ ] Color contrast meets WCAG AA standards

---

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest+ | ✅ Test |
| Firefox | Latest+ | ✅ Test |
| Safari | Latest+ | ⏳ Best effort |
| Edge | Latest+ | ✅ Test |

---

## Test Data

### Test Repositories
- `claude-multi-test-1` - Simple README repo
- `claude-multi-test-2` - Simple README repo
- `test-webhook-repo` - Existing test repo

### Test Prompts
- "List all files in this repository"
- "Summarize the README.md file"
- "Find all JavaScript files"

### Expected Multi-Repo Output
```
## Multi-Repo Results

Processed 2 repositories:

✓ **claude-multi-test-1**
  - PR: https://github.com/owner/repo/pull/1

✓ **claude-multi-test-2**
  - PR: https://github.com/owner/repo/pull/2

**Summary:** 2 succeeded, 0 failed
```

---

## Bug Report Template

If a test fails, document:

```markdown
### Bug: [Brief Description]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**

**Actual Behavior:**

**Screenshot:**

**Browser:**
**Device:**
**Repo Count:**
```

---

## Sign-Off

- **Tester:** _______________ Date: ________
- **QA Lead:** _______________ Date: ________
- **Product Owner:** _______________ Date: ________
