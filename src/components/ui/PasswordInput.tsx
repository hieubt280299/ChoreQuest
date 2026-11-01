import { Eye, EyeOff } from 'pixelarticons/react';
import { useState, type InputHTMLAttributes } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Icon } from './Icon';

/** Password field with a show/hide button, so a mistyped password can be checked on a phone keyboard. */
export function PasswordInput({
  className = '',
  wrapperClassName = '',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { wrapperClassName?: string }) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const label = t(visible ? 'password.hide' : 'password.show');

  return (
    <span className={`relative block ${wrapperClassName}`}>
      <input {...props} type={visible ? 'text' : 'password'} className={`px-input pr-12 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className="px-focus absolute inset-y-0 right-0 flex w-11 items-center justify-center text-wood-600"
      >
        <Icon as={visible ? EyeOff : Eye} size={24} />
      </button>
    </span>
  );
}
