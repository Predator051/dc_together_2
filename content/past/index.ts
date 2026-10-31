import type { Content, Role } from '../../shared/src/content.js';
import { hunterPast } from './hunter/index.js';
import { makerPast } from './maker/index.js';
import { sharedPast } from './shared/index.js';

/**
 * The heroes' pasts, one by role (`.design/personal.md` §3). Each is a whole content of its own, played by
 * one hero alone. Its ids must not meet the main story's (clues, resources, scenes): the client keeps what it
 * has seen by id.
 */
export const pasts: Partial<Record<Role, Content>> = { maker: makerPast, hunter: hunterPast };

/** The past the two share once their roads meet (`.design/pasts-later.md` §2). */
export { sharedPast };
