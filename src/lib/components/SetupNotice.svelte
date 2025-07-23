<script lang="ts">
	export let show = false;
	export let instructions = '';
	
	function copyInstructions() {
		navigator.clipboard.writeText(instructions);
		alert('Setup instructions copied to clipboard!');
	}
</script>

{#if show}
	<div class="setup-notice">
		<div class="setup-content">
			<h2>🔥 Firebase Setup Required</h2>
			<p>It looks like Firebase Authentication is not properly configured. Please follow these steps:</p>
			
			<div class="setup-steps">
				<ol>
					<li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noopener">Firebase Console</a></li>
					<li>Select your project</li>
					<li>Navigate to <strong>Authentication</strong> → <strong>Sign-in method</strong></li>
					<li>Click on <strong>Email/Password</strong></li>
					<li>Enable <strong>Email/Password</strong> authentication</li>
					<li>Click <strong>Save</strong></li>
					<li>Refresh this page</li>
				</ol>
			</div>

			{#if instructions}
				<div class="instructions-box">
					<pre>{instructions}</pre>
					<button class="copy-btn" on:click={copyInstructions}>
						Copy Instructions
					</button>
				</div>
			{/if}

			<div class="setup-footer">
				<p><strong>Need help?</strong> Check the <a href="https://firebase.google.com/docs/auth" target="_blank" rel="noopener">Firebase Auth Documentation</a></p>
			</div>
		</div>
	</div>
{/if}

<style>
	.setup-notice {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.setup-content {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		max-width: 600px;
		width: 100%;
		max-height: 80vh;
		overflow-y: auto;
	}

	.setup-content h2 {
		margin: 0 0 1rem 0;
		color: #1e293b;
		text-align: center;
	}

	.setup-content p {
		color: #64748b;
		margin-bottom: 1.5rem;
	}

	.setup-steps {
		margin-bottom: 2rem;
	}

	.setup-steps ol {
		padding-left: 1.5rem;
	}

	.setup-steps li {
		margin-bottom: 0.5rem;
		color: #374151;
	}

	.setup-steps a {
		color: #2563eb;
		text-decoration: none;
	}

	.setup-steps a:hover {
		text-decoration: underline;
	}

	.instructions-box {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1.5rem;
		position: relative;
	}

	.instructions-box pre {
		margin: 0;
		font-size: 0.75rem;
		color: #374151;
		line-height: 1.4;
		white-space: pre-wrap;
	}

	.copy-btn {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: #2563eb;
		color: white;
		border: none;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.copy-btn:hover {
		background: #1d4ed8;
	}

	.setup-footer {
		text-align: center;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
	}

	.setup-footer a {
		color: #2563eb;
		text-decoration: none;
	}

	.setup-footer a:hover {
		text-decoration: underline;
	}
</style>
