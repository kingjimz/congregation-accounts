<script lang="ts">
	import { onMount } from 'svelte';

	let activeSection = $state('getting-started');
	let searchQuery = $state('');
	let filteredSections = $state<typeof helpSections>([]);

	const helpSections = [
		{
			id: 'getting-started',
			title: 'Getting Started',
			description: 'Learn the basics of using Congregation Accounts',
			content: [
				{ title: 'Welcome to Congregation Accounts', content: 'Congregation Accounts is a comprehensive financial management system designed specifically for congregations. It helps you track donations, manage expenses, and maintain accurate financial records.', type: 'info' },
				{ title: 'First Steps', content: '1. Sign up for an account using your email\n2. Set up your congregation information\n3. Add your first transaction\n4. Explore the dashboard and charts', type: 'steps' },
				{ title: 'Key Features', content: 'Financial Dashboard with visual charts\nTransaction management (income & expenses)\nCategory-based organization\nMonthly financial reports\nData export capabilities\nSecure cloud storage', type: 'features' }
			]
		},
		{
			id: 'dashboard',
			title: 'Dashboard Guide',
			description: 'Understanding your financial dashboard',
			content: [
				{ title: 'Financial Overview Chart', content: 'The main chart displays your financial data with two distinct series:\n\nGreen bars/lines: Local Congregation donations\nBlue bars/lines: Worldwide Work donations\n\nYou can switch between bar and line chart views using the toggle buttons.', type: 'chart' },
				{ title: 'Monthly Balance Card', content: 'Shows your current month\'s financial status:\nOpening balance\nTotal income\nTotal expenses\nNet balance\n\nClick "Set Opening Balance" to add a starting balance for the month.', type: 'balance' },
				{ title: 'Month Picker', content: 'Use the month picker to:\nView data for specific months\nSelect "All" to see all-time data\nNavigate between different time periods', type: 'picker' }
			]
		},
		{
			id: 'transactions',
			title: 'Managing Transactions',
			description: 'How to add, edit, and manage transactions',
			content: [
				{ title: 'Adding Transactions', content: '1. Click the "Add Transaction" button\n2. Fill in the transaction details:\n   Date (defaults to today)\n   Description\n   Category (select from dropdown)\n   Amount\n   Type (Income/Expense)\n3. Click "Add Transaction" to save', type: 'steps' },
				{ title: 'Editing Transactions', content: '1. Find the transaction in the list\n2. Click the three-dot menu icon\n3. Select "Edit"\n4. Modify the details\n5. Click "Update Transaction" to save changes', type: 'steps' },
				{ title: 'Deleting Transactions', content: '1. Find the transaction in the list\n2. Click the three-dot menu icon\n3. Select "Delete"\n4. Confirm the deletion\n\nNote: Deleted transactions cannot be recovered.', type: 'warning' }
			]
		},
		{
			id: 'troubleshooting',
			title: 'Troubleshooting',
			description: 'Common issues and solutions',
			content: [
				{ title: 'Login Issues', content: 'If you can\'t log in:\n\nCheck your email and password\nEnsure caps lock is off\nClear browser cache and cookies\nTry a different browser', type: 'info' },
				{ title: 'Data Not Loading', content: 'If data doesn\'t appear:\n\nCheck your internet connection\nRefresh the page\nClear browser cache\nTry logging out and back in', type: 'info' },
				{ title: 'Performance Tips', content: 'For the best experience:\n\nClose unnecessary browser tabs\nClear browser cache periodically\nUse a modern browser (Chrome, Firefox, Edge)\nInstall the PWA version for offline access', type: 'info' }
			]
		},
		{
			id: 'tips',
			title: 'Best Practices',
			description: 'Expert tips for better financial management',
			content: [
				{ title: 'Regular Data Entry', content: 'Enter transactions daily or weekly to keep records accurate. Don\'t let data pile up. Set aside time for regular updates and review entries for accuracy.', type: 'info' },
				{ title: 'Monthly Reviews', content: 'Check opening balances at the start of each month. Verify all transactions before generating reports. Review category totals and export monthly reports for your records.', type: 'info' },
				{ title: 'Security', content: 'Use a strong password for your account. Always log out when finished, especially on shared devices. Don\'t share login credentials with unauthorized individuals.', type: 'warning' }
			]
		}
	];

	$effect(() => {
		if (searchQuery.trim() === '') { filteredSections = helpSections; }
		else {
			filteredSections = helpSections.filter(section =>
				section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
				section.content.some(item =>
					item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					item.content.toLowerCase().includes(searchQuery.toLowerCase())
				)
			);
		}
	});

	onMount(() => { filteredSections = helpSections; });

	function scrollToSection(sectionId: string) {
		activeSection = sectionId;
		const element = document.getElementById(sectionId);
		if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<svelte:head>
	<title>Help & Support - Congregation Accounts</title>
</svelte:head>

<div class="help-page">
	<!-- Header -->
	<div class="help-header">
		<div class="help-header-content">
			<div>
				<h1 class="help-title">Help & Support</h1>
				<p class="help-subtitle">Everything you need to know about managing your accounts</p>
			</div>
			<div class="search-box">
				<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
				</svg>
				<input type="text" placeholder="Search help topics..." bind:value={searchQuery} class="search-input" />
				{#if searchQuery}
					<button onclick={() => searchQuery = ''} class="search-clear" aria-label="Clear search">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="help-layout">
		<!-- Sidebar -->
		<nav class="help-nav">
			<p class="nav-heading">Topics</p>
			{#each filteredSections as section}
				<button onclick={() => scrollToSection(section.id)} class="nav-item {activeSection === section.id ? 'nav-active' : ''}">
					<span class="nav-item-title">{section.title}</span>
					<span class="nav-item-desc">{section.description}</span>
				</button>
			{/each}
		</nav>

		<!-- Main Content -->
		<main class="help-content">
			{#each filteredSections as section}
				<section id={section.id} class="help-section">
					<div class="section-head">
						<h2 class="section-title">{section.title}</h2>
						<p class="section-desc">{section.description}</p>
					</div>
					<div class="section-items">
						{#each section.content as item}
							<div class="help-item {item.type}">
								<h3 class="item-title">{item.title}</h3>
								<div class="item-body">
									{#if item.type === 'steps'}
										<ol class="steps-list">
											{#each item.content.split('\n').filter((l: string) => l.trim()) as step}
												<li>{step.replace(/^\d+\.\s*/, '')}</li>
											{/each}
										</ol>
									{:else if item.type === 'features'}
										<ul class="features-list">
											{#each item.content.split('\n').filter((l: string) => l.trim()) as feature}
												<li>{feature.replace(/^[•\-]\s*/, '')}</li>
											{/each}
										</ul>
									{:else}
										<p class="item-text">{item.content}</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</main>
	</div>
</div>

<style>
	.help-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.help-header {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border-primary);
		border-radius: 0.5rem;
		padding: 1.5rem;
	}

	.help-header-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.help-header-content { flex-direction: row; align-items: center; justify-content: space-between; }
	}

	.help-title { font-size: 1.375rem; font-weight: 700; color: var(--color-text-primary); margin: 0; }
	.help-subtitle { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0.25rem 0 0; }

	.search-box {
		position: relative;
		min-width: 280px;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1rem;
		height: 1rem;
		color: var(--color-text-tertiary);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 2.5rem 0.5rem 2.25rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.8125rem;
		transition: border-color 0.15s;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px var(--color-accent-alpha);
	}

	.search-clear {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		padding: 0.125rem;
		border: none;
		background: transparent;
		color: var(--color-text-tertiary);
		cursor: pointer;
	}

	.help-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	@media (min-width: 1024px) {
		.help-layout { grid-template-columns: 240px 1fr; }
	}

	.help-nav {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border-primary);
		border-radius: 0.5rem;
		padding: 1rem;
		height: fit-content;
		position: sticky;
		top: 72px;
	}

	.nav-heading {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-tertiary);
		margin: 0 0 0.75rem;
		padding: 0 0.5rem;
	}

	.nav-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.625rem 0.5rem;
		border-radius: 0.375rem;
		border: none;
		background: transparent;
		cursor: pointer;
		transition: all 0.15s;
		margin-bottom: 0.125rem;
	}

	.nav-item:hover { background: var(--color-surface-hover); }

	.nav-active {
		background: var(--color-accent-light) !important;
	}

	.nav-item-title {
		display: block;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.125rem;
	}

	.nav-active .nav-item-title { color: var(--color-accent); }

	.nav-item-desc {
		display: block;
		font-size: 0.6875rem;
		color: var(--color-text-tertiary);
		line-height: 1.3;
	}

	.help-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.help-section {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border-primary);
		border-radius: 0.5rem;
		padding: 1.5rem;
	}

	.section-head {
		margin-bottom: 1.25rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.section-title { font-size: 1.125rem; font-weight: 700; color: var(--color-text-primary); margin: 0 0 0.25rem; }
	.section-desc { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0; }

	.section-items {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.help-item {
		padding: 1rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
	}

	.help-item.info { border-left: 3px solid var(--color-info); }
	.help-item.steps { border-left: 3px solid var(--color-success); }
	.help-item.features { border-left: 3px solid var(--color-accent); }
	.help-item.warning { border-left: 3px solid var(--color-warning); }
	.help-item.chart { border-left: 3px solid var(--color-info); }
	.help-item.balance { border-left: 3px solid var(--color-success); }
	.help-item.picker { border-left: 3px solid var(--color-accent); }

	.item-title { font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); margin: 0 0 0.5rem; }

	.item-body { font-size: 0.8125rem; color: var(--color-text-secondary); line-height: 1.6; }
	.item-text { margin: 0; white-space: pre-line; }

	.steps-list { margin: 0; padding-left: 1.25rem; }
	.steps-list li { margin-bottom: 0.375rem; }

	.features-list { margin: 0; padding-left: 1.25rem; }
	.features-list li { margin-bottom: 0.375rem; }

	@media (max-width: 1024px) {
		.help-nav { position: static; order: 2; }
		.help-content { order: 1; }
	}

	@media (max-width: 640px) {
		.help-page { padding: 1rem; gap: 1rem; }
		.help-header { padding: 1rem; }
		.help-section { padding: 1rem; }
		.search-box { min-width: auto; width: 100%; }
	}
</style>
