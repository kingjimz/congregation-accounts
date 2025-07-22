<script lang="ts">
	// Settings state
	let settings = {
		congregationName: 'Riverside Congregation',
		currency: 'USD',
		language: 'en',
		theme: 'light',
		notifications: true,
		autoBackup: true,
		exportFormat: 'csv'
	};

	let tempSettings = { ...settings };
	let hasChanges = false;

	// Watch for changes
	$: hasChanges = JSON.stringify(settings) !== JSON.stringify(tempSettings);

	function saveSettings() {
		settings = { ...tempSettings };
		hasChanges = false;
		// In a real app, this would save to a database or local storage
		localStorage.setItem('congregationSettings', JSON.stringify(settings));
		alert('Settings saved successfully!');
	}

	function resetSettings() {
		tempSettings = { ...settings };
		hasChanges = false;
	}

	function exportData() {
		// In a real app, this would export all congregation data
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
							alert('Data imported successfully! Don\'t forget to save your settings.');
						} else {
							alert('Invalid backup file format.');
						}
					} catch (error) {
						alert('Error reading backup file.');
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
					currency: 'USD',
					language: 'en',
					theme: 'light',
					notifications: true,
					autoBackup: true,
					exportFormat: 'csv'
				};
				alert('All data has been cleared.');
			}
		}
	}
</script>

<div class="settings-page">
	<div class="page-header">
		<h1>Settings</h1>
		<div class="header-actions">
			{#if hasChanges}
				<button class="reset-btn" on:click={resetSettings}>
					Reset Changes
				</button>
				<button class="save-btn" on:click={saveSettings}>
					Save Settings
				</button>
			{/if}
		</div>
	</div>

	<div class="settings-sections">
		<!-- General Settings -->
		<section class="settings-section">
			<h2>General Settings</h2>
			<div class="settings-grid">
				<div class="setting-item">
					<label for="congregationName">Congregation Name</label>
					<input
						id="congregationName"
						type="text"
						bind:value={tempSettings.congregationName}
						placeholder="Enter congregation name"
					/>
				</div>

				<div class="setting-item">
					<label for="currency">Currency</label>
					<select id="currency" bind:value={tempSettings.currency}>
						<option value="USD">USD - US Dollar</option>
						<option value="EUR">EUR - Euro</option>
						<option value="GBP">GBP - British Pound</option>
						<option value="CAD">CAD - Canadian Dollar</option>
						<option value="AUD">AUD - Australian Dollar</option>
						<option value="JPY">JPY - Japanese Yen</option>
					</select>
				</div>

				<div class="setting-item">
					<label for="language">Language</label>
					<select id="language" bind:value={tempSettings.language}>
						<option value="en">English</option>
						<option value="es">Español</option>
						<option value="fr">Français</option>
						<option value="de">Deutsch</option>
						<option value="pt">Português</option>
						<option value="it">Italiano</option>
					</select>
				</div>

				<div class="setting-item">
					<label for="theme">Theme</label>
					<select id="theme" bind:value={tempSettings.theme}>
						<option value="light">Light</option>
						<option value="dark">Dark</option>
						<option value="auto">Auto (System)</option>
					</select>
				</div>
			</div>
		</section>

		<!-- Preferences -->
		<section class="settings-section">
			<h2>Preferences</h2>
			<div class="settings-grid">
				<div class="setting-item">
					<label for="exportFormat">Default Export Format</label>
					<select id="exportFormat" bind:value={tempSettings.exportFormat}>
						<option value="csv">CSV</option>
						<option value="json">JSON</option>
						<option value="pdf">PDF</option>
					</select>
				</div>

				<div class="setting-item checkbox-item">
					<label>
						<input
							type="checkbox"
							bind:checked={tempSettings.notifications}
						/>
						<span class="checkmark"></span>
						Enable Notifications
					</label>
					<p class="setting-description">
						Get notified about important updates and reminders
					</p>
				</div>

				<div class="setting-item checkbox-item">
					<label>
						<input
							type="checkbox"
							bind:checked={tempSettings.autoBackup}
						/>
						<span class="checkmark"></span>
						Auto Backup
					</label>
					<p class="setting-description">
						Automatically backup your data weekly
					</p>
				</div>
			</div>
		</section>

		<!-- Data Management -->
		<section class="settings-section">
			<h2>Data Management</h2>
			<div class="data-actions">
				<div class="action-item">
					<div class="action-info">
						<h3>Export Data</h3>
						<p>Download a backup of all your congregation data</p>
					</div>
					<button class="action-btn export-btn" on:click={exportData}>
						📊 Export
					</button>
				</div>

				<div class="action-item">
					<div class="action-info">
						<h3>Import Data</h3>
						<p>Restore data from a previous backup file</p>
					</div>
					<button class="action-btn import-btn" on:click={importData}>
						📥 Import
					</button>
				</div>

				<div class="action-item danger">
					<div class="action-info">
						<h3>Clear All Data</h3>
						<p>Permanently delete all transactions and settings</p>
					</div>
					<button class="action-btn danger-btn" on:click={clearAllData}>
						🗑️ Clear All
					</button>
				</div>
			</div>
		</section>

		<!-- About -->
		<section class="settings-section">
			<h2>About</h2>
			<div class="about-info">
				<div class="info-item">
					<strong>Application:</strong> Congregation Accounts Manager
				</div>
				<div class="info-item">
					<strong>Version:</strong> 1.0.0
				</div>
				<div class="info-item">
					<strong>Built with:</strong> SvelteKit & Tailwind CSS
				</div>
				<div class="info-item">
					<strong>Purpose:</strong> Manage congregation financial records and accounts
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	.settings-page {
		max-width: 800px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.page-header h1 {
		margin: 0;
		color: #1e293b;
		font-size: 2rem;
		font-weight: 700;
	}

	.header-actions {
		display: flex;
		gap: 1rem;
	}

	.reset-btn {
		background: #6b7280;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.reset-btn:hover {
		background: #4b5563;
	}

	.save-btn {
		background: #2563eb;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.save-btn:hover {
		background: #1d4ed8;
	}

	.settings-sections {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.settings-section {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.settings-section h2 {
		margin: 0 0 1.5rem 0;
		color: #1e293b;
		font-size: 1.25rem;
		font-weight: 600;
		border-bottom: 1px solid #e2e8f0;
		padding-bottom: 0.75rem;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.setting-item {
		display: flex;
		flex-direction: column;
	}

	.setting-item label {
		margin-bottom: 0.5rem;
		color: #374151;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.setting-item input,
	.setting-item select {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.setting-item input:focus,
	.setting-item select:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.checkbox-item {
		flex-direction: row;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.checkbox-item label {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		cursor: pointer;
		margin-bottom: 0;
		flex: 1;
	}

	.checkbox-item input[type="checkbox"] {
		width: 20px;
		height: 20px;
		margin: 0;
		cursor: pointer;
	}

	.setting-description {
		color: #64748b;
		font-size: 0.875rem;
		margin: 0.5rem 0 0 0;
		line-height: 1.4;
	}

	.data-actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.action-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		transition: border-color 0.2s;
	}

	.action-item:hover {
		border-color: #d1d5db;
	}

	.action-item.danger {
		border-color: #fecaca;
		background: #fef2f2;
	}

	.action-info h3 {
		margin: 0 0 0.25rem 0;
		color: #1e293b;
		font-size: 1rem;
		font-weight: 600;
	}

	.action-info p {
		margin: 0;
		color: #64748b;
		font-size: 0.875rem;
	}

	.action-btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s, transform 0.2s;
	}

	.action-btn:hover {
		transform: translateY(-1px);
	}

	.export-btn {
		background: #10b981;
		color: white;
	}

	.export-btn:hover {
		background: #059669;
	}

	.import-btn {
		background: #2563eb;
		color: white;
	}

	.import-btn:hover {
		background: #1d4ed8;
	}

	.danger-btn {
		background: #ef4444;
		color: white;
	}

	.danger-btn:hover {
		background: #dc2626;
	}

	.about-info {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.info-item {
		padding: 0.75rem;
		background: #f8fafc;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.info-item strong {
		color: #374151;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.settings-grid {
			grid-template-columns: 1fr;
		}

		.action-item {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.action-btn {
			width: 100%;
		}
	}

	@media (max-width: 480px) {
		.settings-section {
			padding: 1.5rem;
		}

		.header-actions {
			flex-direction: column;
		}
	}
</style>
