import * as vscode from 'vscode';
import axios, { AxiosError } from 'axios';

// Interface for the API response
interface SyntheticQuotaResponse {
	subscription: {
		limit: number;
		requests: number;
		renewsAt: string;
	};
}

// Interface for extension configuration
interface SyntheticQuotaConfig {
	refreshInterval: number;
}

// Main quota monitoring class
class SyntheticQuotaMonitor {
	private statusBarItem: vscode.StatusBarItem;
	private refreshTimer?: NodeJS.Timeout;
	private isRefreshing = false;
	private cachedLimit: number | null = null;
	private cachedRequests: number | null = null;
	private cachedRenewsAt: string | null = null;
	private lastSuccessfulUpdate: Date | null = null;
	private cachedTooltip: string | undefined = undefined;

	constructor(private context: vscode.ExtensionContext) {
		// Create status bar items
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100
		);
		// Command will be set dynamically based on state
		this.updateStatusBarCommand();
		this.statusBarItem.show();
		
		  // Initial load
		  this.updateQuota();
		  this.setupAutoRefresh();
		
		// Register commands
		this.registerCommands();
		
		// Listen for configuration changes
		vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
			if (event.affectsConfiguration('syntheticQuota')) {
				this.setupAutoRefresh();
				this.updateQuota();
			}
		});
	}

	private registerCommands(): void {
		const showDetailsCommand = vscode.commands.registerCommand('synthetic-quota.showDetails', () => {
			this.showQuotaDetails();
		});

		const refreshCommand = vscode.commands.registerCommand('synthetic-quota.refresh', () => {
			this.updateQuota();
		});

	   const setTokenCommand = vscode.commands.registerCommand('synthetic-quota.setApiToken', () => {
	     this.promptForApiToken();
	   });

	    const removeTokenCommand = vscode.commands.registerCommand('synthetic-quota.removeApiToken', () => {
	      this.promptForTokenRemoval();
	    });

	 const openSettingsCommand = vscode.commands.registerCommand('synthetic-quota.openSettings', () => {
	  vscode.commands.executeCommand('workbench.action.openSettings', '@ext:nrw.vscode-synthetic-quota');
	 });

	   this.context.subscriptions.push(showDetailsCommand, refreshCommand, setTokenCommand, removeTokenCommand, openSettingsCommand);
	}

	private getConfiguration(): SyntheticQuotaConfig {
		const config = vscode.workspace.getConfiguration('syntheticQuota');
	   return {
			refreshInterval: config.get<number>('refreshInterval', 5)
		};
	}

  private async getApiToken(): Promise<string> {
    return await this.context.secrets.get('syntheticQuota.apiToken') || '';
  }

  private async setApiToken(token: string): Promise<void> {
    await this.context.secrets.store('syntheticQuota.apiToken', token);
  }

  private async removeApiToken(): Promise<void> {
    await this.context.secrets.delete('syntheticQuota.apiToken');
    // Clear cached data
    this.cachedLimit = null;
    this.cachedRequests = null;
    this.cachedRenewsAt = null;
    this.lastSuccessfulUpdate = null;
  }

  private async promptForApiToken(): Promise<void> {
    const currentToken = await this.getApiToken();
    const placeholder = currentToken ? 'Enter new API token to replace existing' : 'Enter your Synthetic API token';

    const token = await vscode.window.showInputBox({
      prompt: 'Enter your Synthetic API token',
      placeHolder: placeholder,
      password: true, // Hide the input
      ignoreFocusOut: true,
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'API token cannot be empty';
        }
        if (value.length < 10) {
          return 'API token seems too short';
        }
        return null;
      }
    });

    if (token !== undefined) {
      await this.setApiToken(token.trim());
      vscode.window.showInformationMessage('API token has been saved securely.');

      // Refresh quota after setting new token
      this.updateQuota();
    }
  }

  private async promptForTokenRemoval(): Promise<void> {
    const currentToken = await this.getApiToken();
    
    // Check if there's actually a token to remove
    if (!currentToken) {
      vscode.window.showInformationMessage('No API token is currently configured.');
      return;
    }

    const result = await vscode.window.showWarningMessage(
      'Are you sure you want to remove your Synthetic API token? This will clear your authentication and reset the extension to the setup required state.',
      { modal: true },
      'Remove Token',
      'Cancel'
    );

    if (result === 'Remove Token') {
      await this.removeApiToken();
      vscode.window.showInformationMessage('API token has been removed successfully.');

      // Update status bar to show setup required
      this.statusBarItem.text = '$(warning) Synthetic: Setup Required';
      this.setTooltip('Click to configure your Synthetic API token');
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.updateStatusBarCommand();
    }
  }


	private setupAutoRefresh(): void {
		// Clear existing timer
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
		}

		const config = this.getConfiguration();
		const intervalMs = config.refreshInterval * 60 * 1000; // Convert minutes to milliseconds

		this.refreshTimer = setInterval(() => {
			this.updateQuota();
		}, intervalMs);
	}

	private async updateQuota(): Promise<void> {
		if (this.isRefreshing) {
			return; // Prevent concurrent requests
		}

		const config = this.getConfiguration();
    const apiToken = await this.getApiToken();
		
    if (!apiToken.trim()) {
   this.statusBarItem.text = '$(warning) Synthetic: Setup Required';
   this.setTooltip('Click to configure your Synthetic API token');
   this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
   this.updateStatusBarCommand();
   return;
  }

		
				this.isRefreshing = true;
				// Show cached data with refresh indicator if available, otherwise show loading
				if (this.hasCachedData()) {
					this.showCachedDataWithRefreshIndicator();
				} else {
          // Use a non-animated icon for initial loading to make updates less intrusive
          this.statusBarItem.text = '$(pulse) Synthetic: Loading...';
					this.setTooltip('Fetching quota information...');
					this.statusBarItem.backgroundColor = undefined;
					this.updateStatusBarCommand();
				}
		try {
			const response = await axios.get<SyntheticQuotaResponse>(
				'https://api.synthetic.new/v2/quotas',
				{
					headers: {
			         'Authorization': `Bearer ${apiToken}`,
						'Content-Type': 'application/json'
					},
					timeout: 30000 // 30 second timeout
				}
			);

			const { limit, requests, renewsAt } = response.data.subscription;
			const remaining = limit - requests;

			
						// Update status bar using cached display method
						this.updateStatusBarDisplay(limit, requests, renewsAt);
		} catch (error) {
			this.handleError(error);
		} finally {
			this.isRefreshing = false;
		}
	}

	private createTooltip(limit: number, requests: number, remaining: number, renewsAt: string): string {
		// Format renewal date in user-friendly way
		const renewsDate = new Date(renewsAt).toLocaleDateString();
		
		return `Quota Usage

Limit: ${limit} requests
Used: ${requests} requests
Remaining: ${remaining} requests
Renews: ${renewsDate}`;
	}

	private updateStatusBarDisplay(limit: number, requests: number, renewsAt: string): void {
		// Update cached values
		this.cachedLimit = limit;
		this.cachedRequests = requests;
		this.cachedRenewsAt = renewsAt;
		this.lastSuccessfulUpdate = new Date();

		// Update status bar text - new format shows requests directly
		this.statusBarItem.text = `$(pulse) Synthetic: ${requests}/${limit} requests`;

		// Update tooltip with new format
		const remaining = limit - requests;
		this.setTooltip(this.createTooltip(limit, requests, remaining, renewsAt));
		this.statusBarItem.backgroundColor = undefined;
		this.updateStatusBarCommand();
	}

	private hasCachedData(): boolean {
		return this.cachedLimit !== null && this.cachedRequests !== null && this.cachedRenewsAt !== null;
	}

	/**
	 * Safely update tooltip only if the value has changed
	 * This prevents tooltip flickering when hovering
	 */
	private setTooltip(tooltip: string): void {
		if (this.cachedTooltip !== tooltip) {
			this.cachedTooltip = tooltip;
			this.statusBarItem.tooltip = tooltip;
		}
	}

	private showCachedDataWithRefreshIndicator(): void {
		// Check if cached data exists
		if (this.hasCachedData() && this.cachedLimit !== null && this.cachedRequests !== null && this.cachedRenewsAt !== null) {
	     // Show last data without animated icon to make refresh less intrusive
	     this.statusBarItem.text = `$(pulse) Synthetic: ${this.cachedRequests}/${this.cachedLimit} requests`;

			// Set tooltip with refresh information
			const remaining = this.cachedLimit - this.cachedRequests;
			this.setTooltip(`${this.createTooltip(this.cachedLimit, this.cachedRequests, remaining, this.cachedRenewsAt)}\n\nRefreshing...`);
			this.updateStatusBarCommand();
		}
	}

	private handleError(error: any): void {
		let errorMessage = 'Unknown error occurred';
		let statusText = '$(error) Synthetic: Error';

		if (axios.isAxiosError(error)) {
			const axiosError = error as AxiosError;
			
			if (axiosError.response) {
				// API returned an error response
				const status = axiosError.response.status;
				switch (status) {
					case 401:
						errorMessage = 'Invalid API token. Please check your configuration.';
						statusText = '$(error) Synthetic: Invalid Token';
						break;
					case 403:
						errorMessage = 'Access forbidden. Please verify your API token permissions.';
						statusText = '$(error) Synthetic: Forbidden';
						break;
					case 429:
						errorMessage = 'Rate limit exceeded. Please try again later.';
						statusText = '$(error) Synthetic: Rate Limited';
						break;
					case 500:
					case 502:
					case 503:
					case 504:
						errorMessage = 'Synthetic API is currently unavailable. Please try again later.';
						statusText = '$(error) Synthetic: API Down';
						break;
					default:
						errorMessage = `API error (${status}): ${axiosError.response.statusText}`;
						statusText = `$(error) Synthetic: API Error`;
				}
			} else if (axiosError.request) {
				// Network error
				errorMessage = 'Network error. Please check your internet connection.';
				statusText = '$(error) Synthetic: Network Error';
			} else {
				errorMessage = `Request error: ${axiosError.message}`;
			}
		} else if (error instanceof Error) {
			errorMessage = error.message;
		}

		// If cached data exists, show it with error icon
		if (this.hasCachedData() && this.cachedLimit !== null && this.cachedRequests !== null && this.cachedRenewsAt !== null) {
			// Show cached data with error icon
			this.statusBarItem.text = `$(error) Synthetic: ${this.cachedRequests}/${this.cachedLimit} requests`;

			// Add information about last successful update time in tooltip
			const remaining = this.cachedLimit - this.cachedRequests;
			let tooltip = this.createTooltip(this.cachedLimit, this.cachedRequests, remaining, this.cachedRenewsAt);

			if (this.lastSuccessfulUpdate) {
				const timeString = this.lastSuccessfulUpdate.toLocaleTimeString();
				tooltip += `\n\nLast updated: ${timeString}\nError: ${errorMessage}`;
			} else {
				tooltip += `\n\nError: ${errorMessage}`;
			}

			this.setTooltip(tooltip);
		} else {
			// No cached data, show error message
			this.statusBarItem.text = statusText;
			this.setTooltip(`Error fetching quota: ${errorMessage}\n\nClick to retry or check configuration`);
		}
		
    // Clear explicit background to avoid aggressive red background; rely on icon and text for error visibility
    this.statusBarItem.backgroundColor = undefined;
		this.updateStatusBarCommand();

		console.error('Synthetic Quota Error:', error);
	}

	private async showQuotaDetails(): Promise<void> {
    const apiToken = await this.getApiToken();
		
    if (!apiToken.trim()) {
			const result = await vscode.window.showWarningMessage(
				'Synthetic API token not configured. Would you like to set it up now?',
			     'Set API Token',
				'Cancel'
			);
			
      if (result === 'Set API Token') {
        await this.promptForApiToken();
			}
			return;
		}

		// Show detailed information
		if (this.statusBarItem.text.includes('Error') || this.statusBarItem.text.includes('Setup Required')) {
			vscode.window.showErrorMessage('Cannot show details: ' + (this.statusBarItem.tooltip as string || 'Unknown error'));
			return;
		}

		if (this.statusBarItem.text.includes('Loading')) {
			vscode.window.showInformationMessage('Please wait, quota information is loading...');
			return;
		}

		// Extract data from current status for detailed view
		const tooltipText = this.statusBarItem.tooltip as string;
		if (tooltipText && tooltipText.includes('Used:')) {
			vscode.window.showInformationMessage(tooltipText, { modal: false });
		} else {
			vscode.window.showInformationMessage('Quota details: ' + this.statusBarItem.text);
		}
	}

	// Note: VSCode doesn't provide hover events for status bar items
	// This method is included for potential future use if VSCode adds this capability
	private handleStatusBarHover(isHovering: boolean): void {		
		// Only update if we have valid quota data
		if (this.statusBarItem.text.includes('Synthetic:') &&
				!this.statusBarItem.text.includes('Setup Required') &&
				!this.statusBarItem.text.includes('Loading') &&
				!this.statusBarItem.text.includes('Error')) {
			// Extract current quota information from text
			const match = this.statusBarItem.text.match(/Synthetic: ([\d.]+)\/(\d+) requests/);
			if (match) {
				const requests = match[1];
				const limit = match[2];
				this.statusBarItem.text = `${isHovering ? '$(sync)' : '$(pulse)'} Synthetic: ${requests}/${limit} requests`;
			}
		}
	}

	/**
	 * Update the status bar command based on the current state
	 * When in "Setup Required" state, use setApiToken command
	 * When in error state, use refresh command
	 * In other states, use openSettings command
	 */
	private updateStatusBarCommand(): void {
		if (this.statusBarItem.text.includes('Setup Required')) {
			this.statusBarItem.command = 'synthetic-quota.setApiToken';
		  } else if (this.statusBarItem.text.includes('$(error)') || this.statusBarItem.text.includes('Error') ||
		           this.statusBarItem.text.includes('Invalid Token') ||
		           this.statusBarItem.text.includes('Forbidden') ||
		           this.statusBarItem.text.includes('Rate Limited') ||
		           this.statusBarItem.text.includes('API Down') ||
		           this.statusBarItem.text.includes('API Error') ||
		           this.statusBarItem.text.includes('Network Error')) {
			this.statusBarItem.command = 'synthetic-quota.refresh';
		} else {
			this.statusBarItem.command = 'synthetic-quota.openSettings';
		}
	}

	public dispose(): void {
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
		}
		this.statusBarItem.dispose();
	}
}

let quotaMonitor: SyntheticQuotaMonitor;

export function activate(context: vscode.ExtensionContext) {
	console.log('Synthetic Quota extension is now active');
	
	// Initialize the quota monitor
	quotaMonitor = new SyntheticQuotaMonitor(context);
	
	// Add to subscriptions for proper cleanup
	context.subscriptions.push({
		dispose: () => quotaMonitor.dispose()
	});
}

export function deactivate() {
	if (quotaMonitor) {
		quotaMonitor.dispose();
	}
}
