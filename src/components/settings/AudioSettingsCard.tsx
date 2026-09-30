import { Music } from 'pixelarticons/react';
import type { CSSProperties } from 'react';
import { useAudio } from '../../context/AudioContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { PixelSwitch } from '../ui/PixelSwitch';

function VolumeSlider({
  label,
  value,
  onChange,
  onCommit,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onCommit?: () => void;
  disabled?: boolean;
}) {
  const percent = Math.round(value * 100);
  return (
    <label className="block">
      <span className="mb-3 flex items-center justify-between text-base font-extrabold uppercase text-wood-700">
        {label}
        <span className="font-arcade text-[10px] text-ink">{percent}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={percent}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className="px-range"
        style={{ '--value': `${percent}%` } as CSSProperties}
      />
    </label>
  );
}

export function AudioSettingsCard() {
  const { t } = useLanguage();
  const audio = useAudio();

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold uppercase tracking-wide text-brick-600">
        <Icon as={Music} size={24} />
        {t('settings.audio')}
      </h2>
      {!audio.audioSupported ? (
        <p className="text-base text-wood-600">{t('settings.audioUnsupported')}</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-lg font-bold">{t('settings.sound')}</span>
            <PixelSwitch
              checked={!audio.isMuted}
              onChange={(on) => audio.setMuted(!on)}
              label={t('settings.sound')}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-lg font-bold">{t('settings.music')}</span>
            <PixelSwitch
              checked={audio.bgmEnabled}
              onChange={audio.setBgmEnabled}
              label={t('settings.music')}
              disabled={audio.isMuted}
            />
          </div>
          <VolumeSlider
            label={t('settings.musicVolume')}
            value={audio.bgmVolume}
            onChange={audio.setBgmVolume}
            disabled={audio.isMuted || !audio.bgmEnabled}
          />
          <VolumeSlider
            label={t('settings.sfxVolume')}
            value={audio.sfxVolume}
            onChange={audio.setSfxVolume}
            onCommit={() => audio.playTaskCompleteSFX()}
            disabled={audio.isMuted}
          />
          <p className="text-base text-wood-600">{t('settings.audioNote')}</p>
        </div>
      )}
    </Card>
  );
}
