// repositories/user-settings.repository.ts

import { dbPool } from "./db.js";
import { UserSettings } from "../domain/types.js";

function mapRowToUserSettings(row: any): UserSettings {
	return {
		user_id: row.user_id,
		invite_permissions: row.invite_permissions,
	};
}

export const UserSettingsRepository = {
	/**
	 * Get user settings by user ID.
	 */
	async findByUserId(userId: string): Promise<UserSettings | null> {
		const result = await dbPool.query(
			`
			SELECT user_id, invite_permissions
			FROM user_settings
			WHERE user_id = $1
			`,
			[userId],
		);

		if (result.rowCount === 0) {
			return null;
		}

		return mapRowToUserSettings(result.rows[0]);
	},
};
