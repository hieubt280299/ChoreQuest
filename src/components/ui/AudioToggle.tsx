import { Volume2, VolumeX } from 'pixelarticons/react';
import { useAudio } from '../../context/AudioContext';
import { useLanguage } from '../../context/LanguageContext';
import { Icon } from './Icon';

/** Speaker button in the top bar; turning sound on also unlocks browser audio (autoplay rules). */
export function AudioToggle() {
  const { t } = useLanguage();
  const { isMuted, toggleMute, audioSupported } = useAudio();
  if (!audioSupported) return null;
  const label = isMuted ? t('audio.enable') : t('audio.disable');

  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-pressed={!isMuted}
      aria-label={label}
      title={label}
      className={`px-btn h-11 w-11 shrink-0 p-0 ${isMuted ? '' : 'px-btn-primary'}`}
    >
      <Icon as={isMuted ? VolumeX : Volume2} size={24} />
    </button>
  );
}
