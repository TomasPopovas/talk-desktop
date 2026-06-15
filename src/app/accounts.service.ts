/*!
 * SPDX-FileCopyrightText: 2025 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Session } from 'electron'

import { app, safeStorage, session } from 'electron'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A single logged-in account.
 *
 * The application can hold several accounts at the same time. Each account
 * runs in its own Electron session (partition) so that cookies, storage,
 * cache and the per-session request interceptor (which injects the account's
 * Basic-Auth credentials) are fully isolated from the other accounts.
 */
export type Account = {
	/**
	 * Stable account identifier in the `user@host` format.
	 * Used for de-duplication, window titles and the accounts menu.
	 */
	id: string
	/**
	 * Opaque persistent Electron session partition, e.g. `persist:acc-<uuid>`.
	 * `null` means the default session (used by the very first / primary account
	 * to stay backward compatible with single-account installations).
	 */
	partition: string | null
	/**
	 * Full appData JSON, exactly as produced by the authentication flow
	 * (serverUrl, credentials, capabilities, userMetadata, version, talkHash).
	 */
	appData: AppDataJSON
}

type Credentials = {
	server: string
	user: string
	password: string
}

type AppDataJSON = {
	serverUrl: string
	credentials: Credentials
	[key: string]: unknown
}

const ACCOUNTS_FILE_NAME = 'accounts.json'

/** In-memory registry of all known accounts */
const accounts: Account[] = []

/** Map of webContents.id -> owning account, to resolve appData per window */
const webContentsToAccount = new Map<number, Account>()

/** Whether the registry has been loaded from disk */
let loaded = false

/**
 * Get the path to the accounts file in the user data directory.
 */
function getAccountsFilePath(): string {
	return join(app.getPath('userData'), ACCOUNTS_FILE_NAME)
}

/**
 * Build a stable account id from appData.
 *
 * @param appData - Full appData JSON
 */
export function accountIdFromAppData(appData: AppDataJSON): string {
	const server = String(appData.serverUrl ?? '').replace(/^https?:\/\//, '')
	const user = appData.credentials?.user ?? ''
	return `${user}@${server}`
}

/**
 * Encrypt credentials at rest using the OS keychain when available.
 * Falls back to plaintext (same as the legacy localStorage behaviour) when
 * encryption is not available (e.g. Linux without a configured keyring).
 *
 * @param credentials - Credentials to encrypt
 */
function encryptCredentials(credentials: Credentials): Record<string, unknown> {
	try {
		if (safeStorage.isEncryptionAvailable()) {
			return { enc: safeStorage.encryptString(JSON.stringify(credentials)).toString('base64') }
		}
	} catch (error) {
		console.error('Failed to encrypt credentials, falling back to plaintext', error)
	}
	return { plain: credentials }
}

/**
 * Decrypt credentials read from disk.
 *
 * @param stored - Stored credentials record
 */
function decryptCredentials(stored: Record<string, unknown> | undefined): Credentials | null {
	if (!stored) {
		return null
	}
	if (typeof stored.enc === 'string') {
		try {
			return JSON.parse(safeStorage.decryptString(Buffer.from(stored.enc, 'base64'))) as Credentials
		} catch (error) {
			console.error('Failed to decrypt credentials', error)
			return null
		}
	}
	return (stored.plain as Credentials) ?? null
}

/**
 * Persist the current registry to disk.
 */
function saveAccounts(): void {
	const serializable = {
		version: 1,
		accounts: accounts.map((account) => {
			const { credentials, ...appDataWithoutCredentials } = account.appData
			return {
				id: account.id,
				partition: account.partition,
				appData: appDataWithoutCredentials,
				credentials: encryptCredentials(credentials),
			}
		}),
	}
	try {
		writeFileSync(getAccountsFilePath(), JSON.stringify(serializable, null, 2))
	} catch (error) {
		console.error('Failed to persist accounts', error)
	}
}

/**
 * Load the registry from disk into memory. No-op if already loaded.
 */
export function loadAccounts(): Account[] {
	if (loaded) {
		return accounts
	}
	loaded = true
	try {
		const raw = readFileSync(getAccountsFilePath(), 'utf-8')
		const parsed = JSON.parse(raw) as {
			accounts?: Array<{ id: string, partition: string | null, appData: Record<string, unknown>, credentials?: Record<string, unknown> }>
		}
		for (const stored of parsed.accounts ?? []) {
			const credentials = decryptCredentials(stored.credentials)
			if (!credentials) {
				console.warn(`Skipping account "${stored.id}" - credentials could not be restored`)
				continue
			}
			accounts.push({
				id: stored.id,
				partition: stored.partition ?? null,
				appData: { ...stored.appData, credentials } as AppDataJSON,
			})
		}
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
			console.error('Failed to read accounts file', error)
		}
	}
	return accounts
}

/**
 * Get all known accounts.
 */
export function listAccounts(): Account[] {
	return loadAccounts()
}

/**
 * Get an account by its id.
 *
 * @param id - Account id
 */
export function getAccountById(id: string): Account | undefined {
	return listAccounts().find((account) => account.id === id)
}

/**
 * Resolve the Electron session that belongs to an account.
 *
 * @param account - Account
 */
export function getAccountSession(account: Account): Session {
	return account.partition ? session.fromPartition(account.partition) : session.defaultSession
}

/**
 * Add or update an account from a full appData object.
 *
 * - If an account with the same id already exists, its appData is updated.
 * - The very first account is bound to the default session (partition = null)
 *   to keep backward compatibility. Every additional account gets a fresh
 *   persistent partition so it is fully isolated.
 *
 * @param appData - Full appData JSON produced by the authentication flow
 * @param options - Options
 * @param options.forcePartition - Force a specific partition (used by the "add account" flow)
 */
export function upsertAccount(appData: AppDataJSON, options: { forcePartition?: string | null } = {}): Account {
	loadAccounts()
	const id = accountIdFromAppData(appData)
	const existing = accounts.find((account) => account.id === id)

	if (existing) {
		existing.appData = appData
		saveAccounts()
		return existing
	}

	let partition: string | null
	if (options.forcePartition !== undefined) {
		partition = options.forcePartition
	} else {
		// First account uses the default session, the rest get isolated partitions
		partition = accounts.length === 0 ? null : `persist:acc-${randomUUID()}`
	}

	const account: Account = { id, partition, appData }
	accounts.push(account)
	saveAccounts()
	return account
}

/**
 * Generate a new persistent partition for an account that is being added.
 * The partition is created upfront so the authentication window and the
 * resulting talk window share the same isolated session.
 */
export function generateAccountPartition(): string {
	return `persist:acc-${randomUUID()}`
}

/**
 * Remove an account from the registry and clear its persisted storage.
 *
 * @param id - Account id
 */
export async function removeAccount(id: string): Promise<void> {
	loadAccounts()
	const index = accounts.findIndex((account) => account.id === id)
	if (index === -1) {
		return
	}
	const [account] = accounts.splice(index, 1)
	saveAccounts()
	// Unbind any webContents pointing to this account
	for (const [wcId, boundAccount] of webContentsToAccount.entries()) {
		if (boundAccount.id === id) {
			webContentsToAccount.delete(wcId)
		}
	}
	// Wipe the isolated session storage (cookies, localStorage, cache, etc.)
	try {
		await getAccountSession(account).clearStorageData()
	} catch (error) {
		console.error(`Failed to clear storage for account "${id}"`, error)
	}
}

/**
 * Bind a webContents to an account so that appData can be resolved per window.
 *
 * @param webContentsId - webContents id
 * @param account - Account
 */
export function bindWebContentsToAccount(webContentsId: number, account: Account): void {
	webContentsToAccount.set(webContentsId, account)
}

/**
 * Unbind a webContents (on window close).
 *
 * @param webContentsId - webContents id
 */
export function unbindWebContents(webContentsId: number): void {
	webContentsToAccount.delete(webContentsId)
}

/**
 * Resolve the account that owns a webContents.
 *
 * @param webContentsId - webContents id
 */
export function getAccountByWebContentsId(webContentsId: number): Account | undefined {
	return webContentsToAccount.get(webContentsId)
}
