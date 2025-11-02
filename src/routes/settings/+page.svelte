<script lang="ts">
	import { onMount } from 'svelte';
	
	// Help sections state
	let activeSection = $state('getting-started');
	let searchQuery = $state('');
	let filteredSections = $state<typeof helpSections>([]);
	
	// Help sections data
	const helpSections = [
		{
			id: 'getting-started',
			title: 'Getting Started',
			icon: '🚀',
			description: 'Learn the basics of using Congregation Accounts',
			content: [
				{
					title: 'Welcome to Congregation Accounts',
					content: 'Congregation Accounts is a comprehensive financial management system designed specifically for congregations. It helps you track donations, manage expenses, and maintain accurate financial records.',
					type: 'info'
				},
				{
					title: 'First Steps',
					content: '1. Sign up for an account using your email\n2. Set up your congregation information\n3. Add your first transaction\n4. Explore the dashboard and charts',
					type: 'steps'
				},
				{
					title: 'Key Features',
					content: '• Financial Dashboard with visual charts\n• Transaction management (income & expenses)\n• Category-based organization\n• Monthly financial reports\n• Data export capabilities\n• Secure cloud storage',
					type: 'features'
				}
			]
		},
		{
			id: 'dashboard',
			title: 'Dashboard Guide',
			icon: '📊',
			description: 'Understanding your financial dashboard',
			content: [
				{
					title: 'Financial Overview Chart',
					content: 'The main chart displays your financial data with two distinct series:\n\n• Green bars/lines: Local Congregation donations\n• Blue bars/lines: Worldwide Work donations\n\nYou can switch between bar and line chart views using the toggle buttons.',
					type: 'chart'
				},
				{
					title: 'Monthly Balance Card',
					content: 'Shows your current month\'s financial status:\n• Opening balance\n• Total income\n• Total expenses\n• Net balance\n\nClick "Set Opening Balance" to add a starting balance for the month.',
					type: 'balance'
				},
				{
					title: 'Category Breakdown',
					content: 'Displays separate totals for:\n• Local Congregation (donations & expenses)\n• Worldwide Work (donations & expenses)\n\nEach category shows donations (+), expenses (-), and net balance.',
					type: 'breakdown'
				},
				{
					title: 'Month Picker',
					content: 'Use the month picker to:\n• View data for specific months\n• Select "All" to see all-time data\n• Navigate between different time periods',
					type: 'picker'
				}
			]
		},
		{
			id: 'transactions',
			title: 'Managing Transactions',
			icon: '💰',
			description: 'How to add, edit, and manage transactions',
			content: [
				{
					title: 'Adding Transactions',
					content: '1. Click the "Add Transaction" button\n2. Fill in the transaction details:\n   • Date (defaults to today)\n   • Description\n   • Category (select from dropdown)\n   • Amount\n   • Type (Income/Expense)\n3. Click "Add Transaction" to save',
					type: 'steps'
				},
				{
					title: 'Transaction Categories',
					content: 'Available categories:\n\nLocal Congregation:\n• Local Congregation Donations\n• Local Congregation Expenses\n\nWorldwide Work:\n• Worldwide Work Donations\n• Worldwide Work Expenses',
					type: 'categories'
				},
				{
					title: 'Editing Transactions',
					content: '1. Find the transaction in the list\n2. Click the edit icon (pencil)\n3. Modify the details\n4. Click "Update Transaction" to save changes',
					type: 'steps'
				},
				{
					title: 'Deleting Transactions',
					content: '1. Find the transaction in the list\n2. Click the delete icon (trash)\n3. Confirm the deletion in the popup\n\n⚠️ Warning: Deleted transactions cannot be recovered.',
					type: 'warning'
				},
				{
					title: 'Filtering Transactions',
					content: 'Use the filter buttons to view:\n• All transactions\n• Donations only\n• Expenses only\n\nThis helps you focus on specific types of financial activity.',
					type: 'filter'
				}
			]
		},
		{
			id: 'charts',
			title: 'Understanding Charts',
			icon: '📈',
			description: 'How to read and use the financial charts',
			content: [
				{
					title: 'Chart Types',
					content: 'Two chart types available:\n\n• Line Chart: Shows trends over time with smooth lines\n• Bar Chart: Displays individual transaction amounts as bars\n\nSwitch between types using the toggle buttons.',
					type: 'types'
				},
				{
					title: 'Color Coding',
					content: 'Charts use distinct colors for easy identification:\n\nDonations:\n• 🟢 Green: Local Congregation Donations\n• 🔵 Blue: Worldwide Work Donations\n\nExpenses:\n• 🔴 Red: Local Congregation Expenses\n• 🟣 Purple: Worldwide Work Expenses',
					type: 'colors'
				},
				{
					title: 'Reading the Charts',
					content: '• X-axis: Shows dates (month/day format)\n• Y-axis: Shows amounts in your currency\n• Hover over data points for detailed information\n• Legend shows what each color represents',
					type: 'reading'
				},
				{
					title: 'Chart Interactions',
					content: '• Hover over data points to see transaction details\n• Use the month picker to change the time period\n• Switch between line and bar views\n• Charts automatically update when you add new transactions',
					type: 'interactions'
				}
			]
		},
		{
			id: 'troubleshooting',
			title: 'Troubleshooting',
			icon: '🔧',
			description: 'Common issues and solutions',
			content: [
				{
					title: 'Login Issues',
					content: 'If you can\'t log in:\n\n• Check your email and password\n• Ensure caps lock is off\n• Try resetting your password\n• Clear browser cache and cookies\n• Contact support if problems persist',
					type: 'login'
				},
				{
					title: 'Data Not Loading',
					content: 'If data doesn\'t appear:\n\n• Check your internet connection\n• Refresh the page\n• Clear browser cache\n• Try logging out and back in\n• Check if you have any transactions for the selected month',
					type: 'loading'
				},
				{
					title: 'Chart Display Issues',
					content: 'If charts don\'t show properly:\n\n• Ensure you have transactions in the selected month\n• Try switching between chart types\n• Check your browser\'s JavaScript is enabled\n• Try a different browser\n• Clear browser cache',
					type: 'charts'
				},
				{
					title: 'Performance Issues',
					content: 'If the app runs slowly:\n\n• Close unnecessary browser tabs\n• Clear browser cache\n• Check your internet connection\n• Restart your browser\n• Try using a different browser',
					type: 'performance'
				},
				{
					title: 'Mobile Issues',
					content: 'For mobile users:\n\n• Use a modern mobile browser\n• Ensure you have a stable internet connection\n• Try rotating your device for better viewing\n• Use the PWA (Progressive Web App) version if available',
					type: 'mobile'
				}
			]
		},
		{
			id: 'tips',
			title: 'Tips & Best Practices',
			icon: '💡',
			description: 'Expert tips for better financial management',
			content: [
				{
					title: 'Regular Data Entry',
					content: 'Best practices:\n\n• Enter transactions daily or weekly\n• Don\'t let data pile up\n• Review entries for accuracy\n• Set aside time for regular updates',
					type: 'regular'
				},
				{
					title: 'Category Organization',
					content: 'Organize your finances:\n\n• Use consistent category names\n• Separate local and worldwide work\n• Add detailed descriptions\n• Review categories regularly',
					type: 'organization'
				},
				{
					title: 'Monthly Reviews',
					content: 'Conduct monthly reviews:\n\n• Check opening balances\n• Verify all transactions\n• Review category totals\n• Export monthly reports\n• Plan for the next month',
					type: 'reviews'
				},
				{
					title: 'Security Tips',
					content: 'Keep your data secure:\n\n• Use strong passwords\n• Log out when finished\n• Don\'t share login credentials\n• Regular data backups\n• Use secure networks',
					type: 'security'
				},
				{
					title: 'Efficiency Tips',
					content: 'Work more efficiently:\n\n• Use keyboard shortcuts\n• Bookmark the app\n• Set up recurring transactions\n• Use filters to find data quickly\n• Take advantage of the search function',
					type: 'efficiency'
				}
			]
		}
	];

	// Initialize filtered sections
	$effect(() => {
		if (searchQuery.trim() === '') {
			filteredSections = helpSections;
		} else {
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

	// Set initial filtered sections
	onMount(() => {
		filteredSections = helpSections;
	});

	function scrollToSection(sectionId: string) {
		activeSection = sectionId;
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	function clearSearch() {
		searchQuery = '';
	}
</script>

<svelte:head>
	<title>Help & Support - Congregation Accounts</title>
	<meta name="description" content="Comprehensive help guide for Congregation Accounts - Learn how to manage your congregation's finances effectively.">
</svelte:head>

<div class="help-container">
	<!-- Header -->
	<div class="help-header">
		<div class="header-content">
			<div class="header-text">
				<h1 class="header-title">
					<span class="header-icon">❓</span>
					Help & Support
				</h1>
				<p class="header-subtitle">Everything you need to know about using Congregation Accounts</p>
			</div>
			
			<!-- Search Bar -->
			<div class="search-container">
				<div class="search-input-group">
					<input
						type="text"
						placeholder="Search help topics..."
						bind:value={searchQuery}
						class="search-input"
					/>
					<div class="search-icon">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
						</svg>
					</div>
					{#if searchQuery}
						<button onclick={clearSearch} class="search-clear" aria-label="Clear search">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
							</svg>
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="help-content">
		<!-- Sidebar Navigation -->
		<nav class="help-sidebar">
			<div class="sidebar-header">
				<h3 class="sidebar-title">Help Topics</h3>
				<p class="sidebar-subtitle">{filteredSections.length} topics available</p>
			</div>
			
			<div class="sidebar-nav">
				{#each filteredSections as section}
					<button
						onclick={() => scrollToSection(section.id)}
						class="nav-item {activeSection === section.id ? 'active' : ''}"
					>
						<span class="nav-icon">{section.icon}</span>
						<div class="nav-content">
							<span class="nav-title">{section.title}</span>
							<span class="nav-description">{section.description}</span>
						</div>
					</button>
				{/each}
			</div>
		</nav>

		<!-- Help Content -->
		<main class="help-main">
			{#each filteredSections as section}
				<section id={section.id} class="help-section">
					<div class="section-header">
						<h2 class="section-title">
							<span class="section-icon">{section.icon}</span>
							{section.title}
						</h2>
						<p class="section-description">{section.description}</p>
					</div>
					
					<div class="section-content">
						{#each section.content as item}
							<div class="help-item {item.type}">
								<h3 class="item-title">{item.title}</h3>
								<div class="item-content">
									{#if item.type === 'steps'}
										<ol class="steps-list">
											{#each item.content.split('\n').filter((line: string) => line.trim()) as step}
												<li class="step-item">{step.replace(/^\d+\.\s*/, '')}</li>
											{/each}
										</ol>
									{:else if item.type === 'features'}
										<ul class="features-list">
											{#each item.content.split('\n').filter((line: string) => line.trim()) as feature}
												<li class="feature-item">{feature.replace(/^[•\-]\s*/, '')}</li>
											{/each}
										</ul>
									{:else if item.type === 'categories'}
										<div class="categories-content">
											{#each item.content.split('\n\n') as categoryGroup}
												<div class="category-group">
													{#each categoryGroup.split('\n').filter((line: string) => line.trim()) as category}
														<div class="category-item">{category.replace(/^[•\-]\s*/, '')}</div>
													{/each}
												</div>
											{/each}
										</div>
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
	/* ========== Main Container ========== */
	.help-container {
		max-width: 80rem;
		margin: 0 auto;
		padding: 2rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		background: var(--color-bg-secondary);
		min-height: 100vh;
	}

	/* ========== Header ========== */
	.help-header {
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

	/* ========== Search ========== */
	.search-container {
		min-width: 20rem;
	}

	.search-input-group {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-input {
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

	.search-input:focus {
		outline: none;
		border-color: #4f46e5;
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
	}

	.search-icon {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--color-text-tertiary);
	}

	.search-clear {
		position: absolute;
		right: 2.5rem;
		top: 50%;
		transform: translateY(-50%);
		padding: 0.25rem;
		border-radius: 0.375rem;
		transition: background-color 0.2s;
		color: var(--color-text-secondary);
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.search-clear:hover {
		background-color: rgba(0, 0, 0, 0.1);
	}

	/* ========== Main Content ========== */
	.help-content {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}

	@media (min-width: 1024px) {
		.help-content {
			grid-template-columns: 300px 1fr;
		}
	}

	/* ========== Sidebar ========== */
	.help-sidebar {
		border-radius: 1rem;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
		border: 1px solid;
		padding: 1.5rem;
		background: var(--color-glass-bg);
		border-color: var(--color-glass-border);
		backdrop-filter: blur(20px);
		height: fit-content;
		position: sticky;
		top: 2rem;
	}

	.sidebar-header {
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid;
		border-color: var(--color-border-primary);
	}

	.sidebar-title {
		font-size: 1.125rem;
		font-weight: 700;
		margin-bottom: 0.25rem;
		color: var(--color-text-primary);
	}

	.sidebar-subtitle {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.nav-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 0.75rem;
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 0.2s ease;
		background: transparent;
		text-align: left;
		width: 100%;
	}

	.nav-item:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-border-primary);
	}

	.nav-item.active {
		background: rgba(79, 70, 229, 0.1);
		border-color: rgba(79, 70, 229, 0.3);
		color: #4f46e5;
	}

	.nav-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.nav-content {
		flex: 1;
		min-width: 0;
	}

	.nav-title {
		display: block;
		font-weight: 600;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
		color: var(--color-text-primary);
	}

	.nav-item.active .nav-title {
		color: #4f46e5;
	}

	.nav-description {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		line-height: 1.4;
	}

	/* ========== Main Help Content ========== */
	.help-main {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.help-section {
		border-radius: 1rem;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
		border: 1px solid;
		padding: 2rem;
		background: var(--color-glass-bg);
		border-color: var(--color-glass-border);
		backdrop-filter: blur(20px);
	}

	.section-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid;
		border-color: var(--color-border-primary);
	}

	.section-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		color: var(--color-text-primary);
	}

	.section-icon {
		font-size: 1.75rem;
		margin-right: 0.75rem;
	}

	.section-description {
		font-size: 1rem;
		color: var(--color-text-secondary);
	}

	.section-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* ========== Help Items ========== */
	.help-item {
		padding: 1.5rem;
		border-radius: 0.75rem;
		border: 1px solid;
		background: var(--color-bg-primary);
		border-color: var(--color-border-primary);
	}

	.help-item.info {
		border-left: 4px solid #3b82f6;
		background: rgba(59, 130, 246, 0.05);
	}

	.help-item.warning {
		border-left: 4px solid #f59e0b;
		background: rgba(245, 158, 11, 0.05);
	}

	.help-item.steps {
		border-left: 4px solid #10b981;
		background: rgba(16, 185, 129, 0.05);
	}

	.help-item.features {
		border-left: 4px solid #8b5cf6;
		background: rgba(139, 92, 246, 0.05);
	}

	.help-item.chart {
		border-left: 4px solid #06b6d4;
		background: rgba(6, 182, 212, 0.05);
	}

	.help-item.balance {
		border-left: 4px solid #84cc16;
		background: rgba(132, 204, 22, 0.05);
	}

	.help-item.breakdown {
		border-left: 4px solid #f97316;
		background: rgba(249, 115, 22, 0.05);
	}

	.help-item.picker {
		border-left: 4px solid #ec4899;
		background: rgba(236, 72, 153, 0.05);
	}

	.help-item.categories {
		border-left: 4px solid #6366f1;
		background: rgba(99, 102, 241, 0.05);
	}

	.help-item.filter {
		border-left: 4px solid #14b8a6;
		background: rgba(20, 184, 166, 0.05);
	}

	.help-item.types {
		border-left: 4px solid #a855f7;
		background: rgba(168, 85, 247, 0.05);
	}

	.help-item.colors {
		border-left: 4px solid #e11d48;
		background: rgba(225, 29, 72, 0.05);
	}

	.help-item.reading {
		border-left: 4px solid #059669;
		background: rgba(5, 150, 105, 0.05);
	}

	.help-item.interactions {
		border-left: 4px solid #dc2626;
		background: rgba(220, 38, 38, 0.05);
	}

	.help-item.monthly {
		border-left: 4px solid #0891b2;
		background: rgba(8, 145, 178, 0.05);
	}

	.help-item.export {
		border-left: 4px solid #16a34a;
		background: rgba(22, 163, 74, 0.05);
	}

	.help-item.backup {
		border-left: 4px solid #7c3aed;
		background: rgba(124, 58, 237, 0.05);
	}

	.help-item.print {
		border-left: 4px solid #ea580c;
		background: rgba(234, 88, 12, 0.05);
	}

	.help-item.login {
		border-left: 4px solid #be123c;
		background: rgba(190, 18, 60, 0.05);
	}

	.help-item.loading {
		border-left: 4px solid #0d9488;
		background: rgba(13, 148, 136, 0.05);
	}

	.help-item.charts {
		border-left: 4px solid #c2410c;
		background: rgba(194, 65, 12, 0.05);
	}

	.help-item.performance {
		border-left: 4px solid #be185d;
		background: rgba(190, 24, 93, 0.05);
	}

	.help-item.mobile {
		border-left: 4px solid #1e40af;
		background: rgba(30, 64, 175, 0.05);
	}

	.help-item.regular {
		border-left: 4px solid #059669;
		background: rgba(5, 150, 105, 0.05);
	}

	.help-item.organization {
		border-left: 4px solid #7c2d12;
		background: rgba(124, 45, 18, 0.05);
	}

	.help-item.reviews {
		border-left: 4px solid #1d4ed8;
		background: rgba(29, 78, 216, 0.05);
	}

	.help-item.security {
		border-left: 4px solid #dc2626;
		background: rgba(220, 38, 38, 0.05);
	}

	.help-item.efficiency {
		border-left: 4px solid #9333ea;
		background: rgba(147, 51, 234, 0.05);
	}

	.item-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
		color: var(--color-text-primary);
	}

	.item-content {
		color: var(--color-text-secondary);
		line-height: 1.6;
	}

	.item-text {
		margin: 0;
		font-size: 0.875rem;
		white-space: pre-line;
	}

	/* ========== Lists ========== */
	.steps-list {
		margin: 0;
		padding-left: 1.5rem;
	}

	.step-item {
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.features-list {
		margin: 0;
		padding-left: 1.5rem;
	}

	.feature-item {
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.categories-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.category-group {
		padding: 1rem;
		border-radius: 0.5rem;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
	}

	.category-item {
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
		padding-left: 1rem;
		position: relative;
	}

	.category-item::before {
		content: "•";
		position: absolute;
		left: 0;
		color: var(--color-text-tertiary);
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
		text-decoration: none;
	}

	.btn:hover {
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
		transform: translateY(-2px);
	}

	.btn:active {
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
		transform: translateY(0);
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

	/* ========== Responsive Design ========== */
	@media (max-width: 1024px) {
		.help-content {
			grid-template-columns: 1fr;
		}

		.help-sidebar {
			position: static;
			order: 2;
		}

		.help-main {
			order: 1;
		}
	}

	@media (max-width: 640px) {
		.help-container {
			padding: 1rem;
			gap: 1.5rem;
		}

		.help-header {
			padding: 1.5rem;
		}

		.help-section {
			padding: 1.5rem;
		}

		.header-content {
			flex-direction: column;
			gap: 1rem;
		}

		.search-container {
			min-width: auto;
			width: 100%;
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

	.help-section {
		animation: fadeInUp 0.6s ease-out;
	}

	.help-section:nth-child(1) { animation-delay: 0.1s; }
	.help-section:nth-child(2) { animation-delay: 0.2s; }
	.help-section:nth-child(3) { animation-delay: 0.3s; }
	.help-section:nth-child(4) { animation-delay: 0.4s; }
	.help-section:nth-child(5) { animation-delay: 0.5s; }
	.help-section:nth-child(6) { animation-delay: 0.6s; }
	.help-section:nth-child(7) { animation-delay: 0.7s; }
	.help-section:nth-child(8) { animation-delay: 0.8s; }

	/* ========== Dark Mode Overrides ========== */
	:root.dark .help-item.info {
		background: rgba(59, 130, 246, 0.1);
	}

	:root.dark .help-item.warning {
		background: rgba(245, 158, 11, 0.1);
	}

	:root.dark .help-item.steps {
		background: rgba(16, 185, 129, 0.1);
	}

	:root.dark .help-item.features {
		background: rgba(139, 92, 246, 0.1);
	}

	:root.dark .help-item.chart {
		background: rgba(6, 182, 212, 0.1);
	}

	:root.dark .help-item.balance {
		background: rgba(132, 204, 22, 0.1);
	}

	:root.dark .help-item.breakdown {
		background: rgba(249, 115, 22, 0.1);
	}

	:root.dark .help-item.picker {
		background: rgba(236, 72, 153, 0.1);
	}

	:root.dark .help-item.categories {
		background: rgba(99, 102, 241, 0.1);
	}

	:root.dark .help-item.filter {
		background: rgba(20, 184, 166, 0.1);
	}

	:root.dark .help-item.types {
		background: rgba(168, 85, 247, 0.1);
	}

	:root.dark .help-item.colors {
		background: rgba(225, 29, 72, 0.1);
	}

	:root.dark .help-item.reading {
		background: rgba(5, 150, 105, 0.1);
	}

	:root.dark .help-item.interactions {
		background: rgba(220, 38, 38, 0.1);
	}

	:root.dark .help-item.monthly {
		background: rgba(8, 145, 178, 0.1);
	}

	:root.dark .help-item.export {
		background: rgba(22, 163, 74, 0.1);
	}

	:root.dark .help-item.backup {
		background: rgba(124, 58, 237, 0.1);
	}

	:root.dark .help-item.print {
		background: rgba(234, 88, 12, 0.1);
	}

	:root.dark .help-item.login {
		background: rgba(190, 18, 60, 0.1);
	}

	:root.dark .help-item.loading {
		background: rgba(13, 148, 136, 0.1);
	}

	:root.dark .help-item.charts {
		background: rgba(194, 65, 12, 0.1);
	}

	:root.dark .help-item.performance {
		background: rgba(190, 24, 93, 0.1);
	}

	:root.dark .help-item.mobile {
		background: rgba(30, 64, 175, 0.1);
	}

	:root.dark .help-item.regular {
		background: rgba(5, 150, 105, 0.1);
	}

	:root.dark .help-item.organization {
		background: rgba(124, 45, 18, 0.1);
	}

	:root.dark .help-item.reviews {
		background: rgba(29, 78, 216, 0.1);
	}

	:root.dark .help-item.security {
		background: rgba(220, 38, 38, 0.1);
	}

	:root.dark .help-item.efficiency {
		background: rgba(147, 51, 234, 0.1);
	}

	/* ========== Smooth Animations ========== */
	* {
		transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
	}
</style>