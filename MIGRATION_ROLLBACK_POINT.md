# MIGRATION ROLLBACK POINT v3.3 - VISUAL FIDELITY GUARANTEED
*Created: January 20, 2025 | Final Plan with Visual Exactness Requirements*

## Pre-Migration State Documentation

This document serves as a rollback reference point before executing the experimental-to-production migration for Text Segmentation and Audio Mapping tabs.

### Current Working State
- ✅ ChapterEditor has 3 tabs: Text Content | Media Content | Segment & Map
- ✅ Experimental components work in Experiment1_SegmentationStudio
- ✅ All backend APIs functional for audio files
- ✅ Production database integration stable

### Files That Will Be Modified

#### Files to be MOVED (preserve originals until migration confirmed working):
- `shared/hooks/experiment1/useAudioPlayer.ts` → `shared/hooks/useAudioPlayer.ts`
- `shared/experiment1-utils.ts` → `shared/utils/text-utils.ts`
- `shared/experiment1-types.ts` → `shared/text-segmentation-types.ts`

#### Files to be COPIED (originals preserved):
- `client/src/components/experiment1/Experiment1_AnnotationLayer.tsx` → `client/src/components/text-segmentation/AnnotationLayer.tsx`
- `client/src/components/experiment1/Experiment1_ProgressiveMapper.tsx` → `client/src/components/audio-mapping/ProgressiveMapper.tsx`
- Supporting components: `SegmentPanel.tsx`, `LanguageSelector.tsx`, etc.

#### Files to be MODIFIED:
- `client/src/pages/ChapterEditor.tsx` (add 2 new tabs, disable 1 old tab)

### Migration Plan Summary
1. Move experimental utilities to production structure
2. Copy and clean experimental components 
3. Create audio URL adapter function
4. Update ChapterEditor to use 4 tabs instead of 3
5. Test compilation and basic functionality

### Rollback Instructions
If migration fails or issues arise:

1. **Restore Original Files**:
   - Delete any moved files from new locations
   - Restore original experimental files if moved
   - Revert ChapterEditor.tsx to current state

2. **Verification Steps**:
   - Confirm ChapterEditor loads with original 3 tabs
   - Verify Experiment1_SegmentationStudio still works
   - Test audio file upload/selection in both interfaces

3. **Safe State Check**:
   - All experimental functionality preserved
   - Production ChapterEditor unchanged
   - No data loss or backend changes

### Current File State (Pre-Migration v3.3)
**Critical Files That Will Be Modified/Moved:**
- `client/src/pages/ChapterEditor.tsx` - Current 3-tab structure (Text Content | Media Content | Segment & Map)
- `shared/hooks/experiment1/useAudioPlayer.ts` - Will be moved to `shared/hooks/useAudioPlayer.ts`
- `shared/experiment1-utils.ts` - Will be moved to `shared/utils/text-utils.ts`
- `shared/experiment1-types.ts` - Will be moved to `shared/types/text-segmentation.ts`
- `shared/components/experiment1/icons/` - Will be moved to `shared/components/icons/`
- All 11 components in `client/src/components/experiment1/` - Will be copied to production locations

**Experimental Interface Status**: ✅ Fully functional at time of rollback point creation
**Production Interface Status**: ✅ ChapterEditor working with 3 tabs
**Database Status**: ✅ All APIs functional, no schema changes planned

**Emergency Rollback Protocol:**
1. Revert all moved/copied files to original locations
2. Restore ChapterEditor.tsx to 3-tab structure
3. Verify experimental interface still works
4. Verify production interface restored to working state

**Visual Reference Screenshots Required:**
- Text Segmentation tab in experimental interface
- Audio Mapping tab in experimental interface  
- Current ChapterEditor 3-tab layout

### Known Good State
- ChapterEditor compilation: ✅ Working
- Experimental components: ✅ Working  
- Audio backend integration: ✅ Working
- Database operations: ✅ Working

### Migration Risks Acknowledged
- **Low Risk**: File moves and component copying
- **Medium Risk**: Import path updates and component integration
- **Mitigation**: Preserve all original files until testing complete

---

**ROLLBACK TRIGGER CONDITIONS (v3.3)**:
- Any TypeScript compilation errors persisting >10 minutes
- Loss of existing ChapterEditor functionality
- Any visual differences from experimental interface
- Any placeholder content required
- Performance degradation
- Console errors during normal usage

**POST-MIGRATION VERIFICATION REQUIRED**:
- [ ] ChapterEditor loads with 4 tabs without errors
- [ ] Text Segmentation tab looks EXACTLY like experimental
- [ ] Audio Mapping tab looks EXACTLY like experimental  
- [ ] All interactions feel identical to experimental
- [ ] Audio file selection works identically in new tabs
- [ ] No visual regressions from experimental version
- [ ] Original experimental interface still functional (backup)

**VISUAL FIDELITY GUARANTEE**:
Migration only succeeds when tabs are visually and functionally IDENTICAL to experimental counterparts.

*This rollback point ensures perfect restoration if visual exactness cannot be achieved.*