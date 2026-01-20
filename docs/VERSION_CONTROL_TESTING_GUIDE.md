# Version Control System - Quick Testing Guide

## How to Test the Implementation

### Prerequisites

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000 in your browser
3. Open browser DevTools Console (to see debug logs)

---

## Test Scenario 1: Basic Versioning (5 minutes)

### Steps:

1. **Create a Campaign**
   - Enter any URL (e.g., `https://example.com`)
   - Click "Analyze Landing Page"
   - Configure campaign settings
   - Click "Generate Emails"

2. **Make First Edit**
   - In editor, select "Day 1" email
   - Click "Show Editor" button
   - Change the subject to: "Test Version 1"
   - Change content (add some text)
   - Click "Save Changes"

3. **Check Version Created**
   - Look at the "History" button in header
   - You should see a badge with "1"
   - ✅ **PASS**: Badge shows version count

4. **Make Second Edit**
   - Change subject to: "Test Version 2"
   - Add more content
   - Click "Save Changes"
   - Badge should now show "2"
   - ✅ **PASS**: Version count incremented

5. **View History**
   - Click the "History" button
   - You should see 2 versions listed
   - Latest version at the top
   - ✅ **PASS**: All versions visible

---

## Test Scenario 2: Diff Viewer (3 minutes)

### Steps:

1. **Select a Version**
   - In history page, click on "Version 1"
   - Middle panel shows changes

2. **Verify Subject Diff**
   - Click "Subject Line" tab
   - Should show old subject vs new subject
   - ✅ **PASS**: Diff shows correctly

3. **Verify Content Diff**
   - Click "Content" tab
   - Green lines = added content
   - Red lines = removed content
   - ✅ **PASS**: Colors and changes are accurate

4. **Check Preview**
   - Right panel shows full email preview
   - Should match the selected version's content
   - ✅ **PASS**: Preview is correct

---

## Test Scenario 3: Version Restore (3 minutes)

### Steps:

1. **Make Multiple Versions**
   - Edit the email 3 times with distinct content:
     - Version 1: "First edit"
     - Version 2: "Second edit"
     - Version 3: "Third edit"
   - You should now have 3 versions in history

2. **Restore Version 2**
   - Go to History
   - Select "Version 2"
   - Click "Restore This Version" button
   - Confirm in dialog
   - ✅ **PASS**: Confirmation dialog appears

3. **Verify Restore**
   - You're redirected to editor
   - Email content should match "Version 2"
   - ✅ **PASS**: Content restored correctly

4. **Check New Version Created**
   - Go back to History
   - Should now see 4 versions total
   - Latest version = restored content
   - Version 3 still exists (not deleted)
   - ✅ **PASS**: Non-destructive restore works

---

## Test Scenario 4: Duplicate Prevention (2 minutes)

### Steps:

1. **Save Without Changes**
   - In editor, click "Save Changes" WITHOUT making any edits
   - Check Console log
   - Should see: "Skipping duplicate version save - content unchanged"
   - ✅ **PASS**: Duplicate detection works

2. **Verify No Extra Version**
   - Go to History
   - Version count should NOT have increased
   - ✅ **PASS**: No duplicate versions

---

## Test Scenario 5: Multiple Email Independence (3 minutes)

### Steps:

1. **Edit Day 1**
   - Select "Day 1" email
   - Make 2 edits and save each time
   - History button should show "2"

2. **Edit Day 2**
   - Select "Day 2" email
   - Make 1 edit and save
   - History button should show "1"

3. **Check Independence**
   - Go to History for Day 1 → shows 2 versions
   - Go to History for Day 2 → shows 1 version
   - ✅ **PASS**: Each email has independent history

---

## Test Scenario 6: Persistence (1 minute)

### Steps:

1. **Create Versions**
   - Make a few edits to any email
   - Note the version count

2. **Refresh Browser**
   - Press F5 or Cmd+R
   - Navigate back to the same email
   - Check History button

3. **Verify Persistence**
   - Version count should be the same
   - All versions still in history
   - ✅ **PASS**: localStorage persists data

---

## Test Scenario 7: Empty State (1 minute)

### Steps:

1. **Create New Campaign**
   - Start a fresh campaign (or clear localStorage)
2. **Check History Immediately**
   - In editor, click History before making any edits
3. **Verify Empty State**
   - Should show "No Saved Versions Yet" message
   - Helpful explanation displayed
   - No errors in console
   - ✅ **PASS**: Empty state handled gracefully

---

## Test Scenario 8: Error Handling (2 minutes)

### Steps:

1. **Test Invalid Restore**
   - Go to History page
   - In URL, manually change `emailId` to 9999
   - Press Enter

2. **Verify Error Handling**
   - Should show "Email Not Found" error page
   - "Back to Editor" button present
   - No console errors
   - ✅ **PASS**: Invalid email handled

3. **Test Corrupted Restore Data**
   - Go to editor with: `/create/editor?email=1&restore=corrupted`
   - Check console for error log
   - App should continue working
   - ✅ **PASS**: Corrupted data handled

---

## Console Debug Messages to Look For

### Normal Operation:

```
✅ "Skipping duplicate version save - content unchanged"
   (when saving identical content)
```

### Error Handling:

```
❌ "Failed to save version: [error]"
   (localStorage issue - app continues)

❌ "Failed to restore version: [error]"
   (restore data corrupted - app continues)

❌ "Invalid restore data: [data]"
   (validation failed - app continues)
```

---

## Critical Checks

### ✅ Data Safety Checklist:

- [ ] Old versions never disappear
- [ ] Restore doesn't delete history
- [ ] Failed saves don't corrupt state
- [ ] No duplicate versions created
- [ ] Version counts match actual versions
- [ ] Each email's history is independent

### ✅ UI/UX Checklist:

- [ ] History button shows correct count
- [ ] Timestamps are human-readable
- [ ] Diff viewer colors are correct
- [ ] Restore requires confirmation
- [ ] Empty states are helpful
- [ ] Loading states work

### ✅ Performance Checklist:

- [ ] History page loads quickly
- [ ] No lag when saving versions
- [ ] Diff renders smoothly
- [ ] No memory leaks after multiple edits

---

## What to Do If You Find Issues

### If a test fails:

1. **Note the exact steps** to reproduce
2. **Check browser console** for errors
3. **Check localStorage** (DevTools → Application → Local Storage)
4. **Report with**: Browser, OS, steps, expected vs actual behavior

### Common Non-Issues:

- ⚠️ "Same version appears twice" → This is OK if content is different
- ⚠️ "History button shows 0" → Normal if no edits made yet
- ⚠️ "Version time is wrong" → Check your system clock

---

## Clean Up After Testing

### To reset everything:

1. Open DevTools → Console
2. Run: `localStorage.clear()`
3. Run: `sessionStorage.clear()`
4. Refresh page

Or simply open in incognito/private window for clean slate.

---

## Expected Results Summary

After running all scenarios, you should have:

- ✅ Multiple emails each with their own version history
- ✅ Ability to view diffs for any version
- ✅ Ability to restore any version non-destructively
- ✅ No duplicate versions
- ✅ No data loss
- ✅ Proper error handling
- ✅ Persistent data across refreshes

**If all tests pass, the system is working correctly! 🎉**
