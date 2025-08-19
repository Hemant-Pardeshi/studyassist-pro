# Chrome Extension CI/CD

This directory contains GitHub Actions workflows for the Student Study Helper Chrome extension.

## Workflows

### 1. CI/CD Pipeline (`ci.yml`)
**Triggers:** Push to main/develop, Pull requests to main

**What it does:**
- ✅ Lints JavaScript files with ESLint
- ✅ Validates manifest.json syntax
- ✅ Runs Chrome extension validation
- ✅ Performs security scanning
- ✅ Checks file sizes and permissions
- ✅ Runs basic functionality tests

### 2. Build and Package (`build.yml`)
**Triggers:** Push to main, Tags (v*), Manual dispatch

**What it does:**
- 📦 Creates production-ready extension package
- 🗜️ Minifies JavaScript and CSS files
- 🔍 Validates the built extension
- 📊 Generates package information
- ⬆️ Uploads build artifacts
- 🛡️ Performs security scan on built files

### 3. Release (`release.yml`)
**Triggers:** Version tags (v*), Manual dispatch

**What it does:**
- 🚀 Creates GitHub releases
- 📝 Generates changelog automatically
- 📋 Updates manifest version
- 📦 Creates release packages
- 🏪 Prepares Chrome Web Store assets
- 📄 Generates store descriptions

## Usage

### Triggering Builds

#### Automatic Triggers
- **Push to main/develop** → Runs CI/CD pipeline
- **Create pull request** → Runs CI/CD pipeline
- **Push tags like v1.0.1** → Creates release

#### Manual Triggers
```bash
# Trigger any workflow manually
gh workflow run "workflow-name.yml"

# Create a release
git tag v1.0.1
git push origin v1.0.1

# Manual release with custom version
gh workflow run release.yml -f version=v1.0.2
```

### Viewing Results

#### GitHub Interface
1. Go to your repository
2. Click "Actions" tab
3. Select a workflow run to see details

#### Command Line
```bash
# List recent workflow runs
gh run list

# View specific run details
gh run view <run-id>

# Download artifacts
gh run download <run-id>
```

## Artifacts Produced

### CI Pipeline
- Lint reports
- Test results
- Security scan results

### Build Pipeline
- `extension.zip` - Ready for Chrome Web Store
- `chrome-extension-TIMESTAMP.zip` - Timestamped build
- `package-info.md` - Build metadata
- Security report

### Release Pipeline
- `student-study-helper-vX.X.X.zip` - Release package
- Changelog
- Chrome Web Store assets
- Release notes

## Configuration

### Required Secrets
For full functionality, add these secrets to your repository:

```bash
# For Chrome Web Store publishing (optional)
CHROME_EXTENSION_ID=your-extension-id
CHROME_CLIENT_ID=your-client-id
CHROME_CLIENT_SECRET=your-client-secret
CHROME_REFRESH_TOKEN=your-refresh-token
```

### Customization

#### Modify Build Process
Edit `.github/workflows/build.yml`:
- Change minification settings
- Add/remove files from package
- Modify security checks

#### Change Release Process
Edit `.github/workflows/release.yml`:
- Customize changelog generation
- Modify version bump strategy
- Add deployment steps

#### Adjust CI Checks
Edit `.github/workflows/ci.yml`:
- Add more lint rules
- Include additional tests
- Change file size limits

## Best Practices

### Version Management
- Use semantic versioning (v1.0.0, v1.0.1, etc.)
- Tag releases consistently
- Update manifest.json version manually before tagging

### Security
- Review all security scan results
- Keep dependencies updated
- Monitor for sensitive data in code

### Performance
- Monitor build artifact sizes
- Check extension load time
- Test on various websites

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check workflow logs
gh run view --log

# Re-run failed jobs
gh run rerun <run-id>
```

#### Permission Errors
- Ensure repository has Actions enabled
- Check if workflows have proper permissions
- Verify GITHUB_TOKEN has necessary scopes

#### Large File Warnings
- Optimize images in icons/ directory
- Minify JavaScript/CSS files
- Remove unnecessary files from build

### Getting Help

1. Check workflow logs in GitHub Actions tab
2. Review this documentation
3. Check GitHub Actions documentation
4. Create an issue in the repository
