<script lang="ts">
	import { onMount } from 'svelte';

	let activeSection = $state('getting-started');
	let searchQuery = $state('');
	let filteredSections = $state<typeof helpSections>([]);
	let expandedFaq = $state<string | null>(null);

	const helpSections = [
		{
			id: 'getting-started',
			title: 'Getting Started',
			icon: 'rocket',
			description: 'Set up your account and start managing finances',
			content: [
				{
					title: 'What is Congregation Accounts?',
					content: 'Congregation Accounts is a purpose-built financial management platform for congregations. It provides a centralized place to record donations, track expenses, generate official reports, and maintain a clear audit trail of all financial activity.',
					type: 'info'
				},
				{
					title: 'Creating Your Account',
					content: '1. Open the app and click "Sign Up" on the login screen\n2. Enter your email address\n3. Create a password and confirm it\n4. Click "Sign Up" to create your account\n5. You will be automatically logged into the dashboard',
					type: 'steps'
				},
				{
					title: 'Your First Month Setup',
					content: '1. Set the opening balance for the current month by clicking the "Set Opening Balance" button on the dashboard\n2. Enter the starting amount, select the date, and add an optional note\n3. Begin recording transactions as they occur\n4. Use the combined donation entry to log multiple donation categories at once',
					type: 'steps'
				},
				{
					title: 'Navigation Overview',
					content: 'Dashboard: Your main workspace for transactions, charts, and reports\nNotes: A built-in notepad for meeting notes, reminders, or any internal records\nKHOC: A password-protected section for Kingdom Hall Operating Committee accounting\nHelp: This documentation page',
					type: 'features'
				}
			]
		},
		{
			id: 'dashboard',
			title: 'Dashboard',
			icon: 'chart',
			description: 'Financial overview, KPIs, charts, and forecasting',
			content: [
				{
					title: 'KPI Cards',
					content: 'The top of the dashboard displays six financial summary cards:\n\nOpening Balance: The starting balance for the selected month. Click the button to set or update it.\nTotal Donations: Sum of all income transactions for the period.\nTotal Expenses: Sum of all expense transactions for the period.\nWorldwide Work: Total donations designated for Worldwide Work.\nLocal Congregation: Total donations designated for the Local Congregation.\nClosing Balance: Calculated as Opening Balance + Total Donations - Total Expenses.',
					type: 'balance'
				},
				{
					title: 'Month Picker',
					content: 'Located at the top of the dashboard, the month picker lets you navigate between months to view historical data. Select a specific month to see that period\'s transactions and balances, or select "All" to view aggregated data across all recorded months.',
					type: 'picker'
				},
				{
					title: 'Financial Overview Chart',
					content: 'The chart visualizes your donation data over time using two series:\n\nGreen: Local Congregation donations\nBlue: Worldwide Work donations\n\nYou can toggle between a bar chart and a line chart using the view buttons above the chart. Below the chart, the Chart Summary shows quick statistics including totals and averages.',
					type: 'chart'
				},
				{
					title: 'Donation Forecast',
					content: 'Once you have at least three months of historical data, the Donation Forecast section becomes available. It uses linear regression to project future donations.\n\nFeatures:\n\nA 12-month timeline combining historical data with projected values\nForecasted values shown with dashed lines to distinguish from actuals\nToggle between Total view and Category breakdown (Worldwide Work vs. Local Congregation)\nYear selector to view different periods\nSummary cards with 3-month projections per category',
					type: 'chart'
				}
			]
		},
		{
			id: 'transactions',
			title: 'Transactions',
			icon: 'list',
			description: 'Recording, editing, and organizing financial entries',
			content: [
				{
					title: 'Adding a Single Transaction',
					content: '1. Click the "Add Transaction" button on the dashboard\n2. Choose the transaction type tab: Donation or Expense\n3. Select a date (defaults to today)\n4. Choose a description from the dropdown or enter a custom one\n5. Select the category\n6. Enter the amount\n7. Click "Add Transaction" to save',
					type: 'steps'
				},
				{
					title: 'Income Categories',
					content: 'Worldwide Work Donations: Funds designated for the worldwide work\nLocal Congregation Donations: Funds for local congregation use\nOther Donations: Any other income that does not fall into the above',
					type: 'features'
				},
				{
					title: 'Expense Categories',
					content: 'KHOC: Kingdom Hall Operating Committee expenses\nResolution: Congregation resolutions\nWorldwide Work Expenses: Expenses related to worldwide work contributions\nLocal Congregation Expenses: General congregation operating expenses',
					type: 'features'
				},
				{
					title: 'Combined Donation Entry',
					content: 'For convenience, you can record donations for both Worldwide Work and Local Congregation in a single form.\n\n1. Click "Add Transaction" and select the Combined Donations tab\n2. Select the date (applies to both entries)\n3. Enter the Worldwide Work donation amount\n4. Enter the Local Congregation donation amount\n5. At least one amount must be greater than zero\n6. Click "Add Donations" to create both transactions at once',
					type: 'steps'
				},
				{
					title: 'Combined Expense Entry',
					content: 'Similarly, you can record multiple expenses in one go.\n\n1. Click "Add Transaction" and select the Combined Expenses tab\n2. Select the date\n3. For each category row (Local Congregation, Worldwide Work, Resolution, KHOC), enter a description and amount as needed\n4. Only categories with amounts will be saved\n5. Click "Add Expenses" to create all entries',
					type: 'steps'
				},
				{
					title: 'Editing a Transaction',
					content: '1. Locate the transaction in the table\n2. Click the three-dot menu icon on the right side of the row\n3. Select "Edit"\n4. Update the fields you want to change\n5. Click "Update Transaction" to save your changes',
					type: 'steps'
				},
				{
					title: 'Deleting a Transaction',
					content: '1. Locate the transaction in the table\n2. Click the three-dot menu icon\n3. Select "Delete"\n4. Confirm the deletion when prompted\n\nImportant: Deleted transactions cannot be recovered. Always verify before confirming.',
					type: 'warning'
				},
				{
					title: 'Filtering and Sorting',
					content: 'Use the filter tabs above the transaction list to show:\n\nAll: Every transaction for the selected period\nDonations: Only income transactions\nExpenses: Only expense transactions\n\nClick on column headers (Date, Description, Category, Amount) to sort the list. Click again to reverse the sort order.\n\nYou can also adjust how many transactions appear per page using the pagination control at the bottom (5, 10, 20, 50, or 100 items per page).',
					type: 'info'
				}
			]
		},
		{
			id: 'opening-balance',
			title: 'Opening Balance',
			icon: 'wallet',
			description: 'Setting and managing monthly starting balances',
			content: [
				{
					title: 'What is the Opening Balance?',
					content: 'The opening balance represents the funds available at the start of a given month. It is the starting point for that month\'s financial calculations. Your closing balance is computed as:\n\nClosing Balance = Opening Balance + Total Donations - Total Expenses',
					type: 'info'
				},
				{
					title: 'Setting an Opening Balance',
					content: '1. On the dashboard, click the "Set Opening Balance" button in the Opening Balance KPI card\n2. Enter the balance amount\n3. Select the effective date (typically the first of the month)\n4. Optionally add a note for context (e.g., "Carried over from December")\n5. Click "Save" to record it',
					type: 'steps'
				},
				{
					title: 'Updating or Removing',
					content: 'To update an existing opening balance, open the same modal and modify the amount. To remove an opening balance for a specific month, use the delete option within the modal. This will reset the opening balance for that month to zero.',
					type: 'info'
				}
			]
		},
		{
			id: 'reports',
			title: 'PDF Reports',
			icon: 'document',
			description: 'Generating and downloading official financial reports',
			content: [
				{
					title: 'Available Report Templates',
					content: 'S-26_E: Congregation\'s monthly financial report form\nS-30_E: Monthly report of Kingdom Hall fund',
					type: 'features'
				},
				{
					title: 'Generating a Report',
					content: '1. Select the month you want to report on using the month picker\n2. Click the "Export" button on the dashboard\n3. Choose the report template (S-26_E or S-30_E) from the dropdown\n4. The system will auto-fill the report with your transaction data\n5. The PDF will download to your device automatically',
					type: 'steps'
				},
				{
					title: 'What Gets Included',
					content: 'Each report is automatically populated with:\n\nCongregation name\nMonth and year\nOpening balance\nWorldwide Work donation totals\nLocal Congregation donation totals\nKHOC contributions\nResolution expenses\nWorldwide Work expenses\nCalculated totals and closing balance\n\nAmounts are formatted with comma separators for readability.',
					type: 'info'
				},
				{
					title: 'Report Best Practice',
					content: 'Before generating a report, make sure all transactions for the month have been entered and verified. Check that the opening balance is set correctly. Once generated, review the PDF for accuracy before distributing.',
					type: 'warning'
				}
			]
		},
		{
			id: 'notes',
			title: 'Notes',
			icon: 'note',
			description: 'Using the built-in notepad for internal records',
			content: [
				{
					title: 'Creating a Note',
					content: '1. Navigate to the Notes section from the sidebar\n2. Click "New Note"\n3. Enter a title (up to 100 characters)\n4. Write your content in the text area (up to 5,000 characters)\n5. The note saves automatically',
					type: 'steps'
				},
				{
					title: 'Managing Notes',
					content: 'Edit: Click on any note to open it, then modify the title or content directly.\nDelete: Use the delete option to remove a note. You will be asked to confirm before deletion.\nSearch: Use the search bar to filter notes by title or content.\nSort: Organize notes by Last Updated, Date Created, or Title in ascending or descending order.',
					type: 'info'
				},
				{
					title: 'Use Cases',
					content: 'Meeting notes or announcements\nReminders for upcoming financial tasks\nAudit preparation checklists\nInstructions for new accounts servants\nAny internal documentation you want to keep alongside your financial data',
					type: 'features'
				}
			]
		},
		{
			id: 'khoc',
			title: 'KHOC Section',
			icon: 'lock',
			description: 'Kingdom Hall Operating Committee restricted accounting',
			content: [
				{
					title: 'What is KHOC?',
					content: 'The KHOC section is a separate, password-protected area for managing Kingdom Hall Operating Committee finances. It operates independently from the main congregation accounts, with its own transactions, balances, and image storage.',
					type: 'info'
				},
				{
					title: 'Accessing KHOC',
					content: '1. Click the KHOC option in the sidebar navigation\n2. You will be prompted to enter credentials\n3. Enter the authorized email and password\n4. Access is granted for the duration of your browser session\n5. Closing the browser or clearing session data will require re-authentication',
					type: 'steps'
				},
				{
					title: 'KHOC Donation Categories',
					content: 'ESP (Esperanza): Donations from the Esperanza congregation\nBOL (Bolaoen): Donations from the Bolaoen congregation',
					type: 'features'
				},
				{
					title: 'KHOC Features',
					content: 'The KHOC dashboard mirrors the main dashboard with:\n\nKPI cards for Esperanza donations, Bolaoen donations, and closing balance\nMonthly transaction management\nOpening balance per month\nMonthly images with KHOC-specific storage\nFiltering and pagination',
					type: 'info'
				}
			]
		},
		{
			id: 'images',
			title: 'Monthly Images',
			icon: 'image',
			description: 'Uploading and managing document images per month',
			content: [
				{
					title: 'What are Monthly Images?',
					content: 'Monthly Images lets you attach scanned receipts, deposit slips, or any supporting documents to a specific month. Images are stored securely in the cloud and organized by month for easy retrieval.',
					type: 'info'
				},
				{
					title: 'Uploading an Image',
					content: '1. Scroll to the Monthly Images section on the dashboard\n2. Drag and drop an image file onto the upload area, or click to browse your files\n3. The image will upload to the cloud automatically\n4. Once complete, it will appear in the gallery for the selected month',
					type: 'steps'
				},
				{
					title: 'Deleting an Image',
					content: 'Click the delete button on any image in the gallery. You will be asked to confirm before the image is permanently removed from both the database and cloud storage.\n\nImportant: Deleted images cannot be recovered.',
					type: 'warning'
				},
				{
					title: 'Supported Formats',
					content: 'Standard image formats are supported (JPG, PNG, etc.). If you attempt to upload an unsupported file type, an error message will appear. For best results, use clear, well-lit photos or high-resolution scans.',
					type: 'info'
				}
			]
		},
		{
			id: 'appearance',
			title: 'Appearance & PWA',
			icon: 'palette',
			description: 'Theme settings, sidebar, and installing the app',
			content: [
				{
					title: 'Light and Dark Mode',
					content: 'Toggle between light and dark themes using the theme button in the sidebar footer. Your preference is saved and will persist across sessions.',
					type: 'info'
				},
				{
					title: 'Sidebar',
					content: 'The sidebar can be collapsed to give more screen space to the main content area. Click the collapse button to toggle. Your preference is saved in your browser.\n\nOn mobile devices, the sidebar is replaced with a bottom navigation bar for quick access, and a hamburger menu for the full navigation overlay.',
					type: 'info'
				},
				{
					title: 'Install as App (PWA)',
					content: 'Congregation Accounts supports installation as a Progressive Web App. When prompted by your browser, click "Install" to add the app to your home screen or desktop. The PWA version provides:\n\nFaster load times\nApp-like experience without the browser toolbar\nOffline access to previously loaded data',
					type: 'features'
				}
			]
		},
		{
			id: 'security',
			title: 'Account & Security',
			icon: 'shield',
			description: 'Login, logout, and keeping your account safe',
			content: [
				{
					title: 'Logging In',
					content: '1. Open the app in your browser\n2. Enter the email and password associated with your account\n3. Click "Log In"\n4. If credentials are correct, you will be taken to the dashboard',
					type: 'steps'
				},
				{
					title: 'Logging Out',
					content: 'Click the "Logout" button in the sidebar to end your session. Always log out when using a shared or public device.',
					type: 'info'
				},
				{
					title: 'Security Recommendations',
					content: 'Use a strong, unique password for your account\nDo not share your login credentials with unauthorized individuals\nAlways log out after each session, especially on shared devices\nKeep your browser up to date for the latest security patches\nIf you suspect unauthorized access, change your password immediately',
					type: 'warning'
				}
			]
		},
		{
			id: 'faq',
			title: 'FAQ',
			icon: 'question',
			description: 'Frequently asked questions and answers',
			content: [
				{
					title: 'How is the closing balance calculated?',
					content: 'Closing Balance = Opening Balance + Total Donations - Total Expenses. This is calculated automatically based on the transactions and opening balance for the selected month.',
					type: 'info'
				},
				{
					title: 'Can I edit a transaction after saving it?',
					content: 'Yes. Click the three-dot menu on any transaction row and select "Edit." Update the fields and save. The dashboard totals will recalculate automatically.',
					type: 'info'
				},
				{
					title: 'What happens if I forget to set the opening balance?',
					content: 'If no opening balance is set for a month, it defaults to zero. Your closing balance will still be calculated, but it will only reflect donations minus expenses for that period.',
					type: 'info'
				},
				{
					title: 'How many months of data do I need for the forecast?',
					content: 'The Donation Forecast requires a minimum of three months of historical data. The more data available, the more reliable the projection.',
					type: 'info'
				},
				{
					title: 'Can I use the app on my phone?',
					content: 'Yes. The app is fully responsive and works on any screen size. On mobile, the sidebar is replaced with a bottom navigation bar. You can also install it as a PWA for an app-like experience.',
					type: 'info'
				},
				{
					title: 'Is my data backed up?',
					content: 'All data is stored securely in Firebase cloud infrastructure. Your transactions, notes, and images are synced in real-time and persist across devices as long as you log in with the same account.',
					type: 'info'
				},
				{
					title: 'What are the S-26_E and S-30_E reports?',
					content: 'These are standardized financial report forms. The S-26_E is the Congregation\'s Monthly Financial Report, and the S-30_E is the Monthly Report of Kingdom Hall Fund. The app auto-fills these templates with your data for easy download.',
					type: 'info'
				},
				{
					title: 'Why can\'t I access the KHOC section?',
					content: 'The KHOC section requires separate credentials. Contact your accounts servant or an authorized individual for access. The session expires when you close the browser.',
					type: 'info'
				}
			]
		},
		{
			id: 'troubleshooting',
			title: 'Troubleshooting',
			icon: 'wrench',
			description: 'Solving common issues',
			content: [
				{
					title: 'Cannot Log In',
					content: 'Verify your email address is typed correctly\nCheck that caps lock is not enabled\nClear your browser cache and cookies, then try again\nTry a different browser\nIf the problem persists, create a new account or contact your administrator',
					type: 'warning'
				},
				{
					title: 'Data Not Loading',
					content: 'Check your internet connection\nRefresh the page\nClear browser cache\nLog out and log back in\nEnsure you are using a supported browser (Chrome, Firefox, Edge, Safari)',
					type: 'info'
				},
				{
					title: 'PDF Report Not Downloading',
					content: 'Ensure pop-ups are not blocked in your browser\nCheck your downloads folder\nTry a different browser\nMake sure transactions exist for the selected month',
					type: 'info'
				},
				{
					title: 'Image Upload Failing',
					content: 'Verify the file is a supported image format (JPG, PNG)\nCheck that the file size is not excessively large\nEnsure you have a stable internet connection\nTry refreshing the page and uploading again',
					type: 'info'
				},
				{
					title: 'Performance Tips',
					content: 'Close unnecessary browser tabs to free up memory\nClear browser cache periodically\nUse a modern, updated browser\nInstall the PWA version for faster load times\nUse monthly filtering instead of viewing all-time data when possible',
					type: 'info'
				}
			]
		}
	];

	const sectionIcons: Record<string, string> = {
		rocket: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-6.914 0',
		chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
		list: 'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
		wallet: 'M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h.75A2.25 2.25 0 0118 6v.75m-3 3.75H6.75A2.25 2.25 0 004.5 12.75v6A2.25 2.25 0 006.75 21h10.5A2.25 2.25 0 0019.5 18.75v-6a2.25 2.25 0 00-2.25-2.25zm-13.5 0V6.75A2.25 2.25 0 016 4.5h10.5a2.25 2.25 0 012.25 2.25V12M6 12h12',
		document: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
		note: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
		lock: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
		image: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0021 3H3a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 003 21z',
		palette: 'M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z',
		shield: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
		question: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z',
		wrench: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.049.58.025 1.193-.14 1.743'
	};

	$effect(() => {
		if (searchQuery.trim() === '') {
			filteredSections = helpSections;
		} else {
			const query = searchQuery.toLowerCase();
			filteredSections = helpSections.filter(section =>
				section.title.toLowerCase().includes(query) ||
				section.description.toLowerCase().includes(query) ||
				section.content.some(item =>
					item.title.toLowerCase().includes(query) ||
					item.content.toLowerCase().includes(query)
				)
			);
		}
	});

	onMount(() => {
		filteredSections = helpSections;
	});

	function scrollToSection(sectionId: string) {
		activeSection = sectionId;
		const element = document.getElementById(sectionId);
		if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function toggleFaq(id: string) {
		expandedFaq = expandedFaq === id ? null : id;
	}

	function handleScroll() {
		const sections = helpSections.map(s => document.getElementById(s.id));
		for (let i = sections.length - 1; i >= 0; i--) {
			const el = sections[i];
			if (el) {
				const rect = el.getBoundingClientRect();
				if (rect.top <= 120) {
					activeSection = helpSections[i].id;
					break;
				}
			}
		}
	}
</script>

<svelte:head>
	<title>Documentation - Congregation Accounts</title>
</svelte:head>

<svelte:window onscroll={handleScroll} />

<div class="docs-page">
	<!-- Header -->
	<div class="docs-header">
		<div class="docs-header-inner">
			<div class="docs-header-text">
				<div class="docs-badge">Documentation</div>
				<h1 class="docs-title">Congregation Accounts</h1>
				<p class="docs-subtitle">Complete guide to managing your congregation's finances</p>
			</div>
			<div class="docs-search">
				<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
				</svg>
				<input type="text" placeholder="Search documentation..." bind:value={searchQuery} class="search-input" />
				{#if searchQuery}
					<button onclick={() => searchQuery = ''} class="search-clear" aria-label="Clear search">
						<svg class="clear-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Quick Links -->
	{#if !searchQuery}
		<div class="quick-links">
			{#each helpSections.slice(0, 4) as section}
				<button class="quick-link-card" onclick={() => scrollToSection(section.id)}>
					<svg class="quick-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d={sectionIcons[section.icon]} />
					</svg>
					<span class="quick-link-title">{section.title}</span>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Layout -->
	<div class="docs-layout">
		<!-- Sidebar Navigation -->
		<nav class="docs-nav">
			<p class="nav-heading">On this page</p>
			{#each filteredSections as section}
				<button onclick={() => scrollToSection(section.id)} class="nav-item {activeSection === section.id ? 'nav-active' : ''}">
					<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d={sectionIcons[section.icon]} />
					</svg>
					<span class="nav-label">{section.title}</span>
				</button>
			{/each}
		</nav>

		<!-- Main Content -->
		<main class="docs-content">
			{#if filteredSections.length === 0}
				<div class="no-results">
					<svg class="no-results-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
					</svg>
					<p class="no-results-text">No results found for "{searchQuery}"</p>
					<button class="no-results-clear" onclick={() => searchQuery = ''}>Clear search</button>
				</div>
			{/if}

			{#each filteredSections as section}
				<section id={section.id} class="docs-section">
					<div class="section-header">
						<div class="section-icon-wrap">
							<svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d={sectionIcons[section.icon]} />
							</svg>
						</div>
						<div>
							<h2 class="section-title">{section.title}</h2>
							<p class="section-desc">{section.description}</p>
						</div>
					</div>

					<div class="section-body">
						{#if section.id === 'faq'}
							<!-- FAQ accordion style -->
							{#each section.content as item, i}
								<div class="faq-item">
									<button class="faq-question" onclick={() => toggleFaq(`${section.id}-${i}`)}>
										<span>{item.title}</span>
										<svg class="faq-chevron {expandedFaq === `${section.id}-${i}` ? 'faq-chevron-open' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
										</svg>
									</button>
									{#if expandedFaq === `${section.id}-${i}`}
										<div class="faq-answer">
											<p>{item.content}</p>
										</div>
									{/if}
								</div>
							{/each}
						{:else}
							{#each section.content as item}
								<div class="doc-card {item.type}">
									<h3 class="doc-card-title">{item.title}</h3>
									<div class="doc-card-body">
										{#if item.type === 'steps'}
											<ol class="steps-list">
												{#each item.content.split('\n').filter((l: string) => l.trim()) as step}
													<li>{step.replace(/^\d+\.\s*/, '')}</li>
												{/each}
											</ol>
										{:else if item.type === 'features'}
											<ul class="features-list">
												{#each item.content.split('\n').filter((l: string) => l.trim()) as feature}
													{@const parts = feature.replace(/^[•\-]\s*/, '').split(':')}
													<li>
														{#if parts.length > 1}
															<strong>{parts[0]}:</strong>{parts.slice(1).join(':')}
														{:else}
															{feature.replace(/^[•\-]\s*/, '')}
														{/if}
													</li>
												{/each}
											</ul>
										{:else}
											{#each item.content.split('\n\n') as paragraph}
												<p class="doc-text">{paragraph}</p>
											{/each}
										{/if}
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</section>
			{/each}

			<!-- Footer -->
			<div class="docs-footer">
				<p>Congregation Accounts Documentation</p>
			</div>
		</main>
	</div>
</div>

<style>
	.docs-page {
		max-width: 1280px;
		margin: 0 auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Header */
	.docs-header {
		background: linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 70%, #000));
		border-radius: 0.75rem;
		padding: 2rem 2rem 1.75rem;
		color: #fff;
	}

	.docs-header-inner {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	@media (min-width: 768px) {
		.docs-header-inner {
			flex-direction: row;
			align-items: flex-end;
			justify-content: space-between;
		}
	}

	.docs-badge {
		display: inline-block;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		background: rgba(255, 255, 255, 0.2);
		padding: 0.2rem 0.625rem;
		border-radius: 999px;
		margin-bottom: 0.5rem;
	}

	.docs-title {
		font-size: 1.5rem;
		font-weight: 800;
		margin: 0;
		color: #fff;
	}

	.docs-subtitle {
		font-size: 0.875rem;
		margin: 0.375rem 0 0;
		opacity: 0.85;
		color: #fff;
	}

	.docs-search {
		position: relative;
		min-width: 300px;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.5);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.625rem 2.5rem 0.625rem 2.5rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.25);
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
		font-size: 0.8125rem;
		transition: all 0.15s;
		backdrop-filter: blur(4px);
	}

	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	.search-input:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.2);
	}

	.search-clear {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		padding: 0.25rem;
		border: none;
		background: transparent;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
	}

	.clear-icon {
		width: 1rem;
		height: 1rem;
	}

	/* Quick Links */
	.quick-links {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	@media (min-width: 768px) {
		.quick-links {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.quick-link-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border-primary);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.quick-link-card:hover {
		border-color: var(--color-accent);
		background: var(--color-accent-light);
		transform: translateY(-1px);
	}

	.quick-link-icon {
		width: 1.5rem;
		height: 1.5rem;
		color: var(--color-accent);
	}

	.quick-link-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	/* Layout */
	.docs-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	@media (min-width: 1024px) {
		.docs-layout {
			grid-template-columns: 220px 1fr;
		}
	}

	/* Sidebar Nav */
	.docs-nav {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border-primary);
		border-radius: 0.5rem;
		padding: 0.75rem;
		height: fit-content;
		position: sticky;
		top: 72px;
	}

	.nav-heading {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-tertiary);
		margin: 0 0 0.5rem;
		padding: 0 0.5rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		text-align: left;
		padding: 0.5rem;
		border-radius: 0.375rem;
		border: none;
		background: transparent;
		cursor: pointer;
		transition: all 0.15s;
		margin-bottom: 1px;
	}

	.nav-item:hover {
		background: var(--color-surface-hover);
	}

	.nav-active {
		background: var(--color-accent-light) !important;
	}

	.nav-icon {
		width: 1rem;
		height: 1rem;
		color: var(--color-text-tertiary);
		flex-shrink: 0;
	}

	.nav-active .nav-icon {
		color: var(--color-accent);
	}

	.nav-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.nav-active .nav-label {
		color: var(--color-accent);
		font-weight: 600;
	}

	/* Content Area */
	.docs-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		min-width: 0;
	}

	/* Sections */
	.docs-section {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border-primary);
		border-radius: 0.5rem;
		padding: 1.5rem;
	}

	.section-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.section-icon-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.5rem;
		background: var(--color-accent-light);
		flex-shrink: 0;
	}

	.section-icon {
		width: 1.125rem;
		height: 1.125rem;
		color: var(--color-accent);
	}

	.section-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.section-desc {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin: 0.125rem 0 0;
	}

	.section-body {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	/* Doc Cards */
	.doc-card {
		padding: 1rem 1rem 1rem 1.125rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		border-left: 3px solid var(--color-border-primary);
	}

	.doc-card.info { border-left-color: var(--color-info, #3b82f6); }
	.doc-card.steps { border-left-color: var(--color-success, #059669); }
	.doc-card.features { border-left-color: var(--color-accent, #1e40af); }
	.doc-card.warning { border-left-color: var(--color-warning, #d97706); }
	.doc-card.chart { border-left-color: var(--color-info, #3b82f6); }
	.doc-card.balance { border-left-color: var(--color-success, #059669); }
	.doc-card.picker { border-left-color: var(--color-accent, #1e40af); }

	.doc-card-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem;
	}

	.doc-card-body {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		line-height: 1.65;
	}

	.doc-text {
		margin: 0 0 0.5rem;
		white-space: pre-line;
	}

	.doc-text:last-child {
		margin-bottom: 0;
	}

	.steps-list {
		margin: 0;
		padding-left: 1.25rem;
	}

	.steps-list li {
		margin-bottom: 0.375rem;
		padding-left: 0.25rem;
	}

	.steps-list li:last-child {
		margin-bottom: 0;
	}

	.features-list {
		margin: 0;
		padding-left: 1.25rem;
		list-style: disc;
	}

	.features-list li {
		margin-bottom: 0.375rem;
		padding-left: 0.25rem;
	}

	.features-list li:last-child {
		margin-bottom: 0;
	}

	/* FAQ */
	.faq-item {
		border: 1px solid var(--color-border-primary);
		border-radius: 0.375rem;
		overflow: hidden;
	}

	.faq-question {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.875rem 1rem;
		border: none;
		background: var(--color-bg-primary);
		cursor: pointer;
		text-align: left;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		transition: background 0.15s;
	}

	.faq-question:hover {
		background: var(--color-surface-hover);
	}

	.faq-chevron {
		width: 1rem;
		height: 1rem;
		color: var(--color-text-tertiary);
		transition: transform 0.2s;
		flex-shrink: 0;
	}

	.faq-chevron-open {
		transform: rotate(180deg);
	}

	.faq-answer {
		padding: 0 1rem 0.875rem;
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		line-height: 1.65;
		background: var(--color-bg-primary);
		border-top: 1px solid var(--color-border-primary);
	}

	.faq-answer p {
		margin: 0.75rem 0 0;
	}

	/* No Results */
	.no-results {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border-primary);
		border-radius: 0.5rem;
	}

	.no-results-icon {
		width: 2.5rem;
		height: 2.5rem;
		color: var(--color-text-tertiary);
		margin-bottom: 0.75rem;
	}

	.no-results-text {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin: 0 0 0.75rem;
	}

	.no-results-clear {
		font-size: 0.8125rem;
		color: var(--color-accent);
		background: none;
		border: none;
		cursor: pointer;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	/* Footer */
	.docs-footer {
		text-align: center;
		padding: 1.5rem 0 0.5rem;
		border-top: 1px solid var(--color-border-primary);
	}

	.docs-footer p {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	/* Mobile */
	@media (max-width: 1024px) {
		.docs-nav {
			position: static;
			display: flex;
			flex-wrap: wrap;
			gap: 0.25rem;
			padding: 0.5rem;
		}

		.nav-heading {
			width: 100%;
			margin-bottom: 0.25rem;
		}

		.nav-item {
			flex: 0 0 auto;
			padding: 0.375rem 0.625rem;
		}
	}

	@media (max-width: 640px) {
		.docs-page {
			padding: 1rem;
			gap: 1rem;
		}

		.docs-header {
			padding: 1.25rem;
		}

		.docs-title {
			font-size: 1.25rem;
		}

		.docs-search {
			min-width: auto;
			width: 100%;
		}

		.docs-section {
			padding: 1rem;
		}

		.section-icon-wrap {
			display: none;
		}

		.quick-links {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.5rem;
		}

		.quick-link-card {
			padding: 0.75rem;
		}
	}
</style>
