# B2B+ Accessibility Checklist

This checklist ensures all pages and components meet WCAG 2.1 AA standards.

## Keyboard Navigation

- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical and follows visual flow
- [ ] Focus is visible on all interactive elements
- [ ] Skip link is present and functional
- [ ] No keyboard traps exist
- [ ] Keyboard shortcuts are documented

## Visual Design

- [ ] Color is not the only indicator of state
- [ ] Text has sufficient contrast (4.5:1 for normal text, 3:1 for large text)
- [ ] Focus indicators are clearly visible
- [ ] Hover states are distinct from normal states
- [ ] Text is resizable without loss of functionality
- [ ] No flashing or blinking content (>3 times per second)

## Semantic HTML

- [ ] Proper heading hierarchy (h1, h2, h3, etc.)
- [ ] Only one h1 per page
- [ ] Lists use `<ul>`, `<ol>`, `<li>` elements
- [ ] Form inputs have associated `<label>` elements
- [ ] Buttons use `<button>` element, not `<div>`
- [ ] Links use `<a>` element with href

## Forms

- [ ] All form fields have labels
- [ ] Error messages are associated with fields
- [ ] Required fields are marked
- [ ] Form validation is clear and helpful
- [ ] Error messages are descriptive
- [ ] Success messages are provided

## Images & Media

- [ ] All images have descriptive alt text
- [ ] Decorative images have empty alt text (`alt=""`)
- [ ] Complex images have long descriptions
- [ ] Videos have captions
- [ ] Audio has transcripts

## ARIA Attributes

- [ ] `role` attributes are used correctly
- [ ] `aria-label` is used for icon-only buttons
- [ ] `aria-describedby` links descriptions to elements
- [ ] `aria-live` is used for dynamic content
- [ ] `aria-expanded` indicates expandable sections
- [ ] `aria-current` marks current page in navigation

## Motion & Animation

- [ ] Animations respect `prefers-reduced-motion`
- [ ] No auto-playing videos or animations
- [ ] Animations are not distracting
- [ ] Parallax effects are optional

## Content

- [ ] Language is clear and simple
- [ ] Abbreviations are explained
- [ ] Links have descriptive text (not "click here")
- [ ] Page purpose is clear
- [ ] Instructions are provided for complex interactions

## Testing

- [ ] Tested with keyboard only (no mouse)
- [ ] Tested with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Tested with browser zoom at 200%
- [ ] Tested with high contrast mode
- [ ] Tested with reduced motion enabled
- [ ] Tested on mobile devices

## Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM](https://webaim.org/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project](https://www.a11yproject.com/)

