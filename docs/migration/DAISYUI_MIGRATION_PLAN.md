# DaisyUI Migration Plan: Complete shadcn/ui to DaisyUI Transition

## Overview
Complete migration from shadcn/ui to DaisyUI with pastel theme for enhanced theming capabilities, cultural aesthetics, and unified design system.

## Migration Strategy

### Phase 1: Foundation Setup (1-2 hours)
1. **Install DaisyUI**
   - Add DaisyUI to tailwind.config.ts
   - Configure pastel theme as default
   - Add theme switching capabilities

2. **Update Tailwind Configuration**
   - Enable DaisyUI components
   - Set pastel as primary theme
   - Configure custom Vedic color extensions

3. **Create DaisyUI Component Wrappers**
   - Build React wrappers for DaisyUI classes
   - Maintain TypeScript support
   - Preserve existing component APIs

### Phase 2: Component Migration (4-6 hours)

#### Direct Replacements (Low Risk)
- `Button` → DaisyUI `btn` classes
- `Card` → DaisyUI `card` classes
- `Badge` → DaisyUI `badge` classes
- `Input` → DaisyUI `input` classes
- `Tabs` → DaisyUI `tabs` classes
- `Progress` → DaisyUI `progress` classes
- `Loading` → DaisyUI `loading` classes

#### Custom Implementations (Medium Risk)
- `Dialog/Modal` → DaisyUI `modal` + React portal logic
- `Toast` → DaisyUI `toast` + notification system
- `Form` components → DaisyUI form classes + React Hook Form
- `Select` → DaisyUI `select` + custom dropdown logic

#### Complex Components (Preserve)
- `RichTextEditor` → Keep TipTap integration, apply DaisyUI styling
- `ErrorBoundary` → React-specific, apply DaisyUI error styling
- Audio components → Custom components with DaisyUI base classes

### Phase 3: Application-Specific Migration (2-3 hours)

#### Core Application Files
1. **ChapterEditor Components**
   - ContentTab: Replace cards, buttons, inputs
   - AudioMappingTab: Apply DaisyUI to controls
   - SegmentationTab: Update segment cards and buttons
   - ChapterHeader: Replace navigation and action buttons

2. **Dashboard Components**
   - SimpleDashboard: Update track cards and navigation
   - AdminPanel: Replace admin controls and tables
   - Landing: Update hero section and call-to-action buttons

3. **Common Components**
   - Navigation: Replace with DaisyUI navbar
   - ScriptSelector: Update with DaisyUI radio/tabs
   - LinkStatusIcon: Apply DaisyUI icon styling

### Phase 4: Theme Customization (1-2 hours)

#### Vedic LMS Custom Theme
- Extend pastel theme with Vedic colors
- Add saffron accent colors
- Configure typography for multi-script content
- Implement cultural design tokens

## Detailed Component Mapping

### Button Migration
**Before (shadcn/ui):**
```tsx
<Button variant="default" size="lg" onClick={handleClick}>
  Create Chapter
</Button>
```

**After (DaisyUI):**
```tsx
<button className="btn btn-primary btn-lg" onClick={handleClick}>
  Create Chapter
</button>
```

### Card Migration
**Before (shadcn/ui):**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Chapter Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

**After (DaisyUI):**
```tsx
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Chapter Title</h2>
    <p>Content here</p>
  </div>
</div>
```

### Form Migration
**Before (shadcn/ui):**
```tsx
<Form {...form}>
  <FormField
    control={form.control}
    name="title"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Title</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
      </FormItem>
    )}
  />
</Form>
```

**After (DaisyUI):**
```tsx
<form>
  <div className="form-control w-full max-w-xs">
    <label className="label">
      <span className="label-text">Title</span>
    </label>
    <input 
      type="text" 
      className="input input-bordered w-full max-w-xs" 
      {...register("title")}
    />
  </div>
</form>
```

## File Impact Analysis

### High Priority Files (Must Change)
1. `client/src/components/ui/` - All shadcn/ui components
2. `client/src/components/chapter-editor/` - Core editing interface
3. `client/src/components/SimpleDashboard.tsx` - Main dashboard
4. `client/src/pages/` - All page components
5. `tailwind.config.ts` - Configuration update

### Medium Priority Files (Styling Updates)
1. All component files using shadcn/ui imports
2. Custom CSS files with component-specific styling
3. Theme-related configurations

### Low Priority Files (Minimal Changes)
1. Server-side files (no changes needed)
2. Utility functions (minimal styling impact)
3. Database and API layers (no changes needed)

## Theme Configuration

### Pastel Theme Setup
```typescript
// tailwind.config.ts
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Custom Vedic extensions to pastel theme
      colors: {
        'vedic-saffron': '#FF9933',
        'vedic-gold': '#FFD700',
        'vedic-earth': '#8B4513',
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        vedic_pastel: {
          ...require("daisyui/src/colors/themes")["pastel"],
          primary: "#FF9933", // Saffron
          secondary: "#FFD700", // Gold
          accent: "#8B4513", // Earth
        }
      },
      "pastel",
      "dark"
    ],
    base: true,
    styled: true,
    utils: true,
  },
}
```

## Risk Assessment

### Low Risk (90% confidence)
- Basic component replacements (buttons, cards, inputs)
- Theme configuration and setup
- Typography and spacing updates

### Medium Risk (75% confidence)
- Complex form interactions
- Modal and dialog behavior
- Animation and transition effects

### High Risk (60% confidence)
- Rich text editor integration
- Audio player component styling
- Complex state management components

## Rollback Strategy

### Immediate Rollback (if needed)
1. Revert tailwind.config.ts changes
2. Restore shadcn/ui imports
3. Keep migration branch for later attempt

### Gradual Rollback (component-by-component)
1. Selective reversion of problematic components
2. Hybrid approach for complex components
3. Progressive migration over time

## Success Metrics

### Technical Success
- All existing functionality preserved
- Improved theme consistency
- Reduced bundle size
- Better performance metrics

### User Experience Success
- Enhanced visual consistency
- Better accessibility scores
- Improved mobile responsiveness
- Cultural aesthetic alignment

### Developer Experience Success
- Faster component development
- Simplified styling workflow
- Better theme management
- Reduced CSS maintenance

## Estimated Timeline

### Aggressive Timeline (1-2 days focused work)
- Day 1: Setup, basic components, core interface
- Day 2: Complex components, polish, testing

### Conservative Timeline (3-5 days gradual work)
- Day 1: Setup and planning
- Day 2-3: Systematic component migration
- Day 4: Testing and refinement
- Day 5: Polish and theme customization

## Next Steps

1. **User Approval**: Confirm migration approach and timeline
2. **Backup Creation**: Create comprehensive rollback point
3. **Implementation**: Execute migration plan systematically
4. **Testing**: Verify all functionality preserved
5. **Theme Customization**: Implement Vedic-specific enhancements