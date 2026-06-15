/*!
 * SPDX-FileCopyrightText: 2025 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Small indirection layer that lets the tray and the application menu trigger
 * account-related actions that are implemented in the main entry point,
 * without creating a circular dependency on `main.js`.
 */

type Handlers = {
	addAccount: () => void
	focusAccount: (id: string) => void
	logoutAccount: (id: string) => void
}

const handlers: Handlers = {
	addAccount: () => {},
	focusAccount: () => {},
	logoutAccount: () => {},
}

/**
 * Register the real action handlers (called once from the main entry point).
 *
 * @param newHandlers - Partial set of handlers to register
 */
export function setAccountActions(newHandlers: Partial<Handlers>): void {
	Object.assign(handlers, newHandlers)
}

/**
 * Request opening the "add account" flow.
 */
export function requestAddAccount(): void {
	handlers.addAccount()
}

/**
 * Request focusing the window of an account.
 *
 * @param id - Account id
 */
export function requestFocusAccount(id: string): void {
	handlers.focusAccount(id)
}

/**
 * Request logging out an account.
 *
 * @param id - Account id
 */
export function requestLogoutAccount(id: string): void {
	handlers.logoutAccount(id)
}
