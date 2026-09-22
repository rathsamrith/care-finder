-- A user may now own/manage several hospitals (organization branches).
-- The FK on user_id needs an index, so add the plain one before dropping the unique one.
CREATE INDEX `hospitals_user_id_idx` ON `hospitals`(`user_id`);

-- DropIndex
DROP INDEX `hospitals_user_id_key` ON `hospitals`;
