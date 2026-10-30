import type { Content, Role } from '../../shared/src/content.js';

/**
 * The heroes' pasts, one by role (`.design/personal.md` §3). Each is a whole content of its own, played by
 * one hero alone. Its ids must not meet the main story's (clues, resources, scenes): the client keeps what it
 * has seen by id. Empty until the first chapters are written.
 */
export const pasts: Partial<Record<Role, Content>> = {};
