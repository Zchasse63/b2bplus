# B2B+ Design System Guide

This guide provides comprehensive documentation for using the B2B+ design system components and patterns.

## Quick Start

### Importing Components

```typescript
import {
  Button,
  Card,
  Input,
  Badge,
  Alert,
  PageTitle,
  SectionTitle,
  BodyText,
  PageShell,
  DashboardShell,
  FormField,
  FieldGroup,
} from '@/components/b2b';
```

## Component Library

### Layout Components

#### PageShell
Standardizes page layout with consistent max-width, padding, and background.

```typescript
<PageShell maxWidth="xl" padding="lg" background="white">
  <PageTitle>My Page</PageTitle>
  {/* content */}
</PageShell>
```

#### DashboardShell
Optimized for dashboard/admin layouts with sensible defaults.

```typescript
<DashboardShell maxWidth="2xl" padding="lg" background="gray">
  {/* dashboard content */}
</DashboardShell>
```

### Typography Components

- **PageTitle** (H1): Main page heading
- **SectionTitle** (H2): Section heading
- **SubsectionTitle** (H3): Subsection heading
- **CardTitle** (H4): Card heading
- **BodyText**: Regular body text
- **BodyTextSmall**: Smaller body text
- **Caption**: Small caption text
- **LabelText**: Form label text
- **HelperText**: Helper/hint text

### Form Components

#### FormField
Wraps form inputs with label, error, and helper text.

```typescript
<FormField label="Email" error={error} helper="Enter your email" required>
  <Input type="email" />
</FormField>
```

#### FieldGroup
Groups multiple form fields in a responsive grid.

```typescript
<FieldGroup columns={2}>
  <FormField label="First Name">
    <Input />
  </FormField>
  <FormField label="Last Name">
    <Input />
  </FormField>
</FieldGroup>
```

### Interactive Components

#### Button
Primary interactive element with multiple variants.

```typescript
<Button variant="primary" size="md">Click me</Button>
<Button variant="outline" size="sm">Secondary</Button>
```

#### Alert
Semantic alert component with variants.

```typescript
<Alert variant="success" title="Success!" description="Operation completed" />
<Alert variant="error" title="Error" description="Something went wrong" />
```

#### CommandPalette
Quick access to actions and navigation (⌘K).

```typescript
<CommandPalette items={commandItems} />
```

### Feedback Components

#### PresenceIndicator
Shows real-time presence of users.

```typescript
<PresenceIndicator users={activeUsers} />
```

#### PersonalizedNavigation
AI-driven navigation suggestions.

```typescript
<PersonalizedNavigation suggestions={suggestions} />
```

## Accessibility Checklist

- [ ] All interactive elements have proper focus states
- [ ] Color is not the only indicator of state
- [ ] All images have alt text
- [ ] Form fields have associated labels
- [ ] Headings follow semantic hierarchy (h1 → h2 → h3)
- [ ] Links are distinguishable from regular text
- [ ] Keyboard navigation works throughout the page
- [ ] Skip link is present and functional
- [ ] ARIA attributes are used correctly
- [ ] Reduced motion preferences are respected

## Patterns

### Empty State
Use EmptyState component for empty lists/views.

```typescript
<EmptyState
  icon={InboxIcon}
  title="No items"
  description="Create your first item to get started"
  action={{ label: 'Create', onClick: () => {} }}
/>
```

### Loading State
Use Skeleton components or loading spinners.

### Error Handling
Use Alert component with error variant.

### Success Feedback
Use Alert component with success variant.

## Best Practices

1. **Use semantic HTML**: Always use proper heading levels and semantic elements
2. **Consistent spacing**: Use Tailwind spacing scale (4px, 8px, 12px, etc.)
3. **Color tokens**: Always use B2B color tokens, never hardcode colors
4. **Focus states**: All interactive elements must have visible focus states
5. **Responsive design**: Test on mobile, tablet, and desktop
6. **Performance**: Lazy load images and heavy components
7. **Testing**: Test with keyboard navigation and screen readers

## Resources

- [Design Tokens](./DESIGN_TOKENS.md)
- [UI/UX Audit](./ui-ux-audit-b2b-plus.md)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref)

