<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/stores/theme';
	import type { Theme } from '$lib/stores/theme';
	
	// Settings state
	let settings = {
		congregationName: 'Bolaoen Congregation',
		currency: 'PHP',
		language: 'en',
		theme: 'auto' as Theme,
		notifications: true,
		autoBackup: true,
		exportFormat: 'csv'
	};

	let tempSettings = { ...settings };
	let hasChanges = false;
	let saving = false;

	// Initialize settings from localStorage and theme store
	onMount(() => {
		const savedSettings = localStorage.getItem('congregationSettings');
		if (savedSettings) {
			try {
				const parsed = JSON.parse(savedSettings);
				settings = { ...settings, ...parsed };
				tempSettings = { ...settings };
			} catch (error) {
				console.error('Failed to parse saved settings:', error);
			}
		}
		
		// Subscribe to theme store
		const unsubscribe = theme.subscribe(currentTheme => {
			tempSettings.theme = currentTheme;
			if (!hasChanges) {
				settings.theme = currentTheme;
			}
		});
		
		return unsubscribe;
	});

	// Watch for changes
	$: hasChanges = JSON.stringify(settings) !== JSON.stringify(tempSettings);

	// Update theme when changed
	$: if (tempSettings.theme !== $theme) {
		theme.setTheme(tempSettings.theme);
	}

	async function saveSettings() {
		saving = true;
		try {
			// Simulate a brief delay for better UX
			await new Promise(resolve => setTimeout(resolve, 500));
			
			settings = { ...tempSettings };
			hasChanges = false;
			
			// Save to localStorage
			localStorage.setItem('congregationSettings', JSON.stringify(settings));
			
			// Update theme
			theme.setTheme(settings.theme);
			
			// Show success notification
			showNotification('Settings saved successfully!', 'success');
		} catch (error) {
			console.error('Failed to save settings:', error);
			showNotification('Failed to save settings. Please try again.', 'error');
		} finally {
			saving = false;
		}
	}

	function resetSettings() {
		tempSettings = { ...settings };
		hasChanges = false;
	}

	function exportData() {
		try {
			const data = {
				settings,
				exportDate: new Date().toISOString(),
				version: '1.0'
			};
			
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `congregation-backup-${new Date().toISOString().split('T')[0]}.json`;
			a.click();
			URL.revokeObjectURL(url);
			
			showNotification('Data exported successfully!', 'success');
		} catch (error) {
			console.error('Export failed:', error);
			showNotification('Failed to export data. Please try again.', 'error');
		}
	}

	function importData() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = (e) => {
					try {
						const data = JSON.parse(e.target?.result as string);
						if (data.settings) {
							tempSettings = { ...data.settings };
							showNotification('Data imported successfully! Don\'t forget to save your settings.', 'success');
						} else {
							showNotification('Invalid backup file format.', 'error');
						}
					} catch (error) {
						console.error('Import failed:', error);
						showNotification('Error reading backup file.', 'error');
					}
				};
				reader.readAsText(file);
			}
		};
		input.click();
	}

	function clearAllData() {
		if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
			if (confirm('This will permanently delete all transactions and settings. Are you absolutely sure?')) {
				localStorage.clear();
				tempSettings = {
					congregationName: '',
					currency: 'PHP',
					language: 'en',
					theme: 'auto',
					notifications: true,
					autoBackup: true,
					exportFormat: 'csv'
				};
				showNotification('All data has been cleared.', 'success');
			}
		}
	}

	// Notification system
	let notifications: Array<{id: number, message: string, type: 'success' | 'error' | 'info', visible: boolean}> = [];
	let notificationId = 0;

	function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
		const id = notificationId++;
		const notification = { id, message, type, visible: true };
		notifications = [...notifications, notification];
		
		// Auto-remove after 5 seconds
		setTimeout(() => {
			notification.visible = false;
			notifications = notifications.map(n => n.id === id ? notification : n);
			
			// Remove from array after animation
			setTimeout(() => {
				notifications = notifications.filter(n => n.id !== id);
			}, 300);
		}, 5000);
	}

	function removeNotification(id: number) {
		notifications = notifications.map(n => 
			n.id === id ? { ...n, visible: false } : n
		);
		
		setTimeout(() => {
			notifications = notifications.filter(n => n.id !== id);
		}, 300);
	}
</script>

<!-- Notifications -->
{#if notifications.length > 0}
	<div class="fixed top-4 right-4 z-50 space-y-2">
		{#each notifications as notification (notification.id)}
			<div 
				class="notification {notification.type} {notification.visible ? 'show' : 'hide'}"
				role="alert"
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center">
						<div class="notification-icon">
							{#if notification.type === 'success'}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
								</svg>
							{:else if notification.type === 'error'}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							{:else}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
							{/if}
						</div>
						<span class="notification-message">{notification.message}</span>
					</div>
					<button 
						class="notification-close"
						on:click={() => removeNotification(notification.id)}
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}

<div class="settings-container">
	<!-- Header -->
	<div class="settings-header">
		<div class="header-content">
			<div class="header-text">
				<h1 class="header-title">
					<span class="header-icon">⚙️</span>
					Settings
				</h1>
				<p class="header-subtitle">Manage your congregation account preferences</p>
			</div>
			
			{#if hasChanges}
				<div class="header-actions">
					<button 
						class="btn btn-secondary" 
						on:click={resetSettings}
						disabled={saving}
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
						</svg>
						Reset Changes
					</button>
					<button 
						class="btn btn-primary" 
						on:click={saveSettings}
						disabled={saving}
					>
						{#if saving}
							<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
							</svg>
							Saving...
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
							</svg>
							Save Settings
						{/if}
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Settings Content -->
	<div class="settings-content">
		<!-- General Settings -->
		<section class="settings-section">
			<div class="section-header">
				<h2 class="section-title">
					<span class="section-icon">🏛️</span>
					General Settings
				</h2>
				<p class="section-description">Basic configuration for your congregation</p>
			</div>
			
			<div class="settings-grid">
				<div class="setting-group">
					<label for="congregationName" class="setting-label">
						Congregation Name
						<span class="label-required">*</span>
					</label>
					<div class="input-group">
						<input
							id="congregationName"
							type="text"
							class="setting-input"
							bind:value={tempSettings.congregationName}
							placeholder="Enter congregation name"
							required
						/>
						<div class="input-icon">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
							</svg>
						</div>
					</div>
				</div>

				<div class="setting-group">
					<label for="currency" class="setting-label">
						Default Currency
					</label>
					<div class="select-group">
						<select id="currency" class="setting-select" bind:value={tempSettings.currency}>
							<option value="PHP">🇵🇭 PHP - Philippine Peso</option>
							</select>
						<div class="select-icon">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
							</svg>
						</div>
					</div>
				</div>

				<div class="setting-group">
					<label for="language" class="setting-label">
						Language
					</label>
					<div class="select-group">
						<select id="language" class="setting-select" bind:value={tempSettings.language}>
							<option value="en">🇺🇸 English</option>
							<option value="es">🇪🇸 Español</option>
							<option value="fr">🇫🇷 Français</option>
							<option value="de">🇩🇪 Deutsch</option>
							<option value="pt">🇵🇹 Português</option>
							<option value="it">🇮🇹 Italiano</option>
						</select>
						<div class="select-icon">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
							</svg>
						</div>
					</div>
				</div>

				<div class="setting-group">
					<label for="theme" class="setting-label">
						Theme Preference
					</label>
					<div class="select-group">
						<select id="theme" class="setting-select" bind:value={tempSettings.theme}>
							<option value="light">☀️ Light Mode</option>
							<option value="dark">🌙 Dark Mode</option>
							<option value="auto">🔄 Auto (System)</option>
						</select>
						<div class="select-icon">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
							</svg>
						</div>
					</div>
					<p class="setting-help">Choose your preferred color scheme</p>
				</div>
			</div>
		</section>

		<!-- Preferences -->
		<section class="settings-section">
			<div class="section-header">
				<h2 class="section-title">
					<span class="section-icon">🎛️</span>
					Preferences
				</h2>
				<p class="section-description">Customize your experience</p>
			</div>
			
			<div class="settings-grid">
				<div class="setting-group">
					<label for="exportFormat" class="setting-label">
						Default Export Format
					</label>
					<div class="select-group">
						<select id="exportFormat" class="setting-select" bind:value={tempSettings.exportFormat}>
							<option value="csv">📊 CSV (Spreadsheet)</option>
							<option value="json">📋 JSON (Data)</option>
							<option value="pdf">📄 PDF (Document)</option>
						</select>
						<div class="select-icon">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
							</svg>
						</div>
					</div>
				</div>

				<div class="setting-group col-span-full">
					<div class="toggle-group">
						<label class="toggle-setting">
							<input
								type="checkbox"
								class="toggle-input"
								bind:checked={tempSettings.notifications}
							/>
							<div class="toggle-switch">
								<div class="toggle-thumb"></div>
							</div>
							<div class="toggle-content">
								<span class="toggle-title">Enable Notifications</span>
								<span class="toggle-description">Get notified about important updates and reminders</span>
							</div>
						</label>
					</div>

					<div class="toggle-group">
						<label class="toggle-setting">
							<input
								type="checkbox"
								class="toggle-input"
								bind:checked={tempSettings.autoBackup}
							/>
							<div class="toggle-switch">
								<div class="toggle-thumb"></div>
							</div>
							<div class="toggle-content">
								<span class="toggle-title">Auto Backup</span>
								<span class="toggle-description">Automatically backup your data weekly</span>
							</div>
						</label>
					</div>
				</div>
			</div>
		</section>

		<!-- Data Management -->
		<section class="settings-section">
			<div class="section-header">
				<h2 class="section-title">
					<span class="section-icon">💾</span>
					Data Management
				</h2>
				<p class="section-description">Import, export, and manage your data</p>
			</div>
			
			<div class="data-actions">
				<div class="action-card">
					<div class="action-icon success">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
						</svg>
					</div>
					<div class="action-content">
						<h3 class="action-title">Export Data</h3>
						<p class="action-description">Download a backup of all your congregation data</p>
					</div>
					<button class="btn btn-success" on:click={exportData}>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
						</svg>
						Export
					</button>
				</div>

				<div class="action-card">
					<div class="action-icon info">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
						</svg>
					</div>
					<div class="action-content">
						<h3 class="action-title">Import Data</h3>
						<p class="action-description">Restore data from a previous backup file</p>
					</div>
					<button class="btn btn-info" on:click={importData}>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
						</svg>
						Import
					</button>
				</div>

				<div class="action-card danger">
					<div class="action-icon danger">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
						</svg>
					</div>
					<div class="action-content">
						<h3 class="action-title">Clear All Data</h3>
						<p class="action-description">Permanently delete all transactions and settings</p>
					</div>
					<button class="btn btn-danger" on:click={clearAllData}>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
						</svg>
						Clear All
					</button>
				</div>
			</div>
		</section>

		<!-- About -->
		<section class="settings-section">
			<div class="section-header">
				<h2 class="section-title">
					<span class="section-icon">ℹ️</span>
					About
				</h2>
				<p class="section-description">Application information</p>
			</div>
			
			<div class="about-grid">
				<div class="about-item">
					<div class="about-icon">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
						</svg>
					</div>
					<div class="about-content">
						<span class="about-label">Application</span>
						<span class="about-value">Congregation Accounts Manager</span>
					</div>
				</div>

				<div class="about-item">
					<div class="about-icon">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
						</svg>
					</div>
					<div class="about-content">
						<span class="about-label">Version</span>
						<span class="about-value">1.0.0</span>
					</div>
				</div>

				<div class="about-item">
					<div class="about-icon">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
						</svg>
					</div>
					<div class="about-content">
						<span class="about-label">Built with</span>
						<span class="about-value">SvelteKit & Modern CSS</span>
					</div>
				</div>

				<div class="about-item">
					<div class="about-icon">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
					</div>
					<div class="about-content">
						<span class="about-label">Purpose</span>
						<span class="about-value">Manage congregation financial records</span>
					</div>
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	/* ========== Notifications ========== */
	.notification {
		max-width: 24rem;
		padding: 1rem;
		border-radius: 0.75rem;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
		backdrop-filter: blur(8px);
		border: 1px solid;
		transition: all 0.3s ease-in-out;
		background: var(--color-glass-bg);
		border-color: var(--color-border-primary);
	}

	.notification.show {
		opacity: 1;
		transform: translateX(0);
	}

	.notification.hide {
		opacity: 0;
		transform: translateX(100%);
	}

	.notification.success {
		border-color: #bbf7d0;
		background-color: #f0fdf4;
		color: var(--color-text-primary);
	}

	.notification.error {
		border-color: #fecaca;
		background-color: #fef2f2;
		color: var(--color-text-primary);
	}

	.notification.info {
		border-color: #bfdbfe;
		background-color: #eff6ff;
		color: var(--color-text-primary);
	}

	:root.dark .notification.success {
		border-color: #166534;
		background-color: rgba(20, 83, 45, 0.5);
	}

	:root.dark .notification.error {
		border-color: #991b1b;
		background-color: rgba(127, 29, 29, 0.5);
	}

	:root.dark .notification.info {
		border-color: #1e3a8a;
		background-color: rgba(30, 58, 138, 0.5);
	}

	.notification-icon {
		margin-right: 0.75rem;
		flex-shrink: 0;
	}

	.notification.success .notification-icon {
		color: #16a34a;
	}

	.notification.error .notification-icon {
		color: #dc2626;
	}

	.notification.info .notification-icon {
		color: #2563eb;
	}

	:root.dark .notification.success .notification-icon {
		color: #4ade80;
	}

	:root.dark .notification.error .notification-icon {
		color: #f87171;
	}

	:root.dark .notification.info .notification-icon {
		color: #60a5fa;
	}

	.notification-message {
		flex: 1;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.notification-close {
		margin-left: 0.75rem;
		padding: 0.25rem;
		border-radius: 0.375rem;
		transition: background-color 0.2s;
		color: var(--color-text-secondary);
	}

	.notification-close:hover {
		background-color: rgba(0, 0, 0, 0.1);
	}

	/* ========== Main Container ========== */
	.settings-container {
		max-width: 64rem;
		margin: 0 auto;
		padding: 2rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		background: var(--color-bg-secondary);
		min-height: 100vh;
	}

	/* ========== Header ========== */
	.settings-header {
		border-radius: 1rem;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
		border: 1px solid;
		padding: 2rem;
		background: var(--color-glass-bg);
		border-color: var(--color-glass-border);
		backdrop-filter: blur(20px);
	}

	.header-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	@media (min-width: 1024px) {
		.header-content {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}

	.header-text {
		flex: 1;
	}

	.header-title {
		font-size: 1.875rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		color: var(--color-text-primary);
	}

	.header-icon {
		font-size: 2.5rem;
		margin-right: 1rem;
	}

	.header-subtitle {
		font-size: 1.125rem;
		color: var(--color-text-secondary);
	}

	.header-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	@media (min-width: 640px) {
		.header-actions {
			flex-direction: row;
		}
	}

	/* ========== Buttons ========== */
	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		font-weight: 600;
		font-size: 0.875rem;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		justify-content: center;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
		transform: translateY(0);
		cursor: pointer;
		border: none;
	}

	.btn:hover {
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
		transform: translateY(-2px);
	}

	.btn:active {
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
		transform: translateY(0);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.btn-primary {
		background: linear-gradient(to right, #4f46e5, #7c3aed);
		color: white;
		border: 1px solid rgba(79, 70, 229, 0.2);
	}

	.btn-primary:hover {
		background: linear-gradient(to right, #4338ca, #6d28d9);
	}

	.btn-secondary {
		border: 1px solid;
		background: var(--color-bg-primary);
		border-color: var(--color-border-primary);
		color: var(--color-text-secondary);
	}

	.btn-secondary:hover {
		background: var(--color-surface-hover);
	}

	.btn-success {
		background: linear-gradient(to right, #16a34a, #059669);
		color: white;
	}

	.btn-success:hover {
		background: linear-gradient(to right, #15803d, #047857);
	}

	.btn-info {
		background: linear-gradient(to right, #2563eb, #0891b2);
		color: white;
	}

	.btn-info:hover {
		background: linear-gradient(to right, #1d4ed8, #0e7490);
	}

	.btn-danger {
		background: linear-gradient(to right, #dc2626, #e11d48);
		color: white;
	}

	.btn-danger:hover {
		background: linear-gradient(to right, #b91c1c, #be123c);
	}

	/* ========== Settings Content ========== */
	.settings-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.settings-section {
		border-radius: 1rem;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
		border: 1px solid;
		padding: 2rem;
		background: var(--color-glass-bg);
		border-color: var(--color-glass-border);
		backdrop-filter: blur(20px);
	}

	/* ========== Section Headers ========== */
	.section-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid;
		border-color: var(--color-border-primary);
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		color: var(--color-text-primary);
	}

	.section-icon {
		font-size: 1.5rem;
		margin-right: 0.75rem;
	}

	.section-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	/* ========== Settings Grid ========== */
	.settings-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	@media (min-width: 1024px) {
		.settings-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.setting-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.col-span-full {
		grid-column: 1 / -1;
	}

	/* ========== Form Elements ========== */
	.setting-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-text-primary);
	}

	.label-required {
		color: #ef4444;
	}

	.input-group, .select-group {
		position: relative;
	}

	.setting-input, .setting-select {
		width: 100%;
		padding: 0.75rem 3rem 0.75rem 1rem;
		border-radius: 0.75rem;
		border: 1px solid;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
		background: var(--color-bg-primary);
		border-color: var(--color-border-primary);
		color: var(--color-text-primary);
	}

	.setting-input:focus, .setting-select:focus {
		outline: none;
		border-color: #4f46e5;
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
	}

	.input-icon, .select-icon {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--color-text-tertiary);
	}

	.setting-help {
		font-size: 0.75rem;
		margin-top: 0.25rem;
		color: var(--color-text-tertiary);
	}

	/* ========== Toggle Switches ========== */
	.toggle-group {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.toggle-setting {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		border-radius: 0.75rem;
		border: 1px solid;
		cursor: pointer;
		transition: all 0.2s ease;
		background: var(--color-bg-primary);
		border-color: var(--color-border-primary);
	}

	.toggle-setting:hover {
		background: var(--color-surface-hover);
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
		transform: translateY(-2px);
	}

	.toggle-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.toggle-switch {
		position: relative;
		width: 3rem;
		height: 1.5rem;
		border-radius: 9999px;
		transition: background-color 0.2s ease;
		flex-shrink: 0;
		background: var(--color-border-secondary);
	}

	.toggle-input:checked + .toggle-switch {
		background-color: #4f46e5;
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 1.25rem;
		height: 1.25rem;
		background-color: white;
		border-radius: 50%;
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
		transition: transform 0.2s ease;
	}

	.toggle-input:checked + .toggle-switch .toggle-thumb {
		transform: translateX(1.5rem);
	}

	.toggle-content {
		flex: 1;
	}

	.toggle-title {
		display: block;
		font-weight: 600;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
		color: var(--color-text-primary);
	}

	.toggle-description {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	/* ========== Data Actions ========== */
	.data-actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.action-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		border-radius: 0.75rem;
		border: 1px solid;
		transition: all 0.2s ease;
		background: var(--color-bg-primary);
		border-color: var(--color-border-primary);
	}

	.action-card:hover {
		background: var(--color-surface-hover);
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
		transform: translateY(-2px);
	}

	.action-card.danger {
		border-color: #fecaca;
		background-color: rgba(254, 242, 242, 0.5);
	}

	:root.dark .action-card.danger {
		border-color: rgba(153, 27, 27, 0.5);
		background-color: rgba(127, 29, 29, 0.2);
	}

	.action-icon {
		width: 3rem;
		height: 3rem;
		border-radius: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.action-icon.success {
		background-color: #dcfce7;
		color: #16a34a;
	}

	.action-icon.info {
		background-color: #dbeafe;
		color: #2563eb;
	}

	.action-icon.danger {
		background-color: #fee2e2;
		color: #dc2626;
	}

	:root.dark .action-icon.success {
		background-color: rgba(20, 83, 45, 0.5);
		color: #4ade80;
	}

	:root.dark .action-icon.info {
		background-color: rgba(30, 58, 138, 0.5);
		color: #60a5fa;
	}

	:root.dark .action-icon.danger {
		background-color: rgba(127, 29, 29, 0.5);
		color: #f87171;
	}

	.action-content {
		flex: 1;
	}

	.action-title {
		font-weight: 600;
		font-size: 1rem;
		margin-bottom: 0.25rem;
		color: var(--color-text-primary);
	}

	.action-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	/* ========== About Section ========== */
	.about-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.about-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.about-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border-radius: 0.75rem;
		border: 1px solid;
		background: var(--color-bg-primary);
		border-color: var(--color-border-primary);
	}

	.about-icon {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background-color: #e0e7ff;
		color: #4f46e5;
	}

	:root.dark .about-icon {
		background-color: rgba(30, 58, 138, 0.5);
		color: #a5b4fc;
	}

	.about-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.about-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-tertiary);
	}

	.about-value {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	/* ========== Responsive Design ========== */
	@media (max-width: 640px) {
		.settings-container {
			padding: 1rem;
			gap: 1.5rem;
		}

		.settings-section, .settings-header {
			padding: 1.5rem;
		}

		.header-content {
			flex-direction: column;
			gap: 1rem;
		}

		.header-actions {
			flex-direction: column;
		}

		.settings-grid {
			grid-template-columns: 1fr;
		}

		.action-card {
			flex-direction: column;
			text-align: center;
		}

		.about-grid {
			grid-template-columns: 1fr;
		}
	}

	/* ========== Animations ========== */
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.settings-section {
		animation: fadeInUp 0.6s ease-out;
	}

	.settings-section:nth-child(1) { animation-delay: 0.1s; }
	.settings-section:nth-child(2) { animation-delay: 0.2s; }
	.settings-section:nth-child(3) { animation-delay: 0.3s; }
	.settings-section:nth-child(4) { animation-delay: 0.4s; }
	.settings-section:nth-child(5) { animation-delay: 0.5s; }

	/* ========== Dark Mode Overrides ========== */
	:root.dark .setting-select option {
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
	}

	/* ========== Smooth Animations ========== */
	* {
		transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
	}
</style>
