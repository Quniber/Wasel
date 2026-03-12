# App Store Review Fixes - Round 2

**Review Date:** March 09, 2026
**Review Device:** iPad Air 11-inch (M3), iPadOS 26.3

---

## Driver App (Wasel Driver)

**Submission ID:** 9ce4438a-b569-4f15-ba6d-ebd57650e993
**Version:** 1.0

### Issue 1: Guideline 2.1(a) - Add Photo Still Broken + Login Error
**Status:** [ ] TODO
**Problem:** The add photo button still does not work. App displayed an error message during login.
**Previous Fix:** Added `ImagePicker.requestMediaLibraryPermissionsAsync()` - did NOT work.
**Notes:** Need deeper investigation - likely iPad-specific issue. Login error suggests demo account or API issue.

---

### Issue 2: Guideline 4.3(a) - Duplicate App Icon
**Status:** [ ] TODO
**Problem:** App icon is still identical to other apps on the App Store.
**Previous Fix:** Changed to dark navy gradient background - still rejected.
**Notes:** Need a completely different icon design, not just color change.

---

---

## Rider App (Wasel Ride)

**Submission ID:** fc53c125-d3b4-4c68-acdb-8666f3caf108
**Version:** 1.0

### Issue 1: Guideline 4.3(a) - Duplicate App Icon
**Status:** [ ] TODO
**Problem:** App icon is identical to other apps on the App Store (repeated rejection).
**Notes:** Need a completely unique icon design.

---

### Issue 2: Guideline 2.1(a) - Login Error + Add Photo Still Broken
**Status:** [ ] TODO
**Problem:** Error message when logging in with demo account. "Add Photo" button still does not work during registration.
**Previous Fix:** Added permission request + demo account bypass - did NOT work.
**Notes:** Login error = demo account bypass may not be deployed or working. Add Photo = permission fix insufficient, need different approach for iPad.

---

### Issue 3: Guideline 5.1.1(v) - Gender Still Required
**Status:** [ ] TODO
**Problem:** App still requires gender upon registration.
**Previous Fix:** Was marked as done but Apple still sees it.
**Notes:** Fix may not have been included in the submitted build. Verify gender field is removed.

---

## Summary

| Issue | Rider App | Driver App | Priority |
|-------|-----------|------------|----------|
| Duplicate app icon | STILL FAILING | STILL FAILING | HIGH |
| Add Photo broken (iPad) | STILL FAILING | STILL FAILING | HIGH |
| Demo login error | STILL FAILING | STILL FAILING | HIGH |
| Gender required | STILL FAILING | N/A | HIGH |

## Key Takeaways
- **All previous fixes failed or were not included in the build** - need to verify each fix is actually in the submitted binary
- **Add Photo**: Simple permission request isn't enough - need to debug iPad-specific image picker behavior
- **Icons**: Both apps need completely redesigned, distinct icons
- **Demo account**: Bypass may not be deployed correctly - test on production server
- **Gender**: Verify the field removal is in the build that was submitted
