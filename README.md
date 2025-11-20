# Synthetic Quota Monitor for VSCode

A VSCode extension that monitors your [Synthetic API](https://synthetic.new/) quota usage and displays it directly in the status bar with periodic updates.
Based on https://github.com/Sigmanor/vscode-chutes-quota

## ✨ Features

- **Status Bar Integration**: Shows current quota usage in format "Synthetic: 0.1/135 requests"
- **Detailed Tooltips**: Hover to see breakdown including renewal date
- **Auto-refresh**: Configurable interval (default: 5 minutes)
- **Manual Refresh**: Use the command palette to manually refresh quota data
- **Secure Token Storage**: API tokens are stored securely using VSCode's built-in secret storage

## 🚀 Setup

1. Install the extension
2. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Run the command `Synthetic Quota: Set API Token`
4. Enter your Synthetic API token when prompted (input will be hidden for security)
5. Optionally adjust the refresh interval in VSCode Settings

## ⚙️ Configuration

This extension contributes the following settings:

- `syntheticQuota.refreshInterval`: Auto-refresh interval in minutes (1-60, default: 5)

## 🔧 Commands

The extension provides the following commands accessible via Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- `Synthetic Quota: Show Details` - Display detailed quota information
- `Synthetic Quota: Refresh Data` - Manually refresh quota data
- `Synthetic Quota: Set API Token` - Securely set or update your API token
- `Synthetic Quota: Remove API Token` - Securely remove your API token and reset the extension

## 🔌 API Integration

The extension uses the Synthetic API endpoint:

- **URL**: `https://api.synthetic.new/v2/quotas`
- **Authentication**: Bearer token
- **Response**: JSON with subscription quota and usage information

**Response Format**:
```json
{
  "subscription": {
    "limit": 135,
    "requests": 0.1,
    "renewsAt": "2025-11-20T19:08:58.478Z"
  }
}
```

## 🔒 Privacy & Security

- API tokens are stored securely using VSCode's built-in secret storage (encrypted)
- Tokens are never stored in plain text in settings or configuration files
- The extension only communicates with the Synthetic API using your provided token
- No data is collected or transmitted to third parties

## 📋 Requirements

- VSCode version 1.103.0 or higher
- Valid Synthetic API token
- Internet connection for API requests