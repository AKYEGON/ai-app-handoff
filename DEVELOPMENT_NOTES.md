# Development Notes

## Project Foundation

This is a professional blank app foundation created for future development and file imports.

### Design System
- **Complete semantic color tokens** defined in `src/index.css`
- **Extended Tailwind configuration** in `tailwind.config.ts`
- **HSL color format** used throughout for proper theming
- **Custom gradients, shadows, and transitions** ready for use

### Architecture Notes
- React 18 + TypeScript + Vite
- Shadcn/ui component library fully integrated
- React Router for navigation
- TanStack Query for data fetching
- Responsive design foundation

### For Future AI Assistants

#### Design System Guidelines
1. **Always use semantic tokens** - Never use direct colors like `text-white` or `bg-black`
2. **Extend the design system** - Add new tokens to `index.css` rather than inline styles
3. **Follow naming conventions** - Use the established pattern for new color variants
4. **Use HSL format** - All colors must be in HSL format for theming support

#### Component Development
- Create custom variants for shadcn components using design system tokens
- Use the established utility classes for transitions and effects
- Follow the responsive-first approach
- Keep components modular and reusable

#### File Structure
- `/src/components` - Reusable UI components
- `/src/pages` - Page-level components
- `/src/hooks` - Custom React hooks
- `/src/lib` - Utility functions and configurations

### Current State
- ✅ Design system established
- ✅ Component library configured
- ✅ Development environment ready
- ✅ Professional blank slate created
- 🔄 Ready for feature development and file imports

### Next Steps for Development
1. Import existing files to GitHub repo
2. Analyze imported code structure
3. Integrate with established design system
4. Extend functionality as needed
5. Maintain design consistency

---

**Note**: This foundation prioritizes maintainability, scalability, and design consistency. All future development should build upon these established patterns.