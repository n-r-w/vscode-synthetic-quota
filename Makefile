# VSCode Extension Publishing Makefile
# This Makefile provides targets for packaging and publishing the VSCode extension

.PHONY: help clean package publish login version-patch version-minor version-major install-deps

# Default target
help:
	@echo "VSCode Extension Publishing Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  help           - Show this help message"
	@echo "  install-deps   - Install dependencies including vsce"
	@echo "  clean          - Clean build artifacts"
	@echo "  package        - Package extension into VSIX file"
	@echo "  publish        - Publish extension to marketplace"
	@echo "  login          - Login to marketplace with publisher token"
	@echo "  version-patch  - Increment patch version (x.x.X)"
	@echo "  version-minor  - Increment minor version (x.X.x)"
	@echo "  version-major  - Increment major version (X.x.x)"
	@echo ""
	@echo "Examples:"
	@echo "  make install-deps  # Install dependencies"
	@echo "  make package       # Create VSIX package"
	@echo "  make publish       # Publish to marketplace"
	@echo "  make version-patch # Bump patch version and publish"

# Install dependencies
install-deps:
	@echo "Installing dependencies..."
	npm install
	npm install -g vsce

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf build/
	rm -rf dist/
	rm -rf out/

# Package extension into VSIX file
package:
	@echo "Packaging extension..."
	npm run compile
	npm run package-vsix
	@echo "Extension packaged successfully!"

# Publish extension to marketplace
publish: package
	@echo "Publishing extension to marketplace..."
	vsce publish
	@echo "Extension published successfully!"

# Login to marketplace
login:
	@echo "Logging in to marketplace..."
	@echo "Please have your Personal Access Token ready from:"
	@echo "https://marketplace.visualstudio.com/manage"
	vsce login $(shell node -p "require('./package.json').publisher")

# Version management targets
version-patch:
	@echo "Incrementing patch version..."
	npm version patch
	@echo "Version bumped to $(shell node -p "require('./package.json').version")"
	@echo "Run 'make publish' to publish the new version"

version-minor:
	@echo "Incrementing minor version..."
	npm version minor
	@echo "Version bumped to $(shell node -p "require('./package.json').version")"
	@echo "Run 'make publish' to publish the new version"

version-major:
	@echo "Incrementing major version..."
	npm version major
	@echo "Version bumped to $(shell node -p "require('./package.json').version")"
	@echo "Run 'make publish' to publish the new version"

# Combined targets for convenience
publish-patch: version-patch publish
	@echo "Patch version published successfully!"

publish-minor: version-minor publish
	@echo "Minor version published successfully!"

publish-major: version-major publish
	@echo "Major version published successfully!"