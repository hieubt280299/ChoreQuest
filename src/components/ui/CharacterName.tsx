import type { ReactNode } from 'react';
import { useCharacterName } from '../../hooks/useCharacterName';
import type { CharacterId } from '../../types';

/**
 * A character's display name exactly as the player typed it ("My nAme"), even inside uppercase
 * headings and buttons. Falls back to the role label when no name is set.
 */
export function CharacterName({ id, className = '' }: { id: CharacterId; className?: string }) {
  const { name } = useCharacterName();
  return <span className={`normal-case ${className}`}>{name(id)}</span>;
}

/** Stand-in passed to `t()` so a styled name node can be spliced into the translated sentence. */
export const NAME_SLOT = '\u0001';

/** `spliceName(t('key', { name: NAME_SLOT }), <CharacterName id={id} />)` */
export function spliceName(text: string, node: ReactNode): ReactNode {
  const [before, after = ''] = text.split(NAME_SLOT);
  return (
    <>
      {before}
      {node}
      {after}
    </>
  );
}
