# Accessibility (A11y) Guidelines

> **Aspirational Document** — This document describes the *target state* for accessibility in the in–midst–my–life system, not the current implementation. The guidelines below represent our design goals and the standards we are working toward. Current implementation includes basic semantic HTML and ARIA attributes; full WCAG 2.1 AA compliance (skip navigation, focus management, contrast validation, keyboard trap prevention) is planned but not yet validated. See `docs/SEED-ALIGNMENT-AUDIT.md` gap G18 for current status.

This document outlines accessibility standards, testing procedures, and best practices for the in–midst–my–life system.

## WCAG 2.1 Level AA Compliance

Our system is committed to meeting **WCAG 2.1 Level AA** accessibility standards. This ensures the application is usable by people with disabilities including:
- Visual impairments (blindness, low vision, color blindness)
- Hearing impairments (deafness, hard of hearing)
- Motor impairments (limited dexterity, mobility limitations)
- Cognitive impairments (learning disabilities, dyslexia)

## Four Principles (POUR)

### 1. Perceivable
Content must be perceivable to all users through multiple modalities.

**Key Requirements:**
- **1.1.1 Non-text Content**: All images have descriptive alt text or are marked as decorative
- **1.3.1 Info and Relationships**: Semantic HTML structure conveys meaning (headings, lists, landmarks)
- **1.4.3 Contrast**: Text has minimum 4.5:1 contrast ratio (7:1 for AAA)
- **1.4.4 Resize Text**: Text can be resized to 200% without loss of functionality
- **1.4.5 Images of Text**: Text is not presented as images (use actual text instead)

**Implementation:**
```html
<!-- Good: Semantic structure -->
<main>
  <h1>CV Editor</h1>
  <nav aria-label="Main navigation">
    <!-- navigation content -->
  </nav>
  <section>
    <h2>Add Entry</h2>
    <form>
      <label for="entry-type">Entry Type</label>
      <select id="entry-type" required>
        <option>--Select--</option>
      </select>
    </form>
  </section>
</main>

<!-- Good: Decorative images marked as such -->
<img src="icon.png" alt="" aria-hidden="true" />

<!-- Good: Color contrast -->
<button style="color: #ffffff; background: #0066cc;">Save</button> <!-- 4.5:1 ratio -->
```

### 2. Operable
All functionality must be accessible via keyboard and other input methods.

**Key Requirements:**
- **2.1.1 Keyboard**: All functionality available via keyboard (no mouse-only)
- **2.1.2 No Keyboard Trap**: User can navigate away from all elements
- **2.2.1 Timing Adjustable**: No arbitrary time limits on critical actions
- **2.4.1 Bypass Blocks**: Skip navigation links present
- **2.4.3 Focus Order**: Focus order is logical and meaningful
- **2.4.7 Focus Visible**: Visual focus indicator on interactive elements

**Implementation:**
```typescript
// Good: All interactive elements keyboard accessible
<button onClick={handleSave} onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') handleSave();
}}>
  Save Entry
</button>

// Good: Focus management
const handleTabIndex = (element) => {
  element.focus();
};

// Good: Live region for status updates
<div role="status" aria-live="polite" aria-atomic="true">
  Entry saved successfully
</div>
```

### 3. Understandable
Content and operations must be understandable to all users.

**Key Requirements:**
- **3.1.1 Language of Page**: Page language declared (`<html lang="en">`)
- **3.2.1 On Focus**: No unexpected context changes when focusing elements
- **3.2.2 On Input**: No unexpected context changes on input (without warning)
- **3.3.1 Error Identification**: Errors identified and described clearly
- **3.3.2 Labels or Instructions**: Form fields have associated labels

**Implementation:**
```html
<!-- Good: Language declared -->
<html lang="en">

<!-- Good: Form with labels -->
<form>
  <label for="entry-content">Entry Description</label>
  <textarea id="entry-content" aria-describedby="content-hint"></textarea>
  <small id="content-hint">Describe your experience or achievement</small>
  
  <label>
    <input type="checkbox" name="include-dates" />
    Include dates (optional)
  </label>
</form>

<!-- Good: Error messaging -->
<form onSubmit={handleSubmit} noValidate>
  <div role="alert" aria-live="assertive">
    {errors.map(error => <p key={error}>{error}</p>)}
  </div>
</form>
```

### 4. Robust
Content must work with assistive technologies and across browsers/devices.

**Key Requirements:**
- **4.1.2 Name, Role, Value**: Interactive elements properly identified
- **4.1.3 Status Messages**: Status updates announced to assistive tech
- Valid HTML and proper ARIA usage

**Implementation:**
```typescript
// Good: Proper ARIA attributes
<button
  aria-pressed={isSelected}
  aria-label="Select Engineer persona"
  onClick={togglePersona}
>
  Engineer
</button>

// Good: Live regions for dynamic updates
<div role="region" aria-live="polite" aria-label="CV entries">
  {entries.map(entry => (
    <div key={entry.id} role="article">
      {entry.content}
    </div>
  ))}
</div>

// Good: Status announcements
<div role="status" aria-live="assertive">
  {isLoading && "Loading CV entries..."}
  {saveSuccess && "Entry saved successfully"}
</div>
```

## Testing

### Automated Testing
Run automated accessibility tests:
```bash
# Run WCAG compliance tests
pnpm --filter @in-midst-my-life/web test:a11y

# Run with coverage report
pnpm --filter @in-midst-my-life/web test:a11y:coverage
```

### Manual Testing Checklist

- [ ] **Keyboard Navigation**
  - [ ] All interactive elements focusable via Tab
  - [ ] Focus order is logical (left-to-right, top-to-bottom)
  - [ ] No keyboard traps (can escape with Esc or Tab)
  - [ ] Skip navigation links present

- [ ] **Screen Reader Testing** (NVDA, JAWS, VoiceOver)
  - [ ] Page title announced on load
  - [ ] Landmarks and regions identified
  - [ ] Form labels associated with inputs
  - [ ] Error messages announced
  - [ ] Dynamic updates announced

- [ ] **Visual Testing**
  - [ ] Text contrast ratio ≥ 4.5:1 (normal text), ≥ 3:1 (large text)
  - [ ] Focus indicators visible and clear
  - [ ] Text resizable to 200% without loss
  - [ ] Color not sole means of conveying information
  - [ ] Images have alt text or are marked decorative

- [ ] **Cognitive**
  - [ ] Clear, simple language used
  - [ ] Instructions and error messages plain
  - [ ] Consistent navigation patterns
  - [ ] No confusing abbreviations without expansion

## Common Issues and Fixes

### Issue: Missing alt text on images
```typescript
// Bad
<img src="profile.jpg" />

// Good
<img src="profile.jpg" alt="Profile photo of John Doe" />

// Good: Decorative images
<img src="divider.png" alt="" aria-hidden="true" />
```

### Issue: Buttons not keyboard accessible
```typescript
// Bad
<div onClick={handleClick}>Click me</div>

// Good
<button onClick={handleClick}>Click me</button>

// Good: Custom element with keyboard support
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Click me
</div>
```

### Issue: Form fields without labels
```typescript
// Bad
<input type="text" placeholder="Name" />

// Good
<label htmlFor="name">Name</label>
<input id="name" type="text" />

// Good: Hidden label if visual design requires
<label htmlFor="search" className="sr-only">Search entries</label>
<input id="search" type="search" placeholder="Search" />
```

### Issue: Low contrast text
```typescript
// Bad (2:1 ratio)
<p style="color: #999; background: #fff;">Text</p>

// Good (4.5:1 ratio)
<p style="color: #0066cc; background: #fff;">Text</p>
```

### Issue: Status updates not announced
```typescript
// Bad
{isSaving && <p>Saving...</p>}

// Good
{isSaving && (
  <div role="status" aria-live="polite" aria-atomic="true">
    Saving your changes...
  </div>
)}
```

## Accessible Component Patterns

### Accessible Persona Selector
```typescript
export const PersonaeSelector = ({
  personas,
  selectedId,
  onSelect,
}: Props) => {
  return (
    <fieldset>
      <legend>Select Your Persona</legend>
      <div role="radiogroup" aria-label="Available personas">
        {personas.map(persona => (
          <label key={persona.id}>
            <input
              type="radio"
              name="persona"
              value={persona.id}
              checked={selectedId === persona.id}
              onChange={() => onSelect(persona.id)}
              aria-label={`${persona.nomen}: ${persona.role_vector}`}
            />
            {persona.nomen}
          </label>
        ))}
      </div>
    </fieldset>
  );
};
```

### Accessible Form with Error Handling
```typescript
export const CVEntryForm = ({ onSubmit }: Props) => {
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate(formData);

    if (newErrors.length > 0) {
      setErrors(newErrors);
      // Focus on error summary for announcement
      errorRef.current?.focus();
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Error Summary with focus management */}
      {errors.length > 0 && (
        <div
          ref={errorRef}
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
        >
          <h2>Errors in form</h2>
          <ul>
            {errors.map(error => <li key={error}>{error}</li>)}
          </ul>
        </div>
      )}

      {/* Form fields with labels */}
      <div>
        <label htmlFor="content">Entry Description *</label>
        <textarea
          id="content"
          required
          aria-required="true"
          aria-invalid={errors.some(e => e.includes('content'))}
          aria-describedby="content-error"
        />
        {errors.some(e => e.includes('content')) && (
          <span id="content-error" className="error">
            Entry description is required
          </span>
        )}
      </div>

      <button type="submit">Save Entry</button>
    </form>
  );
};
```

### Accessible Modal Dialog
```typescript
export const Modal = ({ title, isOpen, onClose, children }: Props) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="modal-overlay"
    >
      <div className="modal-content">
        <h2 id="modal-title">{title}</h2>
        {children}
        <button onClick={onClose} aria-label="Close dialog">
          Close
        </button>
      </div>
    </div>
  );
};
```

## Screen Reader Testing Guide

### Testing with NVDA (Windows - Free)
1. Download NVDA from https://www.nvaccess.org/
2. Start NVDA
3. Navigate with arrow keys and Tab
4. Use Ctrl+Home to read from start
5. Use Ctrl+Alt+Right Arrow to read next heading

### Testing with JAWS (Windows - Paid)
1. Download from https://www.freedomscientific.com/
2. Use Insert key + arrow keys for navigation
3. Insert + H for headings
4. Insert + F5 for forms

### Testing with VoiceOver (Mac - Free)
1. Enable: System Preferences > Accessibility > VoiceOver
2. Use VO key (Ctrl+Option) + arrow keys
3. VO + U for rotor menu
4. VO + H for headings

## Continuous Accessibility

### Development Best Practices
1. **Use semantic HTML** - Use `<button>`, `<a>`, `<form>`, `<nav>`, etc.
2. **Test with keyboard** - Verify all functionality works with keyboard only
3. **Check contrast** - Use tools like WebAIM Color Contrast Checker
4. **Test with screen reader** - Use at least one screen reader during development
5. **Avoid automatic focus changes** - Don't move focus without user action
6. **Provide skip links** - Allow skipping to main content
7. **Use ARIA sparingly** - Semantic HTML first, ARIA for enhancement

### Code Review Checklist
- [ ] All images have meaningful alt text
- [ ] Form fields have associated labels
- [ ] Focus is visible and logical
- [ ] Color not sole means of conveying information
- [ ] Text contrast ratio adequate
- [ ] No keyboard traps
- [ ] Page structure semantic and hierarchical
- [ ] ARIA used correctly (if at all)

### Accessibility Regression Testing
```bash
# Run full accessibility test suite
pnpm --filter @in-midst-my-life/web test:a11y

# Run specific test file
pnpm --filter @in-midst-my-life/web test:a11y wcag-compliance.test.ts

# Run with reporter
pnpm --filter @in-midst-my-life/web test:a11y --reporter=detailed
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Articles](https://webaim.org/articles/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Accessible Rich Internet Applications (ARIA)](https://www.w3.org/WAI/ARIA/apg/)

## Questions?

For accessibility questions or issues, please:
1. File an issue on GitHub with `accessibility` label
2. Include WCAG criterion reference
3. Include steps to reproduce
4. Mention assistive technology used (if applicable)

---

**Last Updated:** February 2026
**Status:** Aspirational — Target state, not current implementation
**Target:** WCAG 2.1 Level AA Compliance
