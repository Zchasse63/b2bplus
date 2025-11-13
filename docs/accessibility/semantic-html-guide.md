# Semantic HTML Guide

## Overview

Semantic HTML uses meaningful tags that describe the content they contain. This improves accessibility, SEO, and code maintainability.

## Landmark Elements

### Main Content
```html
<main>
  <!-- Primary content of the page -->
</main>
```

### Navigation
```html
<nav>
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>
```

### Header
```html
<header>
  <h1>Site Title</h1>
  <nav><!-- Navigation --></nav>
</header>
```

### Footer
```html
<footer>
  <p>&copy; 2024 B2B Plus</p>
</footer>
```

### Aside (Sidebar)
```html
<aside>
  <!-- Related content, sidebars -->
</aside>
```

## Content Sections

### Article
```html
<article>
  <h2>Article Title</h2>
  <p>Article content...</p>
</article>
```

### Section
```html
<section>
  <h2>Section Title</h2>
  <p>Section content...</p>
</section>
```

## Headings

Use proper heading hierarchy (h1 → h2 → h3, etc.):

```html
<h1>Page Title</h1>
<h2>Main Section</h2>
<h3>Subsection</h3>
<h4>Sub-subsection</h4>
```

**Rules:**
- Only one `<h1>` per page
- Don't skip heading levels
- Use headings for structure, not styling

## Lists

### Unordered List
```html
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
```

### Ordered List
```html
<ol>
  <li>First step</li>
  <li>Second step</li>
</ol>
```

### Description List
```html
<dl>
  <dt>Term</dt>
  <dd>Definition</dd>
</dl>
```

## Text Formatting

### Strong (Important)
```html
<strong>Important text</strong>
```

### Emphasis
```html
<em>Emphasized text</em>
```

### Code
```html
<code>const x = 5;</code>
```

### Preformatted Text
```html
<pre><code>
function example() {
  return true;
}
</code></pre>
```

## Forms

### Form Structure
```html
<form>
  <fieldset>
    <legend>Personal Information</legend>
    
    <label for="name">Name:</label>
    <input type="text" id="name" name="name" required>
    
    <label for="email">Email:</label>
    <input type="email" id="email" name="email" required>
  </fieldset>
  
  <button type="submit">Submit</button>
</form>
```

## Tables

### Proper Table Structure
```html
<table>
  <caption>Sales Data</caption>
  <thead>
    <tr>
      <th scope="col">Month</th>
      <th scope="col">Sales</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>January</td>
      <td>$10,000</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <th scope="row">Total</th>
      <td>$50,000</td>
    </tr>
  </tfoot>
</table>
```

## Images

### Proper Image Usage
```html
<!-- Decorative image -->
<img src="decoration.png" alt="" aria-hidden="true">

<!-- Informative image -->
<img src="chart.png" alt="Sales chart showing 50% growth">

<!-- Image with caption -->
<figure>
  <img src="photo.jpg" alt="Team photo">
  <figcaption>Our team at the conference</figcaption>
</figure>
```

## Links

### Meaningful Link Text
```html
<!-- Good -->
<a href="/about">Learn more about our company</a>

<!-- Bad -->
<a href="/about">Click here</a>
```

## Buttons vs Links

### Use `<button>` for Actions
```html
<button type="button">Delete</button>
<button type="submit">Submit Form</button>
```

### Use `<a>` for Navigation
```html
<a href="/products">View Products</a>
```

## ARIA Attributes

### When to Use ARIA

Use ARIA when semantic HTML isn't sufficient:

```html
<!-- Custom button -->
<div role="button" tabindex="0" aria-label="Close menu">
  ✕
</div>

<!-- Live region -->
<div aria-live="polite" aria-atomic="true">
  Loading...
</div>

<!-- Hidden from screen readers -->
<span aria-hidden="true">→</span>
```

## Best Practices

1. **Use semantic elements first** - Only use ARIA when necessary
2. **Maintain heading hierarchy** - Don't skip levels
3. **Use labels for form inputs** - Always associate labels with inputs
4. **Provide alt text for images** - Describe the content, not "image of"
5. **Use meaningful link text** - Avoid "click here"
6. **Test with screen readers** - Use NVDA, JAWS, or VoiceOver
7. **Keyboard navigation** - Ensure all functionality is keyboard accessible
8. **Color contrast** - Maintain 4.5:1 ratio for normal text

## Testing

### Automated Tools
- axe DevTools
- WAVE
- Lighthouse
- Pa11y

### Manual Testing
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader testing
- Color contrast verification
- Heading hierarchy check

## Resources

- [MDN: Semantic HTML](https://developer.mozilla.org/en-US/docs/Glossary/Semantic_HTML)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

