# Contributing to UK MPA Dashboard

Thank you for your interest in contributing! This document outlines standards for maintaining professional code quality.

---

## 🎯 Our Standards

We maintain this repository to professional software development standards:
- **Clear communication** through code and documentation
- **Quality first** – peer-review ready code
- **Maintainability** – future developers can understand and extend the work
- **Performance** – efficient APIs and operations

---

## 🚀 Getting Started

### 1. Understand the Project

Read these files first:
- [README.md](README.md) – Project overview
- [ARCHITECTURE.md](ARCHITECTURE.md) – System design
- [DEVELOPMENT.md](DEVELOPMENT.md) – Development workflow

### 2. Set Up Locally

```bash
git clone https://github.com/KatieHales/uk-mpa-dashboard.git
cd uk-mpa-dashboard

# Start local server (Python)
python -m http.server 8000

# Visit http://localhost:8000
```

### 3. Read the Code

- Review `script.js` to understand data loading
- Check `index.html` for structure
- Examine `styles.css` for styling approach

---

## 💻 Code Standards

### JavaScript

#### Naming Conventions

```javascript
// ✅ GOOD – Clear, descriptive names
const windFarmsLayer = L.layerGroup();
const WIND_SPEED_CACHE_TTL_MS = 5 * 60 * 1000;
function fetchWindSpeed(latitude, longitude) { }

// ❌ AVOID – Unclear abbreviations
const wfl = L.layerGroup();
const TTL = 5 * 60 * 1000;
function fetch(lat, lng) { }
```

#### Function Documentation

Every function should have a clear header comment:

```javascript
/**
 * Converts Degrees/Minutes/Seconds coordinate format to decimal degrees
 * 
 * @param {string} value - Coordinate string (e.g., "53°59′00″N 3°17′00″W")
 * @returns {number|null} Decimal degree value or null if invalid
 * 
 * @example
 * parseDMS("53°59′00″N") // Returns 53.98333...
 */
function parseDMS(value) {
    // Implementation...
}
```

#### Comments – Explain Why, Not What

```javascript
// ✅ GOOD – Explains the reasoning
// Round to 3 decimal places to match typical API precision
// and reduce cache key cardinality
const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;

// ❌ AVOID – Just restates the code
// Round latitude to 3 decimal places
const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
```

#### Error Handling

Always handle errors gracefully:

```javascript
// ✅ GOOD – Handles errors with fallback
async function fetchWindSpeed(lat, lng) {
    try {
        const response = await fetch(url);
        if (!response.ok) return 'N/A';
        
        const data = await response.json();
        const speed = data?.current?.wind_speed_10m;
        
        if (speed !== null && !isNaN(speed)) {
            return `${speed.toFixed(1)} m/s`;
        }
    } catch (error) {
        console.error('Wind speed fetch failed:', error);
    }
    return 'N/A';
}

// ❌ AVOID – Silent failures
async function fetchWindSpeed(lat, lng) {
    const response = await fetch(url);
    const data = await response.json();
    return data.current.wind_speed_10m; // Crashes if API changes!
}
```

#### Code Organization

```javascript
// 1. Constants at top
const WIND_SPEED_CACHE_TTL_MS = 5 * 60 * 1000;
const MAP_CENTER = [54.5, -3.5];

// 2. Data structures
const windSpeedCache = new Map();

// 3. Helper functions
function parseDMS(value) { }

// 4. Main functions
async function fetchWindSpeed(lat, lng) { }

// 5. Initialization
loadCSVData();
```

### HTML

#### Semantic Structure

```html
<!-- ✅ GOOD – Semantic, accessible -->
<header class="page-header">
    <h1>UK Offshore Wind and MPA Dashboard</h1>
    <p>Description here</p>
</header>

<!-- ❌ AVOID – Non-semantic -->
<div class="header">
    <div class="title">UK Offshore Wind and MPA Dashboard</div>
</div>
```

#### Accessibility

```html
<!-- ✅ GOOD – Accessible -->
<a href="url" aria-label="Visit live dashboard">Live Dashboard</a>
<img src="map.png" alt="UK offshore wind farms">

<!-- ❌ AVOID – Not accessible -->
<a href="url">Click here</a>
<img src="map.png">
```

### CSS

#### Consistent Styling

```css
/* ✅ GOOD – Consistent conventions */
.info-control {
    background: white;
    padding: 10px;
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-radius: 5px;
}

/* ❌ AVOID – Inconsistent spacing/naming */
.info-control{
background:white;padding:10px;
border:2px solid rgba(0,0,0,.2);border-radius:5px;}
```

---

## 📝 Commit Message Standards

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation
- `style` – Code formatting
- `refactor` – Code reorganization
- `perf` – Performance
- `test` – Testing
- `chore` – Maintenance

### Examples

```
feat(api): Add wind speed caching for performance

- Implements 5-minute cache with coordinate rounding
- Prevents duplicate API calls for same location
- Reduces rate limiting risk

Closes #42
```

```
fix(parsing): Support DMS coordinate format

Previously only supported decimal coordinates.
Now handles formats like "53°59′00″N 3°17′00″W".

Closes #38
```

```
docs(readme): Update API section with examples
```

---

## 🧪 Testing Your Changes

### Before Committing

1. **Functional Testing**
   ```bash
   # Start local server
   python -m http.server 8000
   
   # Test in multiple browsers
   # Chrome, Firefox, Safari, Edge (if available)
   ```

2. **Check Console for Errors**
   - Open Developer Tools (F12)
   - Look for red error messages
   - Fix any issues

3. **Test Error Scenarios**
   - What if API is down?
   - What if CSV has bad data?
   - What if coordinates are invalid?

4. **Performance Check**
   - Monitor Network tab (F12)
   - Ensure caching is working
   - Check for unnecessary requests

### Automated Checks

```bash
# Check for common issues
grep -r "console.log" script.js  # Should be minimal
grep -r "TODO" *.js               # Document any TODOs
grep -r "FIXME" *.js              # Document any FIXMEs
```

---

## 📚 Documentation Requirements

### Update Documentation When:

- Adding new features → Update README.md
- Adding new APIs → Update API_DOCUMENTATION.md
- Changing architecture → Update ARCHITECTURE.md
- Adding development tips → Update DEVELOPMENT.md

### Example: Adding a New Feature

**1. Update README.md**
```markdown
## My New Feature

This feature does X, enabling Y.

[Link to relevant documentation]
```

**2. Add code comments**
```javascript
/**
 * My new feature description
 */
function myNewFeature() { }
```

**3. Update relevant documentation**
- API_DOCUMENTATION.md if new APIs
- ARCHITECTURE.md if system changes
- TESTING.md with test scenarios

---

## 🔍 Code Review Checklist

Before submitting (self-review minimum):

### Functionality
- [ ] Feature works as intended
- [ ] All edge cases handled
- [ ] No breaking changes to existing features
- [ ] Error scenarios tested

### Code Quality
- [ ] Follows naming conventions
- [ ] Functions have single responsibility
- [ ] Comments explain *why*, not *what*
- [ ] No dead code or commented-out code
- [ ] No `console.log()` debug statements

### Documentation
- [ ] Code comments added
- [ ] README.md updated if needed
- [ ] API_DOCUMENTATION.md updated if needed
- [ ] Commit message is clear and semantic

### Performance
- [ ] No unnecessary API calls
- [ ] Caching implemented if needed
- [ ] Client-side operations only
- [ ] No memory leaks

### Accessibility
- [ ] Works in multiple browsers
- [ ] Mobile responsive (if applicable)
- [ ] Semantic HTML used
- [ ] ARIA labels where needed

---

## 🚀 Making Your Contribution

### Step 1: Fork and Clone

```bash
git clone https://github.com/KatieHales/uk-mpa-dashboard.git
cd uk-mpa-dashboard
```

### Step 2: Create a Feature Branch

```bash
git checkout -b feature/my-new-feature
```

### Step 3: Make Changes

- Edit relevant files
- Follow code standards above
- Update documentation
- Test thoroughly

### Step 4: Commit

```bash
git add .
git commit -m "feat(scope): Clear description of changes"
```

### Step 5: Push

```bash
git push origin feature/my-new-feature
```

### Step 6: Create Pull Request

[In a team environment via GitHub UI]
- Describe changes clearly
- Reference any related issues
- Highlight testing performed

---

## 📊 Types of Contributions

### Bug Fixes
- Identify the bug
- Add test case that reproduces it
- Fix the bug
- Verify fix works
- Update documentation if needed

### Feature Additions
- Discuss in an issue first
- Follow architecture patterns
- Add comprehensive documentation
- Include error handling
- Test thoroughly

### Documentation
- Correct typos and unclear explanations
- Add examples
- Improve organization
- Link to relevant sections

### Performance Improvements
- Measure before and after
- Document the optimization
- Ensure no functionality changed
- Test across devices

---

## 💡 Tips for Success

### Write for Future Developers

Always ask:
- Can someone else understand this code?
- Will future me remember why I did this?
- Is the error message helpful if something fails?

### Keep Changes Focused

- One feature per commit
- One fix per commit
- Avoid mixing refactoring with new features

### Test Edge Cases

- Empty data
- Invalid coordinates
- API failures
- Network timeouts
- Unusual browser configurations

### Think About Performance

- How many API calls?
- Is caching needed?
- Do operations scale with data size?
- Will this work on slow networks?

### Consider Accessibility

- Do screen reader users understand the feature?
- Does it work without a mouse?
- Is color the only differentiator?
- Are error messages clear?

---

## ❓ Questions or Discussions?

Open a GitHub issue:
1. **Title**: Clear, specific description
2. **Body**: Context and what you're trying to do
3. **Labels**: Add relevant labels (bug, feature, documentation)

---

## 🎓 Learning Resources

- [JavaScript Best Practices](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [Leaflet Documentation](https://leafletjs.com/)
- [Web Accessibility](https://www.w3.org/WAI/)
- [Git Workflow](https://git-scm.com/book/en/v2)

---

## 📜 Code of Conduct

- Be respectful and inclusive
- Give credit for others' contributions
- Focus on the code, not the person
- Help new contributors learn

---

**Thank you for contributing to making this a better, more maintainable project!**

---

**Last Updated**: May 2026  
**Version**: 1.0
