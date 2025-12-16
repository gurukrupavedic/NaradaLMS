# Documentation Placement Guide

This guide provides clear criteria for determining where to place new documentation in the docs folder structure.

## **Decision Tree for Document Placement**

### **Is this a major technical decision that affects system architecture?**
**YES** → Place in `architecture/ADR-XXX-Title.md`

**Examples:**
- Authentication strategy choices
- Database schema design decisions
- API architecture patterns
- Technology stack selections
- Code organization strategies

**Format:** Follow ADR template with Date, Status, Decision, Rationale, Consequences

---

### **Is this a step-by-step guide for implementing a planned feature?**
**YES** → Place in `implementation/TODO-Feature-Name.md`

**Examples:**
- User authentication implementation
- New feature development guides
- Migration procedures
- Integration step-by-step instructions

**Format:** Phases, timelines, code examples, testing procedures

---

### **Is this about fixing a bug or resolving a technical issue?**
**YES** → Place in `troubleshooting/issue-description.md`

**Examples:**
- Text corruption fixes
- Performance issue resolutions
- Integration problems
- Database migration issues

**Format:** Problem statement, root cause, solution, verification steps

---

### **Is this a specification for a new feature or capability?**
**YES** → Place in `features/feature-name.md`

**Examples:**
- Error detection systems
- User interface specifications
- API endpoint designs
- New workflow definitions

**Format:** Requirements, technical specs, implementation considerations

---

### **Is this a complete system restoration procedure?**
**YES** → Place in `rollback/FEATURE_ROLLBACK_POINT.md`

**Examples:**
- Pre-deployment snapshots
- Major change rollback procedures
- Emergency recovery instructions
- Component migration rollbacks

**Format:** Current state, rollback instructions, verification checklist

---

### **Is this documentation of a deprecated or historical approach?**  
**YES** → Place in `deprecated-ideas/feature-analysis.md`

**Examples:**
- Abandoned implementation approaches
- Previous UI designs
- Legacy feature documentation
- Alternative solutions that were rejected

**Format:** Historical implementation, deprecation rationale, restoration guide if needed

---

## **Special Cases**

### **Planning Documents (Future Use)**
Place in `planning/` for documents that don't fit other categories but are needed for future reference.

### **API Documentation (Future Use)**
Place in `api/` when API documentation becomes extensive enough to warrant separation.

### **Deployment Documentation (Future Use)**  
Place in `deployment/` for deployment-specific guides and procedures.

## **Naming Conventions**

### **Architecture Decision Records (ADRs)**
Format: `ADR-XXX-Title-With-Hyphens.md`
- Use sequential numbering (001, 002, 003...)
- Keep titles concise but descriptive
- Use hyphens for word separation

### **Implementation Guides**
Format: `TODO-Feature-Name.md`
- Start with "TODO-" prefix for clarity
- Use feature or component name
- Keep focused on single implementation

### **Troubleshooting Documents**
Format: `issue-description.md`
- Use descriptive issue name
- Avoid technical jargon in filename
- Focus on problem being solved

### **Feature Documentation**
Format: `feature-name.md`
- Use clear feature identifier
- Avoid versioning in filename
- Keep name stable across iterations

### **Rollback Points**
Format: `FEATURE_ROLLBACK_POINT.md`
- Use ALL_CAPS with underscores
- Include "ROLLBACK_POINT" suffix
- Reference feature or change being rolled back

### **Historical Documentation**
Format: `feature-analysis.md` or `feature-restoration-guide.md`
- Use descriptive approach name
- Include "analysis" or "guide" suffix for clarity
- Maintain historical context in naming

## **Quality Checklist**

Before creating any documentation, ensure:

- [ ] **Clear Purpose**: Document has single, well-defined purpose
- [ ] **Correct Placement**: Follows decision tree above
- [ ] **Proper Naming**: Follows naming conventions
- [ ] **Complete Content**: Includes all required sections for document type
- [ ] **Cross-References**: Links to related documents where appropriate
- [ ] **Maintenance Info**: Includes creation date and owner information

## **Examples of Good vs Poor Placement**

### **Good Examples**
- `architecture/ADR-001-Authentication-Integration-Strategy.md` - Clear architectural decision
- `implementation/TODO-Authentication-Integration.md` - Step-by-step implementation guide
- `troubleshooting/text-segmentation-selection-time-normalization.md` - Specific technical fix
- `rollback/PROGRESSIVE_MAPPING_ROLLBACK_POINT.md` - Complete rollback procedure

### **Poor Examples** (What to Avoid)
- `misc/random-notes.md` - Unclear purpose and placement
- `temp/quick-fix.md` - Temporary documents in wrong location
- `docs/everything-about-feature.md` - Mixed purposes in single document
- `random-rollback.md` - Important rollback info in wrong location

---

**Use this guide every time you create new documentation to maintain consistent organization.**