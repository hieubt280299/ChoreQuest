import { useRef, useState, type FormEvent } from 'react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { CHARACTER_NAME_MAX, clampCharacterName, normalizeCharacterName } from '../../utils/characterName';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

/** Rename your own character; a blank name falls back to the role (Husband / Wife). */
export function RenameCharacterModal({
  characterId,
  open,
  onClose,
}: {
  characterId: CharacterId;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { state, setCharacterName } = useGame();
  const [value, setValue] = useState(state.characters[characterId].customName ?? '');
  const [error, setError] = useState<TranslationKey | null>(null);
  // While a keyboard (e.g. Vietnamese Telex/VNI) is still composing a letter, don't cut the text.
  const composing = useRef(false);
  const clean = normalizeCharacterName(value);
  const length = Array.from(value.normalize('NFC').replace(/\s+/g, ' ').trim()).length;
  const role = t(`character.${characterId}`);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = setCharacterName(characterId, value);
    if (result.ok) onClose();
    else setError(result.error);
  };

  return (
    <Modal open={open} onClose={onClose} title={t('character.renameTitle')}>
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <label className="block text-base font-extrabold uppercase tracking-wide text-wood-700">
          <span className="flex items-baseline justify-between gap-2">
            {t('character.nameLabel')}
            <span className={`font-arcade text-[10px] ${length > CHARACTER_NAME_MAX ? 'text-brick-600' : 'text-wood-600'}`}>
              {length}/{CHARACTER_NAME_MAX}
            </span>
          </span>
          <input
            value={value}
            onChange={(event) => {
              setValue(composing.current ? event.target.value : clampCharacterName(event.target.value));
              setError(null);
            }}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              setValue(clampCharacterName(event.currentTarget.value));
            }}
            placeholder={role}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={clean === null}
            aria-describedby="character-name-hint"
            className="px-input mt-2 normal-case tracking-normal"
          />
        </label>
        <p
          id="character-name-hint"
          role={clean === null || error ? 'alert' : undefined}
          className={`text-base ${clean === null || error ? 'font-bold text-brick-600' : 'text-wood-600'}`}
        >
          {clean === null ? t('character.nameInvalid') : error ? t(error) : t('character.nameHint', { role })}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {t('tasks.cancel')}
          </Button>
          <Button type="submit" disabled={clean === null}>
            {t('tasks.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
