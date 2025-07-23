<script lang="ts">
	import Login from './Login.svelte';
	import SignUp from './SignUp.svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let mode: 'login' | 'signup' = 'login';

	function handleAuthSuccess() {
		dispatch('authSuccess');
	}

	function switchToSignUp() {
		mode = 'signup';
	}

	function switchToSignIn() {
		mode = 'login';
	}
</script>

{#if mode === 'login'}
	<Login 
		on:success={handleAuthSuccess}
		on:switchToSignUp={switchToSignUp}
	/>
{:else}
	<SignUp 
		on:success={handleAuthSuccess}
		on:switchToSignIn={switchToSignIn}
	/>
{/if}
